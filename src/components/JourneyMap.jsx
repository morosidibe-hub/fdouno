import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from 'framer-motion'
import { Hand, Heart, MapPin, RotateCcw, Route, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { journey } from '../data/content'
import { useConfetti } from '../hooks/useConfetti'
import { useStardustTrail } from '../hooks/useStardustTrail'
import { HAPTICS, vibrate } from '../lib/haptics'
import { EASE_OUT } from '../lib/motion'
import { Section, SectionHeading } from './ui/Section'

const VIEW_W = 400
const VIEW_H = 600
const ROUTE_PATH = 'M90 80 C 130 120, 160 160, 190 210 S 270 330, 290 400 S 230 500, 180 520'
const COAST_PATH =
  'M0 0 H62 C 70 40, 58 70, 72 95 C 92 130, 118 160, 138 210 C 158 260, 200 300, 226 360 C 240 400, 236 440, 214 470 C 198 490, 172 494, 156 508 C 146 518, 146 534, 162 544 C 178 556, 168 578, 150 600 H0 Z'
const HEART_PATH =
  'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'
const DURATION = 6
/** Rayon de la zone tactile en unités SVG : ≥ 48 px une fois la carte affichée sur mobile. */
const HIT_RADIUS = 56
const ROUTE_ID = 'journey-route'
const PARTICLES = 7
const PARTICLE_DURATION = 5.6
const { stops } = journey
const start = stops[0]
const destination = stops.at(-1)

/** Ciel étoilé déterministe (pseudo-aléatoire stable entre les rendus). */
const STARS = Array.from({ length: 46 }, (_, i) => {
  const rand = (seed) => {
    const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453
    return v - Math.floor(v)
  }
  return {
    x: 70 + rand(1) * (VIEW_W - 80),
    y: 10 + rand(2) * (VIEW_H - 20),
    r: 0.6 + rand(3) * 1.4,
    duration: 2 + rand(4) * 4,
    delay: rand(5) * 4,
    gold: rand(6) > 0.7,
  }
})

/** Position (fraction de 0 à 1) de chaque ville le long du tracé. */
function computeStopFractions(path) {
  const total = path.getTotalLength()
  const samples = 400
  return stops.map(({ x, y }) => {
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i <= samples; i++) {
      const p = path.getPointAtLength((i / samples) * total)
      const d = (p.x - x) ** 2 + (p.y - y) ** 2
      if (d < bestDist) {
        bestDist = d
        best = i / samples
      }
    }
    return best
  })
}

function SvgHeart({ size = 24, className }) {
  return <path d={HEART_PATH} transform={`translate(${-size / 2} ${-size / 2}) scale(${size / 24})`} className={className} />
}

/** Bulle d'information ancrée sur une ville, placée au-dessus ou en dessous selon la place. */
function StopTooltip({ stop, onClose }) {
  const below = stop.y < 220
  const leftPct = (stop.x / VIEW_W) * 100
  const topPct = (stop.y / VIEW_H) * 100
  return (
    <motion.div
      role="dialog"
      aria-label={`${stop.name} · ${stop.title}`}
      initial={{ opacity: 0, scale: 0.9, y: below ? -8 : 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      onClick={(e) => e.stopPropagation()}
      className="glass absolute z-20 w-56 rounded-2xl p-4 text-left shadow-2xl shadow-black/50"
      style={{
        left: `clamp(0.5rem, calc(${leftPct}% - 7rem), calc(100% - 14.5rem))`,
        top: below ? `calc(${topPct}% + 1.75rem)` : undefined,
        bottom: below ? undefined : `calc(${100 - topPct}% + 1.75rem)`,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute -right-2 -top-2 grid size-12 place-items-center rounded-full text-powder/70"
      >
        <span className="grid size-7 place-items-center rounded-full bg-night/80 ring-1 ring-white/20">
          <X className="size-3.5" />
        </span>
      </button>
      <p className="flex items-center gap-1.5 pr-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">
        <MapPin className="size-3.5" aria-hidden />
        {stop.name}
      </p>
      <p className="mt-1 font-display text-lg font-semibold text-blush">{stop.title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-powder/85">{stop.message}</p>
    </motion.div>
  )
}

/**
 * Carte néon Kamsar → Conakry : impulsion lumineuse sur la route, villes tactiles
 * avec message personnel, voyage animé du cœur et traînée de poussière d'étoiles au doigt.
 */
export default function JourneyMap() {
  const mapRef = useRef(null)
  const pathRef = useRef(null)
  const fractionsRef = useRef(null)
  const controlsRef = useRef(null)
  const trailRef = useStardustTrail(mapRef)
  const progress = useMotionValue(0)
  const heartX = useMotionValue(start.x)
  const heartY = useMotionValue(start.y)
  const distance = useTransform(progress, (v) => `${Math.round((1 - v) * 100)} %`)
  const [reached, setReached] = useState(0)
  const [status, setStatus] = useState('idle')
  const [selected, setSelected] = useState(null)
  const { heartBurst } = useConfetti()
  const reduceMotion = useReducedMotion()

  useEffect(() => () => controlsRef.current?.stop(), [])

  useMotionValueEvent(progress, 'change', (v) => {
    const path = pathRef.current
    if (!path) return
    const point = path.getPointAtLength(v * path.getTotalLength())
    heartX.set(point.x)
    heartY.set(point.y)

    const fractions = fractionsRef.current
    if (!fractions) return
    const index = fractions.findLastIndex((f) => v >= f - 0.01)
    setReached((r) => (r === index ? r : Math.max(index, 0)))
  })

  const travel = () => {
    if (status === 'travelling') return
    fractionsRef.current ??= computeStopFractions(pathRef.current)
    setSelected(null)
    progress.set(0)
    setReached(0)
    setStatus('travelling')
    vibrate(HAPTICS.tap)
    controlsRef.current = animate(progress, 1, {
      duration: DURATION,
      ease: [0.45, 0, 0.2, 1],
      onComplete: () => {
        setStatus('arrived')
        vibrate(HAPTICS.heartbeat)
        heartBurst({ x: 0.5, y: 0.55 })
      },
    })
  }

  const selectStop = (i) => {
    vibrate(HAPTICS.tap)
    setSelected((s) => (s === i ? null : i))
  }

  const current = stops[reached]
  const arrived = status === 'arrived'

  return (
    <Section id="voyage">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-40 inset-y-0 bg-[radial-gradient(circle_at_30%_40%,rgba(244,63,94,0.14),transparent_60%)]"
      />
      <SectionHeading eyebrow={journey.eyebrow} title={journey.title} subtitle={journey.subtitle} icon={Route} />

      <div className="relative grid items-center gap-10 md:grid-cols-2 md:gap-14">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1, ease: EASE_OUT }}
          className="glass relative mx-auto w-full max-w-md rounded-[2rem] p-3 shadow-2xl shadow-black/40 short:max-w-[calc((88svh-6rem)*2/3+1.5rem)]"
        >
          <div ref={mapRef} className="relative" onClick={() => setSelected(null)}>
            <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="block h-auto w-full" role="img" aria-label="Carte du trajet entre Kamsar et Conakry">
              <defs>
                <linearGradient id="ocean" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#1e3a5f" stopOpacity="0.6" />
                  <stop offset="1" stopColor="#0f2744" stopOpacity="0.15" />
                </linearGradient>
                <linearGradient id="route" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#F43F5E" />
                  <stop offset="0.6" stopColor="#FB7185" />
                  <stop offset="1" stopColor="#F59E0B" />
                </linearGradient>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <pattern id="waves" width="40" height="16" patternUnits="userSpaceOnUse">
                  <path d="M0 8 Q10 2 20 8 T40 8" fill="none" stroke="#FB7185" strokeOpacity="0.1" strokeWidth="1" />
                </pattern>
                <radialGradient id="particle">
                  <stop offset="0" stopColor="#FEF3C7" />
                  <stop offset="0.35" stopColor="#FCD34D" stopOpacity="0.9" />
                  <stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
                </radialGradient>
                <path id={ROUTE_ID} d={ROUTE_PATH} />
              </defs>

              <g className="pointer-events-none">
                {STARS.map((star, i) => (
                  <circle key={i} cx={star.x} cy={star.y} r={star.r} fill={star.gold ? '#FCD34D' : '#FFF1F2'} opacity="0.5">
                    {!reduceMotion && (
                      <animate
                        attributeName="opacity"
                        values="0.15;0.9;0.15"
                        dur={`${star.duration}s`}
                        begin={`-${star.delay}s`}
                        repeatCount="indefinite"
                      />
                    )}
                  </circle>
                ))}
                {stops.slice(1).map((stop, i) => (
                  <line
                    key={stop.name}
                    x1={stops[i].x}
                    y1={stops[i].y}
                    x2={stop.x}
                    y2={stop.y}
                    stroke="#FCD34D"
                    strokeOpacity="0.28"
                    strokeWidth="1"
                    strokeDasharray="1 5"
                    strokeLinecap="round"
                  />
                ))}
              </g>

              <path d={COAST_PATH} fill="url(#ocean)" />
              <path d={COAST_PATH} fill="url(#waves)" />
              <path d={COAST_PATH} fill="none" stroke="#FB7185" strokeOpacity="0.25" strokeWidth="1.2" />
              <ellipse cx="112" cy="566" rx="7" ry="4" fill="#FB7185" fillOpacity="0.18" />
              <ellipse cx="96" cy="580" rx="4" ry="2.5" fill="#FB7185" fillOpacity="0.14" />
              <text
                x="34"
                y="330"
                transform="rotate(-72 34 330)"
                className="fill-powder/35 font-display text-[15px] italic tracking-[0.3em]"
              >
                Océan Atlantique
              </text>

              <path d={ROUTE_PATH} fill="none" stroke="#FB7185" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" />
              <motion.path
                d={ROUTE_PATH}
                pathLength={1}
                fill="none"
                stroke="#F43F5E"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="0.07 0.93"
                filter="url(#glow)"
                initial={{ strokeDashoffset: 1 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 2.8, ease: 'linear', repeat: Infinity }}
              />
              <motion.path
                ref={pathRef}
                d={ROUTE_PATH}
                fill="none"
                stroke="url(#route)"
                strokeWidth="3.5"
                strokeLinecap="round"
                filter="url(#glow)"
                style={{ pathLength: progress }}
              />

              {!reduceMotion && (
                <g className="pointer-events-none">
                  {Array.from({ length: PARTICLES }, (_, i) => (
                    <circle key={i} r={i % 2 ? 4 : 6} fill="url(#particle)">
                      <animateMotion
                        dur={`${PARTICLE_DURATION}s`}
                        begin={`-${(i * PARTICLE_DURATION) / PARTICLES}s`}
                        repeatCount="indefinite"
                        keyPoints="0;1"
                        keyTimes="0;1"
                        calcMode="linear"
                      >
                        <mpath href={`#${ROUTE_ID}`} />
                      </animateMotion>
                      <animate
                        attributeName="opacity"
                        values="0;1;1;0"
                        keyTimes="0;0.1;0.85;1"
                        dur={`${PARTICLE_DURATION}s`}
                        begin={`-${(i * PARTICLE_DURATION) / PARTICLES}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  ))}
                </g>
              )}

              {stops.map((stop, i) => {
                const isReached = status !== 'idle' && i <= reached
                const isSelected = selected === i
                const lit = isReached || isSelected
                return (
                  <g
                    key={stop.name}
                    role="button"
                    tabIndex={0}
                    aria-label={`${stop.name} : ${stop.title}`}
                    className="cursor-pointer outline-none"
                    onClick={(e) => {
                      e.stopPropagation()
                      selectStop(i)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        selectStop(i)
                      }
                    }}
                  >
                    <circle cx={stop.x} cy={stop.y} r={HIT_RADIUS} fill="transparent" />
                    <motion.circle
                      cx={stop.x}
                      cy={stop.y}
                      fill="none"
                      stroke={lit ? '#F59E0B' : '#F43F5E'}
                      initial={{ r: 8, opacity: 0.8 }}
                      animate={{ r: lit ? 24 : 18, opacity: 0 }}
                      transition={{ duration: lit ? 1.4 : 2.4, repeat: Infinity }}
                    />
                    <circle
                      cx={stop.x}
                      cy={stop.y}
                      r={isSelected ? 8 : 6}
                      className="transition-all duration-300"
                      fill={lit ? '#F59E0B' : '#0F172A'}
                      stroke={lit ? '#FCD34D' : '#F43F5E'}
                      strokeWidth="2.5"
                      filter="url(#glow)"
                    />
                    <text
                      x={stop.x + 14}
                      y={stop.y + 5}
                      className={`pointer-events-none font-sans text-[14px] font-semibold tracking-wide transition-colors duration-500 ${lit ? 'fill-gold-light' : 'fill-powder/70'}`}
                    >
                      {stop.name}
                    </text>
                  </g>
                )
              })}

              <motion.g
                className="pointer-events-none"
                style={{ x: destination.x, y: destination.y }}
                animate={arrived ? { scale: [1, 1.5, 1.3] } : { scale: [1, 1.12, 1] }}
                transition={arrived ? { duration: 0.8 } : { duration: 1.6, repeat: Infinity }}
              >
                <SvgHeart size={arrived ? 30 : 20} className="fill-crimson-light" />
              </motion.g>

              <motion.g className="pointer-events-none" style={{ x: heartX, y: heartY }} animate={{ opacity: arrived ? 0 : 1 }}>
                <circle r="14" fill="#F43F5E" fillOpacity="0.25" />
                <SvgHeart size={18} className="fill-gold" />
              </motion.g>
            </svg>

            <canvas ref={trailRef} aria-hidden className="pointer-events-none absolute inset-0" />

            <AnimatePresence>
              {selected !== null && <StopTooltip key={selected} stop={stops[selected]} onClose={() => setSelected(null)} />}
            </AnimatePresence>
          </div>

          <p className="flex items-center justify-center gap-2 pb-1 pt-3 text-xs text-powder/60">
            <Hand className="size-3.5" aria-hidden />
            {journey.touchHint}
          </p>
        </motion.div>

        <div className="mx-auto w-full max-w-md">
          <div className="glass rounded-3xl p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-powder/70">Distance entre nos cœurs</p>
            <motion.p className="mt-2 font-display text-6xl font-semibold text-gradient-gold">{distance}</motion.p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full origin-left rounded-full bg-linear-to-r from-crimson-light to-gold" style={{ scaleX: progress }} />
            </div>
          </div>

          <div className="relative mt-5 min-h-44">
            <AnimatePresence mode="wait">
              {arrived ? (
                <motion.div
                  key="arrival"
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.7, ease: EASE_OUT }}
                  className="rounded-3xl border border-crimson-light/40 bg-linear-to-br from-crimson/25 to-ink-900/60 p-6 neon-glow"
                >
                  <p className="flex items-center gap-2 font-display text-2xl font-semibold text-blush">
                    <Heart className="size-5 fill-crimson-light text-crimson-light" aria-hidden />
                    {journey.arrival.title}
                  </p>
                  <p className="mt-3 leading-relaxed text-powder/85">{journey.arrival.message}</p>
                </motion.div>
              ) : (
                <motion.div
                  key={status === 'idle' ? 'idle' : current.name}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.45, ease: EASE_OUT }}
                  className="glass rounded-3xl p-6"
                >
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                    <MapPin className="size-4" aria-hidden />
                    {current.name} · {current.title}
                  </p>
                  <p className="mt-3 leading-relaxed text-powder/85">{current.message}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            type="button"
            onClick={travel}
            disabled={status === 'travelling'}
            whileHover={{ scale: status === 'travelling' ? 1 : 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-linear-to-r from-crimson to-crimson-light px-6 py-4 font-semibold text-white neon-glow transition-opacity disabled:cursor-wait disabled:opacity-70"
          >
            {arrived ? <RotateCcw className="size-5" aria-hidden /> : <Heart className="size-5 fill-white" aria-hidden />}
            {status === 'travelling' ? journey.travelling : arrived ? journey.replay : journey.cta}
          </motion.button>
        </div>
      </div>
    </Section>
  )
}
