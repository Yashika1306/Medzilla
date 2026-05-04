export function estimateSavings(bill) {
  const { totals, lineItems, survivalPaths } = bill
  const balance = totals?.patientOwes ?? 0
  if (!balance) return null

  const result = {
    balance,
    paths: [],
    lowEstimate: balance,
    highEstimate: balance,
  }

  if (survivalPaths.includes('charity_care')) {
    result.paths.push({
      key: 'charity_care',
      label: 'Charity Care / Financial Assistance',
      savingsLow: Math.round(balance * 0.5),
      savingsHigh: balance,
      note: '50–100% forgiveness for qualifying low-income patients',
      priority: 1,
    })
    result.highEstimate = 0
    result.lowEstimate = Math.min(result.lowEstimate, Math.round(balance * 0.5))
  }

  const flaggedTotal = (lineItems ?? [])
    .filter(i => i.flag !== 'normal')
    .reduce((sum, i) => sum + (i.amount ?? 0), 0)

  if (flaggedTotal > 0) {
    result.paths.push({
      key: 'dispute',
      label: 'Dispute Flagged Charges',
      savingsLow: Math.round(flaggedTotal * 0.3),
      savingsHigh: Math.round(flaggedTotal),
      note: `${(lineItems ?? []).filter(i => i.flag !== 'normal').length} charges flagged totaling $${flaggedTotal.toLocaleString()}`,
      priority: 2,
    })
    result.lowEstimate = Math.max(0, result.lowEstimate - Math.round(flaggedTotal * 0.3))
    result.highEstimate = Math.max(0, result.highEstimate - Math.round(flaggedTotal))
  }

  // Negotiate savings apply to whatever balance remains after disputes — not the full original balance
  if (survivalPaths.includes('negotiate') && balance > 0) {
    const remainingLow = result.lowEstimate
    const remainingHigh = result.highEstimate
    const negotiatedSavingsLow = Math.round(remainingLow * 0.25)
    const negotiatedSavingsHigh = Math.round(remainingHigh * 0.55)
    result.paths.push({
      key: 'negotiate',
      label: 'Negotiate the Balance',
      savingsLow: negotiatedSavingsLow,
      savingsHigh: negotiatedSavingsHigh,
      note: 'Hospitals routinely accept 40–60% in lump-sum settlements',
      priority: 3,
    })
    result.lowEstimate = Math.max(0, result.lowEstimate - negotiatedSavingsLow)
    result.highEstimate = Math.max(0, result.highEstimate - negotiatedSavingsHigh)
  }

  result.lowEstimate = Math.max(0, result.lowEstimate)
  result.highEstimate = Math.max(0, result.highEstimate)

  return result
}
