/**
 * Universal amount extractor for medical bills and EOBs.
 * Supports: Aetna, Cigna, UnitedHealth, BlueCross, Humana, Kaiser, Anthem,
 *           and generic hospital bills / patient statements.
 *
 * Returns { docType, billed, billedConfidence, insurance, insuranceConfidence,
 *           owe, oweConfidence, sane }
 * Confidence levels: 'high' | 'medium' | 'low' | null
 */

// ── STEP 1: Document type detection ──────────────────────────────────────────

export function detectDocumentType(text) {
  const t = text.toLowerCase()
  const eobSignals = [
    'explanation of benefits',
    'this is not a bill',
    "plan's share",
    'member rate',
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
 * Searches `text` for each label in order, returns the first match as
 * { value, confidence, matchedLabel } or null.
 *
 * Pass 1 (high): label + dollar amount on same line (within 150 chars after label)
 * Pass 2 (medium): label on line N, dollar amount within the next 3 lines
 */
function extractByLabels(text, labels, minAmount = 0) {
  const lines = text.split('\n')

  for (const label of labels) {
    // Escape special regex chars in the label string
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

    // Pass 2 — next-line (medium confidence)
    // Require the label to START the line so we don't confuse sentence prose
    // (e.g. "Please pay the amount due.") with a real label/value pair.
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
  // EOB-specific — lower priority to avoid false positives from $0 rows
  'coinsurance',
]

export function extractYouOwe(text, docType) {
  // For non-EOB docs, skip 'coinsurance' — it's rarely the final balance on a hospital bill
  const labels = docType === 'eob'
    ? YOU_OWE_LABELS
    : YOU_OWE_LABELS.filter(l => l !== 'coinsurance')
  // minAmount=1 prevents noise like $0.04 from individual EOB service rows
  // from being mistaken for the patient balance
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
  'charges',   // broad — intentionally last
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
  // minAmount=1 prevents noise values like $0.04 from individual service rows
  return extractByLabels(text, INSURANCE_LABELS, 1)
}

// ── STEP 5: Smart fallback — totals row ───────────────────────────────────────

function totalsRowFallback(text, docType) {
  const lines = text.split('\n')

  for (const line of lines) {
    // Use a fresh regex object per line to avoid lastIndex state bugs
    // with reused global RegExp objects in some JS engines.
    const nums = [...line.matchAll(/\$?([\d,]+\.\d{2})/g)]
      .map(m => parseFloat(m[1].replace(/,/g, '')))

    if (nums.length >= 7) {
      // Wide multi-column EOB row (Aetna column order):
      // billed | memberRate | notPayable | deductible | copay | remaining | planShare | coinsurance | yourShare
      //   [0]       [1]           [2]         [3]       [4]      [5]         [-3]          [-2]         [-1]
      //
      // Guard: nums[0] > 100 ensures this is an aggregate totals row, NOT a
      // small individual service row (e.g. the $0.04 CPT 99199 row where every
      // column is $0.04 and nums[0] = 0.04).
      if (nums[0] <= 100) continue
      return {
        billed:    { value: nums[0],                confidence: 'medium', matchedLabel: 'multi-col[0]' },
        insurance: { value: nums[nums.length - 3],  confidence: 'medium', matchedLabel: 'multi-col[-3]' },
        owe:       { value: nums[nums.length - 1],  confidence: 'medium', matchedLabel: 'multi-col[-1]' },
      }
    }

    if (nums.length >= 4 && /total|balance|due|amount/i.test(line)) {
      // Simpler totals row — rightmost amount is most likely the patient balance
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
  if (billed == null || owe == null) return true   // can't check incomplete data
  if (owe > billed) return false                   // can never owe more than was billed

  if (insurance != null) {
    if (insurance > billed) return false           // insurance can't pay more than billed
    if (docType !== 'eob') {
      // For hospital bills, billed ≈ insurance + owe (±30% tolerance for adjustments)
      const implied = billed - insurance
      const ratio = Math.abs(implied - owe) / billed
      if (ratio > 0.30) return false
    }
    // For EOBs, contractual adjustments mean insurance + owe << billed — skip the sum check
  }

  return true
}

// ── Main export ───────────────────────────────────────────────────────────────

export function extractAmounts(text) {
  const docType = detectDocumentType(text)

  let billedResult    = null
  let insuranceResult = null
  let oweResult       = null

  // For EOBs: run multi-column row detection FIRST.
  // EOB tables (Aetna, UHC, BCBS, etc.) repeat column headers for each service
  // section, so label-based extraction would hit individual service rows (which
  // can have tiny amounts like $0.04) before the aggregate totals row.
  // The multi-column approach finds the FIRST line with 7+ amounts where the
  // first amount > $100 — that's always the real totals row.
  if (docType === 'eob') {
    const fb = totalsRowFallback(text, docType)
    if (fb) {
      billedResult    = fb.billed
      insuranceResult = fb.insurance
      oweResult       = fb.owe
    }
  }

  // Fill any remaining gaps with label-based extraction
  // (primary for hospital bills; fills gaps for EOBs that don't have a wide row)
  if (!billedResult)    billedResult    = extractTotalBilled(text)
  if (!insuranceResult) insuranceResult = extractInsurancePaid(text)
  if (!oweResult)       oweResult       = extractYouOwe(text, docType)

  // Final fallback for hospital bills that have a numeric totals row
  if (!billedResult || !oweResult) {
    const fb = totalsRowFallback(text, docType)
    if (fb) {
      if (!billedResult)    billedResult    = fb.billed
      if (!insuranceResult) insuranceResult = fb.insurance
      if (!oweResult)       oweResult       = fb.owe
    }
  }

  const billed    = billedResult?.value    ?? null
  const insurance = insuranceResult?.value ?? null
  const owe       = oweResult?.value       ?? null

  // Step 7: sanity check — downgrade all confidences if numbers are inconsistent
  const sane = sanityCheck(billed, insurance, owe, docType)
  if (!sane) {
    if (billedResult)    billedResult    = { ...billedResult,    confidence: 'low' }
    if (insuranceResult) insuranceResult = { ...insuranceResult, confidence: 'low' }
    if (oweResult)       oweResult       = { ...oweResult,       confidence: 'low' }
  }

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
