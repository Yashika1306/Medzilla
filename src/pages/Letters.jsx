import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import LetterGenerator from '../components/LetterGenerator'

export default function Letters() {
  const [bill, setBill] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const initialLetterKey = location.state?.openLetter ?? null

  useEffect(() => {
    const saved = localStorage.getItem('medzilla_bill')
    if (saved) {
      try { setBill(JSON.parse(saved)) } catch {}
    }
  }, [])

  if (!bill) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0b1326' }}>
        <Nav />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
          <p className="text-2xl font-bold text-slate-800">Your letters are waiting.</p>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Upload your bill and we'll pre-fill 8 ready-to-send letters — dispute, charity care, negotiation, and more. Takes about 30 seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <button onClick={() => navigate('/analyze')} className="btn-primary">Upload a Bill</button>
            <button onClick={() => navigate('/analyze')} className="btn-secondary">Enter Charges Manually</button>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 max-w-sm mx-auto text-left">
            {['Itemized Bill Request', 'Charity Care Application', 'Charge Dispute Letter', 'Negotiation Offer'].map(l => (
              <div key={l} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-600 font-medium">{l}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">4 more letters available after upload</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Nav />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Letter Generator</h1>
          <p className="text-sm text-slate-500 mt-1">Ready-to-send letters generated from your bill. Fill in the [brackets] before sending.</p>
        </div>

        <LetterGenerator bill={bill} initialLetterKey={initialLetterKey} />
      </main>
      <Footer />
    </div>
  )
}
