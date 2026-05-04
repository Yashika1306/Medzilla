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
    if (m) return m[0].trim()
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
  const billed = extractAmount(text, /(?:total charges?|amount billed|gross charges?)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i)
  const covered = extractAmount(text, /(?:insurance paid|plan paid|amount paid by (?:insurance|plan)|plan.s share)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i)

  // Try multiple patterns for patient amount — EOBs use "Your share" or "Your coinsurance"
  const patientOwes =
    extractAmount(text, /(?:patient (?:responsibility|balance|owes?|amount due)|amount due|balance due|total due|you owe)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i) ??
    extractAmount(text, /your\s+(?:share|coinsurance)[^\n]{0,30}\$\s*([\d,]+(?:\.\d{2}))/i) ??
    extractAmount(text, /\$\s*([\d,]+\.\d{2})\s*(?:\n|$)(?!.*\$\s*[\d,]+\.\d{2})/i) // last dollar amount on its own line

  return { billed, covered, patientOwes }
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
