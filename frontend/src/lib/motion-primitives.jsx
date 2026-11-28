// Motion primitives (Step 3). opacity+transform only; reduced motion renders final state instantly.
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { m, useInView } from 'motion/react'
import { DUR, EASE, EASE_EXPO_OUT, EASE_SPRING, EASE_OUT } from './motion'

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Animates a number to `value` on (first) entry into view. Reduced motion → final value immediately.
export function useCountUp(value, { duration = 0.9, decimals = 0, enabled = true } = {}) {
  const reduce = prefersReducedMotion()
  const [display, setDisplay] = useState(reduce || !enabled ? value : 0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  const raf = useRef(0)

  useEffect(() => {
    if (reduce || !enabled || !inView) return
    const start = performance.now()
    const from = 0
    const tick = (now) => {
      const t = Math.min((now - start) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic (mirrors EASE_SPRING)
      setDisplay(from + (value - from) * eased)
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value, reduce, enabled, inView, duration])

  return { ref, display: display.toFixed(decimals) }
}

// Single fade-up entrance, once, when scrolled into view. No repeat, no stagger.
// Uses expo-out easing for premium entrance feel. Reduced motion → final state immediately.
export function Reveal({ children, y = 12, delay = 0, ...props }) {
  const seconds = delay > 1 ? delay / 1000 : delay
  const reduce = prefersReducedMotion()
  if (reduce) return <div {...props}>{children}</div>
  return (
    <m.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.slower, ease: EASE_EXPO_OUT, delay: seconds }}
      {...props}
    >
      {children}
    </m.div>
  )
}

// Route change fade, ≤200 ms. Keyed by pathname so each route mounts fresh.
// Uses ease-out for quick exit feel.
export function PageTransition({ children }) {
  const { pathname } = useLocation()
  if (prefersReducedMotion()) return <>{children}</>
  return (
    <m.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DUR.fast, ease: EASE_OUT }}
    >
      {children}
    </m.div>
  )
}