// HeroVisual — lazy-loads the 3D hero, shows static poster first (LCP element)
// Mirrors Appendix C of SAMPADA_UI_MODERNIZATION.md
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
  return webgl && wide && !reduced && !saveData && cores > 4
}

export default function HeroVisual() {
  const [enable, setEnable] = useState(false)

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
    <div className="hero-visual" style={{ aspectRatio: '1 / 1', position: 'relative' }}>
      <HeroPoster />
      {enable && (
        <Suspense fallback={null}>
          <Hero3D />
        </Suspense>
      )}
    </div>
  )
}