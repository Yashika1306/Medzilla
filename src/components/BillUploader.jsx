import { useState, useRef } from 'react'
import { extractTextFromPDF, extractTextWithOCR } from '../utils/pdfExtract'
import { parseBill } from '../utils/billParser'
import { decodeLineItems } from '../utils/codeDecoder'
import { flagLineItems, computeFlagSummary } from '../utils/chargeFlagger'
import { determineSurvivalPaths } from '../utils/survivalPaths'
import { COPY } from '../constants/copy'
import ManualBillEntry from './ManualBillEntry'

export default function BillUploader({ onBillParsed }) {
  const [status, setStatus] = useState('idle') // idle | loading | ocr | done
  const [ocrProgress, setOcrProgress] = useState(null) // { status, progress }
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const inputRef = useRef()

  async function handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a PDF file.')
      return
    }
    setStatus('loading')
    setError(null)
    setShowManual(false)
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
        setShowManual(true)
        setOcrProgress(null)
        return
      }

      const parsed = parseBill(rawText)

      if (!parsed.lineItems.length) {
        setError(COPY.noChargesFound)
        setStatus('idle')
        setShowManual(true)
        setOcrProgress(null)
        return
      }

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
      setShowManual(true)
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
        <div className="rounded-lg p-4 text-sm space-y-2" style={{ backgroundColor: '#1a1206', border: '1px solid #4a3010', color: '#fbbf24' }}>
          <p>{error}</p>
          {!showManual && (
            <button
              onClick={() => setShowManual(true)}
              className="text-xs font-semibold hover:underline"
              style={{ color: '#a78bfa' }}
            >
              → Enter your bill manually instead
            </button>
          )}
        </div>
      )}

      {!showManual && status !== 'done' && !error && (
        <p className="text-center text-xs" style={{ color: '#445878' }}>
          Have a scanned or paper bill?{' '}
          <button
            onClick={() => setShowManual(true)}
            className="hover:underline font-medium"
            style={{ color: '#a78bfa' }}
          >
            Enter charges manually
          </button>
        </p>
      )}

      {showManual && (
        <ManualBillEntry onBillParsed={bill => {
          setStatus('done')
          setError(null)
          onBillParsed(bill)
        }} />
      )}
    </div>
  )
}
