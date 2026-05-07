import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import BillUploader from '../components/BillUploader'
import BillBreakdown from '../components/BillBreakdown'
import ChatInterface from '../components/ChatInterface'
import InsuranceExplainer from '../components/InsuranceExplainer'
import LegalVerifier from '../components/LegalVerifier'
import BillHelp from '../components/BillHelp'

const TABS = ['Charges', 'Legal Review', 'Chat', 'Insurance Terms']

export default function Analyze() {
  const [bill, setBill] = useState(null)
  const [tab, setTab] = useState('Charges')
  const [showReplace, setShowReplace] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const saved = localStorage.getItem('medzilla_bill')
    if (saved) {
      try { setBill(JSON.parse(saved)) } catch {}
    }
  }, [])

  function handleBillParsed(b) {
    setBill(b)
    setTab('Charges')
    setShowReplace(false)
  }

  function updateTotals(patch) {
    const updated = { ...bill, totals: { ...(bill.totals ?? {}), ...patch } }
    setBill(updated)
    localStorage.setItem('medzilla_bill', JSON.stringify(updated))
  }

  const flaggedCount = bill?.lineItems?.filter(i => i.flag !== 'normal').length ?? 0

  if (!bill) {
    return (
      <div className="min-h-screen">
        <Nav />
        <main className="max-w-2xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Analyze Your Bill</h1>
            <p className="text-sm mt-2" style={{ color: '#7a8fa8' }}>
              Upload your hospital bill PDF to decode every charge and find errors.
            </p>
          </div>
          <BillUploader onBillParsed={handleBillParsed} />
          <div className="mt-4">
            <BillHelp />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Nav />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8 lg:items-start">

          {/* ── Left sidebar ── */}
          <div className="space-y-4 lg:sticky lg:top-20 mb-6 lg:mb-0">

            {/* Bill summary */}
            <div className="card">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#445878' }}>Bill Summary</p>
              {bill.hospitalName && (
                <p className="font-semibold text-sm leading-snug" style={{ color: 'rgba(255,255,255,0.88)' }}>
                  {bill.hospitalName}
                </p>
              )}
              {bill.dateOfService && (
                <p className="text-xs mt-1" style={{ color: '#5c7090' }}>Date: {bill.dateOfService}</p>
              )}

              <div className="mt-4 rounded-xl px-4 py-3" style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.25)' }}>
                <p className="text-xs" style={{ color: '#7a8fa8' }}>You owe</p>
                {bill.totals?.patientOwes != null ? (
                  <p className="text-2xl font-bold mt-0.5" style={{ color: '#a78bfa' }}>
                    ${bill.totals.patientOwes.toLocaleString()}
                  </p>
                ) : (
                  <p className="text-lg font-semibold mt-0.5" style={{ color: '#5c7090' }}>Not found in PDF</p>
                )}
                {bill.totals?.billed != null && (
                  <p className="text-xs mt-1" style={{ color: '#5c7090' }}>
                    of ${bill.totals.billed.toLocaleString()} billed
                  </p>
                )}
              </div>

              {flaggedCount > 0 && (
                <div className="mt-3 rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <p className="text-xs font-semibold" style={{ color: '#f87171' }}>
                    {flaggedCount} charge{flaggedCount !== 1 ? 's' : ''} flagged
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#7a8fa8' }}>Potentially disputable</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button onClick={() => navigate('/survive')} className="btn-primary w-full text-sm py-2.5 rounded-xl">
                See Survival Plan →
              </button>
              <button onClick={() => navigate('/letters')} className="btn-secondary w-full text-sm py-2.5 rounded-xl">
                Generate Letters
              </button>
            </div>

            {/* Replace bill */}
            <div>
              <button
                onClick={() => setShowReplace(v => !v)}
                className="text-xs w-full text-center transition-colors"
                style={{ color: showReplace ? '#a78bfa' : '#445878' }}
              >
                {showReplace ? '↑ Cancel' : '↑ Upload a different bill'}
              </button>
              {showReplace && (
                <div className="mt-3">
                  <BillUploader onBillParsed={handleBillParsed} />
                </div>
              )}
            </div>

            {/* Always-visible help panel */}
            <BillHelp />
          </div>

          {/* ── Right: tabs + content ── */}
          <div className="space-y-4 min-w-0">
            <div className="border-b overflow-x-auto" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
              <div className="flex min-w-max">
                {TABS.map(t => {
                  const badge = t === 'Legal Review' && flaggedCount > 0 ? flaggedCount : null
                  return (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                        tab === t ? 'border-violet-500 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {t}
                      {badge && (
                        <span className="bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                          {badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {tab === 'Charges' && <BillBreakdown bill={bill} onUpdateTotals={updateTotals} />}
            {tab === 'Legal Review' && <LegalVerifier bill={bill} />}
            {tab === 'Chat' && <ChatInterface bill={bill} />}
            {tab === 'Insurance Terms' && <InsuranceExplainer />}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
