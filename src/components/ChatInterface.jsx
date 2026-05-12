import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { matchChat } from '../utils/chatMatcher'
import { chatWithBill } from '../utils/geminiClient'

const SUGGESTED = [
  'Why were multiple blood tests taken?',
  'Can I dispute any of these charges?',
  'What is a 99285 charge?',
  'How do I negotiate my bill?',
  'What is charity care?',
  'Do I have to pay this right now?',
]

export default function ChatInterface({ bill }) {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([
    { role: 'system', text: 'Ask me anything about your bill — I can explain charges, flag concerns, and walk you through your options.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(q) {
    q = (q ?? input).trim()
    if (!q || loading) return

    const history = messages
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setInput('')
    setLoading(true)

    try {
      let answer
      try {
        answer = await chatWithBill(q, bill, history)
      } catch {
        answer = matchChat(q, bill)
          ?? 'I can help with specific charges, dispute options, or negotiation. Try: "Can I dispute any charges?" or "What is charity care?"'
      }
      setMessages(prev => [...prev, { role: 'assistant', text: answer }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'error', text: err.message }])
    } finally {
      setLoading(false)
    }
  }

  if (!bill) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-10 text-center gap-4" style={{ height: 400 }}>
        <p className="text-slate-600 font-medium">Upload your bill first — then I can answer questions specific to your actual charges.</p>
        <button onClick={() => navigate('/')} className="btn-primary text-sm px-5 py-2">
          Upload Bill →
        </button>
      </div>
    )
  }

  const showChips = messages.length <= 1

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden" style={{ height: 520 }}>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'      ? 'bg-violet-600 text-white' :
              m.role === 'system'   ? 'bg-slate-100 text-slate-600 italic text-xs' :
              m.role === 'error'    ? 'bg-red-50 border border-red-200 text-red-700' :
                                      'bg-slate-100 text-slate-800'
            }`}>
              {m.text}
            </div>
          </div>
        ))}

        {/* Suggested question chips — shown only before any user message */}
        {showChips && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTED.map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                className="text-xs px-3 py-1.5 rounded-full border transition-colors hover:border-violet-400 hover:text-violet-700 hover:bg-violet-50"
                style={{ borderColor: '#e2e8f0', color: '#64748b', background: '#f8fafc' }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 rounded-2xl px-4 py-3 flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-3 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          placeholder="Ask about a charge, your balance, or your options…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="btn-primary text-sm disabled:opacity-40 px-4"
        >
          Send
        </button>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs px-4 py-2 border-t border-slate-100" style={{ color: '#94a3b8', background: '#fafafa' }}>
        Responses are based on your uploaded bill and US patient rights information. This is not legal advice.
      </p>
    </div>
  )
}
