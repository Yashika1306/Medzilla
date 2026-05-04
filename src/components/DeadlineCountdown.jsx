import { useState, useRef } from 'react'

function parseDate(str) {
  if (!str) return null
  const d = new Date(str.replace(/[-]/g, '/'))
  return isNaN(d.getTime()) ? null : d
}

function daysBetween(from, to) {
  return Math.floor((to - from) / (1000 * 60 * 60 * 24))
}

function toICSDate(date) {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function buildICS(serviceDate, deadlineDate, hospitalName) {
  const hospital = hospitalName ? ` (${hospitalName})` : ''

  const events = [
    {
      days: 30,
      summary: `Medzilla: 30-day action reminder${hospital}`,
      description: "You have 150 days left. Dispute flagged charges now if you haven't already. Send your itemized bill request.",
    },
    {
      days: 60,
      summary: `Medzilla: 60-day check-in${hospital}`,
      description: 'You have 120 days left. Follow up on any dispute letters. Apply for charity care if eligible.',
    },
    {
      days: 120,
      summary: `Medzilla: 120-day urgent reminder${hospital}`,
      description: 'You have 60 days left. Negotiate the balance now. Set up a payment plan to pause collections if needed.',
    },
    {
      days: 155,
      summary: `⚠️ Medzilla: Final warning — 25 days left${hospital}`,
      description: 'Credit reporting window closes in 25 days. Take action immediately or set up a payment plan today.',
    },
  ]

  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Medzilla//Medical Bill Tracker//EN', 'CALSCALE:GREGORIAN']

  events.forEach(ev => {
    const evDate = new Date(serviceDate)
    evDate.setDate(evDate.getDate() + ev.days)
    const uid = `medzilla-${ev.days}-${Date.now()}@medzilla.app`
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART;VALUE=DATE:${evDate.toISOString().slice(0, 10).replace(/-/g, '')}`,
      `DTEND;VALUE=DATE:${evDate.toISOString().slice(0, 10).replace(/-/g, '')}`,
      `SUMMARY:${ev.summary}`,
      `DESCRIPTION:${ev.description}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT0M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${ev.summary}`,
      'END:VALARM',
      'END:VEVENT'
    )
  })

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

function downloadICS(content, filename) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function DeadlineCountdown({ bill }) {
  const [manualDate, setManualDate] = useState('')
  const [downloaded, setDownloaded] = useState(false)
  const downloadTimer = useRef(null)

  const serviceDate = parseDate(bill?.dateOfService) ?? parseDate(manualDate)
  const today = new Date()

  let daysElapsed = null
  let daysLeft = null
  let deadlineDate = null

  if (serviceDate) {
    daysElapsed = daysBetween(serviceDate, today)
    daysLeft = 180 - daysElapsed
    deadlineDate = new Date(serviceDate)
    deadlineDate.setDate(deadlineDate.getDate() + 180)
  }

  const urgent = daysLeft !== null && daysLeft <= 30
  const expired = daysLeft !== null && daysLeft <= 0

  function handleDownload() {
    if (!serviceDate) return
    const ics = buildICS(serviceDate, deadlineDate, bill?.hospitalName)
    downloadICS(ics, 'medzilla-bill-reminders.ics')
    clearTimeout(downloadTimer.current)
    setDownloaded(true)
    downloadTimer.current = setTimeout(() => setDownloaded(false), 3000)
  }

  return (
    <div className={`rounded-xl border p-4 ${expired ? 'border-red-300 bg-red-50' : urgent ? 'border-amber-300 bg-amber-50' : 'border-violet-100 bg-white'}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">{expired ? '🚨' : urgent ? '⏰' : '🛡️'}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className={`font-semibold text-sm ${expired ? 'text-red-800' : urgent ? 'text-amber-800' : 'text-slate-800'}`}>
              Credit Bureau Grace Period
            </p>
            {serviceDate && (
              <button
                onClick={handleDownload}
                className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${downloaded ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-violet-200 text-violet-700 hover:bg-violet-50'}`}
              >
                {downloaded ? '✓ Downloaded' : '📅 Add to Calendar'}
              </button>
            )}
          </div>

          {serviceDate ? (
            <>
              <p className={`text-xs mt-0.5 ${expired ? 'text-red-600' : urgent ? 'text-amber-600' : 'text-slate-500'}`}>
                {expired
                  ? `180-day window has passed (${Math.abs(daysLeft)} days ago). Dispute now before credit reporting begins.`
                  : `${daysLeft} days left — deadline ${deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                }
              </p>
              <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${expired ? 'bg-red-500 w-full' : urgent ? 'bg-amber-500' : 'bg-violet-500'}`}
                  style={{ width: `${Math.min(100, Math.max(0, (daysElapsed / 180) * 100))}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">{daysElapsed} of 180 days elapsed since date of service</p>
              {serviceDate && !expired && (
                <p className="text-xs text-slate-400 mt-1">
                  Calendar reminders: day 30, 60, 120, and 155 checkpoints added to your calendar app.
                </p>
              )}
            </>
          ) : (
            <div className="mt-2">
              <p className="text-xs text-slate-500 mb-1">
                Medical bills cannot be reported to credit bureaus for 180 days. Enter your service date to see your deadline.
              </p>
              <input
                type="date"
                className="text-xs rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-violet-400"
                value={manualDate}
                onChange={e => setManualDate(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
