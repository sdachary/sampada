// Motion primitives (Step 3). opacity+transform only; reduced motion renders final state instantly.
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { m, useInView } from 'motion/react'
import { DUR, EASE } from './motion'

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
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setDisplay(from + (value - from) * eased)
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value, reduce, enabled, inView, duration])

  return { ref, display: display.toFixed(decimals) }
}

// Single fade-up entrance, once, when scrolled into view. No repeat, no stagger.
// FIX: If element is already in viewport on mount, show immediately without animation
export function Reveal({ children, y = 12, delay = 0, ...props }) {
  if (prefersReducedMotion()) return <div {...props}>{children}</div>
  
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  const [mounted, setMounted] = useState(false)
  
  // If already in viewport on mount, show immediately
  useEffect(() => {
    if (inView) setMounted(true)
  }, [inView])
  
  // Also check on mount if element is already visible
  useEffect(() => {
    const el = ref.current
    if (el && isElementInViewport(el)) {
      setMounted(true)
    }
  }, [])
  
  // Fallback: show after 500ms if inView hasn't triggered (handles edge cases)
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 500)
    return () => clearTimeout(timer)
  }, [])
  
  if (mounted || inView) {
    return (
      <m.div
        ref={ref}
        initial={mounted ? false : { opacity: 0, y }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.slow, ease: EASE, delay }}
        {...props}
      >
        {children}
      </m.div>
    )
  }
  
  return (
    <m.div
      ref={ref}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: DUR.slow, ease: EASE, delay }}
      {...props}
    >
      {children}
    </m.div>
  )
}

function isElementInViewport(el) {
  const rect = el.getBoundingClientRect()
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  )
}

// Route change fade, ≤200 ms. Keyed by pathname so each route mounts fresh.
export function PageTransition({ children }) {
  const { pathname } = useLocation()
  if (prefersReducedMotion()) return <>{children}</>
  return (
    <m.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DUR.base, ease: EASE }}
    >
      {children}
    </m.div>
  )
}