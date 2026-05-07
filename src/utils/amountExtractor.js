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
  // Match optional currency symbol/code before the number
  const m = str.match(/(?:RS\.?|INR|₹|\$)?\s*([\d,]+\.\d{2})/i)
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
  // US formats
  { re: /your\s*share\s*[:\s]*\$?([\d,]+\.\d{2})/i,           label: 'flex:your-share' },
  { re: /member\s*cost\s*share\s*[:\s]*\$?([\d,]+\.\d{2})/i,  label: 'flex:member-cost-share' },
  { re: /patient\s*responsibility\s*[:\s]*\$?([\d,]+\.\d{2})/i, label: 'flex:patient-resp' },
  { re: /you\s*r?\s*owe\s*[:\s]*\$?([\d,]+\.\d{2})/i,         label: 'flex:you-owe' },
  { re: /coinsurance\s*[:\s]*\$?([\d,]+\.\d{2})/i,             label: 'flex:coinsurance' },
  { re: /balance\s*due\s*[:\s]*\$?([\d,]+\.\d{2})/i,           label: 'flex:balance-due' },
  { re: /amount\s*due\s*[:\s]*\$?([\d,]+\.\d{2})/i,            label: 'flex:amount-due' },
  // Indian / international formats
  { re: /net\s*payable\s*[:\s]*(?:RS\.?|INR|₹|\$)?\s*([\d,]+\.\d{2})/i,    label: 'flex:net-payable' },
  { re: /amount\s*payable\s*[:\s]*(?:RS\.?|INR|₹|\$)?\s*([\d,]+\.\d{2})/i, label: 'flex:amount-payable' },
  { re: /patient\s*payable\s*[:\s]*(?:RS\.?|INR|₹|\$)?\s*([\d,]+\.\d{2})/i, label: 'flex:patient-payable' },
  { re: /payable\s*amount\s*[:\s]*(?:RS\.?|INR|₹|\$)?\s*([\d,]+\.\d{2})/i, label: 'flex:payable-amount' },
]

const BILLED_FLEX = [
  // US formats
  { re: /amount\s*billed\s*[:\s]*\$?([\d,]+\.\d{2})/i,         label: 'flex:amount-billed' },
  { re: /billed\s*amount\s*[:\s]*\$?([\d,]+\.\d{2})/i,         label: 'flex:billed-amount' },
  { re: /total\s*charges?\s*[:\s]*\$?([\d,]+\.\d{2})/i,        label: 'flex:total-charges' },
  { re: /total\s*billed\s*[:\s]*\$?([\d,]+\.\d{2})/i,          label: 'flex:total-billed' },
  { re: /submitted\s*amount\s*[:\s]*\$?([\d,]+\.\d{2})/i,      label: 'flex:submitted-amount' },
  // Indian / international formats
  { re: /grand\s*total\s*[:\s]*(?:RS\.?|INR|₹|\$)?\s*([\d,]+\.\d{2})/i,    label: 'flex:grand-total' },
  { re: /net\s*amount\s*[:\s]*(?:RS\.?|INR|₹|\$)?\s*([\d,]+\.\d{2})/i,     label: 'flex:net-amount' },
  { re: /total\s*amount\s*[:\s]*(?:RS\.?|INR|₹|\$)?\s*([\d,]+\.\d{2})/i,   label: 'flex:total-amount' },
  { re: /total\s*bill\s*[:\s]*(?:RS\.?|INR|₹|\$)?\s*([\d,]+\.\d{2})/i,     label: 'flex:total-bill' },
  { re: /bill\s*amount\s*[:\s]*(?:RS\.?|INR|₹|\$)?\s*([\d,]+\.\d{2})/i,    label: 'flex:bill-amount' },
]

const INSURANCE_FLEX = [
  { re: /plan.{0,8}share\s*[:\s]*\$?([\d,]+\.\d{2})/i,         label: 'flex:plan-share' },
  { re: /plan\s*paid\s*[:\s]*\$?([\d,]+\.\d{2})/i,             label: 'flex:plan-paid' },
  { re: /insurance\s*paid\s*[:\s]*\$?([\d,]+\.\d{2})/i,        label: 'flex:insurance-paid' },
  { re: /insurance\s*payment\s*[:\s]*\$?([\d,]+\.\d{2})/i,     label: 'flex:insurance-payment' },
  { re: /benefit\s*paid\s*[:\s]*\$?([\d,]+\.\d{2})/i,          label: 'flex:benefit-paid' },
  // Indian TPA / insurance reimbursement
  { re: /tpa\s*(?:amount|paid|share)?\s*[:\s]*(?:RS\.?|INR|₹|\$)?\s*([\d,]+\.\d{2})/i, label: 'flex:tpa' },
  { re: /insurance\s*cover(?:age)?\s*[:\s]*(?:RS\.?|INR|₹|\$)?\s*([\d,]+\.\d{2})/i,    label: 'flex:insurance-coverage' },
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
  // US formats
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
  // Indian / international formats
  'net payable',
  'amount payable',
  'patient payable',
  'payable amount',
  'net amount payable',
  'total payable',
]

export function extractYouOwe(text, docType) {
  const labels = docType === 'eob'
    ? YOU_OWE_LABELS
    : YOU_OWE_LABELS.filter(l => l !== 'coinsurance')
  return extractByLabels(text, labels, 1)
}

// ── STEP 3: Total Billed labels ───────────────────────────────────────────────

const BILLED_LABELS = [
  // US formats
  'amount billed',
  'total billed',
  'billed amount',
  'total charges',
  'gross amount',
  'submitted amount',
  'gross charges',
  'charges',
  // Indian / international formats
  'grand total',
  'net amount',
  'total amount',
  'total bill',
  'bill amount',
  'total bill amount',
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

// ── STEP 4b: Indian itemized bill column-sum strategy ────────────────────────
// Detects a column header like "AMOUNT(RS.)" or "Amount (INR)" then sums all
// line-item amounts below it, treating that sum as Total Billed.
// Also looks for a "Grand Total" / "Net Payable" row as a cross-check.

export function extractColumnSum(text) {
  const lines = text.split('\n')

  // Find a header line containing an amount column marker
  const headerRe = /amount\s*[\(\[]?\s*(?:RS\.?|INR|₹|\$)\s*[\)\]]?/i
  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (headerRe.test(lines[i])) { headerIdx = i; break }
  }
  if (headerIdx === -1) return null

  // Collect amounts from lines after the header until a summary row or end
  const stopRe = /grand\s*total|net\s*(?:amount|payable)|total\s*(?:amount|bill)|amount\s*payable/i
  let sum = 0
  let count = 0
  let grandTotal = null

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]

    // If this line looks like a summary/total row, grab it and stop
    if (stopRe.test(line)) {
      const m = line.match(/(?:RS\.?|INR|₹|\$)?\s*([\d,]+\.\d{2})/i)
      if (m) grandTotal = parseFloat(m[1].replace(/,/g, ''))
      break
    }

    // Extract the last currency amount on the line (rightmost column = item amount)
    const allAmounts = [...line.matchAll(/(?:RS\.?|INR|₹|\$)?\s*([\d,]+\.\d{2})/gi)]
    if (allAmounts.length > 0) {
      const val = parseFloat(allAmounts[allAmounts.length - 1][1].replace(/,/g, ''))
      if (!isNaN(val) && val > 0) { sum += val; count++ }
    }
  }

  if (count === 0) return null

  // Prefer the explicit grand total row if present; fall back to computed sum
  const billed = grandTotal ?? (count >= 2 ? sum : null)
  if (billed === null) return null

  return { value: billed, confidence: count >= 2 ? 'high' : 'medium', matchedLabel: 'column-sum' }
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

// ── STEP 6: Flat-text extraction ─────────────────────────────────────────────
// pdf.js sometimes emits all text as a single long line with no newlines.
// Label-based extraction (150-char window, line-start requirement) silently fails.
// Strategy: extract all amounts with positions, match by proximity and context.

function isFlatText(text) {
  const newlines = (text.match(/\n/g) || []).length
  // Zero newlines → definitely a single-line concatenated string
  if (newlines === 0) return true
  const nonEmpty = text.split('\n').filter(l => l.trim().length > 0)
  // Has newlines but average line is very long → mostly flat
  return (text.replace(/\n/g, '').length / nonEmpty.length) > 400
}

export function extractFromFlatText(text) {
  // Collect every dollar-like amount with its character position
  const allAmounts = []
  const amountRe = /(?:RS\.?|INR|₹|\$)?\s*([\d]{1,3}(?:,[\d]{3})*\.[\d]{2})/gi
  let m
  while ((m = amountRe.exec(text)) !== null) {
    const val = parseFloat(m[1].replace(/,/g, ''))
    if (!isNaN(val)) allAmounts.push({ value: val, index: m.index })
  }
  if (allAmounts.length === 0) return null

  const t = text.toLowerCase()

  // ── Strategy 1: find 7-9 consecutive amounts within 1000 chars ─────────────
  // In Aetna flat EOB the 9 column values appear back-to-back after headers.
  // Individual service rows are scattered; only the totals cluster this tightly.
  for (let i = 0; i <= allAmounts.length - 7; i++) {
    const win = allAmounts.slice(i, i + 9)
    const span = win[win.length - 1].index - win[0].index
    if (span > 1000) continue          // not tight enough — different rows
    if (win[0].value <= 100) continue  // guard: skip rows like all-$0.04
    const ins = win[win.length - 3]
    const owe = win[win.length - 1]
    // Sanity: billed > insurance and billed > owe
    if (ins && owe && win[0].value > owe.value && win[0].value > ins.value) {
      return {
        billed:    { value: win[0].value, confidence: 'high', matchedLabel: 'flat:seq[0]' },
        insurance: { value: ins.value,    confidence: 'high', matchedLabel: 'flat:seq[-3]' },
        owe:       { value: owe.value,    confidence: 'high', matchedLabel: 'flat:seq[-1]' },
      }
    }
  }

  // ── Strategy 2: Visit Totals row (e.g. Lenox Hill) ─────────────────────────
  // "Visit Totals $4,356.28 -$3,485.02 $0.00 $871.26"
  const vtM = text.match(/visit\s+totals?\s+\$?([\d,]+\.\d{2})([\s\S]{0,300})/i)
  if (vtM) {
    const billedVal = parseFloat(vtM[1].replace(/,/g, ''))
    const seg = vtM[2]
    const negM  = seg.match(/-\$?([\d,]+\.\d{2})/)
    const posAll = [...seg.matchAll(/(?<![-\d])\$?([\d,]+\.\d{2})/g)]
      .map(a => parseFloat(a[1].replace(/,/g, '')))
      .filter(v => v > 0)
    if (billedVal > 0) {
      return {
        billed:    { value: billedVal,                                       confidence: 'high', matchedLabel: 'flat:visit-totals' },
        insurance: negM ? { value: parseFloat(negM[1].replace(/,/g, '')),   confidence: 'high', matchedLabel: 'flat:visit-totals-discount' } : null,
        owe:       posAll.length ? { value: posAll[posAll.length - 1],      confidence: 'high', matchedLabel: 'flat:visit-totals-last' } : null,
      }
    }
  }

  // ── Strategy 3: wide-window label matching ──────────────────────────────────
  // Use the LAST occurrence of each label (most likely to be the totals/summary row).
  function firstAmountAfterLast(label, minVal = 1) {
    const idx = t.lastIndexOf(label)
    if (idx === -1) return null
    return allAmounts.find(a => a.index > idx && a.value >= minVal) ?? null
  }

  let billed = null, insurance = null, owe = null

  // Total Billed — use largest amount after the label (the total, not a line item)
  const billedLabelIdx = t.indexOf('amount billed')
  if (billedLabelIdx !== -1) {
    const after = allAmounts.filter(a => a.index > billedLabelIdx && a.value > 100)
    if (after.length > 0) {
      const largest = after.reduce((mx, a) => a.value > mx.value ? a : mx)
      billed = { value: largest.value, confidence: 'medium', matchedLabel: 'flat:amount-billed' }
    }
  }

  const oweLabels = ["your share", "net payable", "amount payable", "you owe", "balance due", "patient responsibility", "amount due"]
  for (const label of oweLabels) {
    const a = firstAmountAfterLast(label)
    if (a) { owe = { value: a.value, confidence: 'medium', matchedLabel: `flat:${label}` }; break }
  }

  const insLabels = ["plan's share", "plan paid", "insurance paid", "insurance payment", "tpa amount"]
  for (const label of insLabels) {
    const a = firstAmountAfterLast(label)
    if (a) { insurance = { value: a.value, confidence: 'medium', matchedLabel: `flat:${label}` }; break }
  }

  // ── Strategy 4: infer insurance from billed − owe ──────────────────────────
  if (billed && owe && !insurance) {
    const implied = billed.value - owe.value
    if (implied > 0) {
      const candidate = allAmounts.find(a => Math.abs(a.value - implied) / billed.value < 0.05)
      if (candidate) insurance = { value: candidate.value, confidence: 'low', matchedLabel: 'flat:implied' }
    }
  }

  if (!billed && !owe) return null
  return { billed, insurance, owe }
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

  // ── Pass 0: flat-text extraction (pdf.js single-line output) ───────────
  const flat = isFlatText(rawText) || isFlatText(normalized)
  if (flat) {
    const ft = extractFromFlatText(rawText) ?? extractFromFlatText(normalized)
    if (ft) {
      billedResult    = ft.billed    ?? null
      insuranceResult = ft.insurance ?? null
      oweResult       = ft.owe       ?? null
      console.log('Flat-text hit:', { billed: billedResult?.value, insurance: insuranceResult?.value, owe: oweResult?.value })
    } else {
      console.log('Flat-text: no match')
    }
  }

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

  // ── Pass E: Indian / international column-sum strategy ───────────────────
  if (!billedResult) {
    const cs = extractColumnSum(rawText) ?? extractColumnSum(normalized)
    if (cs) {
      billedResult = cs
      console.log('Column-sum billed:', cs.value, `(${cs.matchedLabel})`)
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
