import { useEffect, useRef } from 'react'

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let loader

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT
      script.async = true
      script.onload = () => resolve(window.turnstile)
      script.onerror = () => reject(new Error('Turnstile failed to load'))
      document.head.appendChild(script)
    })
  }
  return loader
}

// Explicit render so the widget is owned by this component and cleaned up on
// unmount. Site key is a public Pages env var; the secret stays in the Worker.
export default function Turnstile({ onToken }) {
  const host = useRef(null)
  const widget = useRef(null)
  const callback = useRef(onToken)
  callback.current = onToken
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!siteKey || !host.current) return
    let cancelled = false
    loadTurnstile()
      .then((ts) => {
        if (cancelled || !host.current) return
        widget.current = ts.render(host.current, {
          sitekey: siteKey,
          callback: (token) => callback.current(token),
          'expired-callback': () => callback.current(''),
          'error-callback': () => callback.current(''),
        })
      })
      .catch(() => callback.current(''))
    return () => {
      cancelled = true
      if (widget.current !== null && window.turnstile) window.turnstile.remove(widget.current)
    }
  }, [siteKey])

  if (!siteKey) {
    return <p className="text-sm text-danger">Sign-in links are unavailable: Turnstile is not configured.</p>
  }
  return <div ref={host} className="my-2" />
}
