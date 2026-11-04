import { api } from './api'

// Kill switches mirror the backend FeatureFlags::FEATURES. Cached in
// localStorage so gates still evaluate offline.
const KNOWN = ['pdf_import', 'recurring_detection', 'passkeys']
const CACHE_KEY = 'sampada_flags'

export async function fetchFlags() {
  try {
    const { flags } = await api.request('/api/v1/feature_flags')
    localStorage.setItem(CACHE_KEY, JSON.stringify(flags))
    return flags
  } catch {
    return readCache()
  }
}

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}
  } catch {
    return {}
  }
}

// A flag is on unless the backend explicitly marked it off (or it is unknown).
export function enabled(name, flags = readCache()) {
  return KNOWN.includes(name) && flags[name] !== false
}
