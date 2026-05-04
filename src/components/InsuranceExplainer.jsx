import { useState } from 'react'
import { STUDENT_TIPS } from '../data/studentTips'

const TERMS = Object.entries(STUDENT_TIPS.insurance)

export default function InsuranceExplainer() {
  const [active, setActive] = useState(null)

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">US health insurance uses terminology that can be confusing for anyone new to the system. These are the terms that appear on your bill and in insurance documents.</p>

      <div className="grid gap-2">
        {TERMS.map(([key, definition]) => {
          const isOpen = active === key
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())
          return (
            <div key={key} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <button
                className="w-full text-left px-4 py-3 flex items-center justify-between"
                onClick={() => setActive(isOpen ? null : key)}
              >
                <span className="font-medium text-sm text-slate-800">{label}</span>
                <span className="text-slate-400 text-xs">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-sm text-slate-600 border-t border-slate-100 pt-3">
                  {definition}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="card bg-blue-50 border-blue-200">
        <p className="font-semibold text-blue-800 text-sm mb-2">Tips for international students</p>
        <ul className="space-y-2">
          {STUDENT_TIPS.general.map((tip, i) => (
            <li key={i} className="text-sm text-blue-700 flex gap-2">
              <span className="shrink-0">•</span>{tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
