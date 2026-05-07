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
  const lineItems = extractLineItems(lines, rawText, documentType)

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
  // Primary: Aetna claims totals row has all 9 column values on one line.
  // e.g. "13,255.04  14,614.00  11,512.04  0.00  0.00  10,257.00  8,718.45  1,538.55  $1,538.55"
  // Column order: A=billed, B=member rate, C=not payable, D=deductible, E=copay,
  //               F=amount remaining, G=plan's share, H=coinsurance, I=your share
  const claimsRow = extractFromClaimsTotalsRow(text)

  const billed =
    claimsRow?.billed ??
    extractAmountAfterLabel(text, /amount\s+billed/i, 10) ??
    extractAmountAfterLabel(text, /total\s+charges?/i, 10) ??
    extractAmountAfterLabel(text, /gross\s+charges?/i, 10) ??
    extractAmountNextLine(text, /amount\s+billed|total\s+charges?/)

  const covered =
    extractPlanShareFromSummary(text) ??
    claimsRow?.covered ??
    extractAmountAfterLabel(text, /insurance\s+paid/i, 1) ??
    extractAmountAfterLabel(text, /plan\s+paid/i, 1) ??
    extractAmountNextLine(text, /insurance\s+paid|plan\s+paid/)

  const patientOwes =
    extractAmountAfterLabel(text, /^coinsurance[:\s]/im, 1) ??
    claimsRow?.patientOwes ??
    extractAmountAfterLabel(text, /your\s+share[:\s]/i, 1) ??
    extractAmountAfterLabel(text, /patient\s+responsibility/i, 1) ??
    extractAmountAfterLabel(text, /member\s+responsibility/i, 1) ??
    extractAmountAfterLabel(text, /(?:balance|amount)\s+due/i, 1) ??
    extractAmountNextLine(text, /patient\s+responsibility|member\s+responsibility|balance\s+due/) ??
    extractAmountEOBSummary(text)

  return { billed, covered, patientOwes }
}

// Aetna EOB: find a line with 7+ dollar amounts — that's the claims table totals row.
// Returns { billed, covered, patientOwes } extracted by column position.
function extractFromClaimsTotalsRow(text) {
  const lines = text.split('\n')
  for (const line of lines) {
    const nums = [...line.matchAll(/\$?([\d,]+\.\d{2})/g)].map(m => parseFloat(m[1].replace(/,/g, '')))
    if (nums.length >= 7 && nums[0] > 100) {
      return {
        billed: nums[0],                      // Column A: Amount billed
        covered: nums[nums.length - 3],       // Column G: Plan's share
        patientOwes: nums[nums.length - 1]    // Column I: Your share
      }
    }
  }
  return null
}

// Find a line matching labelRegex, return the first dollar amount AFTER the label.
// minAmount filters out noise (e.g. $0.04 line items when we want the $13k total).
function extractAmountAfterLabel(text, labelRegex, minAmount = 0) {
  const lines = text.split('\n')
  for (const line of lines) {
    const match = labelRegex.exec(line)
    if (!match) continue
    const afterLabel = line.slice(match.index + match[0].length)
    const m = afterLabel.match(/\$?([\d,]+\.\d{2})/)
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ''))
      if (val >= minAmount) return val
    }
  }
  return null
}

// Aetna payment summary: "Plan's share" header then look ahead for "Total" row.
// First dollar amount in that row = plan's amount paid to provider.
function extractPlanShareFromSummary(text) {
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (!/plan.s\s+share/i.test(lines[i])) continue
    for (let j = i + 1; j <= Math.min(i + 15, lines.length - 1); j++) {
      if (/total/i.test(lines[j])) {
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

function extractLineItems(lines, fullText, documentType) {
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
