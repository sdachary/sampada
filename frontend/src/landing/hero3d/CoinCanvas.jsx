import { useEffect, useRef } from 'react'

// Solid coin rendered from a rotating cylinder. Canvas 2D maths, no WebGL
// chunk: faces and rim are one shaded surface, so rotation reads as a real object.
const SIZE = 168
const R = 62
const T = 15
const SEGMENTS = 64
const LIGHT = [-0.35, -0.55, 0.76]

function rotate(x, y, z, pitch, yaw) {
  const cy = Math.cos(pitch); const sy = Math.sin(pitch)
  const y1 = y * cy - z * sy; const z1 = y * sy + z * cy
  const cx = Math.cos(yaw); const sx = Math.sin(yaw)
  return { x: x * cx + z1 * sx, y: y1, z: -x * sx + z1 * cx }
}

function paint(ctx, pitch, yaw) {
  const cx = SIZE / 2; const cy = SIZE / 2
  const pt = (a, z) => {
    const p = rotate(R * Math.cos(a), R * Math.sin(a), z, pitch, yaw)
    return { x: cx + p.x, y: cy + p.y, z: p.z, a }
  }
  const front = Array.from({ length: SEGMENTS }, (_, i) => pt((i / SEGMENTS) * Math.PI * 2, T / 2))
  const back = Array.from({ length: SEGMENTS }, (_, i) => pt((i / SEGMENTS) * Math.PI * 2, -T / 2))
  const path = (points) => {
    ctx.beginPath()
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
    ctx.closePath()
  }

  const faceNormal = rotate(0, 0, 1, pitch, yaw)
  const backFirst = faceNormal.z < 0
  const drawFace = (points, isFront) => {
    const grad = ctx.createRadialGradient(cx - 22, cy - 26, 4, cx, cy, R * 1.35)
    if (isFront) { grad.addColorStop(0, '#f9c4b2'); grad.addColorStop(0.55, '#ed6f5c'); grad.addColorStop(1, '#b3402f') }
    else { grad.addColorStop(0, '#c45a4a'); grad.addColorStop(1, '#7d2b1f') }
    path(points); ctx.fillStyle = grad; ctx.fill()
    path(points); ctx.strokeStyle = isFront ? 'rgba(125,43,31,.32)' : 'rgba(80,25,18,.4)'; ctx.lineWidth = 2; ctx.stroke()
  }

  if (backFirst) drawFace(back, false)

  const quads = []
  for (let i = 0; i < SEGMENTS; i++) {
    const j = (i + 1) % SEGMENTS
    const n = rotate(Math.cos(((i + 0.5) / SEGMENTS) * Math.PI * 2), Math.sin(((i + 0.5) / SEGMENTS) * Math.PI * 2), 0, pitch, yaw)
    const depth = (front[i].z + front[j].z + back[i].z + back[j].z) / 4
    const light = Math.max(0, n.x * LIGHT[0] + n.y * LIGHT[1] + n.z * LIGHT[2])
    quads.push({ points: [front[i], front[j], back[j], back[i]], depth, light })
  }
  quads.sort((a, b) => a.depth - b.depth)
  for (const q of quads) {
    const b = 0.52 + 0.48 * q.light
    path(q.points)
    ctx.fillStyle = `rgb(${Math.round(214 * b)}, ${Math.round(96 * b)}, ${Math.round(78 * b)})`
    ctx.fill()
  }

  if (!backFirst) drawFace(front, true)

  // Embossed glyph follows the front face plane and foreshortens with it.
  if (!backFirst) {
    const u = rotate(R, 0, T / 2, pitch, yaw)
    const v = rotate(0, R, T / 2, pitch, yaw)
    const ux = u.x / R; const uy = u.y / R; const vx = v.x / R; const vy = v.y / R
    ctx.save()
    ctx.setTransform(ux, uy, vx, vy, cx, cy)
    ctx.font = '700 62px "Noto Sans Devanagari", "Nirmala UI", sans-serif'
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255,214,200,.55)'; ctx.fillText('सं', 1, 2)
    ctx.fillStyle = '#7d2b1f'; ctx.fillText('सं', 0, 0)
    ctx.restore()
  }
}

export default function CoinCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = SIZE * dpr; canvas.height = SIZE * dpr
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      paint(ctx, -0.28, -0.34); return
    }

    let pitch = -0.28; let yaw = -0.34
    let vp = 0; let vy = 0
    let dragging = false; let lx = 0; let ly = 0; let lt = 0; let lastInput = 0
    let frame
    const render = () => {
      if (!dragging) {
        vp *= 0.94; vy *= 0.94
        pitch += vp; yaw += vy
        if (Math.abs(vp) < 0.001 && Math.abs(vy) < 0.001 && performance.now() - lastInput > 700) yaw += 0.0022
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, SIZE, SIZE)
      paint(ctx, pitch, yaw)
      frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)

    const down = (e) => { dragging = true; lx = e.clientX; ly = e.clientY; lt = performance.now(); vp = vy = 0; canvas.setPointerCapture?.(e.pointerId) }
    const move = (e) => {
      if (!dragging) return
      const dx = e.clientX - lx; const dy = e.clientY - ly
      const dt = Math.max(16, performance.now() - lt)
      yaw += dx * 0.008; pitch += dy * 0.008
      vy = (dx * 0.008 * 16) / dt; vp = (dy * 0.008 * 16) / dt
      lx = e.clientX; ly = e.clientY; lt = performance.now(); lastInput = performance.now()
    }
    const up = (e) => { dragging = false; lastInput = performance.now(); canvas.releasePointerCapture?.(e.pointerId) }
    const key = (e) => {
      const step = 0.18
      if (e.key === 'ArrowLeft') yaw -= step
      else if (e.key === 'ArrowRight') yaw += step
      else if (e.key === 'ArrowUp') pitch -= step
      else if (e.key === 'ArrowDown') pitch += step
      else return
      e.preventDefault(); lastInput = performance.now()
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    canvas.addEventListener('keydown', key)
    return () => {
      cancelAnimationFrame(frame)
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('keydown', key)
    }
  }, [])

  return <canvas ref={canvasRef} className="coin-canvas" width={SIZE} height={SIZE} role="img" tabIndex={0} aria-label="Sampada coin marked with सं. Drag to roll it." />
}
