// HeroVisual — lazy-loads the 3D hero, shows static poster first (LCP element)
// Cross-fades to 3D on first frame. Mirrors Appendix C of SAMPADA_UI_MODERNIZATION.md
import { lazy, Suspense, useEffect, useState } from 'react'
import HeroPoster from './HeroPoster'

const Hero3D = lazy(() => import('./Hero3D'))

function canRender3D() {
  if (typeof window === 'undefined') return false
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const wide = window.innerWidth >= 768
  const nav = navigator
  const saveData = nav.connection?.saveData === true
  const cores = nav.hardwareConcurrency ?? 8
  const canvas = document.createElement('canvas')
  const webgl = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  return webgl && !reduced && !saveData && cores > 4
}

export default function HeroVisual() {
  const [enable, setEnable] = useState(false)
  const [show3D, setShow3D] = useState(false)

  useEffect(() => {
    const go = () => setEnable(canRender3D())
    const id = 'requestIdleCallback' in window
      ? (window).requestIdleCallback(go)
      : window.setTimeout(go, 800)
    return () => ('cancelIdleCallback' in window
      ? (window).cancelIdleCallback(id)
      : clearTimeout(id))
  }, [])

  return (
    <div className="hero-visual" style={{ aspectRatio: '1 / 1', position: 'relative', overflow: 'hidden', width: '100%', height: '100%', minWidth: 0 }}>
      {/* Static poster — LCP element, cross-fades out once the 3D first frame is up */}
      <HeroPoster
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: show3D ? 0 : 1,
          transition: 'opacity 600ms ease-out',
          pointerEvents: 'none',
        }}
      />
      {enable && (
        <Suspense fallback={null}>
          {/* Subtle scale settle alongside the fade — 3D only mounts when
              prefers-reduced-motion is off (canRender3D), so RM users never
              see the transform. */}
          <div style={{ position: 'absolute', inset: 0, opacity: show3D ? 1 : 0, transform: show3D ? 'scale(1)' : 'scale(0.97)', transition: 'opacity 600ms ease-out, transform 600ms ease-out' }}>
            <Hero3D onReady={() => setShow3D(true)} />
          </div>
        </Suspense>
      )}
    </div>
  )
}