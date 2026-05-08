/**
 * Medical bill amount extractor — v4
 *
 * EOB documents  → findTotalsRow(): longest number cluster in the text
 *                  Works on flat pdf.js output and normal line-break text.
 * Hospital bills → largest amount = billed; label scan = owe; insurance = billed − owe
 * Indian bills   → extractColumnSum() for AMOUNT(RS.) column-header tables
 *
 * Returns { docType, billed, billedConfidence, insurance, insuranceConfidence,
 *           owe, oweConfidence, sane }
 */

// ── Text normalization ────────────────────────────────────────────────────────
// Handles pdf.js artifacts: "A m o u n t" → "Amount", merged words, extra spaces.

export function normalizeText(raw) {
  let text = raw.replace(/\b([A-Za-z])\s(?=[A-Za-z]\b)/g, '$1')
  text = text.replace(/ {2,}/g, ' ')
  text = text.replace(/\n{3,}/g, '\n\n')
  return text
}

// ── Document type detection ───────────────────────────────────────────────────

export function detectDocumentType(text) {
  const t = text.toLowerCase()
  const eobSignals = [
    'explanation of benefits',
    'this is not a bill',
    "plan's share",
    'plansshare',
    'member rate',
    'memberrate',
    'your coinsurance',
    '\neob\n',
    ' eob ',
    'eob\r',
  ]
  const billSignals = ['please pay', 'remit payment', 'patient statement', 'please remit']
  if (eobSignals.some(s => t.includes(s))) return 'eob'
  if (t.includes('remittance advice') || t.includes('remittance notice')) return 'remittance'
  if (billSignals.some(s => t.includes(s))) return 'bill'
  return 'bill'
}

// ── EOB: find the longest cluster of numbers in the document ─────────────────
// The totals row — whether the PDF renders with line breaks or as flat text —
// is always the densest cluster of numbers. Individual service lines are fewer
// numbers and/or farther apart.

// minFirst filters which amounts can START a cluster.
// For EOBs pass minFirst=1000 — service line items (< $1000) won't anchor the cluster,
// so the totals row (which starts with the total billed > $1000) wins even when
// service lines appear earlier in the flat text.
export function findTotalsRow(text, minFirst = 0) {
  const numberPattern = /[\d,]+\.\d{2}/g
  const allMatches = []
  let match

  while ((match = numberPattern.exec(text)) !== null) {
    allMatches.push({
      value: parseFloat(match[0].replace(/,/g, '')),
      index: match.index,
    })
  }

  let bestCluster = []
  for (let i = 0; i < allMatches.length; i++) {
    if (allMatches[i].value < minFirst) continue  // skip low-value starting points
    const cluster = [allMatches[i]]
    for (let j = i + 1; j < allMatches.length; j++) {
      if (allMatches[j].index - allMatches[i].index < 400) {
        cluster.push(allMatches[j])
      } else {
        break
      }
    }
    if (cluster.length > bestCluster.length) {
      bestCluster = cluster
    }
  }
  return bestCluster
}

// ── EOB extraction ────────────────────────────────────────────────────────────

function extractEOBAmounts(text) {
  // minFirst=1000: only start clusters from amounts ≥ $1000 — this prevents
  // individual service line amounts from anchoring the cluster search.
  const cluster = findTotalsRow(text, 1000)
  if (cluster.length < 3) return null

  const billed = cluster[0].value
  if (billed < 1000) return null  // belt-and-suspenders guard

  const owe = cluster[cluster.length - 1].value
  if (owe < 0 || owe >= billed) return null

  // Insurance: find a value n in the cluster where n + owe ≈ billed (within 15%)
  let insurance = null
  for (const entry of cluster.slice(1, -1)) {
    if (entry.value > 0 && Math.abs(entry.value + owe - billed) / billed < 0.15) {
      insurance = entry.value
      break
    }
  }
  // Fall back to computed value
  if (insurance === null) {
    insurance = parseFloat((billed - owe).toFixed(2))
  }

  return { billed, insurance, owe }
}

// ── Hospital bill extraction ──────────────────────────────────────────────────
// Also handles Indian/international bills (RS., INR, ₹).

const OWE_LABELS = [
  'balance due', 'amount due', 'total due', 'you owe', 'please pay',
  'net payable', 'amount payable', 'patient responsibility', 'patient payable',
  'payable amount', 'total payable', 'net amount payable', 'your share',
  'your responsibility', 'member responsibility',
]

function extractBillAmounts(text) {
  const numberPattern = /(?:RS\.?|INR|₹|\$)?\s*([\d]{1,3}(?:,[\d]{3})*\.[\d]{2})/gi
  const allMatches = []
  let match

  while ((match = numberPattern.exec(text)) !== null) {
    const val = parseFloat(match[1].replace(/,/g, ''))
    if (!isNaN(val) && val > 0) allMatches.push({ value: val, index: match.index })
  }
  if (allMatches.length === 0) return null

  const t = text.toLowerCase()

  // You Owe — first amount within 300 chars after the last occurrence of each label
  let owe = null
  for (const label of OWE_LABELS) {
    const idx = t.lastIndexOf(label)
    if (idx === -1) continue
    const candidate = allMatches.find(a => a.index > idx && a.index < idx + 300 && a.value > 0)
    if (candidate) { owe = candidate.value; break }
  }

  // Total Billed — largest amount that is strictly greater than owe
  // (if owe found); otherwise largest amount overall
  const billedCandidates = allMatches.filter(a => owe !== null ? a.value > owe : a.value > 0)
  const billed = billedCandidates.length > 0
    ? billedCandidates.reduce((mx, a) => a.value > mx ? a.value : mx, 0)
    : null

  // Fallback owe: if no label matched, use the last amount in the document < billed
  if (owe === null && billed !== null) {
    const fallback = [...allMatches]
      .reverse()
      .find(a => a.value < billed && a.value > 0)
    if (fallback) owe = fallback.value
  }

  if (billed === null && owe === null) return null
  if (billed !== null && billed < 100) return null

  const insurance = (billed !== null && owe !== null && billed > owe)
    ? parseFloat((billed - owe).toFixed(2))
    : null

  return { billed, insurance, owe }
}

// ── Indian / international: AMOUNT(RS.) column-header table ─────────────────
// Detects a column header like "AMOUNT(RS.)" then sums all line-item amounts,
// using the explicit Grand Total row if present.

export function extractColumnSum(text) {
  const lines = text.split('\n')
  const headerRe = /amount\s*[\(\[]?\s*(?:RS\.?|INR|₹|\$)\s*[\)\]]?/i
  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (headerRe.test(lines[i])) { headerIdx = i; break }
  }
  if (headerIdx === -1) return null

  const stopRe = /grand\s*total|net\s*(?:amount|payable)|total\s*(?:amount|bill)|amount\s*payable/i
  let sum = 0, count = 0, grandTotal = null

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (stopRe.test(line)) {
      const m = line.match(/(?:RS\.?|INR|₹|\$)?\s*([\d,]+\.\d{2})/i)
      if (m) grandTotal = parseFloat(m[1].replace(/,/g, ''))
      break
    }
    const nums = [...line.matchAll(/(?:RS\.?|INR|₹|\$)?\s*([\d,]+\.\d{2})/gi)]
    if (nums.length > 0) {
      const val = parseFloat(nums[nums.length - 1][1].replace(/,/g, ''))
      if (!isNaN(val) && val > 0) { sum += val; count++ }
    }
  }

  if (count === 0) return null
  const value = grandTotal ?? (count >= 2 ? sum : null)
  if (value === null) return null
  return { value, confidence: count >= 2 ? 'high' : 'medium', matchedLabel: 'column-sum' }
}

// ── Main export ───────────────────────────────────────────────────────────────

export function extractAmounts(rawText) {
  const normalized = normalizeText(rawText)
  const docType = detectDocumentType(rawText) || detectDocumentType(normalized)

  console.group('[Medzilla] Amount extraction debug')
  console.log('Document type:', docType)
  console.log('Raw text (first 800 chars):\n' + rawText.slice(0, 800))

  let result = null

  if (docType === 'eob') {
    result = extractEOBAmounts(rawText) ?? extractEOBAmounts(normalized)
    console.log('EOB cluster result:', result)
  } else {
    // Try Indian column-sum first for structured itemized tables
    const cs = extractColumnSum(rawText) ?? extractColumnSum(normalized)
    if (cs) {
      const billResult = extractBillAmounts(rawText) ?? extractBillAmounts(normalized)
      if (billResult) {
        result = { ...billResult, billed: cs.value, insurance: parseFloat((cs.value - (billResult.owe ?? 0)).toFixed(2)) }
      } else {
        result = { billed: cs.value, insurance: null, owe: null }
      }
      console.log('Column-sum result:', result)
    } else {
      result = extractBillAmounts(rawText) ?? extractBillAmounts(normalized)
      console.log('Bill result:', result)
    }
  }

  const billed    = result?.billed    ?? null
  const insurance = result?.insurance ?? null
  const owe       = result?.owe       ?? null

  // Validation (RULE 4)
  let sane = true
  if (billed !== null && billed < 100) sane = false
  if (owe !== null && owe < 0) sane = false
  if (billed !== null && owe !== null && owe >= billed) sane = false
  if (insurance !== null && billed !== null && insurance > billed) sane = false

  const conf = (v) => v !== null ? (sane ? 'high' : 'low') : null

  console.log('FINAL:', { billed, insurance, owe, sane })
  console.groupEnd()

  return {
    docType,
    billed,
    billedConfidence:    conf(billed),
    billedLabel:         billed    != null ? (docType === 'eob' ? 'eob:cluster-first' : 'bill:largest') : null,
    insurance,
    insuranceConfidence: conf(insurance),
    insuranceLabel:      insurance != null ? 'derived' : null,
    owe,
    oweConfidence:       conf(owe),
    oweLabel:            owe       != null ? (docType === 'eob' ? 'eob:cluster-last' : 'bill:label') : null,
    sane,
  }
}
