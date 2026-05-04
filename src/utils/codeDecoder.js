let cptCodes = null
let icd10Codes = null
let medicareRates = null

async function loadJSON(path, cache, setter) {
  if (cache) return cache
  try {
    const res = await fetch(path)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    setter(data)
    return data
  } catch (err) {
    console.error(`Failed to load ${path}:`, err)
    return {}
  }
}

async function loadCptCodes() {
  return loadJSON('/data/cpt-codes.json', cptCodes, d => { cptCodes = d })
}

async function loadIcd10Codes() {
  return loadJSON('/data/icd10-codes.json', icd10Codes, d => { icd10Codes = d })
}

async function loadMedicareRates() {
  return loadJSON('/data/medicare-rates.json', medicareRates, d => { medicareRates = d })
}

export async function decodeLineItems(lineItems) {
  const [cpt, icd10, rates] = await Promise.all([loadCptCodes(), loadIcd10Codes(), loadMedicareRates()])

  return lineItems.map(item => {
    const lookup = item.codeType === 'CPT' ? cpt : icd10
    const found = lookup[item.code]
    const rateEntry = rates[item.code]
    return {
      ...item,
      plainEnglish: found?.description ?? `Unknown code ${item.code}`,
      category: found?.category ?? 'Unknown',
      medicareRate: rateEntry?.rate ?? null,
      medicareLabel: rateEntry?.label ?? null,
    }
  })
}
