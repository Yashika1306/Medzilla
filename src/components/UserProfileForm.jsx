import { useState, useEffect } from 'react'

const EMPTY = {
  fullName: '',
  residencyType: '',
  university: '',
  visaType: '',
  annualIncome: '',
  address: '',
  phone: '',
  email: ''
}

export function loadProfile() {
  try {
    const saved = localStorage.getItem('medzilla_profile')
    return saved ? JSON.parse(saved) : null
  } catch { return null }
}

export default function UserProfileForm({ onSave, compact }) {
  const [form, setForm] = useState(() => loadProfile() ?? EMPTY)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const existing = loadProfile()
    if (existing) setForm(existing)
  }, [])

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    setSaved(false)
  }

  function save() {
    localStorage.setItem('medzilla_profile', JSON.stringify(form))
    setSaved(true)
    onSave?.(form)
  }

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400'
  const labelClass = 'block text-xs font-medium text-slate-600 mb-1'

  const isInternational = form.residencyType === 'international'

  return (
    <div className={compact ? '' : 'card'}>
      {!compact && (
        <div className="mb-4">
          <p className="font-semibold text-slate-800">Your Info</p>
          <p className="text-xs text-slate-500 mt-0.5">Saved locally. Used to fill in your letters automatically. Never transmitted.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Full name *</label>
          <input className={inputClass} value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Jane Smith" />
        </div>

        <div>
          <label className={labelClass}>I am a...</label>
          <select className={inputClass} value={form.residencyType} onChange={e => set('residencyType', e.target.value)}>
            <option value="">— Select one —</option>
            <option value="citizen">US citizen</option>
            <option value="permanent_resident">US permanent resident (green card)</option>
            <option value="international">International resident / visa holder</option>
            <option value="other">Other / prefer not to say</option>
          </select>
        </div>

        {/* Show visa fields only if international */}
        {isInternational && (
          <>
            <div>
              <label className={labelClass}>University / Employer (optional)</label>
              <input className={inputClass} value={form.university} onChange={e => set('university', e.target.value)} placeholder="e.g. State University" />
            </div>
            <div>
              <label className={labelClass}>Visa type (optional)</label>
              <select className={inputClass} value={form.visaType} onChange={e => set('visaType', e.target.value)}>
                <option value="">— Select —</option>
                <option value="F-1">F-1 (Academic student)</option>
                <option value="J-1">J-1 (Exchange visitor)</option>
                <option value="H-1B">H-1B (Work visa)</option>
                <option value="L-1">L-1 (Intracompany transfer)</option>
                <option value="O-1">O-1 (Extraordinary ability)</option>
                <option value="TN">TN (NAFTA/USMCA)</option>
                <option value="Other">Other visa type</option>
              </select>
            </div>
          </>
        )}

        <div>
          <label className={labelClass}>Annual income (approx.)</label>
          <input className={inputClass} value={form.annualIncome} onChange={e => set('annualIncome', e.target.value)} placeholder="e.g. $35,000/year" />
        </div>

        <div className={isInternational ? '' : 'sm:col-span-1'}>
          <label className={labelClass}>Mailing address</label>
          <input className={inputClass} value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St, City, State ZIP" />
        </div>

        <div>
          <label className={labelClass}>Phone</label>
          <input className={inputClass} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(555) 000-0000" />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input className={inputClass} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={save} className="btn-primary text-sm">Save to letters</button>
        {saved && <span className="text-xs text-green-600 font-medium">Saved — all letters updated</span>}
      </div>
    </div>
  )
}
