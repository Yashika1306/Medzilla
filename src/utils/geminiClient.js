async function callGemini(prompt, { json = false, systemPrompt } = {}) {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, systemPrompt }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error ?? `HTTP ${res.status}`
    if (res.status === 429) throw new Error('Rate limit hit. Wait a moment and try again.')
    throw new Error(`AI error: ${msg}`)
  }

  const { text } = await res.json()

  if (json) {
    const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/)
    const raw = match ? (match[1] ?? match[0]) : text
    try { return JSON.parse(raw.trim()) } catch {
      throw new Error('AI returned invalid JSON. Try again.')
    }
  }

  return text.trim()
}

export async function analyzeChargeWithAI(item, billContext) {
  const { code, plainEnglish, amount, medicareRate, flagReason } = item
  const multiplier = medicareRate && amount ? (amount / medicareRate).toFixed(1) : null

  const prompt = `You are a US medical billing compliance expert. Analyze this hospital charge and provide a structured legal assessment.

Charge details:
- CPT/Code: ${code}
- Description: ${plainEnglish ?? 'Unknown'}
- Amount billed: $${amount ?? 'Unknown'}
- Medicare allowed amount: ${medicareRate ? '$' + medicareRate : 'Unknown'}${multiplier ? ` (${multiplier}× markup)` : ''}
- Flag reason: ${flagReason ?? 'Flagged for review'}
- Visit context: ${billContext}

Respond ONLY with valid JSON in this exact format:
{
  "strength": "weak" | "moderate" | "strong" | "very_strong",
  "legalBasis": "one concise sentence naming the legal/regulatory basis for dispute",
  "laws": [
    { "cite": "specific law or guideline citation", "desc": "brief explanation of relevance" }
  ],
  "argument": "2-3 sentence argument the patient should make to dispute this charge",
  "whatToRequest": "specific document or action the patient should request from the hospital"
}

Rules:
- very_strong: clear billing error or hard legal violation (like CCI unbundling)
- strong: solid medical necessity challenge backed by clinical guidelines
- moderate: reasonable dispute with some pushback expected
- weak: worth questioning but limited clear legal basis
- Be specific to this exact code and amount. Do not be generic.`

  return callGemini(prompt, { json: true })
}

export async function chatWithBill(userMessage, bill, history) {
  const items = bill.lineItems ?? []
  const flagged = items.filter(i => i.flag !== 'normal')

  const billSummary = `
Hospital: ${bill.hospitalName ?? 'Unknown'}
Date of service: ${bill.dateOfService ?? 'Unknown'}
Total billed: ${bill.totals?.billed ? '$' + bill.totals.billed.toLocaleString() : 'Unknown'}
Insurance paid: ${bill.totals?.covered ? '$' + bill.totals.covered.toLocaleString() : 'Unknown'}
Patient owes: ${bill.totals?.patientOwes ? '$' + bill.totals.patientOwes.toLocaleString() : 'Unknown'}

All charges:
${items.map(i => `- ${i.code}: ${i.plainEnglish ?? 'Unknown'} — $${i.amount ?? '?'}${i.flag !== 'normal' ? ' [FLAGGED: ' + i.flag + ']' : ''}`).join('\n')}

Flagged charges (${flagged.length}):
${flagged.map(i => `- ${i.code}: ${i.flagReason ?? i.flag}`).join('\n') || 'None'}

Survival paths available: ${bill.survivalPaths?.join(', ') ?? 'None detected'}`

  const conversationHistory = history
    .filter(m => m.role !== 'system')
    .slice(-6)
    .map(m => `${m.role === 'user' ? 'Patient' : 'Assistant'}: ${m.text}`)
    .join('\n')

  const prompt = `You are a helpful, knowledgeable, and empathetic medical billing assistant helping a patient understand and fight their hospital bill.

PATIENT'S BILL:
${billSummary}

${conversationHistory ? `RECENT CONVERSATION:\n${conversationHistory}\n` : ''}
PATIENT ASKS: ${userMessage}

Reply in 2-4 sentences. Be direct and specific to their actual bill data above. If they ask about a specific code, explain it and what they can do about it. If they ask about their options, reference their actual flagged charges and survival paths. Never give legal advice — instead explain patient rights and billing concepts based on publicly available information. Sound like a knowledgeable friend, not a legal document.`

  return callGemini(prompt)
}
