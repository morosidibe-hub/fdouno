import { AnimatePresence, motion, useInView, useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion'
import { Flower2, Hand } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { flower } from '../data/content'
import { HAPTICS, vibrate } from '../lib/haptics'
import { clamp01, easeOutBack, fitCanvas } from '../lib/canvas'
import { Section, SectionHeading } from './ui/Section'

const MAX_SIZE = 380
const TAP_STEP = 0.22

/**
 * Couronnes de pétales, de l'extérieur vers le cœur de la fleur.
 * Les pétales extérieurs s'ouvrent en premier, comme dans la nature.
 */
const LAYERS = [
  { count: 13, length: 0.95, width: 0.34, base: '#E11D48', tip: '#FFE4E6', offset: 0 },
  { count: 10, length: 0.74, width: 0.3, base: '#BE123C', tip: '#FB7185', offset: 0.31 },
  { count: 8, length: 0.52, width: 0.27, base: '#b45309', tip: '#FCD34D', offset: 0.2 },
]
const PETALS = LAYERS.flatMap((layer, li) =>
  Array.from({ length: layer.count }, (_, i) => ({
    layer: li,
    angle: (i / layer.count) * Math.PI * 2 + layer.offset,
    jitter: Math.sin(i * 12.9898 + li * 78.233) * 0.06,
  })),
)
const STAMENS = Array.from({ length: 22 }, (_, i) => ({
  angle: i * 2.399963,
  radius: Math.sqrt((i + 0.5) / 22),
}))

/** Chemin d'un pétale orienté vers le haut, base en (0, 0). */
function petalPath(ctx, length, width) {
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(width, -length * 0.28, width * 0.85, -length * 0.82, 0, -length)
  ctx.bezierCurveTo(-width * 0.85, -length * 0.82, -width, -length * 0.28, 0, 0)
  ctx.closePath()
}

/**
 * Dessine la fleur pour un niveau d'éclosion donné.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} size côté du canvas en px CSS
 * @param {number} bloom éclosion globale ∈ [0, 1]
 * @param {number} time horloge en ms (balancement, respiration)
 */
function drawFlower(ctx, size, bloom, time) {
  const c = size / 2
  const radius = size * 0.44
  ctx.clearRect(0, 0, size, size)

  const halo = ctx.createRadialGradient(c, c, 0, c, c, radius * 1.1)
  halo.addColorStop(0, `rgba(251,113,133,${0.08 + bloom * 0.22})`)
  halo.addColorStop(1, 'rgba(251,113,133,0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, size, size)

  ctx.save()
  ctx.translate(c, c)
  ctx.rotate(Math.sin(time * 0.0006) * 0.04)

  const total = PETALS.length
  PETALS.forEach((petal, k) => {
    const start = (k / total) * 0.78
    const t = clamp01((bloom - start) / 0.22)
    if (t <= 0) return
    const eased = easeOutBack(t)
    const layer = LAYERS[petal.layer]
    const breathe = 1 + Math.sin(time * 0.002 + k) * 0.015 * t
    const length = radius * layer.length * (0.2 + 0.8 * eased) * breathe
    const width = radius * layer.width * (0.35 + 0.65 * eased)

    ctx.save()
    ctx.rotate(petal.angle + petal.jitter + (1 - eased) * 0.7)
    ctx.globalAlpha = Math.min(1, t * 1.6)
    const gradient = ctx.createLinearGradient(0, 0, 0, -length)
    gradient.addColorStop(0, layer.base)
    gradient.addColorStop(1, layer.tip)
    ctx.fillStyle = gradient
    petalPath(ctx, length, width)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, -length * 0.08)
    ctx.quadraticCurveTo(width * 0.08, -length * 0.5, 0, -length * 0.88)
    ctx.stroke()
    ctx.restore()
  })

  const heart = clamp01((bloom - 0.8) / 0.2)
  if (heart > 0) {
    const core = radius * 0.16 * easeOutBack(heart)
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, core * 2.4)
    glow.addColorStop(0, 'rgba(252,211,77,0.9)')
    glow.addColorStop(1, 'rgba(245,158,11,0)')
    ctx.globalAlpha = heart
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(0, 0, core * 2.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#F59E0B'
    for (const s of STAMENS) {
      const r = s.radius * core
      ctx.beginPath()
      ctx.arc(Math.cos(s.angle) * r, Math.sin(s.angle) * r, 1.6 + (1 - s.radius) * 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
  ctx.globalAlpha = 1
}

/**
 * Fleur procédurale en Canvas : elle éclôt pétale après pétale au défilement
 * et à chaque toucher, avec un rebond organique (easeOutBack).
 */
export default function BloomingFlower() {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)
  const scrollBloomRef = useRef(0)
  const tapBloomRef = useRef(0)
  const inView = useInView(canvasRef, { margin: '100px' })
  const reduceMotion = useReducedMotion()
  const [bloomed, setBloomed] = useState(false)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'center center'] })

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    scrollBloomRef.current = v
  })

  useEffect(() => {
    if (!inView) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const size = Math.min(canvas.parentElement.clientWidth, MAX_SIZE)
    fitCanvas(canvas, size, size)

    let bloom = 0
    let raf = 0
    let last = performance.now()
    const frame = (now) => {
      const dt = Math.min((now - last) / 16.67, 3)
      last = now
      const target = Math.max(scrollBloomRef.current, tapBloomRef.current)
      bloom = reduceMotion ? target : bloom + (target - bloom) * 0.05 * dt
      drawFlower(ctx, size, bloom, now)
      if (bloom > 0.97) setBloomed(true)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [inView, reduceMotion])

  const nurture = () => {
    tapBloomRef.current = Math.min(1, Math.max(tapBloomRef.current, scrollBloomRef.current) + TAP_STEP)
    vibrate(HAPTICS.tap)
  }

  return (
    <Section id="fleur">
      <div ref={sectionRef} className="pointer-events-none absolute inset-0" aria-hidden />
      <SectionHeading eyebrow={flower.eyebrow} title={flower.title} subtitle={flower.subtitle} icon={Flower2} />

      <div className="mx-auto flex max-w-sm flex-col items-center">
        <button
          type="button"
          onClick={nurture}
          aria-label={flower.tapHint}
          className="relative grid aspect-square w-full max-w-[380px] place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
        >
          <canvas ref={canvasRef} aria-hidden />
        </button>

        <div className="mt-6 min-h-16 text-center">
          <AnimatePresence mode="wait">
            {bloomed ? (
              <motion.p
                key="bloomed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-script text-3xl leading-snug text-gold sm:text-4xl"
              >
                {flower.bloomed}
              </motion.p>
            ) : (
              <motion.p
                key="hint"
                exit={{ opacity: 0 }}
                className="flex items-center justify-center gap-2 text-sm text-powder/70"
              >
                <Hand className="size-4" aria-hidden />
                {flower.tapHint}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Section>
  )
}
