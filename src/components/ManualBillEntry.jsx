import { useState } from 'react'
import { decodeLineItems } from '../utils/codeDecoder'
import { flagLineItems, computeFlagSummary } from '../utils/chargeFlagger'
import { determineSurvivalPaths } from '../utils/survivalPaths'

const EMPTY_ITEM = { code: '', plainEnglish: '', amount: '' }

export default function ManualBillEntry({ onBillParsed }) {
  const [form, setForm] = useState({
    hospitalName: '',
    accountNumber: '',
    dateOfService: '',
    patientName: '',
    billed: '',
    covered: '',
    patientOwes: '',
  })
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [status, setStatus] = useState('idle')
  const [errors, setErrors] = useState([])

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function setItem(idx, k, v) {
    setItems(arr => arr.map((it, i) => i === idx ? { ...it, [k]: v } : it))
  }

  function addItem() {
    setItems(arr => [...arr, { ...EMPTY_ITEM }])
  }

  function removeItem(idx) {
    setItems(arr => arr.filter((_, i) => i !== idx))
  }

  function validate() {
    const errs = []
    if (!form.patientOwes && !form.billed) errs.push('Enter at least one total amount (billed or balance you owe).')
    const validItems = items.filter(i => i.code.trim() || i.amount)
    if (!validItems.length) errs.push('Add at least one charge line item.')
    items.forEach((it, i) => {
      if (it.code && !/^[A-Z0-9]{4,7}$/i.test(it.code.trim())) {
        errs.push(`Item ${i + 1}: code looks unusual — CPT codes are 5 digits (e.g. 99285), ICD-10 are like J18.9.`)
      }
    })
    return errs
  }

  async function handleSubmit() {
    const errs = validate()
    if (errs.length) { setErrors(errs); return }
    setErrors([])
    setStatus('loading')

    try {
      const rawItems = items
        .filter(i => i.code.trim() || i.amount)
        .map(i => ({
          code: i.code.trim().toUpperCase(),
          originalText: i.code.trim(),
          plainEnglish: i.plainEnglish.trim() || null,
          amount: parseFloat(i.amount) || 0,
          codeType: /^\d{5}$/.test(i.code.trim()) ? 'CPT' : 'OTHER',
        }))

      const decoded = await decodeLineItems(rawItems)
      const { flaggedItems, unbundlingWarnings } = await flagLineItems(decoded)
      const flagSummary = computeFlagSummary(flaggedItems)

      const bill = {
        rawText: '',
        extractedAt: new Date().toISOString(),
        hospitalName: form.hospitalName.trim() || null,
        patientName: form.patientName.trim() || null,
        accountNumber: form.accountNumber.trim() || null,
        dateOfService: form.dateOfService || null,
        lineItems: flaggedItems,
        unbundlingWarnings,
        flagSummary,
        totals: {
          billed: parseFloat(form.billed) || null,
          covered: parseFloat(form.covered) || null,
          patientOwes: parseFloat(form.patientOwes) || null,
        },
      }
      bill.survivalPaths = determineSurvivalPaths(bill)

      localStorage.setItem('medzilla_bill', JSON.stringify(bill))
      setStatus('done')
      onBillParsed(bill)
    } catch (err) {
      console.error(err)
      setErrors(['Something went wrong. ' + (err.message ?? '')])
      setStatus('idle')
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
        <p className="text-green-700 font-semibold">✓ Bill entered — analysis complete</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-white p-5 space-y-5">
      <p className="text-sm font-semibold text-slate-700">Enter your bill manually</p>

      {/* Bill metadata */}
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { label: 'Hospital / Provider', key: 'hospitalName', placeholder: 'e.g. General Hospital' },
          { label: 'Account / Patient ID', key: 'accountNumber', placeholder: 'From your bill' },
          { label: 'Date of Service', key: 'dateOfService', placeholder: '', type: 'date' },
          { label: 'Patient Name', key: 'patientName', placeholder: 'Your full name' },
        ].map(({ label, key, placeholder, type }) => (
          <div key={key}>
            <label className="text-xs font-medium text-slate-600 block mb-1">{label}</label>
            <input
              type={type ?? 'text'}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              placeholder={placeholder}
              value={form[key]}
              onChange={e => setField(key, e.target.value)}
            />
          </div>
        ))}
      </div>

      {/* Totals */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Bill Totals</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Billed', key: 'billed', placeholder: 'e.g. 5000' },
            { label: 'Insurance Paid', key: 'covered', placeholder: 'e.g. 3500 (or 0)' },
            { label: 'You Owe', key: 'patientOwes', placeholder: 'e.g. 1500' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-medium text-slate-600 block mb-1">{label}</label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-slate-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-lg border border-slate-200 pl-6 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={e => setField(key, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Charge Line Items</p>
          <button onClick={addItem} className="text-xs text-violet-600 hover:underline font-medium">+ Add row</button>
        </div>
        <div className="space-y-2">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-12 gap-2 px-1">
            <p className="col-span-3 text-xs text-slate-400">CPT / Code</p>
            <p className="col-span-7 text-xs text-slate-400">Description (optional)</p>
            <p className="col-span-2 text-xs text-slate-400">Amount</p>
          </div>

          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <input
                className="col-span-3 rounded-lg border border-slate-200 px-2 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400 uppercase"
                placeholder="99285"
                value={item.code}
                onChange={e => setItem(idx, 'code', e.target.value)}
                maxLength={8}
              />
              <input
                className="col-span-7 rounded-lg border border-slate-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                placeholder="Leave blank — we'll look it up"
                value={item.plainEnglish}
                onChange={e => setItem(idx, 'plainEnglish', e.target.value)}
              />
              <div className="col-span-2 flex gap-1 items-center">
                <div className="relative flex-1">
                  <span className="absolute left-2 top-2 text-slate-400 text-xs">$</span>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-lg border border-slate-200 pl-5 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    placeholder="0"
                    value={item.amount}
                    onChange={e => setItem(idx, 'amount', e.target.value)}
                  />
                </div>
                {items.length > 1 && (
                  <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-400 text-lg leading-none pb-0.5">×</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">Tip: CPT codes are 5-digit numbers (e.g. 99285). We'll automatically decode and flag them.</p>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-1">
          {errors.map((e, i) => <p key={i} className="text-xs text-red-700">{e}</p>)}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={status === 'loading'}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {status === 'loading' ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Analyzing…
          </>
        ) : 'Analyze My Bill'}
      </button>
    </div>
  )
}
