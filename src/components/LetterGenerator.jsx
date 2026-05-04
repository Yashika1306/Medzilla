import { useState, useEffect } from 'react'
import { LETTER_DEFINITIONS } from '../utils/letterGenerator'
import { COPY } from '../constants/copy'
import UserProfileForm, { loadProfile } from './UserProfileForm'
import VerificationCertificate from './VerificationCertificate'

export default function LetterGenerator({ bill, initialLetterKey }) {
  const [selected, setSelected] = useState(initialLetterKey ?? LETTER_DEFINITIONS[0].key)
  const [profile, setProfile] = useState(() => loadProfile())
  const [showProfileForm, setShowProfileForm] = useState(!loadProfile()?.fullName)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (initialLetterKey) setSelected(initialLetterKey)
  }, [initialLetterKey])

  function handleProfileSave(p) {
    setProfile(p)
    setShowProfileForm(false)
  }

  const def = LETTER_DEFINITIONS.find(d => d.key === selected)
  const letterText = def && bill
    ? def.fn({
        patientName: bill.patientName,
        hospitalName: bill.hospitalName,
        accountNumber: bill.accountNumber,
        dateOfService: bill.dateOfService,
        balanceOwed: bill.totals?.patientOwes,
        disputedItems: bill.lineItems?.filter(i => i.flag !== 'normal') ?? [],
        profile
      })
    : ''

  const hasPlaceholders = letterText.includes('[')

  function copyToClipboard() {
    navigator.clipboard.writeText(letterText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function printLetter() {
    const win = window.open('', '_blank')
    if (!win) { alert('Popup blocked. Please allow popups for this page, then try again.'); return }
    win.document.write(`<pre style="font-family:serif;font-size:14px;line-height:1.8;max-width:700px;margin:48px auto;white-space:pre-wrap">${letterText}</pre>`)
    win.document.close()
    win.print()
  }

  const stepLabels = {
    1: { label: 'Step 1 — Do this first', color: 'text-violet-700', dot: 'bg-violet-500' },
    2: { label: 'Step 2 — This week', color: 'text-amber-700', dot: 'bg-amber-400' },
    3: { label: 'Step 3 — After Step 2', color: 'text-slate-600', dot: 'bg-slate-400' },
    4: { label: 'Step 4 — If needed', color: 'text-slate-500', dot: 'bg-slate-300' },
  }

  return (
    <div className="lg:grid lg:grid-cols-[300px_1fr] lg:gap-8 lg:items-start">

      {/* ── Left: profile + letter selector ── */}
      <div className="space-y-5 lg:sticky lg:top-20 mb-6 lg:mb-0">

        {/* Profile panel */}
        <div className="card" style={{ borderColor: 'rgba(124,58,237,0.35)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-sm text-slate-800">Your details</p>
              {profile?.fullName
                ? <p className="text-xs text-green-600 mt-0.5">Filled in — letters personalized for {profile.fullName}</p>
                : <p className="text-xs text-amber-600 mt-0.5">Fill in once, all 8 letters auto-personalized</p>
              }
            </div>
            <button
              className="text-xs text-violet-600 hover:underline shrink-0 ml-2"
              onClick={() => setShowProfileForm(v => !v)}
            >
              {showProfileForm ? 'Hide' : profile?.fullName ? 'Edit' : 'Fill in'}
            </button>
          </div>
          {showProfileForm && <UserProfileForm onSave={handleProfileSave} compact />}
        </div>

        {/* Letter selector grouped by step */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map(step => {
            const stepLetters = LETTER_DEFINITIONS.filter(d => d.step === step)
            if (!stepLetters.length) return null
            const s = stepLabels[step]
            return (
              <div key={step}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <p className={`text-xs font-semibold uppercase tracking-wide ${s.color}`}>{s.label}</p>
                </div>
                <div className="grid gap-1.5">
                  {stepLetters.map(d => (
                    <button
                      key={d.key}
                      onClick={() => setSelected(d.key)}
                      className={`text-left rounded-xl border p-3 transition-colors ${
                        selected === d.key
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-slate-200 hover:border-violet-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-medium text-sm leading-snug ${selected === d.key ? 'text-violet-800' : 'text-slate-800'}`}>
                          {d.title}
                        </p>
                        {d.sendFirst && (
                          <span className="shrink-0 text-xs font-semibold bg-violet-600 text-white rounded px-1.5 py-0.5">
                            Send first
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{d.description}</p>
                      {d.when && (
                        <p className="text-xs text-violet-600 mt-1.5 font-medium">When: {d.when}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Right: preview ── */}
      <div className="space-y-4 min-w-0">
        <p className="text-sm text-slate-500">{COPY.letterIntro}</p>

        {letterText ? (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="font-semibold text-slate-700">{def.title}</h3>
              <div className="flex gap-2">
                <button onClick={copyToClipboard} className="btn-secondary text-sm">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={printLetter} className="btn-primary text-sm">
                  Print / Save PDF
                </button>
              </div>
            </div>

            {hasPlaceholders && (
              <div className="rounded-xl px-4 py-3 text-xs" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.35)', color: '#fbbf24' }}>
                This letter still has <strong>[brackets]</strong> — fill in your details on the left to remove them before sending.
              </div>
            )}

            <pre className="rounded-xl border p-6 text-sm whitespace-pre-wrap font-serif leading-relaxed overflow-auto max-h-[70vh]"
              style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.82)' }}>
              {letterText}
            </pre>

            <VerificationCertificate bill={bill} letterKey={selected} letterText={letterText} />
          </>
        ) : (
          <div className="flex items-center justify-center h-48 rounded-2xl" style={{ border: '2px dashed rgba(255,255,255,0.08)' }}>
            <p className="text-sm" style={{ color: '#445878' }}>Select a letter on the left to preview it here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
