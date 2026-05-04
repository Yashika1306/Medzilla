// Rule-based legal strength analyzer.
// All rules derived from CMS guidelines, AMA CPT manual, ACA Section 501(r),
// No Surprises Act (42 U.S.C. § 300gg-111), and CFPB medical debt regulations.

const CHARGE_RULES = {
  '99285': {
    baseStrength: 'strong',
    legalBasis: 'CMS E&M Documentation Requirements for Level 5 Emergency Visit',
    laws: [
      { cite: '42 CFR § 415.102', desc: 'Requires physician documentation supporting the complexity level billed' },
      { cite: 'AMA CPT 2024 Guidelines — 99285', desc: 'Level 5 requires high medical decision-making AND detailed history/exam. Requires threat to life, multiple chronic conditions, or complex data review.' },
      { cite: 'CMS MLN Matters SE1306', desc: 'Hospitals must retain documentation supporting the E&M level claimed' },
    ],
    argument: 'Level 5 E&M (99285) is the highest-tier emergency visit code and requires documented high-complexity medical decision-making — typically involving a threat to life or bodily function, multiple chronic conditions, or extensive data review. For isolated physical injuries (lacerations, fractures, minor head injury without altered consciousness), Level 5 is frequently unsupported by the medical record. Studies show it is the most commonly upcoded ER code in the US.',
    whatToRequest: 'Request the physician\'s contemporaneous documentation showing (1) the medical decision-making complexity, (2) the number of diagnoses or management options considered, and (3) the data reviewed. If the visit was for a single, non-life-threatening injury, Level 5 cannot be sustained.',
    multiplierThreshold: 3,
    upgradeStrengthAt: 4,
  },
  'G0384': {
    baseStrength: 'moderate',
    legalBasis: 'Hospital Facility Fee Level Assignment — CMS APC Guidelines',
    laws: [
      { cite: 'CMS Outpatient Prospective Payment System (OPPS)', desc: 'Facility fee levels must reflect the actual resources consumed, not the physician E&M level.' },
      { cite: '42 CFR § 419.2', desc: 'Hospital outpatient services must be billed in accordance with APC groupings and resource utilization.' },
    ],
    argument: 'Facility fee Level 5 (G0384) reflects the hospital\'s highest resource utilization tier. When billed simultaneously with physician Level 5 (99285), both must independently meet their respective highest-tier criteria. Hospitals sometimes assign the facility level to match the physician level without independent clinical justification for the facility resources used.',
    whatToRequest: 'Request the hospital\'s clinical criteria for assigning Level 5 facility fees and documentation showing the resources (nursing time, supplies, monitoring) consumed during your visit that justify the highest tier.',
    multiplierThreshold: 2,
    upgradeStrengthAt: 3,
  },
  '80053': {
    baseStrength: 'strong',
    legalBasis: 'Medicare Medical Necessity Standard — Metabolic Panel for Trauma Patients',
    laws: [
      { cite: '42 U.S.C. § 1395y(a)(1)(A)', desc: 'Services must be "reasonable and necessary for the diagnosis or treatment of illness or injury." Commercial insurers and hospitals routinely apply this standard.' },
      { cite: 'CMS LCD L35062', desc: 'Comprehensive metabolic panels require documented clinical indication. Ordering for routine trauma workup without metabolic comorbidities is a known overbilling pattern.' },
    ],
    argument: 'A comprehensive metabolic panel (14 tests including kidney function, liver enzymes, and glucose) has no established clinical necessity for isolated physical injuries (fractures, lacerations, contusions) in patients with no metabolic history. The American College of Emergency Physicians\' clinical guidelines do not recommend routine metabolic panels for trauma without specific indications such as suspected organ injury or known diabetes.',
    whatToRequest: 'Request the specific clinical indication documented by the treating physician that made this metabolic panel medically necessary for your injury. Ask which metabolic abnormality was being screened for.',
    multiplierThreshold: 5,
    upgradeStrengthAt: 8,
  },
  '80061': {
    baseStrength: 'strong',
    legalBasis: 'Medical Necessity — Lipid Panel for Non-Cardiac Presentation',
    laws: [
      { cite: '42 U.S.C. § 1395y(a)(1)(A)', desc: 'Medical necessity standard.' },
      { cite: 'USPSTF Lipid Screening Guidelines', desc: 'Lipid screening is a preventive service, not indicated for acute injury workup.' },
    ],
    argument: 'A lipid panel (cholesterol, triglycerides, HDL) is a preventive cardiovascular screening test with no clinical relevance to acute physical injury. Ordering it in an emergency setting for a trauma patient without cardiac symptoms or cardiovascular risk factors constitutes overbilling. This is one of the most commonly added unnecessary tests in ER billing.',
    whatToRequest: 'Request documentation showing why a lipid panel was clinically indicated for your specific emergency visit. A lipid panel result would not have changed treatment for a physical injury.',
    multiplierThreshold: 5,
    upgradeStrengthAt: 8,
  },
  '85025': {
    baseStrength: 'moderate',
    legalBasis: 'Redundant Panel — CBC in Context of Metabolic and Lipid Panels',
    laws: [
      { cite: '42 U.S.C. § 1395y(a)(1)(A)', desc: 'Medical necessity standard.' },
      { cite: 'CMS Correct Coding Initiative (CCI)', desc: 'Multiple blood panels ordered simultaneously are subject to bundling and medical necessity review.' },
    ],
    argument: 'While a CBC may be individually justified for trauma (to assess blood loss), ordering it alongside a comprehensive metabolic panel AND a lipid panel constitutes a 3-panel blood workup that is very difficult to justify for a single uncomplicated injury. The CMS Correct Coding Initiative specifically targets simultaneous multi-panel ordering as a billing integrity issue.',
    whatToRequest: 'If disputing the CBC alone is difficult, use it as part of the broader 3-panel argument — the pattern of ordering all three together for a single injury lacks clinical justification.',
    multiplierThreshold: 8,
    upgradeStrengthAt: 12,
  },
  '80048': {
    baseStrength: 'moderate',
    legalBasis: 'Redundant Panel — Basic Metabolic Panel When Comprehensive Also Billed',
    laws: [
      { cite: 'CMS Correct Coding Initiative (CCI) — Column 1/Column 2 Edits', desc: '80048 (basic) is a component of 80053 (comprehensive). Billing both is a CCI violation.' },
    ],
    argument: 'The basic metabolic panel (80048) is a subset of the comprehensive metabolic panel (80053) — it contains all the same tests plus fewer. CMS Correct Coding Initiative edits explicitly prohibit billing both 80048 and 80053 for the same patient on the same date. This is a hard billing error, not a judgment call.',
    whatToRequest: 'This is a clear CCI violation. Request removal of 80048 immediately if 80053 is also on the bill. No clinical justification argument is needed — this is a billing code error.',
    multiplierThreshold: 1,
    upgradeStrengthAt: 1,
  },
  '96365': {
    baseStrength: 'moderate',
    legalBasis: 'IV Infusion Documentation Requirements',
    laws: [
      { cite: '42 CFR § 415.102', desc: 'Infusion billing requires contemporaneous nursing documentation of start/stop times and drug administered.' },
      { cite: 'CMS Transmittal 1930', desc: 'IV infusion codes require documented infusion start and stop times. Billing for infusion time without documentation is a billing error.' },
    ],
    argument: 'IV infusion codes (96365) require nursing documentation of: (1) drug administered, (2) infusion start time, (3) infusion stop time, and (4) route of administration. Many hospitals bill for a full hour of infusion when only a brief IV push or saline lock was used. The distinction matters: a 15-minute saline flush is not an "infusion."',
    whatToRequest: 'Request the nursing administration record (MAR) showing the exact drug, start time, and stop time. If the documented infusion time is less than 31 minutes, the charge for a full infusion hour cannot stand.',
    multiplierThreshold: 3,
    upgradeStrengthAt: 5,
  },
  '96361': {
    baseStrength: 'moderate',
    legalBasis: 'Additional Infusion Hour — Documentation of Extended Infusion',
    laws: [
      { cite: 'CMS Transmittal 1930', desc: 'Each additional infusion hour requires documented continuous infusion for the claimed time period.' },
    ],
    argument: 'Each additional infusion hour (96361) requires documented evidence of continuous infusion for the additional period. This code is frequently added to bills without corresponding nursing documentation showing the infusion actually ran for the additional time.',
    whatToRequest: 'Request the complete medication administration record (MAR) showing infusion start, stop, and any interruptions. Challenge this charge if total documented infusion time is under 61 minutes.',
    multiplierThreshold: 3,
    upgradeStrengthAt: 5,
  },
  '99284': {
    baseStrength: 'moderate',
    legalBasis: 'Level 4 E&M — Documentation of High-Complexity Presentation',
    laws: [
      { cite: '42 CFR § 415.102', desc: 'Documentation must support the E&M level billed.' },
      { cite: 'AMA CPT 2024 Guidelines — 99284', desc: 'Level 4 requires moderately high medical decision-making or a new problem with additional workup.' },
    ],
    argument: 'Level 4 emergency visits require documentation supporting moderately high complexity. For presentations that were stabilized quickly or involved a single, clearly defined problem, Level 3 (99283) may be more appropriate. The distinction is fact-specific but worth requesting documentation for.',
    whatToRequest: 'Request the physician\'s medical decision-making documentation. If the visit involved a single problem with straightforward treatment, ask why Level 4 rather than Level 3 was coded.',
    multiplierThreshold: 2,
    upgradeStrengthAt: 4,
  },
  'A4550': {
    baseStrength: 'moderate',
    legalBasis: 'Itemized Supply Charges — Specificity Requirement',
    laws: [
      { cite: 'CMS Hospital Conditions of Participation — 42 CFR § 482.13(b)', desc: 'Patients have the right to an itemized bill and an explanation of charges.' },
    ],
    argument: 'Vague "surgical tray" or "supply" charges without itemization are a common billing practice that makes it impossible for patients to verify what was actually used. You are entitled to a specific list of every item included in this charge.',
    whatToRequest: 'Request a complete itemization of every supply item included in this charge, with unit prices. Compare against what was actually visible and used during your treatment.',
    multiplierThreshold: 1,
    upgradeStrengthAt: 2,
  },
}

const LETTER_CHECKLIST = [
  { id: 'has_code', label: 'Identifies each disputed charge by CPT code', check: text => /\b(9\d{4}|[78]\d{4}|[A-Z]\d{4})\b/.test(text), law: 'Required for hospitals to locate and review the specific charge' },
  { id: 'has_amount', label: 'States the billed dollar amount for each disputed charge', check: text => /\$[\d,]+/.test(text), law: 'Establishes the financial stake and creates a paper record of the amount claimed' },
  { id: 'requests_necessity', label: 'Requests medical necessity documentation', check: text => /medic(al)?\s+necess/i.test(text), law: '42 U.S.C. § 1395y(a)(1)(A) — all billed services must be medically necessary' },
  { id: 'requests_records', label: 'Requests the provider\'s documentation', check: text => /documentation|medical record|physician.s (note|documentation)/i.test(text), law: 'CMS requires hospitals to maintain documentation supporting every billed code' },
  { id: 'requests_response', label: 'Sets a response deadline (30 days)', check: text => /30.day|within.*(thirty|30)/i.test(text), law: 'Creates urgency and a paper trail for escalation if ignored' },
  { id: 'suspends_collection', label: 'Requests suspension of collection activity', check: text => /suspend|pause|hold|stop.*(collection|billing|payment)/i.test(text), law: 'ACA § 501(r)(6) — nonprofit hospitals cannot pursue extraordinary collection actions during active dispute' },
  { id: 'has_account_number', label: 'Includes patient account number', check: text => /account.*(number|#|no)|#\s*\d{4,}/i.test(text), law: 'Required for hospital to locate the correct account' },
  { id: 'has_date', label: 'States the date of service', check: text => /date of service|service date/i.test(text), law: 'Required to identify the specific encounter being disputed' },
  { id: 'cites_rights', label: 'Invokes patient rights or applicable law', check: text => /right|law|act|regulation|cfr|usc|statute/i.test(text), law: 'Letters citing law are taken more seriously and are harder to dismiss' },
  { id: 'medicare_reference', label: 'References Medicare rate comparison', check: text => /medicare|cms rate|allowed amount|fee schedule/i.test(text), law: 'Medicare rates are the strongest objective benchmark for what a service is worth' },
  { id: 'requests_corrected_bill', label: 'Requests a corrected bill', check: text => /corrected bill|adjusted bill|corrected (statement|invoice)/i.test(text), law: 'Makes the desired outcome explicit — a corrected bill, not just an acknowledgment' },
]

const STRENGTH_LEVELS = {
  weak: { label: 'Weak', color: 'red', score: 1, desc: 'Limited legal basis. Dispute is possible but expect resistance.' },
  moderate: { label: 'Moderate', color: 'amber', score: 2, desc: 'Solid grounds. Hospital will likely negotiate. Push firmly.' },
  strong: { label: 'Strong', color: 'green', score: 3, desc: 'Well-supported. High probability of reduction or removal. Send this letter.' },
  very_strong: { label: 'Very Strong', color: 'emerald', score: 4, desc: 'Clear billing error or legal violation. Hospital should immediately correct this.' },
}

export function analyzeLegalStrength(bill, letterText = '') {
  const { lineItems = [], totals, survivalPaths = [] } = bill
  const flaggedItems = lineItems.filter(i => i.flag !== 'normal')

  const chargeAnalyses = flaggedItems.map(item => {
    const rule = CHARGE_RULES[item.code]
    if (!rule) {
      return {
        code: item.code,
        plainEnglish: item.plainEnglish,
        amount: item.amount,
        medicareRate: item.medicareRate,
        flag: item.flag,
        strength: item.flag === 'often_disputed' ? 'moderate' : 'weak',
        legalBasis: 'General medical necessity and accuracy principles',
        laws: [{ cite: '42 U.S.C. § 1395y(a)(1)(A)', desc: 'All billed services must be medically necessary and accurately coded.' }],
        argument: item.flagReason ?? 'This charge warrants review for accuracy and medical necessity.',
        whatToRequest: item.studentTip ?? 'Request documentation supporting this charge.',
        multiplier: item.medicareRate && item.amount ? (item.amount / item.medicareRate) : null,
        hasRule: false,
      }
    }

    const multiplier = item.medicareRate && item.amount ? (item.amount / item.medicareRate) : null
    let strength = rule.baseStrength
    if (multiplier && multiplier >= rule.upgradeStrengthAt) strength = 'very_strong'
    else if (multiplier && multiplier >= rule.upgradeStrengthAt * 0.75) strength = 'strong'

    return {
      code: item.code,
      plainEnglish: item.plainEnglish,
      amount: item.amount,
      medicareRate: item.medicareRate,
      flag: item.flag,
      strength,
      legalBasis: rule.legalBasis,
      laws: rule.laws,
      argument: rule.argument,
      whatToRequest: rule.whatToRequest,
      multiplier,
      hasRule: true,
    }
  })

  const letterChecks = LETTER_CHECKLIST.map(item => ({
    ...item,
    passed: letterText ? item.check(letterText) : false,
    applicable: true,
  }))

  const passedChecks = letterChecks.filter(c => c.passed).length
  const letterScore = letterText ? Math.round((passedChecks / LETTER_CHECKLIST.length) * 100) : 0

  const strengthScores = { weak: 1, moderate: 2, strong: 3, very_strong: 4 }
  const avgStrength = chargeAnalyses.length
    ? chargeAnalyses.reduce((sum, a) => sum + (strengthScores[a.strength] ?? 1), 0) / chargeAnalyses.length
    : 0

  let overallStrength = 'weak'
  if (avgStrength >= 3.5) overallStrength = 'very_strong'
  else if (avgStrength >= 2.5) overallStrength = 'strong'
  else if (avgStrength >= 1.5) overallStrength = 'moderate'

  const missingFromLetter = letterChecks.filter(c => !c.passed && letterText)
  const strengtheningSuggestions = buildStrengtheningParagraphs(chargeAnalyses, letterChecks)

  const hasNoSurprises = survivalPaths.includes('no_surprises_act')
  const hasCharity = survivalPaths.includes('charity_care')

  const additionalRights = []
  if (hasNoSurprises) {
    additionalRights.push({
      title: 'No Surprises Act (42 U.S.C. § 300gg-111)',
      desc: 'You received emergency care with insurance. Out-of-network providers cannot bill you above your in-network cost-sharing. File a complaint at cms.gov/nosurprises if applicable.',
      strength: 'very_strong',
    })
  }
  if (hasCharity) {
    additionalRights.push({
      title: 'ACA § 501(r) — Nonprofit Hospital Financial Assistance',
      desc: 'This hospital is likely a nonprofit required by law to offer charity care. They cannot pursue extraordinary collection actions (lawsuits, wage garnishment, credit reporting) until giving you a reasonable opportunity to apply.',
      strength: 'strong',
    })
  }

  return {
    overallStrength,
    chargeAnalyses,
    letterChecks,
    letterScore,
    missingFromLetter,
    strengtheningSuggestions,
    additionalRights,
    totalFlaggedAmount: flaggedItems.reduce((s, i) => s + (i.amount ?? 0), 0),
  }
}

function buildStrengtheningParagraphs(chargeAnalyses, letterChecks) {
  const suggestions = []

  const has99285 = chargeAnalyses.find(a => a.code === '99285')
  if (has99285 && !letterChecks.find(c => c.id === 'medicare_reference')?.passed) {
    suggestions.push({
      title: 'Add Medicare rate evidence for 99285',
      paragraph: `Furthermore, Medicare reimburses $192 for CPT 99285, the same service for which I was billed $${has99285.amount?.toLocaleString() ?? '[amount]'}. While I understand that hospital rates differ from Medicare rates, a ${has99285.multiplier ? Math.round(has99285.multiplier) + '×' : 'significant'} markup above Medicare for an emergency visit that may not have met Level 5 criteria warrants documentation review.`,
    })
  }

  const bloodPanels = chargeAnalyses.filter(a => ['80053', '80061', '85025'].includes(a.code))
  if (bloodPanels.length >= 2) {
    suggestions.push({
      title: 'Add multi-panel medical necessity argument',
      paragraph: `I am also disputing the ordering of ${bloodPanels.length} simultaneous blood panels (${bloodPanels.map(a => a.code).join(', ')}) for what was a physical injury presentation. The simultaneous ordering of multiple metabolic, lipid, and hematology panels for an acute trauma patient without documented metabolic comorbidities does not meet the medical necessity standard under 42 U.S.C. § 1395y(a)(1)(A). I request the clinical indication for each individual panel, documented in the treating physician's note at the time of service.`,
    })
  }

  const has80048and80053 = chargeAnalyses.find(a => a.code === '80048') && chargeAnalyses.find(a => a.code === '80053')
  if (has80048and80053) {
    suggestions.push({
      title: 'Add CCI violation argument for 80048 + 80053',
      paragraph: `I note that my bill includes both CPT 80048 (basic metabolic panel) and CPT 80053 (comprehensive metabolic panel) for the same date of service. Under the CMS Correct Coding Initiative (CCI), these codes are mutually exclusive — 80048 is a component of 80053 and cannot be billed separately on the same date. This is a billing code error that should be corrected immediately by removing the 80048 charge.`,
    })
  }

  if (!letterChecks.find(c => c.id === 'suspends_collection')?.passed) {
    suggestions.push({
      title: 'Add collection suspension request',
      paragraph: `Pursuant to ACA Section 501(r)(6), I request that all collection activity, late fees, interest accrual, and credit reporting be suspended during the pendency of this dispute. Any extraordinary collection action taken before providing a reasonable opportunity to resolve this dispute would be inconsistent with your obligations as a tax-exempt organization.`,
    })
  }

  return suggestions
}

export { STRENGTH_LEVELS, LETTER_CHECKLIST }
