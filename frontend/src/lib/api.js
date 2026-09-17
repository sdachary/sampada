const API = import.meta.env.VITE_API_URL || ''
// Same-origin path — served by the CF Pages Functions proxy in functions/[[path]].js
const BETTER_AUTH_URL = import.meta.env.VITE_BETTER_AUTH_URL || '/api/auth'

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText)
  return res.status === 204 ? null : res.json()
}

async function betterAuthRequest(path, options = {}) {
  const res = await fetch(`${BETTER_AUTH_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include', // Cookie-only sessions via the same-origin proxy
    ...options,
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.error || error.message || res.statusText)
  }
  return res.status === 204 ? null : res.json()
}

async function requestRaw(path, options = {}) {
  const res = await fetch(`${API}${path}`, { ...options })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText)
  return res
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
}

export const auth = {
  // Better-Auth direct endpoints.
  // `website` is the honeypot field (see functions/[[path]].js): always sent,
  // empty for humans, filled only by form-filling bots.
  register: (data) => betterAuthRequest('/sign-up/email', {
    method: 'POST',
    body: JSON.stringify({ email: data.email, password: data.password, name: `${data.first_name} ${data.last_name}`.trim(), app: 'sampada', website: data.website || '' }),
  }),

  login: (data) => betterAuthRequest('/sign-in/email', {
    method: 'POST',
    body: JSON.stringify({ email: data.email, password: data.password, website: data.website || '' }),
  }),

  logout: () => betterAuthRequest('/sign-out', { method: 'POST' }),

  me: () => betterAuthRequest('/get-session'),

  forgotPassword: (email, website = '') => betterAuthRequest('/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email, redirectTo: `${window.location.origin}/reset-password`, website }),
  }),

  resetPassword: (token, newPassword) => betterAuthRequest('/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  }),

  // OAuth - redirect to Better-Auth
  google: () => `${BETTER_AUTH_URL}/sign-in/social/google`,
  github: () => `${BETTER_AUTH_URL}/sign-in/social/github`,
}