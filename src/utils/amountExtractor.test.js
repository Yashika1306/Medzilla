import { describe, it, expect } from 'vitest'
import { extractAmounts, detectDocumentType } from './amountExtractor.js'

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
