// src/components/Canvas.jsx
// Canvas interactivo de dibujo.
//
// Props:
//   points   → [{ x, y }]  array de puntos del estado de useCanvas
//   onDraw   → (x, y) => void  función sendPoint de useCanvas
//   disabled → boolean  deshabilita clics cuando no hay plano activo
import { useEffect, useRef } from 'react'

const W = 600
const H = 400

export default function Canvas({ points, onDraw, disabled }) {
  const canvasRef = useRef(null)

  // ── Redibuja cada vez que cambia el array de puntos ──────────────────────
  // useEffect detecta el cambio en `points` (referencia nueva en cada setPoints)
  // y vuelve a pintar el canvas completo desde cero.
  // Esto es seguro porque el estado de React es inmutable: cada update crea
  // un array nuevo, por lo que el efecto siempre se dispara.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    // 1. Borra el canvas
    ctx.clearRect(0, 0, W, H)
    if (!points.length) return

    // 2. Dibuja la polilínea completa
    ctx.beginPath()
    ctx.strokeStyle = '#2b6cb0'
    ctx.lineWidth   = 2
    ctx.lineJoin    = 'round'
    ctx.lineCap     = 'round'
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y)
      else         ctx.lineTo(p.x, p.y)
    })
    ctx.stroke()

    // 3. Marca cada punto con un círculo pequeño
    ctx.fillStyle = '#e53e3e'
    points.forEach((p) => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
      ctx.fill()
    })
  }, [points])

  // ── Captura el clic y calcula coordenadas relativas al canvas ──────────────
  function handleClick(e) {
    if (disabled) return
    const rect = e.target.getBoundingClientRect()
    const x = Math.round(e.clientX - rect.left)
    const y = Math.round(e.clientY - rect.top)
    onDraw(x, y)   // Delega en useCanvas → publishPoint → STOMP
    // El canvas NO se actualiza aquí: espera el eco del broker.
  }

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      onClick={handleClick}
      style={{
        border:       '2px solid #cbd5e0',
        borderRadius: 12,
        cursor:       disabled ? 'not-allowed' : 'crosshair',
        opacity:      disabled ? 0.5 : 1,
        display:      'block',
      }}
    />
  )
}
