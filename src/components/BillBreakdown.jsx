import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ChargeCard from './ChargeCard'

export default function BillBreakdown({ bill }) {
  const { lineItems, totals, hospitalName, patientName, dateOfService, flagSummary, unbundlingWarnings } = bill
  const navigate = useNavigate()

  const disputed = lineItems.filter(i => i.flag === 'often_disputed')
  const questionable = lineItems.filter(i => i.flag === 'questionable')
  const normal = lineItems.filter(i => i.flag === 'normal')
  const totalFlagged = disputed.length + questionable.length
  const flaggedAmount = [...disputed, ...questionable].reduce((s, i) => s + (i.amount ?? 0), 0)

  return (
    <div className="space-y-5">

      {/* Stats */}
      <div className="card grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total Billed" value={totals?.billed ? '$' + totals.billed.toLocaleString() : '—'} />
        <Stat label="Insurance Paid" value={totals?.covered ? '$' + totals.covered.toLocaleString() : '—'} />
        <Stat label="You Owe" value={totals?.patientOwes ? '$' + totals.patientOwes.toLocaleString() : '—'} highlight />
        <Stat label="Charges Flagged" value={`${totalFlagged} of ${lineItems.length}`} />
      </div>

      {/* Bill metadata */}
      {(hospitalName || patientName || dateOfService) && (
        <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-600 space-y-1">
          {hospitalName && <p><span className="font-medium text-slate-700">Hospital:</span> {hospitalName}</p>}
          {patientName && <p><span className="font-medium text-slate-700">Patient:</span> {patientName}</p>}
          {dateOfService && <p><span className="font-medium text-slate-700">Date of Service:</span> {dateOfService}</p>}
        </div>
      )}

      {/* Next-step action banner — only if flagged charges exist */}
      {totalFlagged > 0 && (
        <div className="rounded-xl border-l-4 border-violet-500 bg-white border border-violet-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-800 text-sm">
              {totalFlagged} charge{totalFlagged > 1 ? 's' : ''} flagged — ${flaggedAmount.toLocaleString()} you should not pay without challenging first.
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Your first step is to request an itemized bill in writing. Do not pay anything until you do this.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => navigate('/letters', { state: { openLetter: 'itemizedBillRequest' } })}
              className="btn-primary text-xs px-4 py-2 whitespace-nowrap"
            >
              Get Letter #1 →
            </button>
            <button
              onClick={() => navigate('/survive')}
              className="btn-secondary text-xs px-4 py-2 whitespace-nowrap"
            >
              Full Plan
            </button>
          </div>
        </div>
      )}

      {/* Unbundling warnings */}
      {unbundlingWarnings?.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
          <p className="font-semibold text-red-800 text-sm">Possible Unbundling Detected</p>
          <p className="text-xs text-red-600">Unbundling is when one procedure is split into multiple codes to inflate the total charge. This violates CMS Correct Coding Initiative rules.</p>
          {unbundlingWarnings.map((w, i) => (
            <div key={i} className="text-sm text-red-700 mt-2">
              <p className="font-medium">{w.codes.join(' + ')}: {w.description}</p>
              <p className="text-red-600 mt-0.5 text-xs">{w.action}</p>
            </div>
          ))}
        </div>
      )}

      {/* Likely Errors */}
      {disputed.length > 0 && (
        <Section
          title={`Likely Errors (${disputed.length})`}
          subtitle="Flagged based on CMS billing rules — these charges have documented grounds for dispute"
          color="red"
        >
          {disputed.map(item => <ChargeCard key={item.code} item={item} />)}
        </Section>
      )}

      {/* Worth Challenging */}
      {questionable.length > 0 && (
        <Section
          title={`Worth Challenging (${questionable.length})`}
          subtitle="May be legitimate but warrant scrutiny — request documentation before paying"
          color="amber"
        >
          {questionable.map(item => <ChargeCard key={item.code} item={item} />)}
        </Section>
      )}

      {/* Appears Correct */}
      {normal.length > 0 && (
        <Section
          title={`Appears Correct (${normal.length})`}
          subtitle="No billing rule violations detected for these codes"
          color="slate"
          collapsible
        >
          {normal.map(item => <ChargeCard key={item.code} item={item} />)}
        </Section>
      )}

      {/* Source note */}
      <p className="text-xs text-slate-400 text-center leading-relaxed px-2">
        Flags are based on CMS Correct Coding Initiative rules, Medicare necessity standards (42 U.S.C. § 1395y), and AMA CPT documentation guidelines — all publicly available federal sources. This is not legal advice.
      </p>
    </div>
  )
}

function Stat({ label, value, highlight }) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${highlight ? 'text-violet-700' : 'text-slate-800'}`}>{value}</p>
    </div>
  )
}

function Section({ title, subtitle, color, children, collapsible }) {
  const [open, setOpen] = useState(!collapsible)
  const colorMap = {
    red:   { title: 'text-red-700',   dot: 'bg-red-400' },
    amber: { title: 'text-amber-700', dot: 'bg-amber-400' },
    slate: { title: 'text-slate-500', dot: 'bg-slate-300' },
  }
  const c = colorMap[color]

  return (
    <div>
      <button
        className="flex items-start gap-2 w-full text-left mb-3"
        onClick={() => collapsible && setOpen(o => !o)}
      >
        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${c.dot}`} />
        <div className="flex-1">
          <p className={`font-semibold text-sm ${c.title}`}>{title}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {collapsible && <span className="text-slate-400 text-xs mt-0.5">{open ? '▲' : '▼'}</span>}
      </button>
      {open && <div className="space-y-3">{children}</div>}
    </div>
  )
}
