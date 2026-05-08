import { useState, useRef } from 'react'
import { extractTextFromPDF, extractTextWithOCR } from '../utils/pdfExtract'
import { parseBill } from '../utils/billParser'
import { decodeLineItems } from '../utils/codeDecoder'
import { flagLineItems, computeFlagSummary } from '../utils/chargeFlagger'
import { determineSurvivalPaths } from '../utils/survivalPaths'
import { COPY } from '../constants/copy'

export default function BillUploader({ onBillParsed }) {
  const [status, setStatus] = useState('idle') // idle | loading | ocr | done
  const [ocrProgress, setOcrProgress] = useState(null) // { status, progress }
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const inputRef = useRef()

  async function handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a PDF file.')
      return
    }
    setStatus('loading')
    setError(null)
    setOcrProgress(null)

    try {
      let rawText = await extractTextFromPDF(file)

      // Scanned/image PDF — try OCR before giving up
      if (!rawText || rawText.length < 50) {
        setStatus('ocr')
        try {
          rawText = await extractTextWithOCR(file, p => setOcrProgress(p))
        } catch (ocrErr) {
          console.warn('OCR failed:', ocrErr)
        }
      }

      if (!rawText || rawText.length < 50) {
        setError(COPY.uploadError)
        setStatus('idle')
        setOcrProgress(null)
        return
      }

      const parsed = parseBill(rawText)
      const decoded = await decodeLineItems(parsed.lineItems)
      const { flaggedItems, unbundlingWarnings } = await flagLineItems(decoded)
      const flagSummary = computeFlagSummary(flaggedItems)

      const bill = { ...parsed, lineItems: flaggedItems, unbundlingWarnings, flagSummary }
      bill.survivalPaths = determineSurvivalPaths(bill)

      localStorage.setItem('medzilla_bill', JSON.stringify(bill))
      setStatus('done')
      setOcrProgress(null)
      onBillParsed(bill)
    } catch (err) {
      console.error(err)
      setError('Something went wrong reading this file. ' + (err.message ?? ''))
      setStatus('idle')
      setOcrProgress(null)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const isProcessing = status === 'loading' || status === 'ocr'

  return (
    <div className="w-full space-y-3">

      {status !== 'done' && (
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragging ? 'border-violet-500' : 'border-slate-600 hover:border-violet-500'}`}
          style={{ backgroundColor: dragging ? '#12101e' : '#111928' }}
          onClick={() => !isProcessing && inputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={e => handleFile(e.target.files[0])}
          />

          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <p style={{ color: '#9aabca' }}>Reading your bill…</p>
            </div>
          )}

          {status === 'ocr' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <div className="space-y-1.5">
                <p className="font-medium" style={{ color: '#c8d4ea' }}>
                  {ocrProgress?.status ?? 'Scanning with OCR…'}
                </p>
                <p className="text-xs" style={{ color: '#5c7090' }}>
                  Scanned bill detected — reading with OCR. Takes 20–40 seconds.
                </p>
              </div>
              {ocrProgress?.progress != null && (
                <div className="w-48 space-y-1">
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#1c2d42' }}>
                    <div
                      className="h-1.5 rounded-full bg-violet-500 transition-all duration-300"
                      style={{ width: `${Math.round(ocrProgress.progress * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-center" style={{ color: '#445878' }}>
                    {Math.round(ocrProgress.progress * 100)}%
                  </p>
                </div>
              )}
            </div>
          )}

          {status === 'idle' && (
            <div className="flex flex-col items-center gap-3">
              <svg className="w-12 h-12" style={{ color: '#445878' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="font-semibold" style={{ color: '#9aabca' }}>{COPY.uploadPrompt}</p>
              <p className="text-xs" style={{ color: '#445878' }}>{COPY.uploadHint}</p>
            </div>
          )}
        </div>
      )}

      {status === 'done' && (
        <div
          className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-violet-400 transition-colors border-green-600"
          style={{ backgroundColor: '#0d1a0f' }}
          onClick={() => { setStatus('idle'); setShowManual(false) }}
        >
          <p className="font-semibold text-lg" style={{ color: '#4ade80' }}>✓ Bill loaded successfully</p>
          <p className="text-sm mt-1" style={{ color: '#5c7090' }}>Click to upload a different bill</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg p-4 text-sm" style={{ backgroundColor: '#1a1206', border: '1px solid #4a3010', color: '#fbbf24' }}>
          <p>{error}</p>
        </div>
      )}

      {/* Help section */}
      <div className="mt-2">
        <button
          onClick={() => setShowHelp(v => !v)}
          className="flex items-center gap-1 mx-auto text-xs transition-colors"
          style={{ color: showHelp ? '#a78bfa' : '#445878' }}
        >
          Having trouble with your bill?
          <span className="text-xs">{showHelp ? '↑' : '↓'}</span>
        </button>

        {showHelp && (
          <div className="mt-3 rounded-xl p-4 space-y-4" style={{ background: '#0d1220', border: '1px solid #1c2d42' }}>

            <HelpItem
              title="EOB vs. Hospital Bill — what's the difference?"
              body="An EOB (Explanation of Benefits) is sent by your insurance company after a claim. It shows what was billed and what they paid — but it is NOT a bill. The actual hospital itemized bill comes separately from the hospital and lists every charge by CPT code. Upload the itemized bill if you have it."
            />

            <HelpItem
              title="Which document should I upload?"
              body="If you have both, upload the hospital's itemized bill — it gives the most detail for disputes and charge flagging. If you only have the EOB, upload that. The app detects both formats and tells you which one it found."
            />

            <HelpItem
              title="Where to find your amounts"
              body="On an EOB: look for 'Your Share', 'Member Responsibility', or 'Coinsurance' — that's what you owe. On a hospital bill: look for 'Patient Balance', 'Amount Due', or the bold total at the bottom of the last page."
            />

            <HelpItem
              title="Scanned or photographed bills"
              body="This app reads text from digital PDFs. If your PDF is a photo or scan (text is not selectable), the app automatically tries OCR — this takes 20–40 seconds. If OCR fails, use 'Enter charges manually' to type in your charges instead."
            />

          </div>
        )}
      </div>
    </div>
  )
}

function HelpItem({ title, body }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold" style={{ color: '#c8d4ea' }}>{title}</p>
      <p className="text-xs leading-relaxed" style={{ color: '#5c7090' }}>{body}</p>
    </div>
  )
}
