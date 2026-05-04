import { useState } from 'react'
import Nav from '../components/Nav'
import UserProfileForm from '../components/UserProfileForm'
import { getApiKey, setApiKey } from '../utils/geminiClient'

function GeminiKeyPanel() {
  const [key, setKey] = useState(() => getApiKey())
  const [show, setShow] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  function save() {
    setApiKey(key)
    setSaved(true)
    setTestResult(null)
    setTimeout(() => setSaved(false), 2000)
  }

  async function testKey() {
    const k = key.trim()
    if (!k) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${k}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Say "ok" in one word.' }] }] }),
        }
      )
      if (res.ok) {
        setApiKey(k)
        setTestResult('success')
      } else {
        const err = await res.json().catch(() => ({}))
        setTestResult(err?.error?.message ?? `Error ${res.status}`)
      }
    } catch (e) {
      setTestResult(e.message)
    } finally {
      setTesting(false)
    }
  }

  const isSet = !!getApiKey()

  return (
    <div className="card space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-slate-800">Gemini AI</p>
          {isSet && <span className="text-xs bg-violet-100 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full font-medium">✦ Active</span>}
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Optional. Adding your own Gemini API key unlocks AI-powered legal analysis for any charge code and real AI answers in the chat — not just the 10 codes with built-in rules.
          Your key is stored only in your browser. It never leaves your device.
        </p>
      </div>

      <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-600 space-y-1">
        <p className="font-semibold text-slate-700">How to get a free key:</p>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Go to <strong>aistudio.google.com</strong></li>
          <li>Sign in with a Google account</li>
          <li>Click "Get API key" → "Create API key"</li>
          <li>Copy and paste it below</li>
        </ol>
        <p className="text-slate-400 mt-1">The free tier is generous — more than enough for personal bill analysis.</p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-600">API Key</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={show ? 'text' : 'password'}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400 pr-16"
              placeholder="AIza..."
              value={key}
              onChange={e => { setKey(e.target.value); setSaved(false); setTestResult(null) }}
            />
            <button
              onClick={() => setShow(v => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              {show ? 'hide' : 'show'}
            </button>
          </div>
          <button
            onClick={testKey}
            disabled={!key.trim() || testing}
            className="btn-secondary text-sm px-4 disabled:opacity-40 shrink-0"
          >
            {testing ? 'Testing…' : 'Test'}
          </button>
          <button
            onClick={save}
            disabled={!key.trim()}
            className="btn-primary text-sm px-4 disabled:opacity-40 shrink-0"
          >
            {saved ? 'Saved ✓' : 'Save'}
          </button>
        </div>

        {testResult === 'success' && (
          <p className="text-xs text-green-600 font-medium">✓ Key works — AI features are now active across the app.</p>
        )}
        {testResult && testResult !== 'success' && (
          <p className="text-xs text-red-600">✗ {testResult}</p>
        )}

        {isSet && (
          <button
            onClick={() => { setApiKey(''); setKey(''); setTestResult(null) }}
            className="text-xs text-slate-400 hover:text-red-500 hover:underline"
          >
            Remove key
          </button>
        )}
      </div>
    </div>
  )
}

export default function Profile() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Profile & Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Fill this in once and all 8 letters are automatically personalized. Everything stays on your device.
          </p>
        </div>
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start space-y-6 lg:space-y-0">
          <GeminiKeyPanel />
          <UserProfileForm />
        </div>
      </main>
    </div>
  )
}
