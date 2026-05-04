import { useState, useRef, useEffect } from 'react'
import { matchChat } from '../utils/chatMatcher'
import { chatWithBill, getApiKey } from '../utils/geminiClient'

export default function ChatInterface({ bill }) {
  const [messages, setMessages] = useState([
    { role: 'system', text: 'Ask me anything about your bill — I can explain charges, flag concerns, and walk you through your options.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()
  const hasKey = !!getApiKey()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const q = input.trim()
    if (!q || loading) return

    const userMsg = { role: 'user', text: q }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      let answer
      if (hasKey) {
        answer = await chatWithBill(q, bill, [...messages, userMsg])
      } else {
        answer = matchChat(q, bill)
          ?? "I couldn't find a match for that in your bill. Try asking about a specific charge code, your total balance, or what options you have."
      }
      setMessages(prev => [...prev, { role: 'assistant', text: answer }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'error', text: err.message }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden" style={{ height: 500 }}>

      {/* Mode indicator */}
      <div className={`px-4 py-2 text-xs flex items-center gap-1.5 border-b ${hasKey ? 'bg-violet-50 border-violet-100 text-violet-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${hasKey ? 'bg-violet-500' : 'bg-slate-400'}`} />
        {hasKey
          ? 'Gemini AI — answers based on your actual bill'
          : 'Keyword matching — add a Gemini API key in Profile for real AI answers'
        }
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              m.role === 'user'    ? 'bg-violet-600 text-white' :
              m.role === 'system' ? 'bg-slate-100 text-slate-600 italic text-xs' :
              m.role === 'error'  ? 'bg-red-50 border border-red-200 text-red-700' :
                                    'bg-slate-100 text-slate-800'
            }`}>
              {m.text}
            </div>
          </div>
        ))}

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
          placeholder={hasKey ? 'Ask anything about your bill…' : 'Ask about a charge code, your balance, or your options…'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="btn-primary text-sm disabled:opacity-40 px-4"
        >
          Send
        </button>
      </div>
    </div>
  )
}
