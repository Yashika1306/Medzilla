const today = () => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

function p(val, fallback) {
  return (val && val.trim()) ? val.trim() : fallback
}

function buildSignature(profile) {
  const name = p(profile?.fullName, '[Your Full Name]')
  const address = p(profile?.address, '[Your Address]')
  const phone = p(profile?.phone, '[Your Phone Number]')
  const email = p(profile?.email, '[Your Email]')
  return `${name}\n${address}\n${phone}\n${email}`
}

function studentContext(profile) {
  const income = p(profile?.annualIncome, '[your income]')
  const residency = profile?.residencyType
  const visa = profile?.visaType
  const uni = profile?.university

  let identity = 'a patient'
  if (residency === 'international') {
    const visaNote = visa ? ` on a ${visa} visa` : ''
    const affiliation = uni ? `, currently affiliated with ${uni}` : ''
    identity = `an international resident${visaNote}${affiliation}`
  } else if (residency === 'citizen') {
    identity = 'a US citizen'
  } else if (residency === 'permanent_resident') {
    identity = 'a US permanent resident'
  }

  return `I am ${identity}. My annual income is approximately ${income}, which I believe falls below your financial assistance eligibility threshold.`
}

export function generateItemizedBillRequest({ patientName, hospitalName, accountNumber, dateOfService, profile }) {
  const name = p(profile?.fullName, patientName) || '[Your Full Name]'
  return `${today()}

${p(hospitalName, '[Hospital Name]')} — Patient Financial Services

Re: Request for Itemized Bill
Patient Name: ${name}
Account Number: ${p(accountNumber, '[Your Account Number]')}
Date of Service: ${p(dateOfService, '[Date of Service]')}

Dear Patient Financial Services Department,

I am writing to formally request a complete itemized bill for the above-referenced account, including a line-by-line breakdown of every charge, the CPT or procedure code for each service, the date each service was provided, and the name of each provider who rendered services.

As a patient, I have the legal right to receive an itemized statement of all charges. I am requesting this before making any payment, as I intend to review each charge carefully and dispute any that were not received, were duplicated, or do not reflect the services actually provided.

Please provide this itemized statement within 30 days. I also request that you suspend any collection activity, late fees, or interest accrual while this review is ongoing.

Thank you for your prompt attention.

Sincerely,
${buildSignature(profile || { fullName: patientName })}`.trim()
}

export function generateCharityCareLetter({ patientName, hospitalName, accountNumber, dateOfService, balanceOwed, profile }) {
  const name = p(profile?.fullName, patientName) || '[Your Full Name]'
  return `${today()}

${p(hospitalName, '[Hospital Name]')} — Patient Financial Services

Re: Request for Financial Assistance Application
Patient Name: ${name}
Account Number: ${p(accountNumber, '[Your Account Number]')}
Date of Service: ${p(dateOfService, '[Date of Service]')}

Dear Patient Financial Services Team,

I am writing to formally request information about your hospital's Financial Assistance Program (also known as Charity Care), as required under Section 501(r) of the Internal Revenue Code.

${studentContext(profile)}

I respectfully request:
1. A copy of your complete Financial Assistance Policy
2. A Financial Assistance Application form
3. A list of all documents required to complete the application
4. Suspension of any collection activity while my application is under review

Current balance in question: $${balanceOwed ? balanceOwed.toLocaleString() : '[Balance]'}

I am committed to resolving this account and appreciate your assistance in connecting me with your financial assistance program.

Sincerely,
${buildSignature(profile || { fullName: patientName })}`.trim()
}

export function generateDisputeLetter({ patientName, hospitalName, accountNumber, dateOfService, disputedItems, profile }) {
  const name = p(profile?.fullName, patientName) || '[Your Full Name]'
  const itemList = (disputedItems || [])
    .map(i => `  - Code ${i.code} (${i.plainEnglish || 'Unknown'}): ${i.flagReason || 'Disputed charge'}${i.amount ? ' — billed $' + i.amount.toLocaleString() : ''}${i.medicareRate ? ` (Medicare rate: $${i.medicareRate})` : ''}`)
    .join('\n')

  return `${today()}

${p(hospitalName, '[Hospital Name]')} — Patient Financial Services

Re: Formal Dispute of Specific Charges
Patient Name: ${name}
Account Number: ${p(accountNumber, '[Your Account Number]')}
Date of Service: ${p(dateOfService, '[Date of Service]')}

Dear Patient Financial Services Department,

I am writing to formally dispute the following charges on my account, which I believe are inaccurate, not medically necessary, or not reflective of services actually rendered:

${itemList || '  [List disputed charges here]'}

For each disputed charge, I request:
1. Documentation showing the medical necessity for each service
2. The name of the provider who ordered and who performed each service
3. Confirmation that the services listed were actually provided to me
4. A corrected bill removing or adjusting any charges that cannot be substantiated

Studies show that a significant percentage of medical bills contain errors. I am exercising my right to dispute these charges before any payment is made. Per the No Surprises Act and applicable consumer protection regulations, I request that you suspend any collection activity, credit reporting, or late fees while this dispute is under review.

I expect a written response within 30 days.

Sincerely,
${buildSignature(profile || { fullName: patientName })}`.trim()
}

export function generateNegotiationLetter({ patientName, hospitalName, accountNumber, dateOfService, balanceOwed, profile }) {
  const name = p(profile?.fullName, patientName) || '[Your Full Name]'
  const offer = balanceOwed ? Math.round(balanceOwed * 0.45) : null

  return `${today()}

${p(hospitalName, '[Hospital Name]')} — Patient Financial Services

Re: Settlement Offer — Lump-Sum Payment
Patient Name: ${name}
Account Number: ${p(accountNumber, '[Your Account Number]')}
Date of Service: ${p(dateOfService, '[Date of Service]')}
Current Balance: $${balanceOwed ? balanceOwed.toLocaleString() : '[Balance]'}

Dear Patient Financial Services Department,

${studentContext(profile)} This makes it impossible for me to pay the full balance stated on this account.

However, I am committed to resolving this account. I would like to propose a one-time, lump-sum settlement in the amount of $${offer ? offer.toLocaleString() : '[Offer Amount — typically 40–50% of balance]'}, which represents approximately 45% of the current balance. I can make this payment within 14 days of written acceptance.

This offer reflects what I am genuinely able to pay. If accepted, I request that:
1. The remaining balance be written off
2. The account be marked as "Paid in Full" or "Settled"
3. No adverse credit reporting be made for the forgiven amount

I hope you will consider this offer and I am happy to discuss further.

Sincerely,
${buildSignature(profile || { fullName: patientName })}`.trim()
}

export function generateHardshipLetter({ patientName, hospitalName, accountNumber, dateOfService, balanceOwed, profile }) {
  const name = p(profile?.fullName, patientName) || '[Your Full Name]'
  const income = p(profile?.annualIncome, '$[your income]')

  return `${today()}

${p(hospitalName, '[Hospital Name]')} — Patient Financial Services

Re: Financial Hardship — Request for Discount or Reduced Balance
Patient Name: ${name}
Account Number: ${p(accountNumber, '[Your Account Number]')}
Date of Service: ${p(dateOfService, '[Date of Service]')}

Dear Patient Financial Services Department,

I am writing to request consideration for a financial hardship discount on the above account. My circumstances are as follows:

- My annual income is approximately ${income}
- This medical expense was unexpected and represents a significant financial hardship
- I do not have savings or family resources sufficient to pay this balance in full
- I am committed to resolving this account but need assistance to do so

I am requesting:
1. A financial hardship discount on the remaining balance of $${balanceOwed ? balanceOwed.toLocaleString() : '[Balance]'}
2. Information about any prompt-pay discounts available if I pay within 30 days
3. Consideration for your hospital's financial assistance program if I qualify

I am happy to provide documentation of my income and financial situation. Please let me know what is needed.

Thank you for your consideration.

Sincerely,
${buildSignature(profile || { fullName: patientName })}`.trim()
}

export function generatePaymentPlanLetter({ patientName, hospitalName, accountNumber, dateOfService, balanceOwed, profile }) {
  const name = p(profile?.fullName, patientName) || '[Your Full Name]'
  const monthly = balanceOwed ? Math.round(balanceOwed / 24) : null

  return `${today()}

${p(hospitalName, '[Hospital Name]')} — Patient Financial Services

Re: Request for Extended, Interest-Free Payment Plan
Patient Name: ${name}
Account Number: ${p(accountNumber, '[Your Account Number]')}
Date of Service: ${p(dateOfService, '[Date of Service]')}

Dear Patient Financial Services Department,

I am writing to request an interest-free extended payment plan for the balance of $${balanceOwed ? balanceOwed.toLocaleString() : '[Balance]'} on the above account.

${studentContext(profile)} While I am committed to paying this balance, I am unable to pay it in a lump sum.

Under the Affordable Care Act, nonprofit hospitals are required to offer interest-free payment plans to patients who qualify for financial assistance programs. I am requesting a 24-month payment plan at $0 interest.

Proposed plan: $${monthly ? monthly.toLocaleString() : '[Monthly Amount]'}/month for 24 months = $${balanceOwed ? balanceOwed.toLocaleString() : '[Balance]'} total.

I also request written confirmation that this payment plan will:
1. Suspend any collection activity for the duration of the plan
2. Carry no interest, fees, or penalties
3. Not be reported to credit bureaus as long as I am current on payments

Please respond in writing with the terms of the plan.

Sincerely,
${buildSignature(profile || { fullName: patientName })}`.trim()
}

export function generateNoSurprisesLetter({ patientName, hospitalName, accountNumber, dateOfService, balanceOwed, profile }) {
  const name = p(profile?.fullName, patientName) || '[Your Full Name]'

  return `${today()}

${p(hospitalName, '[Hospital Name]')} — Patient Financial Services

Re: Dispute Under the No Surprises Act (42 U.S.C. § 300gg-111 et seq.)
Patient Name: ${name}
Account Number: ${p(accountNumber, '[Your Account Number]')}
Date of Service: ${p(dateOfService, '[Date of Service]')}

Dear Patient Financial Services Department,

I am writing to dispute charges I believe may violate the No Surprises Act, which took effect January 1, 2022.

I received emergency medical services on ${p(dateOfService, '[Date of Service]')} and had insurance coverage at the time. My understanding is that I was seen by one or more out-of-network providers. Under the No Surprises Act:

- Out-of-network providers cannot bill patients more than the in-network cost-sharing amount for emergency services
- I am only responsible for my in-network deductible, copay, and coinsurance amounts — not the difference between the out-of-network rate and what insurance paid

I am requesting:
1. Clarification of which charges relate to out-of-network providers
2. Written confirmation that any out-of-network charges comply with the No Surprises Act
3. Adjustment of any charges that exceed my in-network cost-sharing obligation

If this dispute is not resolved satisfactorily, I intend to file a complaint with the CMS No Surprises Help Desk at 1-800-985-3059.

Sincerely,
${buildSignature(profile || { fullName: patientName })}`.trim()
}

export function generatePatientAdvocateLetter({ patientName, hospitalName, accountNumber, dateOfService, balanceOwed, profile }) {
  const name = p(profile?.fullName, patientName) || '[Your Full Name]'
  const uni = p(profile?.university, '[University Name]')
  const visa = profile?.visaType ?? 'F-1'

  return `${today()}

${p(hospitalName, '[Hospital Name]')} — Patient Relations / Patient Financial Services

Re: Request for Patient Financial Advocate Assignment
Patient Name: ${name}
Account Number: ${p(accountNumber, '[Your Account Number]')}
Date of Service: ${p(dateOfService, '[Date of Service]')}

Dear Patient Relations Department,

I am writing to request that a patient financial advocate or patient navigator be assigned to assist me with the bill for my recent care.

I am an international resident with limited familiarity with the US healthcare billing system. The balance of $${balanceOwed ? balanceOwed.toLocaleString() : '[Balance]'} represents a significant financial hardship, and I would benefit greatly from the assistance of an advocate who can help me:

1. Understand each charge on my bill
2. Identify any financial assistance programs I may qualify for
3. Navigate the dispute or negotiation process
4. Connect with any state or community resources available to me

Many hospitals provide this service at no cost to patients. I respectfully request to be connected with a patient financial advocate as soon as possible.

Thank you.

Sincerely,
${buildSignature(profile || { fullName: patientName })}`.trim()
}

export const LETTER_DEFINITIONS = [
  {
    key: 'itemizedBillRequest',
    step: 1,
    sendFirst: true,
    title: 'Itemized Bill Request',
    description: 'Send this first — always. You cannot effectively dispute or negotiate without a line-by-line breakdown.',
    when: 'Always — before paying anything',
    fn: generateItemizedBillRequest,
  },
  {
    key: 'charityCareLetter',
    step: 2,
    title: 'Charity Care Application Request',
    description: 'Ask the hospital for their financial assistance program application. Nonprofit hospitals are legally required to have one.',
    when: 'If the hospital is a nonprofit (most are)',
    fn: generateCharityCareLetter,
  },
  {
    key: 'disputeLetter',
    step: 2,
    title: 'Charge Dispute Letter',
    description: 'Formally dispute each flagged charge. Cites specific billing rules and requests the documentation that justifies each charge.',
    when: 'If you have flagged or questionable charges',
    fn: generateDisputeLetter,
  },
  {
    key: 'noSurprisesLetter',
    step: 2,
    title: 'No Surprises Act Dispute',
    description: 'If you had insurance and received emergency care from an out-of-network provider, this law caps what they can charge you.',
    when: 'If any provider was out-of-network during an emergency',
    fn: generateNoSurprisesLetter,
  },
  {
    key: 'hardshipLetter',
    step: 3,
    title: 'Financial Hardship Letter',
    description: 'Documents your income and financial situation to request a discount. Works even if you don\'t qualify for full charity care.',
    when: 'After requesting itemized bill — send alongside charity care',
    fn: generateHardshipLetter,
  },
  {
    key: 'negotiationLetter',
    step: 3,
    title: 'Negotiation / Settlement Offer',
    description: 'Offers a lump-sum at 45% of the remaining balance. Hospitals routinely accept this — they just don\'t advertise it.',
    when: 'After disputes are processed — negotiate whatever remains',
    fn: generateNegotiationLetter,
  },
  {
    key: 'paymentPlanLetter',
    step: 4,
    title: 'Payment Plan Request',
    description: 'Requests a 24-month interest-free payment plan. Pauses collection activity while you pursue other paths.',
    when: 'If you need time — set this up in parallel with everything else',
    fn: generatePaymentPlanLetter,
  },
  {
    key: 'patientAdvocateLetter',
    step: 4,
    title: 'Patient Advocate Request',
    description: 'Asks the hospital to assign a free patient financial advocate to help you navigate the process.',
    when: 'If the hospital is unresponsive or the bill is complex',
    fn: generatePatientAdvocateLetter,
  },
]
