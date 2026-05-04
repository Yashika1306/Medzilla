import { estimateSavings } from '../utils/savingsEstimator'

export default function SavingsEstimate({ bill }) {
  const est = estimateSavings(bill)
  if (!est || !est.balance) return null

  const maxSavings = est.balance - est.highEstimate
  const pct = Math.round((maxSavings / est.balance) * 100)

  return (
    <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Potential Savings</p>
          <p className="text-3xl font-bold text-emerald-800 mt-1">
            Up to ${maxSavings.toLocaleString()}
          </p>
          <p className="text-sm text-emerald-700 mt-0.5">
            Your ${est.balance.toLocaleString()} bill could go as low as{' '}
            <strong>${est.highEstimate.toLocaleString()}</strong>
            {est.highEstimate === 0 ? ' — potentially $0.' : '.'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-emerald-700">{pct}%</div>
          <div className="text-xs text-emerald-600">reducible</div>
        </div>
      </div>

      <div className="space-y-2">
        {est.paths.map(path => (
          <div key={path.key} className="flex items-center justify-between gap-3 bg-white/60 rounded-lg px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">{path.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{path.note}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-emerald-700">
                −${path.savingsLow.toLocaleString()}
                {path.savingsHigh !== path.savingsLow && ` to −$${path.savingsHigh.toLocaleString()}`}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-emerald-600">
        These are estimates based on typical outcomes — not guarantees. Work through the action plan below to pursue each path.
      </p>
    </div>
  )
}
