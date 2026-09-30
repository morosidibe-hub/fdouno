import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { ChevronUp, Headphones, Heart, KeyRound, LockKeyhole } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { intro } from '../data/content'
import { clamp01, fitCanvas } from '../lib/canvas'
import { createCosmicHeart } from '../lib/cosmicHeart'
import { HAPTICS, vibrate } from '../lib/haptics'

const UNLOCK_RADIUS = 56
const PROXIMITY_RANGE = 260

/**
 * Porte d'entrée cosmique : un cœur arc-en-ciel se dessine dans l'espace et voyage
 * sur son orbite. Elle glisse la clé lumineuse dans la serrure, qui suit le cœur ;
 * il accélère à l'approche, puis explose en supernova.
 * @param {{ onPrime?: () => void, onUnlock?: () => void, onEnter: () => void }} props
 */
export default function IntroGate({ onPrime, onUnlock, onEnter }) {
  const canvasRef = useRef(null)
  const orbitRef = useRef(null)
  const lockRef = useRef(null)
  const keyRef = useRef(null)
  const proximityRef = useRef(0)
  const holdRef = useRef(false)
  const unlockedRef = useRef(false)
  const geometryRef = useRef(null)
  const onEnterRef = useRef(onEnter)
  const keyX = useMotionValue(0)
  const keyY = useMotionValue(0)
  const keyRotate = useMotionValue(0)
  const [phase, setPhase] = useState('idle')
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    onEnterRef.current = onEnter
  }, [onEnter])

  useEffect(() => {
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const scene = createCosmicHeart({
      coarse: window.matchMedia('(pointer: coarse)').matches,
      reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    })
    let raf = 0
    let last = performance.now()
    let opened = false

    const resize = () => {
      fitCanvas(canvas, window.innerWidth, window.innerHeight)
      scene.resize(window.innerWidth, window.innerHeight)
    }
    resize()
    window.addEventListener('resize', resize)

    const frame = (now) => {
      const dt = Math.min((now - last) / 16.67, 3)
      last = now
      if (unlockedRef.current && !opened) {
        opened = true
        scene.unlock(now)
      }
      const { ox, oy, finished } = scene.frame(ctx, now, dt, { proximity: proximityRef.current, hold: holdRef.current })
      // La serrure voyage avec le cœur sur son orbite.
      if (orbitRef.current) orbitRef.current.style.transform = `translate3d(${ox}px, ${oy}px, 0)`
      if (finished) {
        onEnterRef.current?.()
        return
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  /** Origine de la clé, sans son déplacement. */
  const measure = () => {
    const key = keyRef.current.getBoundingClientRect()
    return { origin: { x: key.left + key.width / 2 - keyX.get(), y: key.top + key.height / 2 - keyY.get() } }
  }

  /** Centre de la serrure, lu en direct puisqu'elle suit l'orbite du cœur. */
  const lockCenter = () => {
    const lock = lockRef.current.getBoundingClientRect()
    return { x: lock.left + lock.width / 2, y: lock.top + lock.height / 2 }
  }

  const distanceToLock = () => {
    const { origin } = geometryRef.current
    const lock = lockCenter()
    return Math.hypot(origin.x + keyX.get() - lock.x, origin.y + keyY.get() - lock.y)
  }

  const unlock = () => {
    if (phase === 'unlocking') return
    holdRef.current = true
    geometryRef.current ??= measure()
    const { origin } = geometryRef.current
    const lock = lockCenter()
    setPhase('unlocking')
    proximityRef.current = 1
    vibrate(HAPTICS.unlock)
    onUnlock?.()

    const spring = { type: 'spring', stiffness: 260, damping: 22 }
    animate(keyX, lock.x - origin.x, spring)
    animate(keyY, lock.y - origin.y, spring)
      .then(() => animate(keyRotate, 90, { duration: 0.35, ease: 'easeInOut' }))
      .then(() => {
        unlockedRef.current = true
      })
  }

  const handleDragStart = () => {
    geometryRef.current = measure()
    setPhase('dragging')
    vibrate(HAPTICS.tap)
    onPrime?.()
  }

  const handleDrag = () => {
    const distance = distanceToLock()
    proximityRef.current = clamp01(1 - (distance - UNLOCK_RADIUS) / PROXIMITY_RANGE)
    const next = distance < UNLOCK_RADIUS ? 'near' : 'dragging'
    setPhase((p) => (p === 'unlocking' || p === next ? p : next))
  }

  const handleDragEnd = () => {
    if (distanceToLock() < UNLOCK_RADIUS) return unlock()
    setPhase('idle')
    proximityRef.current = 0
    const spring = { type: 'spring', stiffness: 220, damping: 18 }
    animate(keyX, 0, spring)
    animate(keyY, 0, spring)
  }

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    onPrime?.()
    unlock()
  }

  const message =
    phase === 'unlocking' ? intro.opened : phase === 'near' ? intro.near : phase === 'dragging' ? intro.dragging : intro.instruction

  return (
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9 }}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 z-[70] touch-none select-none overflow-hidden bg-night [-webkit-touch-callout:none]"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[42%] size-[130vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_90deg,rgba(139,92,246,0.2),rgba(6,182,212,0.12),rgba(236,72,153,0.22),rgba(245,158,11,0.1),rgba(34,197,94,0.08),rgba(139,92,246,0.2))] opacity-80 blur-3xl"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(225,29,72,0.18),transparent_50%),radial-gradient(ellipse_at_50%_42%,transparent_45%,rgba(15,23,42,0.85)_100%)]"
      />
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0" />

      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.4, delay: 0.4 }}
        className="pointer-events-none absolute inset-x-0 top-[max(3.5rem,env(safe-area-inset-top))] text-center font-script text-4xl text-gold sm:text-5xl short:top-3 short:text-3xl"
      >
        {intro.greeting}
      </motion.p>

      <div ref={orbitRef} aria-hidden className="pointer-events-none absolute inset-0 will-change-transform">
        <motion.div
          ref={lockRef}
          animate={
            phase === 'unlocking'
              ? { scale: [1.2, 1.5, 0], opacity: [1, 1, 0] }
              : phase === 'near'
                ? { scale: 1.25 }
                : { scale: [1, 1.06, 1] }
          }
          transition={
            phase === 'unlocking'
              ? { duration: 1.1, delay: 0.5, times: [0, 0.4, 1] }
              : phase === 'near'
                ? { type: 'spring', stiffness: 300, damping: 15 }
                : { duration: 2, repeat: Infinity }
          }
          className="absolute left-1/2 top-[42%] grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"
        >
          <span
            className={`absolute -inset-1.5 rounded-full bg-[conic-gradient(from_0deg,#f43f5e,#f59e0b,#fde047,#22c55e,#06b6d4,#8b5cf6,#ec4899,#f43f5e)] blur-[5px] ${
              reduceMotion ? '' : 'animate-spin'
            } ${phase === 'near' || phase === 'unlocking' ? 'opacity-100 [animation-duration:1.2s]' : 'opacity-75 [animation-duration:5s]'}`}
          />
          <span
            className={`absolute inset-0 rounded-full border backdrop-blur-md transition-all duration-300 ${
              phase === 'near' || phase === 'unlocking'
                ? 'border-gold bg-night/40 shadow-[0_0_50px_rgba(245,158,11,0.9)]'
                : 'border-white/25 bg-night/60 shadow-[0_0_30px_rgba(139,92,246,0.5)]'
            }`}
          />
          {phase === 'unlocking' ? (
            <Heart className="relative size-8 fill-gold text-gold" />
          ) : (
            <LockKeyhole className="relative size-8 text-blush" />
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 1 }}
        className="absolute inset-x-0 bottom-[max(2.5rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-4 px-8 text-center short:bottom-3 short:gap-2"
      >
        <motion.span
          aria-hidden
          animate={{ y: [0, -6, 0], opacity: phase === 'idle' ? 0.8 : 0 }}
          transition={{ y: { duration: 1.4, repeat: Infinity }, opacity: { duration: 0.3 } }}
          className="text-gold short:hidden"
        >
          <ChevronUp className="size-5" />
        </motion.span>

        <motion.button
          ref={keyRef}
          type="button"
          aria-label={intro.keyLabel}
          drag={phase !== 'unlocking'}
          dragMomentum={false}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          onKeyDown={handleKeyDown}
          whileTap={{ scale: 1.1 }}
          style={{ x: keyX, y: keyY, rotate: keyRotate }}
          className="relative z-10 grid size-16 touch-none place-items-center rounded-full border border-gold/50 bg-gold/15 text-gold-light shadow-[0_0_40px_rgba(245,158,11,0.7)] backdrop-blur-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
        >
          <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-gold/20 [animation-duration:2.2s]" />
          <KeyRound className="relative size-8 -rotate-45" aria-hidden />
        </motion.button>

        <div className="min-h-14 max-w-xs short:min-h-0 short:max-w-md">
          <AnimatePresence mode="wait">
            <motion.p
              key={phase}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="font-display text-xl italic leading-snug text-blush short:text-base"
            >
              {message}
            </motion.p>
          </AnimatePresence>
        </div>

        <p className="flex items-center gap-2 text-xs text-powder/60 short:hidden">
          <Headphones className="size-3.5" aria-hidden />
          {intro.hint}
        </p>
      </motion.div>
    </motion.div>
  )
}
