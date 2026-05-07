import { describe, it, expect } from 'vitest'
import { extractAmounts, detectDocumentType, extractColumnSum, extractFromFlatText } from './amountExtractor.js'

// ── TEST 1: Aetna EOB ─────────────────────────────────────────────────────────
describe('TEST 1 — Aetna EOB', () => {
  const text = `
EXPLANATION OF BENEFITS
This is not a bill.

Amount billed: $13,255.04
Plan's share Amount: $5,193.52
Your share: $1,538.55
  `.trim()

  it('detects document type as eob', () => {
    expect(detectDocumentType(text)).toBe('eob')
  })

  it('extracts Billed = 13255.04', () => {
    const r = extractAmounts(text)
    expect(r.billed).toBe(13255.04)
  })

  it('extracts Insurance = 5193.52', () => {
    const r = extractAmounts(text)
    expect(r.insurance).toBe(5193.52)
  })

  it('extracts Owe = 1538.55', () => {
    const r = extractAmounts(text)
    expect(r.owe).toBe(1538.55)
  })
})

// ── TEST 2: Generic hospital bill ─────────────────────────────────────────────
describe('TEST 2 — Generic hospital bill', () => {
  const text = `
PATIENT STATEMENT
Please pay the amount due.

Total Charges: $4,500.00
Insurance Payment: $3,200.00
Balance Due: $1,300.00
  `.trim()

  it('detects document type as bill', () => {
    expect(detectDocumentType(text)).toBe('bill')
  })

  it('extracts Billed = 4500', () => {
    const r = extractAmounts(text)
    expect(r.billed).toBe(4500.00)
  })

  it('extracts Insurance = 3200', () => {
    const r = extractAmounts(text)
    expect(r.insurance).toBe(3200.00)
  })

  it('extracts Owe = 1300', () => {
    const r = extractAmounts(text)
    expect(r.owe).toBe(1300.00)
  })
})

// ── TEST 3: UnitedHealth EOB ──────────────────────────────────────────────────
describe('TEST 3 — UnitedHealth EOB', () => {
  const text = `
EXPLANATION OF BENEFITS — UnitedHealthcare
This is not a bill.

Billed Amount: $8,200.00
Plan Paid: $6,500.00
Your Responsibility: $1,700.00
  `.trim()

  it('detects document type as eob', () => {
    expect(detectDocumentType(text)).toBe('eob')
  })

  it('extracts Billed = 8200', () => {
    const r = extractAmounts(text)
    expect(r.billed).toBe(8200.00)
  })

  it('extracts Insurance = 6500', () => {
    const r = extractAmounts(text)
    expect(r.insurance).toBe(6500.00)
  })

  it('extracts Owe = 1700', () => {
    const r = extractAmounts(text)
    expect(r.owe).toBe(1700.00)
  })
})

// ── TEST 4: Simple hospital statement — no insurance ──────────────────────────
describe('TEST 4 — Simple hospital statement (no insurance)', () => {
  const text = `
HOSPITAL BILLING STATEMENT

Amount Due: $2,450.00
  `.trim()

  it('extracts Owe = 2450', () => {
    const r = extractAmounts(text)
    expect(r.owe).toBe(2450.00)
  })

  it('Billed is null (not in document)', () => {
    const r = extractAmounts(text)
    expect(r.billed).toBeNull()
  })

  it('Insurance is null (not in document)', () => {
    const r = extractAmounts(text)
    expect(r.insurance).toBeNull()
  })
})

// ── TEST 5: Indian itemized bill — column-sum strategy ────────────────────────
describe('TEST 5 — Indian hospital bill (AMOUNT(RS.) column)', () => {
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

  it('extractColumnSum finds grand total from column', () => {
    const r = extractColumnSum(text)
    expect(r?.value).toBe(10165.54)
  })

  it('extractAmounts returns correct Total Billed', () => {
    const r = extractAmounts(text)
    expect(r.billed).toBe(10165.54)
  })
})

// ── TEST 6: Indian bill — label-based "Net Payable" ──────────────────────────
describe('TEST 6 — Indian bill with Net Payable', () => {
  const text = `
HOSPITAL BILLING SUMMARY

Total Amount: RS. 10,165.54
TPA Amount: RS. 6,000.00
Net Payable: RS. 4,165.54
  `.trim()

  it('extracts Total Billed from "Total Amount"', () => {
    const r = extractAmounts(text)
    expect(r.billed).toBe(10165.54)
  })

  it('extracts Insurance from "TPA Amount"', () => {
    const r = extractAmounts(text)
    expect(r.insurance).toBe(6000.00)
  })

  it('extracts You Owe from "Net Payable"', () => {
    const r = extractAmounts(text)
    expect(r.owe).toBe(4165.54)
  })
})

// ── TEST 7: INR symbol ₹ ──────────────────────────────────────────────────────
describe('TEST 7 — INR symbol ₹', () => {
  const text = `
Grand Total: ₹15,500.00
Insurance Coverage: ₹10,000.00
Amount Payable: ₹5,500.00
  `.trim()

  it('extracts billed with ₹ symbol', () => {
    const r = extractAmounts(text)
    expect(r.billed).toBe(15500.00)
  })

  it('extracts owe with ₹ symbol', () => {
    const r = extractAmounts(text)
    expect(r.owe).toBe(5500.00)
  })
})

// ── TEST 8: Aetna EOB — flat text (pdf.js single-line output) ────────────────
describe('TEST 8 — Aetna EOB flat text (no line breaks)', () => {
  // Simulates what pdf.js produces when it joins all text items with spaces.
  // The 9 column values appear as a tight cluster after the column headers.
  const text = 'Track your health care costs Your payment summary Amount billed Member rate Not payable by plan Applied to deductible Your copay Amount remaining Plan\'s share Your coinsurance Your share C+D+E+H=I Service type Emergency 13,255.04 9,522.97 3,703.57 0.00 0.00 0.00 5,193.52 329.97 1,538.55 Your next steps'

  it('extractFromFlatText detects the 9-column cluster', () => {
    const r = extractFromFlatText(text)
    expect(r?.billed?.value).toBe(13255.04)
    expect(r?.insurance?.value).toBe(5193.52)
    expect(r?.owe?.value).toBe(1538.55)
  })

  it('extractAmounts returns correct values from flat text', () => {
    const r = extractAmounts(text)
    expect(r.billed).toBe(13255.04)
    expect(r.insurance).toBe(5193.52)
    expect(r.owe).toBe(1538.55)
  })
})

// ── TEST 9: Lenox Hill — Visit Totals row ─────────────────────────────────────
describe('TEST 9 — Lenox Hill Visit Totals row', () => {
  const text = 'Jersey City Medical Center Patient Statement Visit Totals $4,356.28 -$3,485.02 $0.00 $871.26 Please pay balance due'

  it('extractFromFlatText parses Visit Totals', () => {
    const r = extractFromFlatText(text)
    expect(r?.billed?.value).toBe(4356.28)
    expect(r?.insurance?.value).toBe(3485.02)
    expect(r?.owe?.value).toBe(871.26)
  })

  it('extractAmounts returns correct values for Visit Totals format', () => {
    const r = extractAmounts(text)
    expect(r.billed).toBe(4356.28)
    expect(r.owe).toBe(871.26)
  })
})

// ── EXTRA: Confidence level checks ───────────────────────────────────────────
describe('Confidence levels', () => {
  it('returns high confidence for direct label matches', () => {
    const text = 'Your share: $1,200.00\nAmount billed: $5,000.00\nPlan paid: $3,800.00'
    const r = extractAmounts(text)
    expect(r.oweConfidence).toBe('high')
    expect(r.billedConfidence).toBe('high')
    expect(r.insuranceConfidence).toBe('high')
  })

  it('returns null confidence when value is not found', () => {
    const r = extractAmounts('No monetary amounts here at all.')
    expect(r.oweConfidence).toBeNull()
    expect(r.billed).toBeNull()
  })

  it('sanity check passes when numbers add up', () => {
    const text = 'Total charges: $1,000.00\nInsurance paid: $700.00\nBalance due: $300.00'
    const r = extractAmounts(text)
    expect(r.sane).toBe(true)
  })
})
