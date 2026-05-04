let flagRules = null

async function loadFlagRules() {
  if (flagRules) return flagRules
  try {
    const res = await fetch('/data/flag-rules.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    flagRules = await res.json()
    return flagRules
  } catch (err) {
    console.error('Failed to load flag rules:', err)
    // Return empty rules so the app still works — all charges show as normal
    return { often_disputed: { codes: {} }, questionable: { codes: {} }, unbundling_patterns: [] }
  }
}

export async function flagLineItems(lineItems) {
  const rules = await loadFlagRules()
  const codes = lineItems.map(i => i.code)

  const flagged = lineItems.map(item => {
    if (rules.often_disputed.codes[item.code]) {
      const rule = rules.often_disputed.codes[item.code]
      return { ...item, flag: 'often_disputed', flagReason: rule.reason, tip: rule.tip }
    }
    if (rules.questionable.codes[item.code]) {
      const rule = rules.questionable.codes[item.code]
      return { ...item, flag: 'questionable', flagReason: rule.reason, tip: rule.tip }
    }
    return { ...item, flag: 'normal', flagReason: null, tip: null }
  })

  const unbundlingWarnings = detectUnbundling(codes, rules.unbundling_patterns ?? [])

  return { flaggedItems: flagged, unbundlingWarnings }
}

function detectUnbundling(codes, patterns) {
  const warnings = []
  for (const pattern of patterns) {
    const matchCount = pattern.codes.filter(c => codes.includes(c)).length
    if (matchCount >= 2) {
      warnings.push({
        codes: pattern.codes.filter(c => codes.includes(c)),
        description: pattern.description,
        action: pattern.action,
      })
    }
  }
  return warnings
}

export function computeFlagSummary(lineItems) {
  return lineItems.reduce((acc, item) => {
    acc[item.flag] = (acc[item.flag] ?? 0) + 1
    return acc
  }, {})
}
