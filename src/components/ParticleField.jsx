import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { PALETTE, createGlowSprite, createHeartSprite, createPetalSprite, fitCanvas } from '../lib/canvas'

const REPEL_RADIUS = 120
const MAX_TAP_HEARTS = 60

/**
 * Moteur de particules plein écran, en fond de page :
 * - poussière d'or qui monte et s'intensifie avec la musique (`getLevel`) ;
 * - cœurs lumineux qui flottent vers le haut ;
 * - pétales de sakura qui tombent en virevoltant ;
 * - petits cœurs qui s'envolent à chaque toucher.
 * Tous les sprites sont pré-rendus hors écran ; la boucle se met en pause quand l'onglet est caché.
 * @param {{ getLevel?: () => number }} props
 */
export default function ParticleField({ getLevel }) {
  const canvasRef = useRef(null)
  const getLevelRef = useRef(getLevel)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    getLevelRef.current = getLevel
  }, [getLevel])

  useEffect(() => {
    if (reduceMotion) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const glow = [PALETTE.gold, PALETTE.gold, PALETTE.goldLight, PALETTE.roseGold, PALETTE.blush].map((c) => createGlowSprite(c))
    const heartSprites = [createHeartSprite(PALETTE.neon), createHeartSprite(PALETTE.roseGold), createHeartSprite(PALETTE.gold)]
    const petalSprite = createPetalSprite()
    const pointer = { x: -9999, y: -9999 }
    const tapHearts = []
    let width = 0
    let height = 0
    let raf = 0
    let last = performance.now()
    let level = 0

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      fitCanvas(canvas, width, height)
    }
    resize()

    const spawnDust = (initial) => ({
      x: Math.random() * width,
      y: initial ? Math.random() * height : height + 20,
      r: 1 + Math.random() * 2.4,
      vy: 0.12 + Math.random() * 0.4,
      vx: (Math.random() - 0.5) * 0.12,
      depth: 0.35 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
      sprite: glow[Math.floor(Math.random() * glow.length)],
    })

    const spawnHeart = (initial) => ({
      x: Math.random() * width,
      y: initial ? Math.random() * height : height + 40,
      size: 14 + Math.random() * 16,
      vy: 0.25 + Math.random() * 0.35,
      phase: Math.random() * Math.PI * 2,
      sprite: heartSprites[Math.floor(Math.random() * heartSprites.length)],
    })

    const spawnPetal = (initial) => ({
      x: Math.random() * width,
      y: initial ? Math.random() * height : -30,
      size: 10 + Math.random() * 10,
      vy: 0.5 + Math.random() * 0.7,
      sway: 0.6 + Math.random() * 1.2,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.04,
      flip: Math.random() * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
    })

    const dust = Array.from({ length: coarse ? 45 : 80 }, () => spawnDust(true))
    const hearts = Array.from({ length: coarse ? 7 : 12 }, () => spawnHeart(true))
    const petals = Array.from({ length: coarse ? 14 : 24 }, () => spawnPetal(true))

    const releaseTapHearts = (x, y) => {
      for (let i = 0; i < 6 && tapHearts.length < MAX_TAP_HEARTS; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8
        const speed = 1.2 + Math.random() * 2.2
        tapHearts.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 12 + Math.random() * 12,
          life: 1,
          sprite: heartSprites[i % heartSprites.length],
          spin: (Math.random() - 0.5) * 0.08,
          rotation: (Math.random() - 0.5) * 0.6,
        })
      }
    }

    const onMove = (e) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
    }
    const onDown = (e) => {
      onMove(e)
      releaseTapHearts(e.clientX, e.clientY)
    }
    const onUp = (e) => {
      if (e.pointerType !== 'mouse') pointer.x = pointer.y = -9999
    }

    const drawRotated = (sprite, x, y, w, h, rotation) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rotation)
      ctx.drawImage(sprite, -w / 2, -h / 2, w, h)
      ctx.restore()
    }

    const frame = (now) => {
      const dt = Math.min((now - last) / 16.67, 3)
      last = now
      level += ((getLevelRef.current?.() ?? 0) - level) * 0.15
      ctx.clearRect(0, 0, width, height)

      ctx.globalCompositeOperation = 'lighter'
      for (const p of dust) {
        p.y -= p.vy * (1 + level * 4) * p.depth * dt
        p.x += (p.vx + Math.sin(now * 0.0006 + p.phase) * 0.2) * dt
        const dx = p.x - pointer.x
        const dy = p.y - pointer.y
        const dist = Math.hypot(dx, dy)
        if (dist < REPEL_RADIUS && dist > 0) {
          const force = (1 - dist / REPEL_RADIUS) * 2.4 * dt
          p.x += (dx / dist) * force
          p.y += (dy / dist) * force
        }
        if (p.y < -30 || p.x < -30 || p.x > width + 30) Object.assign(p, spawnDust(false))
        const twinkle = 0.5 + 0.5 * Math.sin(now * 0.002 + p.phase)
        const size = p.r * (6 + level * 14) * p.depth
        ctx.globalAlpha = Math.min(1, (0.2 + twinkle * 0.4 + level * 0.5) * p.depth)
        ctx.drawImage(p.sprite, p.x - size / 2, p.y - size / 2, size, size)
      }

      for (const h of hearts) {
        h.y -= h.vy * (1 + level * 2) * dt
        h.x += Math.sin(now * 0.0008 + h.phase) * 0.35 * dt
        if (h.y < -40) Object.assign(h, spawnHeart(false))
        const pulse = 1 + Math.sin(now * 0.003 + h.phase) * 0.08 + level * 0.3
        const size = h.size * pulse
        ctx.globalAlpha = 0.22 + level * 0.3
        ctx.drawImage(h.sprite, h.x - size / 2, h.y - size / 2, size, size)
      }

      ctx.globalCompositeOperation = 'source-over'
      for (const p of petals) {
        p.y += p.vy * dt
        p.x += Math.sin(now * 0.001 * p.sway + p.phase) * 0.8 * dt
        p.rotation += p.spin * dt
        p.flip += 0.03 * dt
        if (p.y > height + 30) Object.assign(p, spawnPetal(false))
        ctx.globalAlpha = 0.55
        drawRotated(petalSprite, p.x, p.y, p.size * Math.max(0.15, Math.abs(Math.cos(p.flip))), p.size, p.rotation)
      }

      for (let i = tapHearts.length - 1; i >= 0; i--) {
        const h = tapHearts[i]
        h.life -= 0.012 * dt
        if (h.life <= 0) {
          tapHearts.splice(i, 1)
          continue
        }
        h.vy -= 0.015 * dt
        h.vx *= 0.99
        h.x += h.vx * dt
        h.y += h.vy * dt
        h.rotation += h.spin * dt
        ctx.globalAlpha = h.life
        drawRotated(h.sprite, h.x, h.y, h.size, h.size, h.rotation)
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }

    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }

    raf = requestAnimationFrame(frame)
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointerup', onUp, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reduceMotion])

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 -z-10" />
}
