import { useState } from 'react'

const ITEMS = [
  {
    title: 'EOB vs. Hospital Bill',
    body: 'An EOB (Explanation of Benefits) comes from your insurance company — it shows what was billed and what they paid, but it is NOT a bill. The actual hospital itemized bill comes separately from the hospital. Upload the itemized bill if you have both.'
  },
  {
    title: 'Which document should I upload?',
    body: 'The hospital\'s itemized bill gives the most detail for charge disputes. If you only have the EOB, upload that — the app detects both. You can always re-upload once you get the itemized bill.'
  },
  {
    title: 'Where to find your dollar amounts',
    body: 'On an EOB: look for "Your Share", "Member Responsibility", or "Coinsurance". On a hospital bill: look for "Patient Balance", "Amount Due", or the bold total at the bottom of the last page.'
  },
  {
    title: 'Scanned or photographed bills',
    body: 'This app reads text from digital PDFs. If text is not selectable, the app tries OCR automatically (20–40 sec). If OCR fails, use "Enter charges manually" to type in your charges.'
  },
  {
    title: 'Amounts not showing correctly?',
    body: 'Click "Amount looks wrong?" next to any number to correct it. Your insurer selection also helps us improve parsing for everyone on that plan.'
  }
]

export default function BillHelp() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between text-xs px-3 py-2 rounded-lg transition-colors"
        style={{
          background: open ? 'rgba(124,58,237,0.08)' : 'transparent',
          border: '1px solid rgba(255,255,255,0.07)',
          color: open ? '#a78bfa' : '#445878'
        }}
      >
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-bold"
            style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>?</span>
          Having trouble with your bill?
        </span>
        <span>{open ? '↑' : '↓'}</span>
      </button>

      {open && (
        <div className="mt-2 rounded-xl p-3 space-y-3" style={{ background: '#0d1220', border: '1px solid #1c2d42' }}>
          {ITEMS.map(item => (
            <div key={item.title} className="space-y-0.5">
              <p className="text-xs font-semibold" style={{ color: '#c8d4ea' }}>{item.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: '#5c7090' }}>{item.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
