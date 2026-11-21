// Best-effort client error reporting. Never throws, never blocks navigation.
const API = import.meta.env.VITE_API_URL || ''

export function reportError(error, context = {}) {
  try {
    const payload = JSON.stringify({
      message: String(error?.message || error || 'unknown error').slice(0, 1000),
      stack: String(error?.stack || '').slice(0, 4000),
      path: context.path || window.location.pathname,
    })
    fetch(`${API}/api/v1/client_errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // telemetry must never be the reason the app breaks
  }
}
