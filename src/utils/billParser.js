const CPT_REGEX = /\b(9[90]\d{3}|[78]\d{4}|[0-9]\d{4}|[A-HJ-Z]\d{4})\b/g
const ICD10_REGEX = /\b([A-Z]\d{2}(?:\.\d{1,4})?[A-Z]?)\b/g
const AMOUNT_REGEX = /\$?\s*([\d,]+(?:\.\d{2})?)/g

function detectDocumentType(text) {
  const upper = text.toUpperCase()
  if (upper.includes('EXPLANATION OF BENEFITS') || upper.includes('THIS IS NOT A BILL') || upper.includes('EOB')) return 'eob'
  if (upper.includes('REMITTANCE ADVICE') || upper.includes('REMITTANCE NOTICE')) return 'remittance'
  return 'bill'
}

export function parseBill(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
  const documentType = detectDocumentType(rawText)

  const hospitalName = extractHospitalName(rawText)
  const patientName = extractPatientName(rawText)
  const accountNumber = extractAccountNumber(rawText)
  const dateOfService = extractDateOfService(rawText)
  const totals = extractTotals(rawText)
  const lineItems = extractLineItems(lines, rawText)

  return {
    rawText,
    extractedAt: new Date().toISOString(),
    documentType,
    hospitalName,
    patientName,
    accountNumber,
    dateOfService,
    lineItems,
    totals,
    flagSummary: null,
    survivalPaths: []
  }
}

function extractHospitalName(text) {
  const patterns = [
    /(?:hospital|medical center|health system|health center|regional medical|community hospital|university hospital|memorial hospital)[^\n,]*/i,
    /^([A-Z][A-Za-z\s]+(?:Hospital|Medical|Health|Center|Clinic))/m
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) {
      let name = m[0].trim()
      // Stop at EOB/claim metadata keywords to avoid grabbing entire document
      const stopAt = /\s+(?:Claim\s+ID|Received\s+on|Amount\s+billed|In-Network|Out-of-Network|\(In-Network\)|\(Out)/i
      const stop = stopAt.exec(name)
      if (stop) name = name.slice(0, stop.index).trim()
      // Hard cap at 80 characters
      if (name.length > 80) name = name.slice(0, 80).trim()
      return name
    }
  }
  return null
}

function extractPatientName(text) {
  const m = text.match(/patient(?:\s+name)?[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i)
  return m ? m[1].trim() : null
}

function extractAccountNumber(text) {
  const m = text.match(/(?:account|acct|patient id|account no)[.#:\s]+([A-Z0-9\-]{4,20})/i)
  return m ? m[1].trim() : null
}

function extractDateOfService(text) {
  const m = text.match(/(?:date of service|dos|service date)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i)
  return m ? m[1].trim() : null
}

function extractTotals(text) {
  const billed =
    extractAmountInline(text, /(?:total\s+charges?|amount\s+billed|charged\s+amount|billed\s+amount|gross\s+charges?|submitted\s+charges?|provider\s+charges?|amount\s+charged|full\s+charges?)[\s:]*\$?([\d,]+(?:\.\d{2})?)/i) ??
    extractAmountNextLine(text, /(?:total\s+charges?|amount\s+billed|charged\s+amount|billed\s+amount|gross\s+charges?|submitted\s+charges?)/) ??
    extractAmountInline(text, /(?:member\s+rate|contracted\s+rate|allowed\s+amount|negotiated\s+(?:rate|amount))[\s:]*\$?([\d,]+(?:\.\d{2})?)/i)

  const covered =
    extractAmountInline(text, /(?:insurance\s+paid|plan\s+paid|plan\s+payment|benefit\s+paid|amount\s+paid(?:\s+by\s+(?:insurance|plan|health\s+plan))?|health\s+plan\s+paid|we\s+paid|aetna\s+paid|cigna\s+paid|bcbs\s+paid|united\s+paid|humana\s+paid)[\s:]*\$?([\d,]+(?:\.\d{2})?)/i) ??
    extractAmountNextLine(text, /(?:insurance\s+paid|plan\s+paid|plan\s+payment|benefit\s+paid|amount\s+paid|health\s+plan\s+paid|we\s+paid)/) ??
    extractAmountInline(text, /(?:plan(?:'s)?\s+share|insurance(?:'s)?\s+share)[\s:]*\$?([\d,]+(?:\.\d{2})?)/i) ??
    extractAmountNextLine(text, /(?:plan(?:'s)?\s+share|insurance(?:'s)?\s+share)/)

  const patientOwes =
    extractAmountInline(text, /(?:patient\s+(?:responsibility|balance|owes?|amount\s+due|share|cost)|member\s+(?:responsibility|share|cost|owes?)|your\s+(?:responsibility|share|total\s+responsibility|cost\s+share|amount\s+due|balance)|amount\s+(?:you\s+owe|due\s+from\s+(?:you|member|patient))|(?:total\s+)?balance\s+due|total\s+due|amount\s+due|you\s+owe|what\s+you\s+owe|(?:total\s+)?(?:deductible|copay|coinsurance)\s+(?:and\s+(?:copay|coinsurance)\s+)?(?:total|amount))[\s:]*\$?([\d,]+(?:\.\d{2})?)/i) ??
    extractAmountNextLine(text, /(?:patient\s+responsibility|member\s+responsibility|your\s+(?:responsibility|share|total|amount\s+due)|balance\s+due|total\s+due|amount\s+due|you\s+owe|what\s+you\s+owe)/) ??
    extractAmountInline(text, /total\s+(?:member|patient|your)\s+(?:responsibility|share|balance)[\s:]*\$?([\d,]+(?:\.\d{2})?)/i) ??
    extractAmountEOBSummary(text)

  return { billed, covered, patientOwes }
}

// Match label and amount on the same line
function extractAmountInline(text, regex) {
  const m = text.match(regex)
  if (!m) return null
  return parseFloat(m[1].replace(/,/g, ''))
}

// Match label on one line, then find first dollar amount within next 3 lines
function extractAmountNextLine(text, labelRegex) {
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (!labelRegex.test(lines[i])) continue
    for (let j = i; j <= Math.min(i + 3, lines.length - 1); j++) {
      const m = lines[j].match(/\$?\s*([\d,]+\.\d{2})/)
      if (m) return parseFloat(m[1].replace(/,/g, ''))
    }
  }
  return null
}

// For EOBs: scan the last 1200 chars for a summary total (last-resort fallback)
function extractAmountEOBSummary(text) {
  const upper = text.toUpperCase()
  const isEOB = upper.includes('EXPLANATION OF BENEFITS') || upper.includes('THIS IS NOT A BILL') || upper.includes('EOB')
  if (!isEOB) return null
  const tail = text.slice(-1200)
  const matches = [...tail.matchAll(/(?<!\d)([\d,]{1,7}\.\d{2})(?!\d)/g)]
    .map(m => parseFloat(m[1].replace(/,/g, '')))
    .filter(n => n > 10 && n < 15000)
  return matches.length ? matches[matches.length - 1] : null
}

function extractAmount(text, regex) {
  const m = text.match(regex)
  if (!m) return null
  return parseFloat(m[1].replace(/,/g, ''))
}

function extractLineItems(lines, fullText) {
  const items = []
  const seenCodes = new Set()

  for (const line of lines) {
    const cptMatches = [...line.matchAll(CPT_REGEX)]
    const icd10Matches = [...line.matchAll(ICD10_REGEX)]

    const allMatches = [
      ...cptMatches.map(m => ({ code: m[1], type: 'CPT' })),
      ...icd10Matches.map(m => ({ code: m[1], type: 'ICD10' }))
    ]

    for (const { code, type } of allMatches) {
      if (seenCodes.has(code)) continue
      seenCodes.add(code)

      const amount = extractLineAmount(line)
      items.push({
        code,
        codeType: type,
        originalText: line,
        plainEnglish: null,
        amount,
        flag: 'normal',
        flagReason: null,
        studentTip: null
      })
    }
  }

  return items
}

function extractLineAmount(line) {
  const matches = [...line.matchAll(/\$?([\d,]+\.\d{2})/g)]
  if (!matches.length) return null
  const amounts = matches.map(m => parseFloat(m[1].replace(/,/g, '')))
  return Math.max(...amounts)
}
