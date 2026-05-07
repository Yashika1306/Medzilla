import { useState } from 'react'
import { analyzeLegalStrength, STRENGTH_LEVELS, LETTER_CHECKLIST } from '../utils/legalAnalyzer'
import { generateDisputeLetter } from '../utils/letterGenerator'
import { loadProfile } from './UserProfileForm'

const STRENGTH_STYLE = {
  weak:        { bg: 'bg-red-50',      text: 'text-red-800',     border: 'border-red-200',     dot: 'bg-red-400' },
  moderate:    { bg: 'bg-amber-50',    text: 'text-amber-800',   border: 'border-amber-200',   dot: 'bg-amber-400' },
  strong:      { bg: 'bg-green-50',    text: 'text-green-800',   border: 'border-green-200',   dot: 'bg-green-500' },
  very_strong: { bg: 'bg-emerald-50',  text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
}

function ChargeCard({ a, bill }) {
  const [open, setOpen] = useState(false)

  const s = STRENGTH_STYLE[a.strength]

  return (
    <div className={`rounded-xl border-2 overflow-hidden ${s.border}`}>
      <button
        className={`w-full flex items-start gap-3 p-4 text-left ${s.bg}`}
        onClick={() => setOpen(v => !v)}
      >
        <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-slate-600">{a.code}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s.bg} ${s.text} ${s.border}`}>
              {STRENGTH_LEVELS[a.strength]?.label}
            </span>
            {!a.hasRule && (
              <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full">Rule-based fallback</span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-800 mt-0.5">{a.plainEnglish}</p>
          {bill.documentType === 'eob' ? (
            a.medicareRate && (
              <p className="text-xs text-slate-500 mt-0.5">
                Medicare rate: <strong>${a.medicareRate}</strong>
                <span className="ml-1 text-amber-600">(get itemized bill for your billed amount)</span>
              </p>
            )
          ) : (
            a.amount && (
              <p className="text-xs text-slate-500 mt-0.5">
                Billed: <strong>${a.amount.toLocaleString()}</strong>
                {a.medicareRate && (
                  <> · Medicare: <strong>${a.medicareRate}</strong>
                    {a.multiplier && <span className={`ml-1 font-bold ${a.multiplier >= 5 ? 'text-red-600' : 'text-amber-600'}`}>({a.multiplier.toFixed(1)}× markup)</span>}
                  </>
                )}
              </p>
            )
          )}
        </div>
        <span className="text-slate-400 text-xs shrink-0 mt-1">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="p-4 bg-white space-y-4 border-t border-slate-100">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Legal Basis</p>
            <p className="text-sm text-slate-800 mt-1 font-medium">{a.legalBasis}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Applicable Law & Guidelines</p>
            <div className="space-y-2">
              {(a.laws ?? []).map((law, i) => (
                <div key={i} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                  <p className="text-xs font-bold text-slate-700">{law.cite}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{law.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">The Argument</p>
            <p className="text-sm text-slate-700 mt-1 leading-relaxed">{a.argument}</p>
          </div>

          <div className={`rounded-lg border p-3 ${s.border} ${s.bg}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide ${s.text}`}>What to request from the hospital</p>
            <p className={`text-sm mt-1 ${s.text}`}>{a.whatToRequest}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LegalVerifier({ bill }) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [copied, setCopied] = useState(null)

  const profile = loadProfile()
  const disputeLetterText = generateDisputeLetter({
    patientName: bill.patientName,
    hospitalName: bill.hospitalName,
    accountNumber: bill.accountNumber,
    dateOfService: bill.dateOfService,
    disputedItems: bill.lineItems?.filter(i => i.flag !== 'normal') ?? [],
    profile,
  })

  const analysis = analyzeLegalStrength(bill, disputeLetterText)
  const { overallStrength, chargeAnalyses, letterChecks, letterScore, strengtheningSuggestions, additionalRights, totalFlaggedAmount } = analysis

  const overallStyle = STRENGTH_STYLE[overallStrength]
  const overallInfo = STRENGTH_LEVELS[overallStrength]

  function copyParagraph(text, id) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!chargeAnalyses.length) {
    return (
      <div className="card text-center text-slate-500 py-10">
        <p className="text-2xl mb-2">⚖️</p>
        <p className="font-medium">No flagged charges to analyze.</p>
        <p className="text-sm mt-1">Upload a bill with disputed charges to see your legal review.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Info banner */}
      <div className="rounded-lg px-4 py-3 text-xs bg-slate-50 border border-slate-200 text-slate-500">
        Analysis based on CMS billing rules and Medicare rate data.
      </div>

      {/* Overall strength */}
      <div className={`rounded-xl border-2 p-5 ${overallStyle.border} ${overallStyle.bg}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Overall Case Strength</p>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${overallStyle.dot}`} />
              <span className={`text-2xl font-bold ${overallStyle.text}`}>{overallInfo.label}</span>
            </div>
            <p className={`text-sm mt-1 ${overallStyle.text}`}>{overallInfo.desc}</p>
          </div>
          <div className="text-right shrink-0">
            {bill.documentType === 'eob' ? (
              <>
                <p className="text-xs text-slate-500">Your share (EOB)</p>
                <p className="text-2xl font-bold text-slate-800">
                  {bill.totals?.patientOwes ? `$${bill.totals.patientOwes.toLocaleString()}` : '—'}
                </p>
                <p className="text-xs text-slate-400">Get itemized bill for per-charge amounts</p>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-500">Disputed amount</p>
                <p className="text-2xl font-bold text-slate-800">${totalFlaggedAmount.toLocaleString()}</p>
                <p className="text-xs text-slate-400">{chargeAnalyses.length} charge{chargeAnalyses.length !== 1 ? 's' : ''} reviewed</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Charge-by-charge */}
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-3">Charge-by-Charge Legal Analysis</p>
        <div className="space-y-3">
          {chargeAnalyses.map(a => (
            <ChargeCard key={a.code} a={a} bill={bill} />
          ))}
        </div>
      </div>

      {/* Letter completeness */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-slate-700">Dispute Letter Completeness</p>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-slate-200 rounded-full">
              <div
                className={`h-2 rounded-full ${letterScore >= 80 ? 'bg-green-500' : letterScore >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                style={{ width: `${letterScore}%` }}
              />
            </div>
            <span className="text-sm font-bold text-slate-700">{letterScore}%</span>
          </div>
        </div>
        <div className="space-y-2">
          {letterChecks.map(check => (
            <div key={check.id} className="flex items-start gap-2">
              <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold ${check.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {check.passed ? '✓' : '✗'}
              </span>
              <div className="flex-1">
                <p className={`text-xs font-medium ${check.passed ? 'text-slate-700' : 'text-red-700'}`}>{check.label}</p>
                {!check.passed && <p className="text-xs text-slate-400 mt-0.5">{check.law}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional rights */}
      {additionalRights.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">Additional Legal Protections</p>
          {additionalRights.map((r, i) => {
            const s = STRENGTH_STYLE[r.strength]
            return (
              <div key={i} className={`rounded-lg border p-4 ${s.border} ${s.bg}`}>
                <p className={`text-sm font-semibold ${s.text}`}>{r.title}</p>
                <p className={`text-sm mt-1 ${s.text}`}>{r.desc}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Strengthening suggestions */}
      {strengtheningSuggestions.length > 0 && (
        <div className="card">
          <button className="w-full flex items-center justify-between text-left" onClick={() => setShowSuggestions(v => !v)}>
            <p className="text-sm font-semibold text-slate-700">Paragraphs to Add to Your Letter ({strengtheningSuggestions.length})</p>
            <span className="text-slate-400 text-xs">{showSuggestions ? '▲ hide' : '▼ show'}</span>
          </button>
          {showSuggestions && (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-500">Copy these into your dispute letter to strengthen the legal case.</p>
              {strengtheningSuggestions.map((s, i) => (
                <div key={i} className="rounded-lg border border-violet-200 bg-violet-50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">{s.title}</p>
                    <button className="text-xs text-violet-600 hover:underline font-medium" onClick={() => copyParagraph(s.paragraph, i)}>
                      {copied === i ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed italic">"{s.paragraph}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
