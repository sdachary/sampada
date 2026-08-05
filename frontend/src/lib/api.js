const API = import.meta.env.VITE_API_URL || ''
// Same-origin path — served by the CF Pages Functions proxy in functions/[[path]].js
const BETTER_AUTH_URL = import.meta.env.VITE_BETTER_AUTH_URL || '/auth/v2'

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

export const api = {
  request: (path, opts) => request(path, opts),
  dashboard: () => request('/api/v1/dashboard'),
  dashboardProjection: () => request('/api/v1/dashboard/projection'),
}

export const auth = {
  // Better-Auth direct endpoints
  register: (data) => betterAuthRequest('/sign-up/email', {
    method: 'POST',
    body: JSON.stringify({ email: data.email, password: data.password, name: `${data.first_name} ${data.last_name}`.trim() }),
  }),

  login: (data) => betterAuthRequest('/sign-in/email', {
    method: 'POST',
    body: JSON.stringify({ email: data.email, password: data.password }),
  }),

  logout: () => betterAuthRequest('/sign-out', { method: 'POST' }),

  me: () => betterAuthRequest('/get-session'),

  forgotPassword: (email) => betterAuthRequest('/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),

  resetPassword: (token, password) => betterAuthRequest('/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  }),

  // OAuth - redirect to Better-Auth
  google: () => `${BETTER_AUTH_URL}/sign-in/social/google`,
  github: () => `${BETTER_AUTH_URL}/sign-in/social/github`,
}