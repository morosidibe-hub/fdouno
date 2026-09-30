import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { PALETTE, createGlowSprite, createHeartSprite, fitCanvas } from '../../lib/canvas'

const DUST_COUNT = 130
const HEART_COUNT = 16
const GRAVITY = 0.035
const DRAG = 0.965

/**
 * Explosion de poussière d'or et de cœurs lumineux au centre de son conteneur.
 * Chaque nouvelle valeur de `burstKey` (> 0) relance une gerbe ; la boucle rAF
 * ne tourne que tant que des particules sont vivantes.
 * @param {{ burstKey: number }} props
 */
export default function StardustBurst({ burstKey }) {
  const canvasRef = useRef(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!burstKey || reduceMotion) return
    const canvas = canvasRef.current
    const { clientWidth: width, clientHeight: height } = canvas.parentElement
    fitCanvas(canvas, width, height)
    const ctx = canvas.getContext('2d')
    const dust = [createGlowSprite(PALETTE.gold, 48), createGlowSprite(PALETTE.goldLight, 48), createGlowSprite(PALETTE.blush, 48)]
    const hearts = [createHeartSprite(PALETTE.neon, 64), createHeartSprite(PALETTE.roseGold, 64), createHeartSprite(PALETTE.gold, 64)]
    const cx = width / 2
    const cy = height / 2

    const spawn = (count, sprites, speed, size, life) =>
      Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2
        const v = speed * (0.35 + Math.random() * 0.65)
        return {
          x: cx,
          y: cy,
          vx: Math.cos(angle) * v,
          vy: Math.sin(angle) * v - 1.2,
          size: size * (0.5 + Math.random() * 0.8),
          life: life * (0.6 + Math.random() * 0.4),
          age: 0,
          spin: (Math.random() - 0.5) * 0.08,
          rotation: (Math.random() - 0.5) * 0.6,
          sprite: sprites[Math.floor(Math.random() * sprites.length)],
        }
      })

    const particles = [...spawn(DUST_COUNT, dust, 7, 10, 90), ...spawn(HEART_COUNT, hearts, 4.5, 26, 120)]
    let raf = 0
    let last = performance.now()

    const frame = (now) => {
      const dt = Math.min((now - last) / 16.67, 3)
      last = now
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter'

      let alive = 0
      for (const p of particles) {
        p.age += dt
        if (p.age >= p.life) continue
        alive++
        p.vx *= DRAG ** dt
        p.vy = p.vy * DRAG ** dt + GRAVITY * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rotation += p.spin * dt
        const t = p.age / p.life
        ctx.globalAlpha = t < 0.1 ? t * 10 : 1 - (t - 0.1) / 0.9
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.drawImage(p.sprite, -p.size / 2, -p.size / 2, p.size, p.size)
        ctx.restore()
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      if (alive > 0) raf = requestAnimationFrame(frame)
      else ctx.clearRect(0, 0, width, height)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [burstKey, reduceMotion])

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 z-30" />
}
