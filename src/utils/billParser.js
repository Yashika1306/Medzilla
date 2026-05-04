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
  const billed = extractAmount(text, /(?:total charges?|amount billed|gross charges?|member rate)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i)
  const covered =
    extractAmount(text, /(?:insurance paid|plan paid|amount paid by (?:insurance|plan)|plan.s share|plan paid)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i) ??
    extractAmount(text, /(?:plan(?:'s)?\s+share)[^\n]{0,40}([\d,]+\.\d{2})/i)

  // Multiple patterns for patient amount — EOBs use "Your share", "member responsibility", etc.
  const patientOwes =
    extractAmount(text, /(?:patient (?:responsibility|balance|owes?|amount due)|amount due|balance due|total due|you owe|member responsibility)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i) ??
    extractAmount(text, /total\s+(?:member|patient|your)\s+(?:responsibility|share|balance)[^\n]{0,30}([\d,]+\.\d{2})/i) ??
    extractAmount(text, /(?:your\s+total\s+(?:share|responsibility)|total\s+you\s+owe)[^\n]{0,30}([\d,]+\.\d{2})/i) ??
    extractAmount(text, /your\s+(?:share|coinsurance)[^\n]{0,30}\$\s*([\d,]+(?:\.\d{2}))/i) ??
    extractAmountEOBSummary(text)

  return { billed, covered, patientOwes }
}

// For EOBs only: scan the last 800 chars of the document for a standalone total amount
// Only applies when EOB markers are present (prevents false positives on regular bills)
function extractAmountEOBSummary(text) {
  const upper = text.toUpperCase()
  const isEOB = upper.includes('EXPLANATION OF BENEFITS') || upper.includes('THIS IS NOT A BILL') || upper.includes('EOB')
  if (!isEOB) return null
  // Look at the tail of the document where totals usually appear
  const tail = text.slice(-800)
  const matches = [...tail.matchAll(/(?<!\d)([\d,]{1,7}\.\d{2})(?!\d)/g)]
    .map(m => parseFloat(m[1].replace(/,/g, '')))
    .filter(n => n > 10 && n < 15000) // plausible patient responsibility range
  // Return last candidate (totals appear at end of EOB)
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
