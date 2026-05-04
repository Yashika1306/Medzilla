// Generates a personalized advocate briefing from bill data.
// Speaks directly to the patient — not to the hospital.
// All advice is rule-based and derived from actual billing law and negotiation practice.

export function generateAdvocateBriefing(bill) {
  const { lineItems = [], totals = {}, hospitalName, flagSummary = {}, survivalPaths = [], dateOfService } = bill
  const flagged = lineItems.filter(i => i.flag !== 'normal')
  const balance = totals.patientOwes ?? 0
  const billed = totals.billed ?? 0
  const covered = totals.covered ?? 0

  return {
    caseSummary: buildCaseSummary(bill, flagged, balance, billed, covered),
    verifiedRights: buildVerifiedRights(bill, flagged, balance, survivalPaths),
    topArguments: buildTopArguments(flagged, balance),
    phoneScript: buildPhoneScript(bill, flagged, balance),
    callChecklist: buildCallChecklist(flagged, survivalPaths),
    mistakesToAvoid: buildMistakesToAvoid(balance, flagged, survivalPaths),
    negotiationStance: buildNegotiationStance(balance, flagged, survivalPaths),
  }
}

function buildCaseSummary(bill, flagged, balance, billed, covered) {
  const hospital = bill.hospitalName ?? 'the hospital'
  const isNonprofit = bill.survivalPaths?.includes('charity_care')
  const hasDispute = flagged.length > 0
  const flaggedTotal = flagged.reduce((s, i) => s + (i.amount ?? 0), 0)
  const highMultiplier = flagged.find(i => i.medicareRate && i.amount && (i.amount / i.medicareRate) >= 5)

  const parts = []

  if (balance > 0) {
    parts.push(`Your bill from ${hospital} shows you owe $${balance.toLocaleString()}${covered ? ` after your insurance paid $${covered.toLocaleString()}` : ''}.`)
  }

  if (hasDispute) {
    parts.push(`We found ${flagged.length} charge${flagged.length > 1 ? 's' : ''} totaling $${flaggedTotal.toLocaleString()} that you should not pay without challenging first.`)
  }

  if (highMultiplier) {
    parts.push(`One charge alone — code ${highMultiplier.code} — was billed at ${(highMultiplier.amount / highMultiplier.medicareRate).toFixed(1)}× the Medicare rate. That gap is your strongest leverage point.`)
  }

  if (isNonprofit) {
    parts.push(`${hospital} appears to be a nonprofit hospital, which means they are legally required to have a financial assistance program. You may qualify for significant reduction or full forgiveness — but you have to ask.`)
  }

  parts.push(`Here is exactly what your advocate recommends you do, in order.`)

  return parts.join(' ')
}

function buildVerifiedRights(bill, flagged, balance, survivalPaths) {
  const rights = []

  rights.push({
    right: 'Right to an itemized bill',
    status: 'confirmed',
    detail: 'You are legally entitled to a line-by-line breakdown of every charge, including the CPT code, the date of service, and the name of every provider. The hospital must provide this. Request it before paying anything.',
    law: 'Federal patient rights (CMS Conditions of Participation)',
    action: 'Request it in writing using the Itemized Bill Request letter.'
  })

  if (survivalPaths.includes('charity_care')) {
    rights.push({
      right: 'Right to apply for charity care / financial assistance',
      status: 'confirmed',
      detail: 'This hospital is likely a nonprofit organization. Under IRS Section 501(r), they must have a written financial assistance policy and must not pursue collection action until they have given you a reasonable opportunity to apply.',
      law: 'ACA § 501(r), IRS Revenue Procedure 2014-11',
      action: 'Apply using the Charity Care letter. You can apply even after a bill goes to collections.'
    })
  }

  if (flagged.length > 0) {
    rights.push({
      right: 'Right to dispute any charge before paying',
      status: 'confirmed',
      detail: `You have ${flagged.length} flagged charge${flagged.length > 1 ? 's' : ''}. You are not required to pay any charge you believe is incorrect, not medically necessary, or not supported by documentation. Paying a charge is treated as acceptance of it.`,
      law: '42 U.S.C. § 1395y(a)(1)(A) — medical necessity standard',
      action: 'Do not pay the flagged amounts until you receive a response to your dispute letter.'
    })
  }

  if (survivalPaths.includes('no_surprises_act')) {
    rights.push({
      right: 'No Surprises Act protection may apply',
      status: 'confirmed',
      detail: 'You had insurance and received emergency care. If any provider was out-of-network, they cannot legally bill you more than your in-network cost-sharing amount. This is a hard legal protection — not a negotiation.',
      law: 'No Surprises Act — 42 U.S.C. § 300gg-111 (effective Jan 1, 2022)',
      action: 'Check if any providers were out-of-network. If so, dispute using the No Surprises Act letter and file a complaint with CMS at 1-800-985-3059.'
    })
  }

  rights.push({
    right: '180-day credit protection window',
    status: 'confirmed',
    detail: 'Medical bills cannot be reported to credit bureaus for at least 180 days after the debt is incurred. You have time to dispute and negotiate before your credit is affected. Medical debt under $500 is no longer reported at all.',
    law: 'CFPB medical debt credit reporting rules (2023)',
    action: 'Use this window to pursue all reduction paths before considering payment.'
  })

  if (balance > 0) {
    rights.push({
      right: 'Right to negotiate the balance',
      status: 'confirmed',
      detail: 'The amount on your bill is not fixed. Hospitals negotiate routinely — especially with uninsured and underinsured patients. The amount on the bill is an opening position, not a final number.',
      law: 'General contract law + hospital charity care obligations',
      action: 'After disputing flagged charges, offer 40–50% of the remaining balance as a lump-sum settlement.'
    })
  }

  return rights
}

function buildTopArguments(flagged, balance) {
  const args = []

  const cciViolation = flagged.find(i => i.code === '80048') && flagged.find(i => i.code === '80053')
  if (cciViolation) {
    args.push({
      rank: 1,
      strength: 'very_strong',
      title: 'Hard billing error — CCI violation (80048 + 80053)',
      argument: 'Your bill contains both a basic metabolic panel (80048) and a comprehensive metabolic panel (80053) on the same date. This is a Correct Coding Initiative violation — 80048 is a component of 80053 and cannot be billed separately. This is not a judgment call. It is a billing error and must be corrected.',
      expectedOutcome: 'Removal of 80048 charge — no negotiation needed.',
      difficulty: 'Easy'
    })
  }

  const highER = flagged.find(i => i.code === '99285')
  if (highER) {
    const mult = highER.medicareRate ? (highER.amount / highER.medicareRate).toFixed(1) : null
    args.push({
      rank: args.length + 1,
      strength: 'strong',
      title: `Level 5 ER visit (99285) — ${mult ? mult + '× Medicare rate — ' : ''}requires documentation review`,
      argument: `The highest-tier emergency visit code requires specific documentation of high-complexity medical decision-making. For a physical injury without multi-system involvement or threat to life, Level 5 is frequently unsupported by the medical record. Ask for the physician's documentation showing why Level 5 — not Level 3 or 4 — was the correct code.`,
      expectedOutcome: 'Downcode to 99283 or 99284, saving 30–60% of this charge.',
      difficulty: 'Moderate — expect pushback, but the argument is strong'
    })
  }

  const bloodPanels = flagged.filter(i => ['80053', '80061', '85025'].includes(i.code))
  if (bloodPanels.length >= 2) {
    const total = bloodPanels.reduce((s, i) => s + (i.amount ?? 0), 0)
    args.push({
      rank: args.length + 1,
      strength: 'strong',
      title: `${bloodPanels.length} blood panels ordered for a physical injury — medical necessity questioned`,
      argument: `Your bill includes ${bloodPanels.map(i => i.code).join(', ')} — ${bloodPanels.length} simultaneous blood panels totaling $${total.toLocaleString()} for what appears to be a physical trauma presentation. None of these tests changes treatment for a fracture, laceration, or contusion in a patient without documented metabolic disease. Ask the physician to provide the specific clinical indication for each individual panel at the time of your visit.`,
      expectedOutcome: 'Removal of 1–3 panels. Even removing one saves $100–$300.',
      difficulty: 'Moderate'
    })
  }

  flagged.filter(i => !['80048', '80053', '80061', '85025', '99285'].includes(i.code)).forEach(item => {
    args.push({
      rank: args.length + 1,
      strength: item.flag === 'often_disputed' ? 'moderate' : 'weak',
      title: `${item.code} — ${item.plainEnglish ?? 'disputed charge'}`,
      argument: item.flagReason ?? 'This charge has been flagged for review. Request documentation confirming this service was provided and was medically necessary.',
      expectedOutcome: 'Potential reduction or removal with supporting documentation request.',
      difficulty: 'Moderate'
    })
  })

  if (balance > 0 && args.length === 0) {
    args.push({
      rank: 1,
      strength: 'moderate',
      title: 'Negotiate the total balance directly',
      argument: `Even without specific code disputes, hospitals routinely accept 40–60% of the patient balance in lump-sum settlements. Your balance of $${balance.toLocaleString()} could potentially be settled for $${Math.round(balance * 0.45).toLocaleString()}–$${Math.round(balance * 0.55).toLocaleString()}.`,
      expectedOutcome: 'Settlement at 40–60% of current balance.',
      difficulty: 'Moderate — requires persistence'
    })
  }

  return args
}

function buildPhoneScript(bill, flagged, balance) {
  const hospital = bill.hospitalName ?? 'the hospital'
  const account = bill.accountNumber ?? '[your account number]'
  const flaggedCodes = flagged.map(i => i.code).join(', ')

  return {
    opening: `"Hi, I'm calling about my account number ${account}. I recently received a bill and before making any payment, I have some questions about the charges. Is this the right department, or should I speak with someone in Patient Financial Services?"`,

    medicalNecessity: flagged.length > 0
      ? `"I'm looking at my itemized bill and I have questions about the following charges: ${flaggedCodes}. Can you tell me what documentation you have showing these services were medically necessary for my specific condition on the date of service?"`
      : null,

    charityCarePitch: bill.survivalPaths?.includes('charity_care')
      ? `"I'm an international resident with limited income in the United States. I'd like to apply for your hospital's financial assistance program or charity care. Can you tell me the income threshold to qualify and send me the application?"`
      : null,

    negotiationOpener: balance > 0
      ? `"I understand the current balance is $${balance.toLocaleString()}. I'm not in a position to pay that in full, but I could make a one-time payment of $${Math.round(balance * 0.45).toLocaleString()} to resolve this account today. Is that something your department can accept, or do I need to speak with a supervisor?"`
      : null,

    selfPayRate: `"What is your hospital's self-pay rate for these services? I'd like to understand what patients without insurance are typically charged for the same procedures."`,

    closing: `"Before we finish, can I confirm your name and direct extension in case I need to follow up? And can you note in my account that we spoke today and that I have questions about specific charges pending a response?"`,

    tips: [
      'Always call in the morning on weekdays — billing staff have more flexibility early in the day.',
      'Get the name of every person you speak with. Write it down with the date and time.',
      'Never agree to a payment arrangement during the first call — say you need to review anything in writing first.',
      'If they say "we can\'t reduce this," ask to speak with a financial counselor or supervisor.',
      'The magic phrase: "What is the lowest you are authorized to accept?" — it shifts the conversation immediately.',
    ]
  }
}

function buildCallChecklist(flagged, survivalPaths) {
  const items = [
    { label: 'Request itemized bill before discussing payment', done: false },
    { label: 'Ask for their Financial Assistance Program application', done: false, condition: survivalPaths.includes('charity_care') },
    { label: 'Ask for the self-pay rate for your charges', done: false },
  ]

  if (flagged.length > 0) {
    items.push({ label: `Ask for medical necessity documentation for: ${flagged.map(i => i.code).join(', ')}`, done: false })
  }

  items.push(
    { label: 'Write down the name and extension of who you spoke with', done: false },
    { label: 'Ask them to note your call in the account', done: false },
    { label: 'Request everything they say in writing before agreeing', done: false },
    { label: 'Ask about a payment plan if balance remains (interest-free)', done: false },
  )

  return items.filter(i => i.condition !== false)
}

function buildMistakesToAvoid(balance, flagged, survivalPaths) {
  const mistakes = []

  mistakes.push({
    mistake: 'Paying before disputing',
    why: 'Payment is treated as acceptance of every charge. Once you pay, it is much harder to dispute. You lose most of your leverage the moment money changes hands.',
    instead: 'Dispute first. Pay only what you agree is legitimate and correct.'
  })

  if (flagged.length > 0) {
    mistakes.push({
      mistake: 'Paying the flagged charges to "settle it quickly"',
      why: `You have ${flagged.length} charges totaling $${flagged.reduce((s, i) => s + (i.amount ?? 0), 0).toLocaleString()} that have documented dispute grounds. Paying them forfeits that money permanently.`,
      instead: 'Send the dispute letter first. Wait for their written response before paying a cent of the flagged amounts.'
    })
  }

  mistakes.push({
    mistake: 'Agreeing to a payment plan on the first call',
    why: 'Once you enter a payment plan, you have implicitly accepted the balance as correct and you lose negotiating leverage. Hospitals also become less flexible on reductions once a plan is active.',
    instead: 'Negotiate the total amount first. Only set up a payment plan on whatever final amount you agree to — not the original bill.'
  })

  if (survivalPaths.includes('charity_care')) {
    mistakes.push({
      mistake: 'Not applying for charity care because you think you won\'t qualify',
      why: 'Many international residents with limited US income fall under 200–400% of the Federal Poverty Level — which is exactly the threshold most hospitals use. Many people who assume they won\'t qualify, do.',
      instead: 'Apply. The worst they can say is no. The application costs nothing and the potential savings are 50–100% of the bill.'
    })
  }

  mistakes.push({
    mistake: 'Ignoring the bill or hoping it goes away',
    why: 'After 180 days, the bill can be sent to collections and reported to credit bureaus. At that point your leverage drops significantly.',
    instead: 'Take action within 30 days. Even sending one letter pauses the clock.'
  })

  mistakes.push({
    mistake: 'Calling without a written record of the conversation',
    why: 'Verbal agreements in medical billing mean nothing. Hospitals have changed offered amounts and denied conversations happened.',
    instead: 'Follow up every phone call with an email or letter: "This confirms our conversation on [date] in which you stated [what they said]."'
  })

  return mistakes
}

function buildNegotiationStance(balance, flagged, survivalPaths) {
  if (!balance) return null

  const flaggedTotal = flagged.reduce((s, i) => s + (i.amount ?? 0), 0)
  const cleanBalance = Math.max(0, balance - flaggedTotal)
  const offerAmount = Math.round(cleanBalance * 0.45)
  const walkaway = Math.round(cleanBalance * 0.65)

  return {
    currentBalance: balance,
    flaggedTotal,
    cleanBalance,
    offerAmount,
    walkawayAmount: walkaway,
    strategy: [
      { phase: 'Phase 1 — Before negotiating', action: `Dispute all ${flagged.length} flagged charges first. If successful, your negotiable balance drops from $${balance.toLocaleString()} to roughly $${cleanBalance.toLocaleString()}.` },
      { phase: 'Phase 2 — Opening offer', action: `Offer $${offerAmount.toLocaleString()} as a lump-sum settlement (45% of the post-dispute balance). Present it as your maximum available amount.` },
      { phase: 'Phase 3 — If they counter', action: `Do not exceed $${walkaway.toLocaleString()} (65% of post-dispute balance) without getting something in return — like a prompt-pay discount or financial hardship consideration.` },
      { phase: 'Phase 4 — If they refuse to negotiate', action: 'Ask to escalate to a financial counselor or patient financial services manager. Front-line billing staff often have limited authority. Managers can approve more.' },
    ]
  }
}
