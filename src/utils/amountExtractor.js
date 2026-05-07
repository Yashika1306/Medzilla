/**
 * Universal amount extractor for medical bills and EOBs.
 * Supports: Aetna, Cigna, UnitedHealth, BlueCross, Humana, Kaiser, Anthem,
 *           and generic hospital bills / patient statements.
 *
 * Returns { docType, billed, billedConfidence, insurance, insuranceConfidence,
 *           owe, oweConfidence, sane }
 * Confidence levels: 'high' | 'medium' | 'low' | null
 */

// ── FIX 1: Normalize pdf.js text extraction artifacts ────────────────────────
// pdf.js may produce "A m o u n t b i l l e d" (spaced chars), "Amountbilled"
// (merged words), or "Amount  billed" (extra spaces). Normalize before matching.

export function normalizeText(raw) {
  // Remove spaces between single characters: "A m o u n t" → "Amount"
  let text = raw.replace(/\b([A-Za-z])\s(?=[A-Za-z]\b)/g, '$1')
  // Collapse multiple spaces into one
  text = text.replace(/ {2,}/g, ' ')
  // Remove excessive blank lines
  text = text.replace(/\n{3,}/g, '\n\n')
  return text
}

// ── STEP 1: Document type detection ──────────────────────────────────────────

export function detectDocumentType(text) {
  const t = text.toLowerCase()
  const eobSignals = [
    'explanation of benefits',
    'this is not a bill',
    "plan's share",
    'plansshare',   // after normalization
    'member rate',
    'memberrate',
    'your coinsurance',
    '\neob\n',
    ' eob ',
    'eob\r',
  ]
  const billSignals = [
    'please pay',
    'remit payment',
    'patient statement',
    'please remit',
  ]
  if (eobSignals.some(s => t.includes(s))) return 'eob'
  if (t.includes('remittance advice') || t.includes('remittance notice')) return 'remittance'
  if (billSignals.some(s => t.includes(s))) return 'bill'
  return 'bill'
}

// ── Core helpers ──────────────────────────────────────────────────────────────

function parseDollar(str) {
  if (!str) return null
  const m = str.match(/\$?([\d,]+\.\d{2})/)
  return m ? parseFloat(m[1].replace(/,/g, '')) : null
}

/**
 * Label-based extraction.
 * Pass 1 (high): label + dollar on same line within 150 chars
 * Pass 2 (medium): label starts a line, dollar within next 3 lines
 */
function extractByLabels(text, labels, minAmount = 0) {
  const lines = text.split('\n')

  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const labelRe = new RegExp(escaped, 'i')

    // Pass 1 — same line
    for (const line of lines) {
      const m = labelRe.exec(line)
      if (!m) continue
      const after = line.slice(m.index + m[0].length, m.index + m[0].length + 150)
      const val = parseDollar(after)
      if (val !== null && val >= minAmount) {
        return { value: val, confidence: 'high', matchedLabel: label }
      }
    }

    // Pass 2 — next-line
    // Require label to START the line to avoid matching prose sentences.
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].toLowerCase().trim().startsWith(label.toLowerCase())) continue
      for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
        const val = parseDollar(lines[j])
        if (val !== null && val >= minAmount) {
          return { value: val, confidence: 'medium', matchedLabel: label }
        }
      }
    }
  }

  return null
}

// ── FIX 3: Flexible regex patterns ───────────────────────────────────────────
// These patterns use \s* between words and [:\s]* between label and value,
// handling both "Amount billed: $13,255.04" and "Amountbilled$13255.04".

const OWE_FLEX = [
  { re: /your\s*share\s*[:\s]*\$?([\d,]+\.\d{2})/i,           label: 'flex:your-share' },
  { re: /member\s*cost\s*share\s*[:\s]*\$?([\d,]+\.\d{2})/i,  label: 'flex:member-cost-share' },
  { re: /patient\s*responsibility\s*[:\s]*\$?([\d,]+\.\d{2})/i, label: 'flex:patient-resp' },
  { re: /you\s*r?\s*owe\s*[:\s]*\$?([\d,]+\.\d{2})/i,         label: 'flex:you-owe' },
  { re: /coinsurance\s*[:\s]*\$?([\d,]+\.\d{2})/i,             label: 'flex:coinsurance' },
  { re: /balance\s*due\s*[:\s]*\$?([\d,]+\.\d{2})/i,           label: 'flex:balance-due' },
  { re: /amount\s*due\s*[:\s]*\$?([\d,]+\.\d{2})/i,            label: 'flex:amount-due' },
]

const BILLED_FLEX = [
  { re: /amount\s*billed\s*[:\s]*\$?([\d,]+\.\d{2})/i,         label: 'flex:amount-billed' },
  { re: /billed\s*amount\s*[:\s]*\$?([\d,]+\.\d{2})/i,         label: 'flex:billed-amount' },
  { re: /total\s*charges?\s*[:\s]*\$?([\d,]+\.\d{2})/i,        label: 'flex:total-charges' },
  { re: /total\s*billed\s*[:\s]*\$?([\d,]+\.\d{2})/i,          label: 'flex:total-billed' },
  { re: /submitted\s*amount\s*[:\s]*\$?([\d,]+\.\d{2})/i,      label: 'flex:submitted-amount' },
]

const INSURANCE_FLEX = [
  { re: /plan.{0,8}share\s*[:\s]*\$?([\d,]+\.\d{2})/i,         label: 'flex:plan-share' },
  { re: /plan\s*paid\s*[:\s]*\$?([\d,]+\.\d{2})/i,             label: 'flex:plan-paid' },
  { re: /insurance\s*paid\s*[:\s]*\$?([\d,]+\.\d{2})/i,        label: 'flex:insurance-paid' },
  { re: /insurance\s*payment\s*[:\s]*\$?([\d,]+\.\d{2})/i,     label: 'flex:insurance-payment' },
  { re: /benefit\s*paid\s*[:\s]*\$?([\d,]+\.\d{2})/i,          label: 'flex:benefit-paid' },
]

function extractByFlexPatterns(text, patterns, minAmount = 1) {
  for (const { re, label } of patterns) {
    const m = text.match(re)
    if (m?.[1]) {
      const val = parseFloat(m[1].replace(/,/g, ''))
      if (!isNaN(val) && val >= minAmount) {
        return { value: val, confidence: 'medium', matchedLabel: label }
      }
    }
  }
  return null
}

// ── STEP 2: You Owe labels ────────────────────────────────────────────────────

const YOU_OWE_LABELS = [
  'your share',
  'your responsibility',
  'patient responsibility',
  'amount you owe',
  'you owe',
  'patient balance',
  'amount due',
  'balance due',
  'total due',
  'please pay',
  'your cost',
  'member cost',
  'member responsibility',
  'member amount owed',
  'coinsurance',
]

export function extractYouOwe(text, docType) {
  const labels = docType === 'eob'
    ? YOU_OWE_LABELS
    : YOU_OWE_LABELS.filter(l => l !== 'coinsurance')
  return extractByLabels(text, labels, 1)
}

// ── STEP 3: Total Billed labels ───────────────────────────────────────────────

const BILLED_LABELS = [
  'amount billed',
  'total billed',
  'billed amount',
  'total charges',
  'gross amount',
  'submitted amount',
  'gross charges',
  'charges',
]

export function extractTotalBilled(text) {
  return extractByLabels(text, BILLED_LABELS, 1)
}

// ── STEP 4: Insurance Paid labels ─────────────────────────────────────────────

const INSURANCE_LABELS = [
  "plan's share",
  'plan paid',
  'insurance paid',
  'insurance payment',
  'plan payment',
  'benefit paid',
  'amount paid by plan',
  'paid by insurance',
  'we paid',
]

export function extractInsurancePaid(text) {
  return extractByLabels(text, INSURANCE_LABELS, 1)
}

// ── STEP 5: Multi-column totals row ──────────────────────────────────────────

function totalsRowFallback(text, docType) {
  const lines = text.split('\n')

  for (const line of lines) {
    const nums = [...line.matchAll(/\$?([\d,]+\.\d{2})/g)]
      .map(m => parseFloat(m[1].replace(/,/g, '')))

    if (nums.length >= 7) {
      // Aetna-style 9-column totals row.
      // Guard: nums[0] > 100 skips small service rows (e.g. all $0.04 columns).
      if (nums[0] <= 100) continue
      return {
        billed:    { value: nums[0],               confidence: 'medium', matchedLabel: 'multi-col[0]' },
        insurance: { value: nums[nums.length - 3], confidence: 'medium', matchedLabel: 'multi-col[-3]' },
        owe:       { value: nums[nums.length - 1], confidence: 'medium', matchedLabel: 'multi-col[-1]' },
      }
    }

    if (nums.length >= 4 && /total|balance|due|amount/i.test(line)) {
      return {
        billed:    null,
        insurance: null,
        owe: { value: nums[nums.length - 1], confidence: 'low', matchedLabel: 'totals-row-last' },
      }
    }
  }

  return null
}

// ── STEP 7: Sanity check ──────────────────────────────────────────────────────

function sanityCheck(billed, insurance, owe, docType) {
  if (billed == null || owe == null) return true
  if (owe > billed) return false
  if (insurance != null) {
    if (insurance > billed) return false
    if (docType !== 'eob') {
      const implied = billed - insurance
      const ratio = Math.abs(implied - owe) / billed
      if (ratio > 0.30) return false
    }
  }
  return true
}

// ── Main export ───────────────────────────────────────────────────────────────

export function extractAmounts(rawText) {
  // FIX 1+2: normalize and try BOTH raw and normalized versions
  const normalized = normalizeText(rawText)

  const docType = detectDocumentType(rawText) || detectDocumentType(normalized)

  // FIX 4: debug logging — check browser console after upload
  console.group('[Medzilla] Amount extraction debug')
  console.log('Document type:', docType)
  console.log('Raw text (first 600 chars):\n' + rawText.slice(0, 600))
  console.log('Normalized text (first 600 chars):\n' + normalized.slice(0, 600))

  let billedResult    = null
  let insuranceResult = null
  let oweResult       = null

  // ── Pass A: multi-column totals row (EOB primary) ───────────────────────
  if (docType === 'eob') {
    const fb = totalsRowFallback(rawText, docType) ?? totalsRowFallback(normalized, docType)
    if (fb) {
      billedResult    = fb.billed
      insuranceResult = fb.insurance
      oweResult       = fb.owe
      console.log('Multi-col row hit:', { billed: fb.billed?.value, insurance: fb.insurance?.value, owe: fb.owe?.value })
    } else {
      console.log('Multi-col row: no match (no line with 7+ amounts where first > 100)')
    }
  }

  // ── Pass B: label-based on raw, then normalized ─────────────────────────
  if (!billedResult) {
    billedResult = extractTotalBilled(rawText) ?? extractTotalBilled(normalized)
    console.log('Label billed:', billedResult ? `${billedResult.value} via "${billedResult.matchedLabel}"` : 'no match')
  }
  if (!insuranceResult) {
    insuranceResult = extractInsurancePaid(rawText) ?? extractInsurancePaid(normalized)
    console.log('Label insurance:', insuranceResult ? `${insuranceResult.value} via "${insuranceResult.matchedLabel}"` : 'no match')
  }
  if (!oweResult) {
    oweResult = extractYouOwe(rawText, docType) ?? extractYouOwe(normalized, docType)
    console.log('Label owe:', oweResult ? `${oweResult.value} via "${oweResult.matchedLabel}"` : 'no match')
  }

  // ── Pass C: flexible regex on raw, then normalized (FIX 3) ──────────────
  if (!billedResult) {
    billedResult = extractByFlexPatterns(rawText, BILLED_FLEX) ?? extractByFlexPatterns(normalized, BILLED_FLEX)
    console.log('Flex billed:', billedResult ? `${billedResult.value} via "${billedResult.matchedLabel}"` : 'no match')
  }
  if (!insuranceResult) {
    insuranceResult = extractByFlexPatterns(rawText, INSURANCE_FLEX) ?? extractByFlexPatterns(normalized, INSURANCE_FLEX)
    console.log('Flex insurance:', insuranceResult ? `${insuranceResult.value} via "${insuranceResult.matchedLabel}"` : 'no match')
  }
  if (!oweResult) {
    oweResult = extractByFlexPatterns(rawText, OWE_FLEX) ?? extractByFlexPatterns(normalized, OWE_FLEX)
    console.log('Flex owe:', oweResult ? `${oweResult.value} via "${oweResult.matchedLabel}"` : 'no match')
  }

  // ── Pass D: multi-column row fallback for hospital bills ─────────────────
  if (!billedResult || !oweResult) {
    const fb = totalsRowFallback(rawText, docType) ?? totalsRowFallback(normalized, docType)
    if (fb) {
      if (!billedResult)    billedResult    = fb.billed
      if (!insuranceResult) insuranceResult = fb.insurance
      if (!oweResult)       oweResult       = fb.owe
    }
  }

  const billed    = billedResult?.value    ?? null
  const insurance = insuranceResult?.value ?? null
  const owe       = oweResult?.value       ?? null

  const sane = sanityCheck(billed, insurance, owe, docType)
  if (!sane) {
    if (billedResult)    billedResult    = { ...billedResult,    confidence: 'low' }
    if (insuranceResult) insuranceResult = { ...insuranceResult, confidence: 'low' }
    if (oweResult)       oweResult       = { ...oweResult,       confidence: 'low' }
  }

  console.log('FINAL:', { billed, insurance, owe, sane })
  console.groupEnd()

  return {
    docType,
    billed,
    billedConfidence:    billedResult?.confidence    ?? null,
    billedLabel:         billedResult?.matchedLabel  ?? null,
    insurance,
    insuranceConfidence: insuranceResult?.confidence ?? null,
    insuranceLabel:      insuranceResult?.matchedLabel ?? null,
    owe,
    oweConfidence:    oweResult?.confidence    ?? null,
    oweLabel:         oweResult?.matchedLabel  ?? null,
    sane,
  }
}
