export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { prompt, systemPrompt } = req.body
  if (!prompt) return res.status(400).json({ error: 'prompt required' })

  const key = process.env.GEMINI_API_KEY
  if (!key) return res.status(500).json({ error: 'API key not configured' })

  const contents = []
  if (systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] })
    contents.push({ role: 'model', parts: [{ text: 'Understood.' }] })
  }
  contents.push({ role: 'user', parts: [{ text: prompt }] })

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      }),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    return res.status(response.status).json({ error: err })
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  res.json({ text })
}
