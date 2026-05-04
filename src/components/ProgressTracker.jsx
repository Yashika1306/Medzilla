import { useState, useEffect } from 'react'
import { generateActionPlan } from '../utils/actionPlanGenerator'

function loadProgress() {
  try { return JSON.parse(localStorage.getItem('medzilla_progress') ?? '{}') } catch { return {} }
}
function saveProgress(p) {
  localStorage.setItem('medzilla_progress', JSON.stringify(p))
}

export default function ProgressTracker({ bill }) {
  const steps = generateActionPlan(bill)
  const [progress, setProgress] = useState(loadProgress)
  const [editingNote, setEditingNote] = useState(null)

  useEffect(() => { saveProgress(progress) }, [progress])

  function toggle(stepNum) {
    setProgress(p => ({
      ...p,
      [stepNum]: { ...p[stepNum], done: !p[stepNum]?.done }
    }))
  }

  function setNote(stepNum, note) {
    setProgress(p => ({
      ...p,
      [stepNum]: { ...p[stepNum], note }
    }))
  }

  const doneCount = steps.filter(s => progress[s.number]?.done).length
  const pct = Math.round((doneCount / steps.length) * 100)

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-slate-700">Action Plan Progress</p>
          <p className="text-sm font-bold text-violet-700">{doneCount}/{steps.length} steps done</p>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-violet-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {doneCount === steps.length && (
          <p className="text-xs text-green-600 mt-2 font-medium">All steps completed. Check your outcomes below.</p>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map(step => {
          const isDone = !!progress[step.number]?.done
          const note = progress[step.number]?.note ?? ''
          const isEditingThis = editingNote === step.number

          return (
            <div
              key={step.number}
              className={`rounded-xl border p-4 transition-colors ${isDone ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'}`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggle(step.number)}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isDone ? 'bg-green-500 border-green-500 text-white' : 'border-slate-400 hover:border-violet-500'}`}
                  aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
                >
                  {isDone && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{step.timing}</span>
                  </div>
                  <p className={`font-medium text-sm mt-0.5 ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    Step {step.number}: {step.title}
                  </p>

                  {note && !isEditingThis && (
                    <div className="mt-2 text-xs bg-yellow-50 border border-yellow-200 rounded px-2 py-1 text-slate-600">
                      <span className="font-medium text-yellow-700">Note: </span>{note}
                    </div>
                  )}

                  {isEditingThis && (
                    <div className="mt-2 flex gap-2">
                      <input
                        autoFocus
                        className="flex-1 text-xs rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400"
                        placeholder="e.g. Hospital offered 30% discount, called billing dept..."
                        value={note}
                        onChange={e => setNote(step.number, e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && setEditingNote(null)}
                      />
                      <button className="text-xs text-violet-600 font-medium" onClick={() => setEditingNote(null)}>Save</button>
                    </div>
                  )}

                  <button
                    className="mt-1 text-xs text-slate-400 hover:text-violet-600"
                    onClick={() => setEditingNote(isEditingThis ? null : step.number)}
                  >
                    {isEditingThis ? 'cancel' : note ? 'edit note' : '+ add outcome note'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
