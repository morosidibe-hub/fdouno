import { useEffect, useRef } from 'react'
import { PALETTE, createGlowSprite, fitCanvas } from '../lib/canvas'

const MAX_PARTICLES = 260

/**
 * Traînée de poussière d'étoiles qui suit le doigt (ou la souris) sur un conteneur.
 * Les écouteurs `touchmove` sont passifs : le défilement de la page reste fluide.
 * La boucle d'animation ne tourne que tant qu'il reste des particules visibles.
 * @param {import('react').RefObject<HTMLElement>} containerRef conteneur en `position: relative`
 * @returns {import('react').RefObject<HTMLCanvasElement>} ref à poser sur un <canvas> absolu
 */
export function useStardustTrail(containerRef) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    const ctx = canvas.getContext('2d')
    const sprites = [PALETTE.gold, PALETTE.goldLight, PALETTE.roseGold, PALETTE.blush].map((c) => createGlowSprite(c))
    const particles = []
    let width = 0
    let height = 0
    let raf = 0
    let running = false
    let last = 0

    const resize = () => {
      const rect = container.getBoundingClientRect()
      width = rect.width
      height = rect.height
      fitCanvas(canvas, width, height)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)

    const loop = (now) => {
      const dt = Math.min((now - last) / 16.67, 3)
      last = now
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter'
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life -= 0.018 * dt
        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }
        p.vy -= 0.01 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        const size = p.size * (0.4 + p.life * 0.6)
        ctx.globalAlpha = p.life
        ctx.drawImage(p.sprite, p.x - size / 2, p.y - size / 2, size, size)
      }
      ctx.globalAlpha = 1
      if (particles.length) {
        raf = requestAnimationFrame(loop)
      } else {
        running = false
        ctx.clearRect(0, 0, width, height)
      }
    }

    const spawn = (clientX, clientY) => {
      const rect = container.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return
      for (let i = 0; i < 3; i++) {
        particles.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 1.2,
          vy: -Math.random() * 1.2 - 0.2,
          size: 6 + Math.random() * 12,
          life: 1,
          sprite: sprites[Math.floor(Math.random() * sprites.length)],
        })
      }
      if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES)
      if (!running) {
        running = true
        last = performance.now()
        raf = requestAnimationFrame(loop)
      }
    }

    const onPointerMove = (e) => {
      if (e.pointerType !== 'touch') spawn(e.clientX, e.clientY)
    }
    const onTouch = (e) => {
      for (const touch of e.touches) spawn(touch.clientX, touch.clientY)
    }

    container.addEventListener('pointermove', onPointerMove, { passive: true })
    container.addEventListener('touchstart', onTouch, { passive: true })
    container.addEventListener('touchmove', onTouch, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('touchstart', onTouch)
      container.removeEventListener('touchmove', onTouch)
    }
  }, [containerRef])

  return canvasRef
}
