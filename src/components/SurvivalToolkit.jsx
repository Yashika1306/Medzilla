import { useState } from 'react'
import { COPY } from '../constants/copy'
import { ADVOCACY_ORGS } from '../data/advocacyOrgs'

const PATH_DETAILS = {
  charity_care: {
    icon: '🏥',
    title: 'Charity Care / Financial Assistance',
    summary: 'Most nonprofit hospitals will forgive 100% of the bill for qualifying low-income patients. Hospitals are legally required to offer this — they just never tell you.',
    details: [
      'Every US nonprofit hospital must have a Financial Assistance Program (FAP) under IRS Section 501(r).',
      'Most thresholds are 200–400% of the Federal Poverty Level. International students on stipends often qualify.',
      'You can apply AFTER receiving a bill — even after it goes to collections.',
      'The hospital cannot sue you, garnish wages, or report to credit bureaus until you have been given a chance to apply.'
    ],
    action: 'Use the Charity Care letter in the Letters section to apply today.',
    priority: 1
  },
  dispute: {
    icon: '⚠️',
    title: 'Dispute Overbilling',
    summary: 'Studies estimate 80% of hospital bills contain at least one error. Duplicate charges, upcoded procedures, and charges for services not rendered are common.',
    details: [
      'You have the legal right to request an itemized bill showing every charge and its procedure code.',
      'Common errors: upcoding (billing at higher complexity than performed), duplicate charges, charges for services not received.',
      'Disputing does not require paying first. You can dispute before paying anything.',
      'Hospitals must respond to written disputes — they cannot ignore them.'
    ],
    action: 'Use the Dispute Letter for each flagged charge. Start with the Itemized Bill Request.',
    priority: 2
  },
  negotiate: {
    icon: '🤝',
    title: 'Negotiate the Balance',
    summary: 'Hospitals always negotiate. The amount on your bill is an opening position, not a final number. Hospitals routinely accept 40–60% in lump-sum settlements.',
    details: [
      'Ask for the "self-pay rate" — this alone often reduces the bill by 30–50% immediately.',
      'A lump-sum offer gives more leverage than a payment plan.',
      'Negotiation does not hurt your credit if done before the account goes to collections.',
      'Be polite but firm. "I cannot pay the full amount. What is the lowest you can accept today?" is enough.'
    ],
    action: 'Use the Negotiation Letter to make a written settlement offer.',
    priority: 3
  },
  hardship: {
    icon: '📋',
    title: 'Financial Hardship Discount',
    summary: 'Many hospitals offer additional discounts for documented financial hardship, even for patients who don\'t qualify for full charity care.',
    details: [
      'Being an international student on an F-1 visa with a limited stipend is exactly the profile hospitals recognize as hardship.',
      'Some hospitals offer "prompt pay" discounts of 10–30% for paying within 30 days.',
      'You can combine a hardship discount with a payment plan.',
      'Always request this in writing so there is a record.'
    ],
    action: 'Use the Financial Hardship Letter to document your situation.',
    priority: 4
  },
  credit_protection: {
    icon: '🛡️',
    title: 'Credit Report Protections',
    summary: 'Medical debt under $500 no longer appears on US credit reports (since 2023). And even for larger amounts, you have a 180-day grace period before any reporting is allowed.',
    details: [
      'Since July 2022, the three major credit bureaus no longer report paid medical debt.',
      'As of 2023, medical debt under $500 is no longer reported at all.',
      'Medical bills cannot be reported to credit bureaus for at least 180 days (6 months) after being sent.',
      'If your balance falls below $500 through successful dispute or negotiation, it may have zero credit impact.',
      'Many states have additional protections beyond federal law.'
    ],
    action: 'Do not let fear of credit damage rush you into paying before pursuing reduction paths.',
    priority: 5
  },
  payment_plan: {
    icon: '📅',
    title: 'Interest-Free Payment Plan',
    summary: 'If a balance is unavoidable, hospitals must offer payment plans. Nonprofit hospitals cannot charge interest to financial-assistance-eligible patients.',
    details: [
      'Under the ACA, nonprofit hospitals must offer interest-free payment plans to financial assistance-eligible patients.',
      'A payment plan pauses collection activity while you pursue other paths.',
      '$1,600 ÷ 24 months = $67/month — manageable while you fight the larger charges.',
      'Always get the payment plan terms in writing before agreeing.'
    ],
    action: 'Use the Payment Plan Request letter to get this in writing.',
    priority: 6
  },
  patient_advocate: {
    icon: '👤',
    title: 'Free Patient Advocate',
    summary: 'Many hospitals have free patient advocates (patient navigators) who will negotiate on your behalf. And several nonprofits offer this service specifically for students and immigrants.',
    details: [
      'Ask for the hospital\'s Patient Financial Services department — they exist to help patients navigate bills.',
      'Dollar For (dollarfor.org) will personally help you apply for charity care. Free.',
      'Patient Advocate Foundation (patientadvocate.org) provides free case management.',
      'You do not have to fight this alone.'
    ],
    action: 'Use the Patient Advocate Request letter, and contact Dollar For directly.',
    priority: 7
  },
  state_programs: {
    icon: '🗺️',
    title: 'State-Specific Programs',
    summary: 'Many states have programs beyond federal law. Some cover emergency care regardless of immigration status.',
    details: [
      'New York\'s Emergency Medicaid covers emergency care regardless of immigration status.',
      'California\'s SB 370 requires hospitals to screen patients for charity care before billing.',
      'Massachusetts Health Safety Net covers many non-citizens.',
      'Select your state on the Survival page to see what applies to you.'
    ],
    action: 'Select your state on the Survival Toolkit page for state-specific resources.',
    priority: 8
  },
  no_surprises_act: {
    icon: '⚖️',
    title: 'No Surprises Act Protection',
    summary: 'If you had insurance and received emergency care, out-of-network providers cannot bill you more than your in-network cost-sharing amount. This is federal law since 2022.',
    details: [
      'The No Surprises Act (effective January 1, 2022) prohibits balance billing for emergency care.',
      'You can only be charged your in-network deductible, copay, and coinsurance — even if the provider was out-of-network.',
      'This protection applies to ER visits, some air ambulance services, and certain other emergency services.',
      'File a complaint at cms.gov/nosurprises or call 1-800-985-3059 if your rights were violated.'
    ],
    action: 'Use the No Surprises Act Dispute Letter and file a complaint with CMS if needed.',
    priority: 9
  }
}

export default function SurvivalToolkit({ bill }) {
  const [expanded, setExpanded] = useState(null)
  const paths = bill?.survivalPaths ?? Object.keys(PATH_DETAILS)

  return (
    <div className="space-y-6">
      <div className="card bg-violet-50 border-violet-200">
        <p className="font-bold text-violet-800 text-lg">That bill does not have to be paid in full.</p>
        <p className="text-violet-700 mt-1 text-sm">Based on your bill, here are every legitimate path to reduce or eliminate what you owe. Work through these in order before paying a single dollar.</p>
      </div>

      <div className="space-y-3">
        {paths.map(pathKey => {
          const path = PATH_DETAILS[pathKey]
          if (!path) return null
          const isOpen = expanded === pathKey

          return (
            <div key={pathKey} className={`rounded-xl border transition-colors ${isOpen ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-white'}`}>
              <button
                className="w-full flex items-start gap-4 p-4 text-left"
                onClick={() => setExpanded(isOpen ? null : pathKey)}
              >
                <span className="text-2xl mt-0.5">{path.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{path.title}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{path.summary}</p>
                </div>
                <span className="text-slate-400 shrink-0 mt-1">{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-violet-200">
                  <ul className="mt-3 space-y-2">
                    {path.details.map((d, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-700">
                        <span className="text-violet-500 mt-0.5 shrink-0">•</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 rounded-lg bg-white border border-violet-200 p-3">
                    <p className="text-sm font-semibold text-violet-700">Next step:</p>
                    <p className="text-sm text-slate-700 mt-0.5">{path.action}</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="card">
        <p className="font-semibold text-slate-800 mb-3">Free Help — Always Available</p>
        <div className="space-y-3">
          {ADVOCACY_ORGS.map(org => (
            <div key={org.name} className="flex gap-3">
              <div className="flex-1">
                <a href={org.url} target="_blank" rel="noopener noreferrer" className="font-medium text-violet-600 hover:underline text-sm">{org.name}</a>
                {org.phone && <span className="text-xs text-slate-500 ml-2">{org.phone}</span>}
                <p className="text-xs text-slate-500 mt-0.5">{org.description}</p>
              </div>
              <span className="text-xs text-slate-400 shrink-0 self-start">{org.bestFor}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
