import { extractAmounts, detectDocumentType } from './amountExtractor.js'

const CPT_REGEX = /\b(9[90]\d{3}|[78]\d{4}|[0-9]\d{4}|[A-HJ-Z]\d{4})\b/g
const ICD10_REGEX = /\b([A-Z]\d{2}(?:\.\d{1,4})?[A-Z]?)\b/g

export function parseBill(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
  const documentType = detectDocumentType(rawText)

  const hospitalName = extractHospitalName(rawText)
  const patientName  = extractPatientName(rawText)
  const accountNumber = extractAccountNumber(rawText)
  const dateOfService = extractDateOfService(rawText)
  const lineItems = extractLineItems(lines, rawText, documentType)

  // Universal amount extraction with confidence levels
  const amounts = extractAmounts(rawText)
  const totals = {
    billed:    amounts.billed,
    covered:   amounts.insurance,
    patientOwes: amounts.owe,
    // Confidence levels drive the display hints in BillBreakdown
    billedConfidence:    amounts.billedConfidence,
    coveredConfidence:   amounts.insuranceConfidence,
    patientOwesConfidence: amounts.oweConfidence,
    sane: amounts.sane,
  }

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
      const stopAt = /\s+(?:Claim\s+ID|Received\s+on|Amount\s+billed|In-Network|Out-of-Network|\(In-Network\)|\(Out)/i
      const stop = stopAt.exec(name)
      if (stop) name = name.slice(0, stop.index).trim()
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

function extractLineItems(lines, fullText, documentType) {
  const items = []
  const seenCodes = new Set()

  for (const line of lines) {
    const cptMatches  = [...line.matchAll(CPT_REGEX)]
    const icd10Matches = [...line.matchAll(ICD10_REGEX)]

    const allMatches = [
      ...cptMatches.map(m => ({ code: m[1], type: 'CPT' })),
      ...icd10Matches.map(m => ({ code: m[1], type: 'ICD10' }))
    ]

    for (const { code, type } of allMatches) {
      if (seenCodes.has(code)) continue
      seenCodes.add(code)

      // EOB lines have multiple dollar columns (Member Rate, Plan's Share, etc.)
      // — amounts are unreliable, so skip them to avoid showing wrong values.
      const amount = documentType === 'eob' ? null : extractLineAmount(line)
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
