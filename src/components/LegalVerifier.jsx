import { useState } from 'react'
import { analyzeLegalStrength, STRENGTH_LEVELS, LETTER_CHECKLIST } from '../utils/legalAnalyzer'
import { generateDisputeLetter } from '../utils/letterGenerator'
import { loadProfile } from './UserProfileForm'
import { analyzeChargeWithAI, getApiKey } from '../utils/geminiClient'

const STRENGTH_STYLE = {
  weak:        { bg: 'bg-red-50',      text: 'text-red-800',     border: 'border-red-200',     dot: 'bg-red-400' },
  moderate:    { bg: 'bg-amber-50',    text: 'text-amber-800',   border: 'border-amber-200',   dot: 'bg-amber-400' },
  strong:      { bg: 'bg-green-50',    text: 'text-green-800',   border: 'border-green-200',   dot: 'bg-green-500' },
  very_strong: { bg: 'bg-emerald-50',  text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
}

function ChargeCard({ a, bill }) {
  const [open, setOpen] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  const hasKey = !!getApiKey()

  const s = STRENGTH_STYLE[a.strength]
  const display = aiResult ?? a

  async function fetchAI() {
    setAiLoading(true)
    setAiError(null)
    try {
      const context = `${bill.hospitalName ?? 'unknown hospital'}, date of service ${bill.dateOfService ?? 'unknown'}, total bill $${bill.totals?.patientOwes ?? 'unknown'}`
      const result = await analyzeChargeWithAI(a, context)
      setAiResult(result)
    } catch (e) {
      setAiError(e.message)
    } finally {
      setAiLoading(false)
    }
  }

  const effectiveStrength = aiResult?.strength ?? a.strength
  const effectiveStyle = STRENGTH_STYLE[effectiveStrength] ?? s

  return (
    <div className={`rounded-xl border-2 overflow-hidden ${effectiveStyle.border}`}>
      <button
        className={`w-full flex items-start gap-3 p-4 text-left ${effectiveStyle.bg}`}
        onClick={() => setOpen(v => !v)}
      >
        <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${effectiveStyle.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-bold text-slate-600">{a.code}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${effectiveStyle.bg} ${effectiveStyle.text} ${effectiveStyle.border}`}>
              {STRENGTH_LEVELS[effectiveStrength]?.label}
            </span>
            {aiResult && (
              <span className="text-xs bg-violet-100 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-medium">✦ AI</span>
            )}
            {!a.hasRule && !aiResult && (
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

          {/* AI upgrade button for codes without hardcoded rules */}
          {!a.hasRule && !aiResult && hasKey && (
            <button
              onClick={e => { e.stopPropagation(); fetchAI() }}
              disabled={aiLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold py-2.5 transition-colors disabled:opacity-60"
            >
              {aiLoading ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analyzing with Gemini…</>
              ) : (
                <>✦ Analyze this charge with AI</>
              )}
            </button>
          )}

          {/* AI available but hasn't run yet for non-rule codes, no key */}
          {!a.hasRule && !aiResult && !hasKey && (
            <div className="rounded-lg bg-violet-50 border border-violet-200 px-3 py-2 text-xs text-violet-700">
              Add your Gemini API key in <strong>Profile</strong> to get a full AI-powered analysis of this charge.
            </div>
          )}

          {/* AI upgrade button even for rule-based codes */}
          {a.hasRule && !aiResult && hasKey && (
            <button
              onClick={e => { e.stopPropagation(); fetchAI() }}
              disabled={aiLoading}
              className="text-xs text-violet-600 hover:underline font-medium flex items-center gap-1"
            >
              {aiLoading ? <><span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" /> Fetching AI analysis…</> : '✦ Get AI analysis for this charge'}
            </button>
          )}

          {aiError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{aiError}</div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Legal Basis</p>
            <p className="text-sm text-slate-800 mt-1 font-medium">{display.legalBasis}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Applicable Law & Guidelines</p>
            <div className="space-y-2">
              {(display.laws ?? a.laws).map((law, i) => (
                <div key={i} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                  <p className="text-xs font-bold text-slate-700">{law.cite}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{law.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">The Argument</p>
            <p className="text-sm text-slate-700 mt-1 leading-relaxed">{display.argument}</p>
          </div>

          <div className={`rounded-lg border p-3 ${effectiveStyle.border} ${effectiveStyle.bg}`}>
            <p className={`text-xs font-semibold uppercase tracking-wide ${effectiveStyle.text}`}>What to request from the hospital</p>
            <p className={`text-sm mt-1 ${effectiveStyle.text}`}>{display.whatToRequest}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LegalVerifier({ bill }) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [copied, setCopied] = useState(null)
  const hasKey = !!getApiKey()

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

      {/* AI status banner */}
      <div className={`rounded-lg px-4 py-3 text-xs flex items-center gap-2 ${hasKey ? 'bg-violet-50 border border-violet-200 text-violet-800' : 'bg-slate-100 border border-slate-200 text-slate-500'}`}>
        <span>{hasKey ? '✦' : '○'}</span>
        {hasKey
          ? <span><strong>Gemini AI enabled.</strong> Click any charge to expand, then use "Analyze with AI" for a full analysis of any code — including ones not in the built-in rules.</span>
          : <span><strong>Running on built-in rules only.</strong> Add your Gemini API key in Profile to unlock AI-powered analysis for any charge code.</span>
        }
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
