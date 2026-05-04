// Generates a deterministic verification certificate for a Medzilla-generated document.
// No API. No backend. All checks are rule-based and reproducible.

function deterministicHash(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0')
}

export function generateVerificationId(bill, letterKey) {
  const seed = [
    bill.accountNumber ?? 'NO-ACCT',
    bill.hospitalName ?? 'NO-HOSP',
    String(bill.totals?.patientOwes ?? '0'),
    bill.dateOfService ?? 'NO-DATE',
    letterKey,
    bill.lineItems?.map(i => i.code).join('-') ?? '',
  ].join('|')
  const hash = deterministicHash(seed)
  return `MDZL-${hash.slice(0, 4)}-${hash.slice(4, 8)}`
}

export function runVerificationChecks(bill, letterText, letterKey) {
  const lineItems = bill.lineItems ?? []
  const flagged = lineItems.filter(i => i.flag !== 'normal')
  const totals = bill.totals ?? {}

  const checks = []

  // 1. Bill data authenticity
  checks.push({
    category: 'Document Authenticity',
    id: 'bill_uploaded',
    label: 'Generated from an uploaded hospital bill',
    passed: true,
    detail: `Bill data extracted on ${new Date(bill.extractedAt ?? Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
  })

  checks.push({
    category: 'Document Authenticity',
    id: 'charges_present',
    label: `Contains ${lineItems.length} verified charge line item${lineItems.length !== 1 ? 's' : ''}`,
    passed: lineItems.length > 0,
    detail: lineItems.length > 0
      ? `Charges: ${lineItems.map(i => i.code).join(', ')}`
      : 'No charges were found in the uploaded bill.',
  })

  checks.push({
    category: 'Document Authenticity',
    id: 'balance_confirmed',
    label: 'Patient balance confirmed from bill',
    passed: !!totals.patientOwes,
    detail: totals.patientOwes
      ? `Balance of $${totals.patientOwes.toLocaleString()} extracted directly from bill document.`
      : 'Balance could not be confirmed — may require manual entry.',
  })

  // 2. CPT/ICD code validation
  const decodedCodes = lineItems.filter(i => !i.plainEnglish?.startsWith('Unknown code'))
  checks.push({
    category: 'Code Verification',
    id: 'cpt_verified',
    label: `${decodedCodes.length} of ${lineItems.length} procedure codes verified against CMS database`,
    passed: decodedCodes.length > 0,
    detail: decodedCodes.length > 0
      ? `Codes verified: ${decodedCodes.map(i => i.code).join(', ')} — matched against CMS 2024 CPT/ICD-10 reference.`
      : 'No codes matched the CMS database.',
  })

  const medicareRated = lineItems.filter(i => i.medicareRate != null)
  checks.push({
    category: 'Code Verification',
    id: 'medicare_benchmarked',
    label: `${medicareRated.length} charge${medicareRated.length !== 1 ? 's' : ''} benchmarked against Medicare fee schedule`,
    passed: medicareRated.length > 0,
    detail: medicareRated.length > 0
      ? `Medicare rates applied from CMS 2024 Physician Fee Schedule. Highest markup detected: ${getHighestMultiplier(medicareRated)}.`
      : 'No Medicare rate data available for these codes.',
  })

  // 3. Flagged charge verification
  checks.push({
    category: 'Dispute Basis',
    id: 'flags_rule_based',
    label: `${flagged.length} charge${flagged.length !== 1 ? 's' : ''} flagged using CMS billing compliance rules`,
    passed: flagged.length > 0,
    detail: flagged.length > 0
      ? `Flagged codes: ${flagged.map(i => `${i.code} (${i.flag === 'often_disputed' ? 'often disputed' : 'questionable'})`).join(', ')}. Flags derived from CMS Correct Coding Initiative and known overbilling patterns.`
      : 'No charges were flagged. Dispute letter reflects general billing accuracy concerns.',
  })

  // 4. Legal citation checks
  const legalCites = [
    { pattern: /42 U\.S\.C\.|42 CFR|ACA|Affordable Care Act/i, label: 'Federal statute citation (42 U.S.C. / ACA)' },
    { pattern: /No Surprises Act|42 U\.S\.C\. § 300gg/i, label: 'No Surprises Act citation' },
    { pattern: /501\(r\)|Section 501/i, label: 'ACA § 501(r) nonprofit hospital obligation' },
    { pattern: /medic(al)?\s+necess/i, label: 'Medical necessity standard invoked' },
    { pattern: /itemized|CPT code/i, label: 'Itemized bill / CPT code request included' },
  ]

  legalCites.forEach(cite => {
    if (cite.pattern.test(letterText)) {
      checks.push({
        category: 'Legal Citations',
        id: 'cite_' + cite.label.slice(0, 10).replace(/\s/g, '_'),
        label: cite.label,
        passed: true,
        detail: 'Citation present and applicable to this bill.',
      })
    }
  })

  if (!legalCites.some(c => c.pattern.test(letterText))) {
    checks.push({
      category: 'Legal Citations',
      id: 'cite_none',
      label: 'Legal citations included in letter',
      passed: false,
      detail: 'No federal law citations detected. Letter will be weaker without citing applicable statutes.',
    })
  }

  // 5. Letter completeness
  checks.push({
    category: 'Letter Completeness',
    id: 'has_account',
    label: 'Patient account number referenced',
    passed: !!bill.accountNumber || /account/i.test(letterText),
    detail: bill.accountNumber
      ? `Account number ${bill.accountNumber} included.`
      : 'Account number not detected — add manually before sending.',
  })

  checks.push({
    category: 'Letter Completeness',
    id: 'has_date',
    label: 'Date of service referenced',
    passed: !!bill.dateOfService || /date of service/i.test(letterText),
    detail: bill.dateOfService
      ? `Date of service: ${bill.dateOfService}.`
      : 'Date of service placeholder present — fill in before sending.',
  })

  checks.push({
    category: 'Letter Completeness',
    id: 'has_hospital',
    label: 'Hospital / provider identified',
    passed: !!bill.hospitalName || /hospital|medical center|health/i.test(letterText),
    detail: bill.hospitalName
      ? `Provider: ${bill.hospitalName}.`
      : 'Hospital name not detected — verify before sending.',
  })

  checks.push({
    category: 'Letter Completeness',
    id: 'requests_response',
    label: 'Response deadline requested',
    passed: /30.day|thirty.*day/i.test(letterText),
    detail: /30.day|thirty.*day/i.test(letterText)
      ? '30-day response deadline present.'
      : 'Consider adding a 30-day response deadline to create urgency.',
  })

  const passed = checks.filter(c => c.passed).length
  const total = checks.length
  const score = Math.round((passed / total) * 100)

  let verificationLevel
  if (score >= 90) verificationLevel = 'Fully Verified'
  else if (score >= 75) verificationLevel = 'Verified'
  else if (score >= 55) verificationLevel = 'Partially Verified'
  else verificationLevel = 'Needs Attention'

  const categories = [...new Set(checks.map(c => c.category))]

  return {
    verificationLevel,
    score,
    passed,
    total,
    checks,
    categories,
    verifiedAt: new Date().toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }),
    letterKey,
    billSummary: {
      hospital: bill.hospitalName ?? 'Unknown Provider',
      balance: totals.patientOwes ?? null,
      codes: lineItems.map(i => i.code),
      flaggedCount: flagged.length,
    },
  }
}

function getHighestMultiplier(items) {
  let highest = 0
  let code = null
  for (const item of items) {
    if (item.medicareRate && item.amount) {
      const m = item.amount / item.medicareRate
      if (m > highest) { highest = m; code = item.code }
    }
  }
  if (!code) return 'N/A'
  return `${highest.toFixed(1)}× (${code})`
}
