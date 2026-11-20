import { enqueue } from './offlineQueue'

const API = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  let res
  try {
    res = await fetch(`${API}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    })
  } catch (err) {
    // Mutating call with no network while offline — queue it for replay.
    if (options.method && options.method !== 'GET' && !navigator.onLine) {
      await enqueue(options.method, path, options.body)
      throw new Error('Offline — change queued, will sync when back online')
    }
    throw err
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err = new Error(body.error || body.message || res.statusText)
    err.status = res.status
    throw err
  }
  return res.status === 204 ? null : res.json()
}

async function requestRaw(path, options = {}) {
  const res = await fetch(`${API}${path}`, { ...options })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText)
  return res
}

// Worker auth client — same-origin via the /api/worker proxy branch.
// 15s timeout, {error} parsing, err.status preserved for callers.
const WORKER_AUTH_URL = API ? `${API}/api/v1/auth` : '/api/worker/api/v1/auth'

async function workerRequest(path, options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(`${WORKER_AUTH_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      credentials: 'include', // sampada_session cookie via the same-origin proxy
      ...options,
      signal: controller.signal,
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({}))
      throw new Error(error.error || error.message || res.statusText)
    }
    return res.status === 204 ? null : res.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

export const workerAuth = {
  beginRegister: (data) => workerRequest('/register/begin', {
    method: 'POST',
    body: JSON.stringify({ email: data.email, firstName: data.firstName, lastName: data.lastName, adultAttested: true }),
  }),

  finishRegister: (credentialJSON, email) => workerRequest('/register/finish', {
    method: 'POST',
    body: JSON.stringify({ credential: credentialJSON, email }),
  }),

  beginLogin: (email) => workerRequest('/login/begin', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),

  finishLogin: (credentialJSON, email) => workerRequest('/login/finish', {
    method: 'POST',
    body: JSON.stringify({ credential: credentialJSON, email }),
  }),

  me: () => workerRequest('/me'),

  magicLinkRequest: (email, turnstileToken) => workerRequest('/magic-link/request', {
    method: 'POST',
    body: JSON.stringify({ email, turnstileToken }),
  }),

  magicLinkVerify: (token) => workerRequest('/magic-link/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  }),

  otpRequest: (data) => workerRequest('/otp/request', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  otpVerify: (email, code) => workerRequest('/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  }),

  logout: () => workerRequest('/logout', { method: 'POST', body: '{}' }),
}

export const api = {
  request: (path, opts) => request(path, opts),
  // Returns the Response itself — for file downloads (CSV/JSON blob) where
  // parsing as JSON would throw.
  raw: (path, opts) => requestRaw(path, opts),
  dashboard: () => request('/api/v1/dashboard'),
  dashboardProjection: () => request('/api/v1/dashboard/projection'),
  onboardingSnapshot: () => request('/api/v1/onboarding/snapshot'),
  onboardingComplete: () => request('/api/v1/onboarding/complete', { method: 'POST' }),

  // Rebalance v2
  rebalanceV2: (portfolioId, contribution) =>
    request(`/api/v1/portfolios/${portfolioId}/rebalance_v2`, {
      method: 'POST',
      body: JSON.stringify({ contribution }),
    }),
  rebalanceConfig: (portfolioId) => request(`/api/v1/portfolios/${portfolioId}/rebalance_config`),
  updateRebalanceConfig: (portfolioId, config) =>
    request(`/api/v1/portfolios/${portfolioId}/rebalance_config`, {
      method: 'PUT',
      body: JSON.stringify({ rebalance_config: config }),
    }),
  importInvestments: (portfolioId, file, preview = false) => {
    const formData = new FormData()
    formData.append('file', file)
    return request(`/api/v1/portfolios/${portfolioId}/import_investments${preview ? '?preview=true' : ''}`, {
      method: 'POST',
      headers: {}, // Let browser set Content-Type with boundary
      body: formData,
    })
  },
}
