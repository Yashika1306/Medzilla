import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import SurvivalToolkit from '../components/SurvivalToolkit'
import ActionPlan from '../components/ActionPlan'
import SavingsEstimate from '../components/SavingsEstimate'
import DeadlineCountdown from '../components/DeadlineCountdown'
import ProgressTracker from '../components/ProgressTracker'
import UniversityResources from '../components/UniversityResources'
import AdvocateDashboard from '../components/AdvocateDashboard'

const TABS = ['Action Plan', 'My Advocate', 'Track Progress', 'All Paths', 'State Programs', 'University Help']

export default function Survive() {
  const [bill, setBill] = useState(null)
  const [tab, setTab] = useState('Action Plan')
  const [stateCode, setStateCode] = useState('')
  const [stateData, setStateData] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const saved = localStorage.getItem('medzilla_bill')
    if (saved) {
      try { setBill(JSON.parse(saved)) } catch {}
    }
  }, [])

  async function loadStateData(code) {
    setStateCode(code)
    if (!code) return
    const res = await fetch('/data/state-programs.json')
    const all = await res.json()
    setStateData(all[code] ?? null)
  }

  if (!bill) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0b1326' }}>
        <Nav />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
          <p className="text-2xl font-bold text-slate-800">Your action plan starts here.</p>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Upload your bill and we'll build a personalized step-by-step plan — what to dispute, what to apply for, and what order to do it in.
          </p>
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-left max-w-sm mx-auto space-y-3">
            {[
              { step: '1', text: 'Request itemized bill in writing', color: 'bg-violet-600' },
              { step: '2', text: 'Apply for charity care / financial assistance', color: 'bg-amber-500' },
              { step: '3', text: 'Dispute flagged or overbilled charges', color: 'bg-amber-500' },
              { step: '4', text: 'Negotiate the remaining balance', color: 'bg-slate-400' },
            ].map(({ step, text, color }) => (
              <div key={step} className="flex items-start gap-3">
                <span className={`w-5 h-5 rounded-full ${color} text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5`}>{step}</span>
                <p className="text-sm text-slate-700">{text}</p>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/analyze')} className="btn-primary mt-4">Upload a Bill to Get My Plan</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Nav />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Plan</h1>
          <p className="text-sm text-slate-500 mt-1">Every legitimate path to reduce or eliminate your bill — in the order you should take them.</p>
        </div>

        {/* Always-visible top cards — side by side on desktop */}
        <div className="grid md:grid-cols-2 gap-4">
          <SavingsEstimate bill={bill} />
          <DeadlineCountdown bill={bill} />
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 overflow-x-auto">
          <div className="flex gap-0 min-w-max">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === t ? 'border-violet-500 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {tab === 'Action Plan' && <ActionPlan bill={bill} />}
        {tab === 'My Advocate' && <AdvocateDashboard bill={bill} />}
        {tab === 'Track Progress' && <ProgressTracker bill={bill} />}
        {tab === 'All Paths' && <SurvivalToolkit bill={bill} />}
        {tab === 'University Help' && <UniversityResources />}
        {tab === 'State Programs' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select your state</label>
              <select
                value={stateCode}
                onChange={e => loadStateData(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
              >
                <option value="">— Choose a state —</option>
                {US_STATES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>

            {stateData && (
              <div className="space-y-4">
                <div className="card">
                  <p className="font-semibold text-slate-800 mb-1">{stateData.name}</p>
                  <p className="text-sm text-slate-600">{stateData.notes}</p>
                </div>
                {stateData.programs.length > 0 ? (
                  <div className="space-y-3">
                    {stateData.programs.map((p, i) => (
                      <div key={i} className="card border-violet-200 bg-violet-50">
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-medium text-violet-700 hover:underline">{p.name}</a>
                        <p className="text-sm text-slate-600 mt-1">{p.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="card bg-slate-50">
                    <p className="text-sm text-slate-600">No state-specific programs beyond hospital charity care are listed for this state. Your strongest path is to apply for the hospital's own financial assistance program — use the Charity Care letter in the Letters section.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DC','District of Columbia'],['DE','Delaware'],
  ['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],
  ['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],
  ['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],
  ['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],
  ['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],
  ['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],
  ['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],
  ['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],
  ['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming']
]
