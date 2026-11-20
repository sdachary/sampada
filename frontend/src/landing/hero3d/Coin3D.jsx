import { useEffect, useRef } from 'react'

// CSS-3D coin: idle spin, pointer drag rolls it in place, inertia decays.
// No WebGL dependency, and transform-only animation.
const SLICES = Array.from({ length: 64 }, (_, i) => i * 5.625)

export default function Coin3D() {
  const coinRef = useRef(null)

  useEffect(() => {
    const coin = coinRef.current
    if (!coin || matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let rotX = -18
    let rotY = -20
    let velX = 0
    let velY = 0
    let dragging = false
    let lastX = 0
    let lastY = 0
    let lastT = 0
    let lastInteraction = 0
    let frame

    const render = () => {
      if (!dragging) {
        velX *= 0.95
        velY *= 0.95
        rotX += velX
        rotY += velY
        if (Math.abs(velX) < 0.02 && Math.abs(velY) < 0.02 && performance.now() - lastInteraction > 700) {
          rotY += 0.12 // idle spin resumes once the roll has settled
        }
      }
      coin.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`
      frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)

    const down = (e) => {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      lastT = performance.now()
      velX = velY = 0
      coin.setPointerCapture?.(e.pointerId)
    }
    const move = (e) => {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      const dt = Math.max(16, performance.now() - lastT)
      rotY += dx * 0.45
      rotX -= dy * 0.45
      velY = (dx * 0.45 * 16) / dt
      velX = (-dy * 0.45 * 16) / dt
      lastX = e.clientX
      lastY = e.clientY
      lastT = performance.now()
      lastInteraction = performance.now()
    }
    const up = (e) => {
      dragging = false
      lastInteraction = performance.now()
      coin.releasePointerCapture?.(e.pointerId)
    }
    const key = (e) => {
      const step = 12
      if (e.key === 'ArrowLeft') rotY -= step
      else if (e.key === 'ArrowRight') rotY += step
      else if (e.key === 'ArrowUp') rotX -= step
      else if (e.key === 'ArrowDown') rotX += step
      else return
      e.preventDefault()
      lastInteraction = performance.now()
    }

    coin.addEventListener('pointerdown', down)
    coin.addEventListener('pointermove', move)
    coin.addEventListener('pointerup', up)
    coin.addEventListener('pointercancel', up)
    coin.addEventListener('keydown', key)
    return () => {
      cancelAnimationFrame(frame)
      coin.removeEventListener('pointerdown', down)
      coin.removeEventListener('pointermove', move)
      coin.removeEventListener('pointerup', up)
      coin.removeEventListener('pointercancel', up)
      coin.removeEventListener('keydown', key)
    }
  }, [])

  return (
    <div className="coin-stage" aria-label="Sampada coin marked with सं. Drag to roll it." role="img" tabIndex={0}>
      <div className="coin-float">
        <div className="coin-shadow" aria-hidden="true" />
        <div className="coin" ref={coinRef}>
          <div className="coin-edge" aria-hidden="true">
            {SLICES.map((deg) => (
              <span
                key={deg}
                style={{
                  transform: `rotate(${deg}deg) translateY(-78px)`,
                  filter: `brightness(${0.72 + 0.28 * Math.cos((deg * Math.PI) / 180)})`,
                }}
              />
            ))}
          </div>
          <div className="coin-face coin-face--front" aria-hidden="true">सं</div>
          <div className="coin-face coin-face--back" aria-hidden="true">सं</div>
        </div>
      </div>
    </div>
  )
}
