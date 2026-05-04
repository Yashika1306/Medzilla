export function matchChat(query, bill) {
  if (!bill || !query.trim()) return null

  const q = query.toLowerCase()
  const { lineItems, totals, hospitalName, flagSummary } = bill

  if (/what.*(owe|balance|due|total|pay)/i.test(q)) {
    if (totals?.patientOwes) {
      return `Your current balance due is $${totals.patientOwes.toLocaleString()}. Before paying this, review your action plan — there are likely paths to reduce or eliminate this amount.`
    }
    return 'I could not find a balance due amount in your bill. Look for "Patient Responsibility", "Amount Due", or "Balance Due" on the document.'
  }

  if (/what.*(hospital|provider|where)/i.test(q)) {
    return hospitalName
      ? `The hospital/provider on your bill appears to be: ${hospitalName}`
      : 'I could not identify the hospital name from the bill text. It may be on a header that was not extracted.'
  }

  if (/how many.*(flag|disput|problem|issue)/i.test(q) || /flag/i.test(q)) {
    const disputed = flagSummary?.often_disputed ?? 0
    const questionable = flagSummary?.questionable ?? 0
    if (disputed + questionable === 0) return 'No charges were flagged on your bill. That does not mean all charges are correct — it means none matched our dispute patterns.'
    return `Your bill has ${disputed} often-disputed charge${disputed !== 1 ? 's' : ''} and ${questionable} questionable charge${questionable !== 1 ? 's' : ''}. These are the ones to focus on first.`
  }

  const codeMatch = q.match(/\b(9[90]\d{3}|[78]\d{4}|[A-Z]\d{2}(?:\.\d+)?)\b/i)
  if (codeMatch) {
    const code = codeMatch[1].toUpperCase()
    const item = lineItems?.find(i => i.code.toUpperCase() === code)
    if (item) {
      let response = `Code ${item.code}: ${item.plainEnglish ?? 'Unknown service'}.`
      if (item.amount) response += ` Billed amount: $${item.amount.toLocaleString()}.`
      if (item.flag === 'often_disputed') response += ` This charge is often disputed. ${item.flagReason ?? ''}`
      else if (item.flag === 'questionable') response += ` This charge is questionable. ${item.flagReason ?? ''}`
      else response += ' This charge appears normal for its context.'
      return response
    }
    return `Code ${code} was not found on your bill. It may have been listed in a different format.`
  }

  if (/blood|lab|panel/i.test(q)) {
    const labItems = lineItems?.filter(i => i.category === 'Laboratory') ?? []
    if (labItems.length === 0) return 'No laboratory charges were found on your bill.'
    const total = labItems.reduce((sum, i) => sum + (i.amount ?? 0), 0)
    return `Your bill includes ${labItems.length} lab charge${labItems.length !== 1 ? 's' : ''} totaling $${total.toLocaleString()}: ${labItems.map(i => i.code).join(', ')}. ${labItems.some(i => i.flag !== 'normal') ? 'Some of these are flagged — see the charge breakdown.' : ''}`
  }

  if (/emergency|er|emergency room/i.test(q)) {
    const erItems = lineItems?.filter(i => i.category === 'Emergency' || i.category === 'Facility Fee') ?? []
    if (erItems.length === 0) return 'No emergency room charges were found on your bill.'
    const total = erItems.reduce((sum, i) => sum + (i.amount ?? 0), 0)
    return `Your bill includes ${erItems.length} emergency/facility charge${erItems.length !== 1 ? 's' : ''} totaling $${total.toLocaleString()}.`
  }

  if (/charity|financial assistance|free care/i.test(q)) {
    return 'Charity care (also called Financial Assistance) is a program that nonprofit hospitals are legally required to offer. Many international students on limited incomes qualify for 50–100% bill forgiveness. Use the Charity Care letter in the Letters section to apply.'
  }

  if (/dispute|wrong|incorrect|error/i.test(q)) {
    const flagged = lineItems?.filter(i => i.flag !== 'normal') ?? []
    if (flagged.length === 0) return 'No charges were flagged for dispute. You can still request an itemized bill and review each charge manually.'
    return `${flagged.length} charge${flagged.length !== 1 ? 's are' : ' is'} flagged for potential dispute: ${flagged.map(i => i.code).join(', ')}. Use the Dispute Letter in the Letters section.`
  }

  if (/negotiate|offer|settle/i.test(q)) {
    if (totals?.patientOwes) {
      const offer = Math.round(totals.patientOwes * 0.45)
      return `Hospitals routinely accept 40–60% of patient balances. For your $${totals.patientOwes.toLocaleString()} balance, a reasonable opening offer is around $${offer.toLocaleString()}. Use the Negotiation Letter in the Letters section.`
    }
    return 'Hospitals routinely accept 40–60% of patient balances in lump-sum settlements. Use the Negotiation Letter in the Letters section.'
  }

  if (/no surprises|surprise bill|out.of.network/i.test(q)) {
    return 'The No Surprises Act (effective 2022) protects patients from surprise bills for emergency care. If you had insurance and received emergency care, out-of-network providers cannot bill you more than your in-network cost-sharing amount. Use the No Surprises Act letter if this applies.'
  }

  return `I could not find a match for "${query}" in your bill data. Try asking about a specific code (like "99285"), your total balance, lab charges, or your flagged charges.`
}
