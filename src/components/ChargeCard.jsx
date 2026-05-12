import { useState } from 'react'
import FlagBadge from './FlagBadge'
import { analyzeChargeWithAI } from '../utils/geminiClient'

const CHARGE_SOURCES = {
  '99285': 'CMS E&M Documentation Guidelines — Level 5 requires high-complexity medical decision-making',
  'G0384': 'CMS OPPS APC Guidelines — 42 CFR § 419.2 — facility level must reflect actual resources used',
  '80053': '42 U.S.C. § 1395y(a)(1)(A) — Medical Necessity Standard; CMS LCD L35062',
  '80061': '42 U.S.C. § 1395y(a)(1)(A); USPSTF Lipid Screening Guidelines (preventive, not emergency)',
  '85025': '42 U.S.C. § 1395y(a)(1)(A); CMS Correct Coding Initiative (CCI)',
  '80048': 'CMS Correct Coding Initiative (CCI) — 80048 is a component of 80053 and cannot be billed separately on the same date',
  '96365': 'CMS Transmittal 1930 — IV infusion requires documented start/stop times and drug administered',
  '96361': 'CMS Transmittal 1930 — each additional hour requires documented continuous infusion',
  '99284': '42 CFR § 415.102; AMA CPT 2024 — Level 4 requires moderately high medical decision-making',
  'A4550': '42 CFR § 482.13(b) — patients have a right to itemized supply charges',
  '36415': 'CMS NCCI Edits — blood draw fees are often bundled with the lab panel codes',
  '96374': 'CMS Transmittal 1930 — IV push requires medication administration record',
  '93000': '42 U.S.C. § 1395y(a)(1)(A) — EKG without cardiac presentation requires clinical justification',
}

export default function ChargeCard({ item, isEOB }) {
  const [expanded, setExpanded] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)

  async function toggleExpanded() {
    const next = !expanded
    setExpanded(next)
    if (next && !aiAnalysis && !aiLoading) {
      setAiLoading(true)
      setAiError(null)
      try {
        const result = await analyzeChargeWithAI(item, `Hospital: ${item.hospitalName ?? 'Unknown'}`)
        setAiAnalysis(result)
      } catch (err) {
        setAiError(err.message)
      } finally {
        setAiLoading(false)
      }
    }
  }

  const multiplier = item.medicareRate && item.amount
    ? (item.amount / item.medicareRate).toFixed(1)
    : null

  const source = CHARGE_SOURCES[item.code]
  const hasDetails = item.flagReason || item.tip || item.studentTip || source

  return (
    <div className={`rounded-lg border p-4 transition-colors ${
      item.flag === 'often_disputed' ? 'border-red-200 bg-red-50' :
      item.flag === 'questionable'   ? 'border-amber-200 bg-amber-50' :
                                       'border-slate-100 bg-white'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-slate-600">{item.code}</span>
            <FlagBadge flag={item.flag} />
          </div>
          <p className="mt-1 text-sm font-medium text-slate-800">{item.plainEnglish ?? 'Unknown service'}</p>
          {item.category && (
            <p className="text-xs text-slate-400 mt-0.5">{item.category}</p>
          )}
        </div>

        <div className="text-right shrink-0 space-y-1">
          {!isEOB && item.amount != null && (
            <p className="font-bold text-slate-800">${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          )}
          {item.medicareRate != null && (
            <div className="text-xs text-slate-500">
              Medicare: <span className="font-semibold">${item.medicareRate}</span>
              {!isEOB && multiplier && parseFloat(multiplier) > 1.5 && (
                <span className={`ml-1 font-bold ${parseFloat(multiplier) >= 5 ? 'text-red-600' : parseFloat(multiplier) >= 2.5 ? 'text-amber-600' : 'text-slate-500'}`}>
                  ({multiplier}×)
                </span>
              )}
            </div>
          )}
          {hasDetails && (
            <button
              className="text-xs text-violet-600 hover:text-violet-800 underline block mt-1"
              onClick={toggleExpanded}
            >
              {expanded ? 'Hide details' : 'Why flagged?'}
            </button>
          )}
        </div>
      </div>

      {!isEOB && item.medicareRate != null && item.amount != null && parseFloat(multiplier) >= 2 && (
        <div className="mt-2 text-xs text-slate-600 bg-white/80 rounded px-2 py-1.5 border border-slate-100">
          Billed <strong>${item.amount.toLocaleString()}</strong> — Medicare allows <strong>${item.medicareRate}</strong> for this same service. That {multiplier}× gap is your strongest negotiation point.
        </div>
      )}

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
          {item.flagReason && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Why this is flagged</p>
              <p className="text-sm text-slate-700 mt-0.5 leading-relaxed">{item.flagReason}</p>
            </div>
          )}
          {(item.tip || item.studentTip) && (
            <div>
              <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">What you can do</p>
              <p className="text-sm text-slate-700 mt-0.5 leading-relaxed">{item.tip ?? item.studentTip}</p>
            </div>
          )}
          {source && (
            <div className="rounded bg-slate-50 border border-slate-100 px-3 py-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Rule source</p>
              <p className="text-xs text-slate-600 leading-relaxed">{source}</p>
            </div>
          )}

          {/* AI analysis */}
          {aiLoading && (
            <div className="flex items-center gap-2 text-xs text-violet-600">
              <span className="w-3 h-3 border border-violet-500 border-t-transparent rounded-full animate-spin" />
              Getting AI analysis…
            </div>
          )}
          {aiError && (
            <p className="text-xs text-red-500">{aiError}</p>
          )}
          {aiAnalysis && (
            <div className="rounded-lg bg-violet-50 border border-violet-100 px-3 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">AI Dispute Analysis</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  aiAnalysis.strength === 'very_strong' ? 'bg-red-100 text-red-700' :
                  aiAnalysis.strength === 'strong'      ? 'bg-orange-100 text-orange-700' :
                  aiAnalysis.strength === 'moderate'    ? 'bg-amber-100 text-amber-700' :
                                                          'bg-slate-100 text-slate-600'
                }`}>
                  {aiAnalysis.strength?.replace('_', ' ')}
                </span>
              </div>
              {aiAnalysis.argument && (
                <p className="text-sm text-violet-900 leading-relaxed">{aiAnalysis.argument}</p>
              )}
              {aiAnalysis.whatToRequest && (
                <div>
                  <p className="text-xs font-semibold text-violet-600">What to request</p>
                  <p className="text-xs text-violet-800 mt-0.5">{aiAnalysis.whatToRequest}</p>
                </div>
              )}
              {aiAnalysis.laws?.length > 0 && (
                <div className="space-y-1">
                  {aiAnalysis.laws.map((l, i) => (
                    <p key={i} className="text-xs text-violet-700"><span className="font-mono font-semibold">{l.cite}</span> — {l.desc}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
