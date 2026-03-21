import 'dotenv/config'

export const abacusConfig = {
  apiKey: process.env.ABACUS_API_KEY,
  baseUrl: process.env.ABACUS_API_URL || 'https://api.abacus.ai'
}

export async function abacusFetch(endpoint, options = {}) {
  const url = `${abacusConfig.baseUrl}${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'apikey': abacusConfig.apiKey,
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Abacus.ai API error ${response.status}: ${error}`)
  }
  return response.json()
}