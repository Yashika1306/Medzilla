import { generateActionPlan } from '../utils/actionPlanGenerator'
import { COPY } from '../constants/copy'
import { useNavigate } from 'react-router-dom'

const PRIORITY_STYLES = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-slate-100 text-slate-600 border-slate-200'
}

export default function ActionPlan({ bill }) {
  const steps = generateActionPlan(bill)
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="card bg-amber-50 border-amber-200">
        <p className="font-bold text-amber-800">{COPY.actionPlanHeader}</p>
        <p className="text-sm text-amber-700 mt-1">{COPY.doNotPay}</p>
      </div>

      <div className="space-y-4">
        {steps.map(step => (
          <div key={step.number} className="card flex gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${step.priority === 'high' ? 'bg-red-100 text-red-700' : step.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
              {step.number}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">{step.timing}</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{step.title}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${PRIORITY_STYLES[step.priority]}`}>
                  {step.priority}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">{step.body}</p>
              {step.letterKey && (
                <button
                  className="mt-3 text-sm text-violet-600 hover:text-violet-800 font-medium underline"
                  onClick={() => navigate('/letters', { state: { openLetter: step.letterKey } })}
                >
                  Generate the letter for this step →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
