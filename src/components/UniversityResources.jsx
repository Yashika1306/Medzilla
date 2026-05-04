import { useState, useEffect } from 'react'

const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DC','District of Columbia'],['DE','Delaware'],
  ['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],
  ['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],
  ['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],
  ['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],
  ['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],
  ['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],
  ['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],
  ['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],
  ['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming']
]

export default function UniversityResources() {
  const [state, setState] = useState('')
  const [data, setData] = useState(null)
  const [allData, setAllData] = useState(null)

  useEffect(() => {
    fetch('/data/university-resources.json')
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(d => setAllData(d))
      .catch(err => console.error('Failed to load university resources:', err))
  }, [])

  function selectState(code) {
    setState(code)
    if (!code || !allData) return
    setData(allData[code] ?? [])
  }

  const national = allData?._national ?? []
  const stateResources = data ?? []

  return (
    <div className="space-y-5">
      <div className="card bg-blue-50 border-blue-200">
        <p className="font-semibold text-blue-800 text-sm">Your university may pay part of your bill for you.</p>
        <p className="text-xs text-blue-700 mt-1">Emergency hardship funds, patient advocacy, and international student resources are available at most US universities — and almost nobody knows to ask.</p>
      </div>

      {/* National resources — always shown */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Available at Every University</p>
        {national.map((r, i) => (
          <ResourceCard key={i} resource={r} />
        ))}
      </div>

      {/* State selector */}
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Find resources for your state</label>
        <select
          value={state}
          onChange={e => selectState(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="">— Select your state —</option>
          {US_STATES.map(([code, name]) => (
            <option key={code} value={code}>{name}</option>
          ))}
        </select>
      </div>

      {state && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            University Resources — {US_STATES.find(([c]) => c === state)?.[1] ?? state}
          </p>
          {stateResources.length > 0 ? (
            stateResources.map((r, i) => (
              <ResourceCard key={i} resource={r} showSchools />
            ))
          ) : (
            <div className="card bg-slate-50">
              <p className="text-sm text-slate-600">
                No specific university funds are listed for this state yet. Contact your Dean of Students office directly — emergency hardship funds exist at nearly every US university, they just aren't always well-publicized.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ResourceCard({ resource, showSchools }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {resource.url ? (
            <a href={resource.url} target="_blank" rel="noopener noreferrer" className="font-medium text-violet-700 hover:underline text-sm">{resource.name}</a>
          ) : (
            <p className="font-medium text-slate-800 text-sm">{resource.name}</p>
          )}
          {showSchools && resource.schools && (
            <p className="text-xs text-slate-400 mt-0.5">{resource.schools.join(', ')}</p>
          )}
          <p className="text-sm text-slate-600 mt-1">{resource.description}</p>
          {resource.action && (
            <p className="text-xs text-violet-700 bg-violet-50 rounded px-2 py-1 mt-2 border border-violet-100">
              <strong>Action: </strong>{resource.action}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
