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
  // Total Billed — Aetna: "Amount billed: [description] $13,255.04" (amount at end of line)
  const billed =
    extractAmountLastOnLine(text, /amount\s+billed/i) ??
    extractAmountLastOnLine(text, /total\s+charges?/i) ??
    extractAmountLastOnLine(text, /(?:gross|billed|charged|submitted|provider)\s+(?:charges?|amount)/i) ??
    extractAmountNextLine(text, /amount\s+billed|total\s+charges?/)

  // Insurance Paid — Aetna payment summary: "Total: $5,193.52 $1,538.55" (first = plan's share)
  // Also handles "Plan's share", "Plan paid", "Insurance paid" labels
  const covered =
    extractPlanShareFromSummary(text) ??
    extractAmountLastOnLine(text, /insurance\s+paid/i) ??
    extractAmountLastOnLine(text, /plan\s+paid/i) ??
    extractAmountLastOnLine(text, /benefit\s+paid/i) ??
    extractAmountNextLine(text, /insurance\s+paid|plan\s+paid|benefit\s+paid/)

  // You Owe — Aetna: "Coinsurance: [description] $1,538.55" or "Your share" in payment summary
  const patientOwes =
    extractAmountLastOnLine(text, /^coinsurance[:\s]/im) ??
    extractAmountLastOnLine(text, /your\s+share[:\s]/i) ??
    extractAmountLastOnLine(text, /patient\s+responsibility/i) ??
    extractAmountLastOnLine(text, /member\s+responsibility/i) ??
    extractAmountLastOnLine(text, /(?:balance|amount)\s+due/i) ??
    extractAmountLastOnLine(text, /you\s+owe/i) ??
    extractAmountNextLine(text, /patient\s+responsibility|member\s+responsibility|balance\s+due|you\s+owe/) ??
    extractAmountEOBSummary(text)

  return { billed, covered, patientOwes }
}

// Find a line matching labelRegex, return the LAST dollar amount on that line.
// Handles Aetna-style: "Amount billed: [long description] $13,255.04"
function extractAmountLastOnLine(text, labelRegex) {
  const lines = text.split('\n')
  for (const line of lines) {
    if (!labelRegex.test(line)) continue
    const matches = [...line.matchAll(/\$?([\d,]+\.\d{2})/g)]
    if (matches.length) return parseFloat(matches[matches.length - 1][1].replace(/,/g, ''))
  }
  return null
}

// Aetna payment summary: find "Plan's share" column header, then find the "Total:" row
// below it and return its first dollar amount (= plan's share total)
function extractPlanShareFromSummary(text) {
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (!/plan.s\s+share/i.test(lines[i])) continue
    for (let j = i + 1; j <= Math.min(i + 15, lines.length - 1); j++) {
      if (/^\s*total[:\s]/i.test(lines[j])) {
        const m = lines[j].match(/\$?([\d,]+\.\d{2})/)
        if (m) return parseFloat(m[1].replace(/,/g, ''))
      }
    }
  }
  return null
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
