export function generateActionPlan(bill) {
  const { totals, flagSummary, survivalPaths, hospitalName, lineItems } = bill
  const steps = []
  let stepNum = 1

  steps.push({
    number: stepNum++,
    timing: 'Do this today',
    title: 'Request your itemized bill in writing',
    body: 'You cannot effectively dispute or negotiate without knowing exactly what you\'re being charged for. The hospital is legally required to provide one.',
    letterKey: 'itemizedBillRequest',
    priority: 'high'
  })

  const likelyNonprofit = survivalPaths.includes('charity_care')
  if (likelyNonprofit) {
    steps.push({
      number: stepNum++,
      timing: 'This week',
      title: 'Apply for the hospital\'s Financial Assistance Program',
      body: `${hospitalName ? hospitalName + ' appears to be a' : 'Many hospitals are'} nonprofit hospital${hospitalName ? '' : 's'} legally required to have a charity care program. International students on limited stipends often qualify for 50–100% forgiveness. You can apply EVEN AFTER receiving a bill.`,
      letterKey: 'charityCareLetter',
      priority: 'high'
    })
  }

  const disputedItems = lineItems?.filter(i => i.flag === 'often_disputed') ?? []
  const questionableItems = lineItems?.filter(i => i.flag === 'questionable') ?? []
  const totalFlagged = disputedItems.length + questionableItems.length

  if (totalFlagged > 0) {
    const itemList = [...disputedItems, ...questionableItems]
      .map(i => `${i.code} (${i.plainEnglish ?? 'Unknown'})${i.amount ? ' — $' + i.amount.toLocaleString() : ''}`)
      .join('\n   - ')

    steps.push({
      number: stepNum++,
      timing: 'This week, in parallel with Step ' + (stepNum - 1),
      title: `Dispute the ${totalFlagged} flagged charge${totalFlagged > 1 ? 's' : ''}`,
      body: `We found ${totalFlagged} charge${totalFlagged > 1 ? 's' : ''} that ${totalFlagged > 1 ? 'are' : 'is'} commonly disputed:\n   - ${itemList}`,
      letterKey: 'disputeLetter',
      priority: 'high'
    })
  }

  if (survivalPaths.includes('negotiate') && totals?.patientOwes > 0) {
    const offer = Math.round(totals.patientOwes * 0.45)
    steps.push({
      number: stepNum++,
      timing: 'After Steps 1–' + (stepNum - 2),
      title: 'Negotiate the remaining balance',
      body: `Offer a lump-sum settlement of around $${offer.toLocaleString()} (roughly 45% of the $${totals.patientOwes.toLocaleString()} balance). Hospitals routinely accept 40–60% of patient balances. Paying in a lump sum gives you the most leverage.`,
      letterKey: 'negotiationLetter',
      priority: 'medium'
    })
  }

  if (survivalPaths.includes('payment_plan')) {
    const monthly = totals?.patientOwes ? Math.round(totals.patientOwes / 24) : null
    steps.push({
      number: stepNum++,
      timing: 'If you need time regardless',
      title: 'Request a 0% interest payment plan',
      body: `A payment plan pauses collection activity while you pursue the other steps. Nonprofit hospitals cannot charge interest to financial-assistance-eligible patients.${monthly ? ` $${totals.patientOwes.toLocaleString()} ÷ 24 months = $${monthly}/month.` : ''}`,
      letterKey: 'paymentPlanLetter',
      priority: 'low'
    })
  }

  if (survivalPaths.includes('no_surprises_act')) {
    steps.push({
      number: stepNum++,
      timing: 'Separately',
      title: 'Check for No Surprises Act violations',
      body: 'You received emergency care and had insurance. If any provider was out-of-network, the No Surprises Act may limit how much you can be billed above your in-network cost-sharing amount.',
      letterKey: 'noSurprisesLetter',
      priority: 'high'
    })
  }

  return steps
}
