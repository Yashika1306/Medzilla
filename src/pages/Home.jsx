import { useNavigate } from 'react-router-dom'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

export default function Home() {
  const navigate = useNavigate()
  const hasBill = !!localStorage.getItem('medzilla_bill')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0b1326' }}>
      <Nav />

      <div className="max-w-7xl mx-auto px-6">

        {/* ── Hero: 2-col on desktop ── */}
        <section className="pt-14 pb-10 grid lg:grid-cols-2 gap-12 items-center">

          {/* Left — headline + CTA */}
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6" style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.35)', color: '#a78bfa' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              Free to use · Nothing leaves your device
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-bold leading-[1.12] tracking-tight" style={{ color: 'rgba(255,255,255,0.92)' }}>
              Before you pay<br />that bill —{' '}
              <span style={{ background: 'linear-gradient(90deg, #7C3AED, #22D3EE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                you have options.
              </span>
            </h1>

            <p className="mt-5 text-lg leading-relaxed max-w-lg" style={{ color: '#7a8fa8' }}>
              Most people pay whatever the hospital sends. They don't know they can dispute it, negotiate it, or in many cases eliminate it entirely.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => navigate('/analyze')} className="btn-primary text-base px-8 py-3 rounded-xl">
                Analyze my bill →
              </button>
              {hasBill && (
                <button onClick={() => navigate('/survive')} className="btn-secondary text-base px-6 py-3 rounded-xl">
                  Back to my plan
                </button>
              )}
            </div>
            <p className="mt-3 text-xs" style={{ color: '#445878' }}>PDF read in your browser. No upload, no server, no account.</p>

            {/* Who it's for */}
            <div className="mt-8 grid grid-cols-3 gap-2">
              {[
                { label: 'International residents', accent: '#7C3AED' },
                { label: 'US residents', accent: '#10B981' },
                { label: 'Anyone overwhelmed', accent: '#F59E0B' },
              ].map(({ label, accent }) => (
                <div key={label} className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.04)', borderLeft: `3px solid ${accent}`, border: `1px solid rgba(255,255,255,0.07)`, borderLeftColor: accent }}>
                  <p className="text-xs font-semibold leading-tight" style={{ color: 'rgba(255,255,255,0.8)' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — steps */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#445878' }}>How it works</p>
            {[
              { n: '01', t: 'Upload your bill', d: 'PDF or enter manually. Runs entirely in your browser — your data never goes anywhere.' },
              { n: '02', t: "Decode every charge", d: 'CPT codes turned into plain English. Medicare rates compared. Overbilling flagged automatically.' },
              { n: '03', t: 'Get your plan', d: 'Letters pre-filled, phone scripts ready, negotiation strategy built from your real bill data.' },
            ].map(({ n, t, d }) => (
              <div key={n} className="flex gap-4 rounded-xl px-5 py-4 transition-all" style={{ background: 'rgba(49,57,77,0.45)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-2xl font-bold shrink-0 w-10" style={{ background: 'linear-gradient(135deg,#7C3AED,#22D3EE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{n}</div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'rgba(255,255,255,0.88)' }}>{t}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#5c7090' }}>{d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── What you get — 4-col on xl, 2-col on md ── */}
        <section className="py-8 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: '#445878' }}>What you get</p>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              { label: 'Every charge decoded', desc: 'CPT/ICD-10 codes into plain English instantly.' },
              { label: 'Overbilling flagged', desc: 'CMS billing rules catch duplicates, upcoding, unbundling.' },
              { label: 'Medicare benchmarks', desc: 'See exactly how much above Medicare you were billed.' },
              { label: 'Personal advocate', desc: 'Word-for-word phone scripts and ranked arguments.' },
              { label: '8 ready-to-send letters', desc: 'Charity care, dispute, negotiation — pre-filled.' },
              { label: '180-day tracker', desc: 'Credit bureau deadline tracked with calendar reminders.' },
              { label: 'State programs', desc: 'Medicaid expansions and state assistance by your state.' },
              { label: 'Progress tracker', desc: 'Check off each step, log outcomes, never lose your place.' },
            ].map(({ label, desc }) => (
              <div key={label} className="rounded-xl px-4 py-4 transition-all hover:border-violet-700/50 cursor-default" style={{ background: 'rgba(49,57,77,0.4)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="font-semibold text-sm mb-1" style={{ color: 'rgba(255,255,255,0.88)' }}>{label}</p>
                <p className="text-xs leading-relaxed" style={{ color: '#5c7090' }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Story + CTA ── */}
        <section className="py-8 grid lg:grid-cols-2 gap-8 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(49,57,77,0.45)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="px-6 pt-6 pb-4">
              <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#445878' }}>Why this exists</p>
              <p className="text-sm leading-relaxed" style={{ color: '#7a8fa8' }}>
                The founder arrived in the US as an international student. One month in, a scooter accident — broken teeth, head injuries, lacerations. The hospital ran five blood tests for a physical injury, gave a bandage and some scans, and sent a bill for <strong style={{ color: 'rgba(255,255,255,0.9)' }}>$13,000</strong>.
              </p>
              <p className="text-sm leading-relaxed mt-3" style={{ color: '#7a8fa8' }}>
                Insurance covered $11,400. Still owed <strong style={{ color: 'rgba(255,255,255,0.9)' }}>$1,600</strong> — devastating, one month into a new country with no savings and no support system.
              </p>
            </div>
            <div className="mx-6 mb-6 pl-4 py-1" style={{ borderLeft: '3px solid #7C3AED' }}>
              <p className="text-sm font-semibold leading-snug" style={{ color: '#c4b5fd' }}>
                That $1,600 did not have to be paid. There were four legitimate paths to zero. The student just didn't know they existed.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-5">
            <div>
              <p className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.92)' }}>Ready to fight your bill?</p>
              <p className="text-sm mt-2" style={{ color: '#7a8fa8' }}>Upload your bill and get a full analysis, action plan, and 8 ready-to-send letters in about 30 seconds.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate('/analyze')} className="btn-primary px-8 py-3 text-sm rounded-xl">
                Analyze my bill →
              </button>
              <button onClick={() => navigate('/survive')} className="btn-secondary px-6 py-3 text-sm rounded-xl">
                See what's possible
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[['$0', 'Cost'], ['100%', 'Private'], ['8', 'Letters ready']].map(([val, lbl]) => (
                <div key={lbl} className="rounded-xl p-3 text-center" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <p className="text-xl font-bold" style={{ color: '#a78bfa' }}>{val}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#5c7090' }}>{lbl}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
      <Footer />
    </div>
  )
}
