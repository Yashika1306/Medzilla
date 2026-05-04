import { useState } from 'react'
import { generateAdvocateBriefing } from '../utils/advocateAdvisor'

const STRENGTH_STYLE = {
  very_strong: { bg: 'bg-emerald-50', border: 'border-emerald-400', badge: 'bg-emerald-600', text: 'Very Strong' },
  strong:      { bg: 'bg-green-50',   border: 'border-green-400',   badge: 'bg-green-600',   text: 'Strong' },
  moderate:    { bg: 'bg-amber-50',   border: 'border-amber-300',   badge: 'bg-amber-500',   text: 'Moderate' },
  weak:        { bg: 'bg-slate-50',   border: 'border-slate-300',   badge: 'bg-slate-400',   text: 'Weak' },
}

function Section({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-semibold text-slate-800">{title}</span>
        </div>
        <span className="text-slate-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-100">{children}</div>}
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="text-xs text-violet-600 hover:underline shrink-0">
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function ScriptBlock({ label, text }) {
  const [show, setShow] = useState(false)
  if (!text) return null
  return (
    <div className="mt-3">
      <button
        onClick={() => setShow(v => !v)}
        className="text-sm font-medium text-violet-700 hover:underline"
      >
        {show ? '▲ Hide' : '▼ Show'} {label}
      </button>
      {show && (
        <div className="mt-2 rounded-lg bg-violet-50 border border-violet-200 p-4 text-sm text-slate-700 leading-relaxed font-serif italic">
          <div className="flex justify-between items-start gap-2">
            <span>{text}</span>
            <CopyButton text={text} />
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdvocateDashboard({ bill }) {
  const [checklistState, setChecklistState] = useState({})

  if (!bill) return null

  const briefing = generateAdvocateBriefing(bill)
  const {
    caseSummary,
    verifiedRights,
    topArguments,
    phoneScript,
    callChecklist,
    mistakesToAvoid,
    negotiationStance,
  } = briefing

  function toggleCheck(idx) {
    setChecklistState(s => ({ ...s, [idx]: !s[idx] }))
  }

  return (
    <div className="space-y-4">

      {/* Case Summary */}
      <div className="rounded-xl bg-gradient-to-br from-violet-700 to-violet-900 p-6 text-white">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">⚖️</span>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-200">Your Advocate Briefing</p>
        </div>
        <p className="text-sm leading-relaxed">{caseSummary}</p>
      </div>

      {/* Verified Rights */}
      <Section title="Your Verified Legal Rights" icon="🛡️" defaultOpen>
        <div className="space-y-4 mt-4">
          {verifiedRights.map((r, i) => (
            <div key={i} className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">✓</span>
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-emerald-900 text-sm">{r.right}</p>
                  <p className="text-xs text-emerald-800 mt-1 leading-relaxed">{r.detail}</p>
                  <div className="mt-2 flex flex-wrap gap-3 items-center">
                    <span className="text-xs bg-white border border-emerald-300 text-emerald-700 rounded px-2 py-0.5 font-mono">
                      {r.law}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-violet-700">→ {r.action}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Top Arguments */}
      <Section title="Your Strongest Arguments" icon="💪" defaultOpen>
        <div className="space-y-3 mt-4">
          {topArguments.map((arg, i) => {
            const s = STRENGTH_STYLE[arg.strength] ?? STRENGTH_STYLE.moderate
            return (
              <div key={i} className={`rounded-lg border p-4 ${s.bg} ${s.border}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-500">#{arg.rank}</span>
                    <span className={`text-xs text-white font-bold px-2 py-0.5 rounded-full ${s.badge}`}>{s.text}</span>
                    <p className="font-semibold text-slate-800 text-sm">{arg.title}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{arg.argument}</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Expected Outcome</p>
                    <p className="text-xs text-slate-700 mt-0.5">{arg.expectedOutcome}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Difficulty</p>
                    <p className="text-xs text-slate-700 mt-0.5">{arg.difficulty}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* Phone Script */}
      <Section title="Word-for-Word Phone Script" icon="📞">
        <div className="mt-4 space-y-1">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 mb-4">
            <strong>Before you call:</strong> Have your account number ready. Call in the morning on a weekday. Record the name and extension of everyone you speak with.
          </div>

          <ScriptBlock label="Opening" text={phoneScript.opening} />
          <ScriptBlock label="Ask about medical necessity" text={phoneScript.medicalNecessity} />
          <ScriptBlock label="Ask about charity care / financial assistance" text={phoneScript.charityCarePitch} />
          <ScriptBlock label="Ask about self-pay rate" text={phoneScript.selfPayRate} />
          <ScriptBlock label="Make your negotiation offer" text={phoneScript.negotiationOpener} />
          <ScriptBlock label="Closing" text={phoneScript.closing} />

          <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Call Tips</p>
            <ul className="space-y-1.5">
              {phoneScript.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="text-violet-500 mt-0.5 shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Call Checklist */}
      <Section title="Call Checklist — Do Before You Hang Up" icon="✅">
        <div className="mt-4 space-y-2">
          {callChecklist.map((item, i) => (
            <button
              key={i}
              onClick={() => toggleCheck(i)}
              className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${checklistState[i] ? 'bg-green-50 border-green-300' : 'bg-white border-slate-200 hover:border-violet-300'}`}
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors ${checklistState[i] ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                {checklistState[i] && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <span className={`text-sm ${checklistState[i] ? 'line-through text-slate-400' : 'text-slate-700'}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* Mistakes to Avoid */}
      <Section title="Critical Mistakes to Avoid" icon="⚠️">
        <div className="mt-4 space-y-3">
          {mistakesToAvoid.map((m, i) => (
            <div key={i} className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="font-semibold text-red-800 text-sm flex items-center gap-2">
                <span>✗</span> {m.mistake}
              </p>
              <p className="text-xs text-red-700 mt-1 leading-relaxed"><strong>Why:</strong> {m.why}</p>
              <p className="text-xs text-emerald-700 mt-1.5 leading-relaxed"><strong>Instead:</strong> {m.instead}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Negotiation Stance */}
      {negotiationStance && (
        <Section title="Negotiation Strategy & Numbers" icon="💰">
          <div className="mt-4 space-y-4">
            {/* Dollar breakdown */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Current Balance', val: negotiationStance.currentBalance, color: 'text-red-700 bg-red-50 border-red-200' },
                { label: 'Flagged (Dispute First)', val: negotiationStance.flaggedTotal, color: 'text-amber-700 bg-amber-50 border-amber-200' },
                { label: 'Your Opening Offer', val: negotiationStance.offerAmount, color: 'text-violet-700 bg-violet-50 border-violet-200' },
                { label: 'Walk-Away Max', val: negotiationStance.walkawayAmount, color: 'text-slate-700 bg-slate-50 border-slate-200' },
              ].map(({ label, val, color }) => (
                <div key={label} className={`rounded-lg border p-3 text-center ${color}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">{label}</p>
                  <p className="text-lg font-bold">${val.toLocaleString()}</p>
                </div>
              ))}
            </div>

            {/* Phase strategy */}
            <div className="space-y-2">
              {negotiationStance.strategy.map((phase, i) => (
                <div key={i} className="flex gap-3 rounded-lg bg-white border border-slate-200 p-4">
                  <div className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{phase.phase}</p>
                    <p className="text-sm text-slate-700 mt-0.5">{phase.action}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
              <strong>The golden rule:</strong> Never reveal your walk-away number. Always present your opening offer as the absolute maximum you can pay. Silence after making an offer is your strongest tool — let them respond first.
            </div>
          </div>
        </Section>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-slate-400 text-center px-4 leading-relaxed">
        This advocate briefing is generated from rule-based analysis of your bill, CMS billing guidelines, and applicable federal law. It is not legal advice. All recommendations are based on publicly documented patient rights and standard billing negotiation practice.
      </p>
    </div>
  )
}
