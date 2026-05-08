import { describe, it, expect } from 'vitest'
import { extractAmounts, detectDocumentType, findTotalsRow, extractColumnSum } from './amountExtractor.js'

// ── REQUIRED TEST — Aetna EOB flat text ──────────────────────────────────────
// This is the primary regression test. Must pass before any deploy.
// Real Aetna 8-column totals row (from console debug output):
//   Amount billed | Member rate | Not payable | Deductible | Copay | Remaining | Plan's share | Your share
describe('REQUIRED — Aetna EOB flat text (no line breaks)', () => {
  const text = 'Track your health care costs This is not a bill. Amount billed Member rate Not payable by plan Applied to deductible Your copay Amount remaining Plan\'s share Your share C+D+E+H=I Service type Emergency 13,255.04 14,614.00 11,512.04 0.00 0.00 10,257.00 8,718.45 1,538.55 Your next steps'

  it('findTotalsRow finds the 8-value cluster', () => {
    const cluster = findTotalsRow(text)
    expect(cluster.length).toBeGreaterThanOrEqual(5)
    expect(cluster[0].value).toBe(13255.04)
    expect(cluster[cluster.length - 1].value).toBe(1538.55)
  })

  it('totalBilled = 13255.04', () => {
    expect(extractAmounts(text).billed).toBe(13255.04)
  })

  it('youOwe = 1538.55 (non-negotiable)', () => {
    expect(extractAmounts(text).owe).toBe(1538.55)
  })

  it('rejects individual service line items under $1000 as billed', () => {
    const withLineItems = '99285 emergency 328.00 290.00 93.00 0.00 0.00 175.00 146.00 38.00 ' + text
    const r = extractAmounts(withLineItems)
    expect(r.billed).toBe(13255.04)
    expect(r.owe).toBe(1538.55)
  })
})

// ── TEST 1: Aetna EOB with line breaks ───────────────────────────────────────
describe('Aetna EOB with line breaks', () => {
  const text = `
EXPLANATION OF BENEFITS
This is not a bill.

Amount billed: $13,255.04
Plan's share Amount: $5,193.52
Your share: $1,538.55
  `.trim()

  it('detects eob', () => expect(detectDocumentType(text)).toBe('eob'))
  it('billed = 13255.04', () => expect(extractAmounts(text).billed).toBe(13255.04))
  it('owe = 1538.55', () => expect(extractAmounts(text).owe).toBe(1538.55))
  it('insurance > 0 and < billed', () => {
    const r = extractAmounts(text)
    expect(r.insurance).toBeGreaterThan(0)
    expect(r.insurance).toBeLessThan(r.billed)
  })
})

// ── TEST 2: Generic hospital bill ─────────────────────────────────────────────
describe('Generic hospital bill', () => {
  const text = `
PATIENT STATEMENT
Please pay the amount due.

Total Charges: $4,500.00
Insurance Payment: $3,200.00
Balance Due: $1,300.00
  `.trim()

  it('detects bill', () => expect(detectDocumentType(text)).toBe('bill'))
  it('billed = 4500', () => expect(extractAmounts(text).billed).toBe(4500.00))
  it('owe = 1300', () => expect(extractAmounts(text).owe).toBe(1300.00))
  it('insurance = 3200 (computed as billed - owe)', () => expect(extractAmounts(text).insurance).toBe(3200.00))
})

// ── TEST 3: UnitedHealth EOB ──────────────────────────────────────────────────
describe('UnitedHealth EOB', () => {
  const text = `
EXPLANATION OF BENEFITS — UnitedHealthcare
This is not a bill.

Billed Amount: $8,200.00
Plan Paid: $6,500.00
Your Responsibility: $1,700.00
  `.trim()

  it('billed = 8200', () => expect(extractAmounts(text).billed).toBe(8200.00))
  // 6500 + 1700 = 8200 exactly → cluster match finds 6500 as insurance
  it('insurance = 6500 (found in cluster: 6500 + 1700 = 8200)', () => {
    expect(extractAmounts(text).insurance).toBe(6500.00)
  })
  it('owe = 1700', () => expect(extractAmounts(text).owe).toBe(1700.00))
})

// ── TEST 4: Simple hospital statement — one amount ────────────────────────────
describe('Simple hospital statement (single amount)', () => {
  const text = `
HOSPITAL BILLING STATEMENT

Amount Due: $2,450.00
  `.trim()

  it('owe = 2450 (from label)', () => {
    expect(extractAmounts(text).owe).toBe(2450.00)
  })
  it('billed is null (no larger amount exists)', () => {
    expect(extractAmounts(text).billed).toBeNull()
  })
})

// ── TEST 5: Lenox Hill — Visit Totals row ─────────────────────────────────────
describe('Lenox Hill hospital bill', () => {
  const text = 'Jersey City Medical Center Patient Statement Visit Totals $4,356.28 -$3,485.02 $0.00 $871.26 Please pay balance due'

  it('billed = 4356.28', () => expect(extractAmounts(text).billed).toBe(4356.28))
  it('owe = 871.26 (from balance due label)', () => expect(extractAmounts(text).owe).toBe(871.26))
})

// ── TEST 6: Indian bill — AMOUNT(RS.) column ──────────────────────────────────
describe('Indian hospital bill (AMOUNT(RS.) column)', () => {
  const text = `
Apollo Hospital
DISCHARGE BILL

Service Name AMOUNT(RS.)
ROOM RENT 4,000.00
PHARMACY 2,765.54
MEDICAL EQUIPMENT 1,000.00
CONSULTATIONS 2,400.00
Grand Total RS. 10,165.54
  `.trim()

  it('extractColumnSum finds grand total', () => {
    expect(extractColumnSum(text)?.value).toBe(10165.54)
  })
  it('billed = 10165.54', () => expect(extractAmounts(text).billed).toBe(10165.54))
})

// ── TEST 7: Indian bill — Net Payable label ───────────────────────────────────
describe('Indian bill with Net Payable', () => {
  const text = `
HOSPITAL BILLING SUMMARY

Total Amount: RS. 10,165.54
TPA Amount: RS. 6,000.00
Net Payable: RS. 4,165.54
  `.trim()

  it('billed = 10165.54', () => expect(extractAmounts(text).billed).toBe(10165.54))
  it('owe = 4165.54 (from Net Payable)', () => expect(extractAmounts(text).owe).toBe(4165.54))
  it('insurance = 6000 (computed)', () => expect(extractAmounts(text).insurance).toBe(6000.00))
})

// ── TEST 8: Validation ────────────────────────────────────────────────────────
describe('Validation', () => {
  it('sane = true when numbers add up', () => {
    const r = extractAmounts('Patient Statement\nTotal Charges: $1,000.00\nBalance Due: $300.00')
    expect(r.sane).toBe(true)
  })

  it('returns null confidence when value not found', () => {
    const r = extractAmounts('No monetary amounts here at all.')
    expect(r.billedConfidence).toBeNull()
    expect(r.oweConfidence).toBeNull()
  })

  it('billed null when only one small amount exists', () => {
    const r = extractAmounts('Amount Due: $50.00')
    // $50 < $100 threshold → billed rejected; owe may be found
    expect(r.billed).toBeNull()
  })
})
