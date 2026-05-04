const NONPROFIT_KEYWORDS = [
  'medical center', 'community hospital', 'regional medical', 'university hospital',
  'memorial hospital', 'saint ', 'st.', 'presbyterian', 'methodist', 'baptist',
  'health system', 'health network', 'general hospital', 'children\'s hospital',
  'county hospital', 'veterans', 'va medical'
]

export function determineSurvivalPaths(bill) {
  const paths = []
  const { hospitalName, totals, lineItems, flagSummary } = bill

  const lowerName = (hospitalName || '').toLowerCase()
  const likelyNonprofit = NONPROFIT_KEYWORDS.some(kw => lowerName.includes(kw))

  if (likelyNonprofit || !hospitalName) {
    paths.push('charity_care')
  }

  const hasDisputedCharges =
    (flagSummary?.often_disputed ?? 0) > 0 ||
    (flagSummary?.questionable ?? 0) > 0

  if (hasDisputedCharges) {
    paths.push('dispute')
  }

  if (totals?.patientOwes && totals.patientOwes > 0) {
    paths.push('negotiate')
    paths.push('hardship')
    paths.push('payment_plan')
    // credit protection applies to any outstanding balance — added once
    paths.push('credit_protection')
  }

  paths.push('patient_advocate')
  paths.push('state_programs')

  const hasInsurancePayment = totals?.covered && totals.covered > 0
  const hasHighTierER = lineItems?.some(i => ['99285', 'G0384'].includes(i.code))
  if (hasInsurancePayment && hasHighTierER) {
    paths.push('no_surprises_act')
  }

  return [...new Set(paths)]
}
