import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { ChevronLeft, ChevronRight, Eye, Hand, Heart, RotateCcw, RotateCw, Sparkles } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { eclipse } from '../data/content'
import { useConfetti } from '../hooks/useConfetti'
import { HAPTICS, vibrate } from '../lib/haptics'
import { EASE_OUT } from '../lib/motion'
import StardustBurst from './ui/StardustBurst'
import { Section, SectionHeading } from './ui/Section'

const { cards, fusion } = eclipse
const VISIBLE = 3
const SWIPE_DISTANCE = 80
const SWIPE_VELOCITY = 500
/** Distance (px) entre les centres des deux photos qui déclenche la fusion. */
const FUSE_DISTANCE = 56
const FUSED_HEART =
  'M100 172 C 42 128, 0 96, 0 56 C 0 25, 25 0, 56 0 C 76 0, 92 12, 100 30 C 108 12, 124 0, 144 0 C 175 0, 200 25, 200 56 C 200 96, 158 128, 100 172 Z'

const stackVariants = {
  enter: (direction) =>
    direction < 0 ? { x: -420, rotate: -16, opacity: 0 } : { opacity: 0, scale: 0.8, y: 60 },
  exit: (direction) =>
    direction > 0
      ? { x: -420, rotate: -16, opacity: 0, transition: { duration: 0.4, ease: EASE_OUT } }
      : { opacity: 0, scale: 0.8, y: 60, transition: { duration: 0.3 } },
}

/** Face d'une carte : photo plein cadre, cadrée sur les visages. */
function Photo({ src, alt }) {
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      decoding="async"
      className="absolute inset-0 size-full select-none object-cover object-[center_25%]"
    />
  )
}

/**
 * Carte de la pile. Au sommet (depth 0) elle se retourne au toucher (rotation 3D sur Y)
 * et se glisse horizontalement pour passer à la suivante.
 */
function StackCard({ card, depth, direction, flipped, onFlip, onSwipe }) {
  const x = useMotionValue(0)
  const rotateZ = useTransform(x, [-220, 220], [-14, 14])
  const draggedRef = useRef(false)
  const isTop = depth === 0

  return (
    <motion.li
      custom={direction}
      variants={stackVariants}
      initial="enter"
      animate={{ x: 0, rotate: 0, opacity: 1, scale: 1 - depth * 0.06, y: depth * 18 }}
      exit="exit"
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
      style={{ x, rotateZ, zIndex: VISIBLE - depth }}
      drag={isTop ? 'x' : false}
      dragSnapToOrigin
      dragElastic={0.6}
      onPointerDown={() => {
        draggedRef.current = false
      }}
      onDragStart={() => {
        draggedRef.current = true
      }}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > SWIPE_DISTANCE || Math.abs(info.velocity.x) > SWIPE_VELOCITY) {
          onSwipe(info.offset.x < 0 ? 1 : -1)
        }
      }}
      onTap={() => {
        if (isTop && !draggedRef.current) onFlip()
      }}
      aria-hidden={!isTop}
      className={`absolute inset-0 touch-pan-y ${isTop ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
    >
      <motion.div
        role={isTop ? 'button' : undefined}
        tabIndex={isTop ? 0 : -1}
        aria-pressed={isTop ? flipped : undefined}
        aria-label={isTop ? `${card.caption} : ${flipped ? eclipse.flipBack : eclipse.flipHint}` : undefined}
        onKeyDown={(e) => {
          if (isTop && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onFlip()
          }
        }}
        animate={{ rotateY: isTop && flipped ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 16 }}
        style={{ transformStyle: 'preserve-3d', transformPerspective: 1200 }}
        className="relative size-full rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-3xl border border-rose-gold/60 bg-ink-800 shadow-[0_0_35px_-6px_rgba(251,113,133,0.75)]"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
        >
          <Photo src={card.douno} alt={`Douno · ${card.caption}`} />
          <div className="absolute inset-0 bg-linear-to-t from-night/90 via-night/10 to-transparent" />
          <div aria-hidden className="absolute inset-0 animate-pulse rounded-3xl ring-2 ring-inset ring-rose-gold/40 [animation-duration:3s]" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="font-script text-4xl leading-none text-blush drop-shadow-lg">{card.caption}</p>
            {isTop && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-blush backdrop-blur-md">
                <RotateCw className="size-3" aria-hidden />
                {eclipse.flipHint}
              </p>
            )}
          </div>
        </div>

        <div
          className="absolute inset-0 overflow-hidden rounded-3xl border border-gold/60 bg-ink-800 shadow-[0_0_35px_-6px_rgba(245,158,11,0.75)]"
          style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <Photo src={card.moro} alt="Moro" />
          <div className="absolute inset-0 bg-linear-to-t from-night/95 via-night/30 to-transparent" />
          <figure className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
            <blockquote className="font-display text-lg italic leading-snug text-blush">« {card.quote} »</blockquote>
            <figcaption className="mt-2 text-right font-script text-2xl text-gold-light">— Moro</figcaption>
          </figure>
        </div>
      </motion.div>
    </motion.li>
  )
}

/** Cœur final : moitié Moro, moitié Douno, réunis dans un même contour doré. */
function FusedHeart() {
  const clipId = useId()
  const seamId = useId()
  return (
    <motion.svg
      viewBox="-6 -6 212 186"
      className="w-56 max-w-full drop-shadow-[0_0_30px_rgba(244,63,94,0.7)]"
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{ scale: [0.3, 1.12, 1], opacity: 1 }}
      transition={{ duration: 0.9, ease: EASE_OUT }}
      role="img"
      aria-label="Photos de Moro et Douno réunies dans un cœur"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={FUSED_HEART} />
        </clipPath>
        <linearGradient id={seamId} x1="0" x2="1">
          <stop offset="0" stopColor="#F59E0B" stopOpacity="0" />
          <stop offset="0.5" stopColor="#FCD34D" stopOpacity="0.55" />
          <stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="200" height="180" fill="#1e293b" />
        <image href={fusion.moro} x="0" y="0" width="100" height="180" preserveAspectRatio="xMidYMin slice" />
        <image href={fusion.douno} x="100" y="0" width="100" height="180" preserveAspectRatio="xMidYMin slice" />
        <rect x="82" width="36" height="180" fill={`url(#${seamId})`} />
      </g>
      <path d={FUSED_HEART} fill="none" stroke="#F59E0B" strokeWidth="4" />
    </motion.svg>
  )
}

/** Photo ronde utilisée dans la zone de fusion. */
function Bubble({ src, alt, ring }) {
  return (
    <span className={`block size-24 overflow-hidden rounded-full border-[3px] bg-ink-800 sm:size-28 ${ring}`}>
      <img src={src} alt={alt} draggable={false} className="size-full select-none object-cover object-[center_25%]" />
    </span>
  )
}

/**
 * Fusion interactive : glisser la photo de Moro jusqu'à celle de Douno.
 * Au contact, les deux photos se rejoignent au centre et fusionnent dans un cœur,
 * avec une gerbe de poussière d'or et de cœurs lumineux.
 */
function Fusion() {
  const arenaRef = useRef(null)
  const moroRef = useRef(null)
  const dounoRef = useRef(null)
  const geometryRef = useRef(null)
  const phaseRef = useRef('apart')
  const [phase, setPhaseState] = useState('apart')
  const [burstKey, setBurstKey] = useState(0)
  const moroX = useMotionValue(0)
  const moroY = useMotionValue(0)
  const dounoX = useMotionValue(0)
  const dounoY = useMotionValue(0)
  const proximity = useMotionValue(0)
  const dounoScale = useTransform(proximity, [0, 1], [1, 1.15])
  const magnetOpacity = useTransform(proximity, [0, 1], [0.35, 1])
  const magnetScale = useTransform(proximity, [0, 1], [1, 1.6])
  const { heartBurst } = useConfetti()

  /** Le ref est lu par les gestionnaires de glisser, appelés plusieurs fois avant le rendu suivant. */
  const setPhase = (value) => {
    phaseRef.current = value
    setPhaseState(value)
  }

  /** Mesure une fois les centres au repos (hors translation en cours) : aucune lecture pendant le glisser. */
  const measure = () => {
    const center = (el, dx = 0, dy = 0) => {
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2 - dx, y: r.top + r.height / 2 - dy }
    }
    const arena = arenaRef.current.getBoundingClientRect()
    const moro = center(moroRef.current, moroX.get(), moroY.get())
    const douno = center(dounoRef.current, dounoX.get(), dounoY.get())
    geometryRef.current = {
      dx: douno.x - moro.x,
      dy: douno.y - moro.y,
      span: Math.hypot(douno.x - moro.x, douno.y - moro.y),
      moro,
      douno,
      center: { x: arena.left + arena.width / 2, y: arena.top + arena.height / 2 },
    }
  }

  const merge = () => {
    if (phaseRef.current !== 'apart') return
    if (!geometryRef.current) measure()
    const { moro, douno, center } = geometryRef.current
    setPhase('merging')
    proximity.set(1)
    vibrate(HAPTICS.heartbeat)
    const spring = { type: 'spring', stiffness: 260, damping: 22 }
    animate(moroX, center.x - moro.x, spring)
    animate(moroY, center.y - moro.y, spring)
    animate(dounoX, center.x - douno.x, spring)
    animate(dounoY, center.y - douno.y, spring).then(() => {
      setPhase('fused')
      setBurstKey((k) => k + 1)
      heartBurst({ x: center.x / window.innerWidth, y: center.y / window.innerHeight })
    })
  }

  const handleDrag = () => {
    const g = geometryRef.current
    if (!g || phaseRef.current !== 'apart') return
    const distance = Math.hypot(g.dx - moroX.get(), g.dy - moroY.get())
    proximity.set(Math.max(0, Math.min(1, 1 - (distance - FUSE_DISTANCE) / (g.span - FUSE_DISTANCE))))
    if (distance < FUSE_DISTANCE) merge()
  }

  const handleDragEnd = () => {
    if (phaseRef.current !== 'apart') return
    const spring = { type: 'spring', stiffness: 300, damping: 24 }
    animate(moroX, 0, spring)
    animate(moroY, 0, spring)
    animate(proximity, 0, { duration: 0.4 })
  }

  const replay = () => {
    for (const mv of [moroX, moroY, dounoX, dounoY, proximity]) mv.set(0)
    geometryRef.current = null
    setPhase('apart')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE_OUT }}
      className="mx-auto mt-16 max-w-md"
    >
      <p className="mb-4 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-gold">
        <Sparkles className="size-4" aria-hidden />
        {fusion.title}
      </p>

      <div ref={arenaRef} className="glass-card relative h-80 select-none overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(244,63,94,0.22),transparent_60%)]"
        />
        <StardustBurst burstKey={burstKey} />

        <AnimatePresence>
          {phase !== 'fused' && (
            <motion.div key="apart" exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.35 } }} className="absolute inset-0">
              <div aria-hidden className="absolute inset-x-16 top-1/2 border-t-2 border-dashed border-gold/35" />
              <motion.span
                aria-hidden
                style={{ opacity: magnetOpacity, scale: magnetScale }}
                className="absolute left-1/2 top-1/2 -ml-5 -mt-5 grid size-10 place-items-center rounded-full bg-crimson/25"
              >
                <Heart className="size-5 animate-pulse fill-crimson-light text-crimson-light" />
              </motion.span>

              <motion.div
                ref={dounoRef}
                style={{ x: dounoX, y: dounoY, scale: dounoScale }}
                className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full shadow-[0_0_35px_-4px_rgba(245,158,11,0.8)]"
              >
                <Bubble src={fusion.douno} alt="Douno" ring="border-gold" />
              </motion.div>

              <motion.div
                ref={moroRef}
                role="button"
                tabIndex={0}
                aria-label={`${fusion.hint} (${fusion.keyboardHint})`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    merge()
                  }
                }}
                drag={phase === 'apart'}
                dragConstraints={arenaRef}
                dragElastic={0.15}
                dragMomentum={false}
                onDragStart={() => {
                  measure()
                  vibrate(HAPTICS.tap)
                }}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                whileDrag={{ scale: 1.08 }}
                style={{ x: moroX, y: moroY }}
                className="absolute left-5 top-1/2 z-10 -translate-y-1/2 cursor-grab touch-none rounded-full shadow-[0_0_35px_-4px_rgba(244,63,94,0.85)] outline-none focus-visible:ring-2 focus-visible:ring-gold active:cursor-grabbing"
              >
                <Bubble src={fusion.moro} alt="Moro" ring="border-crimson-light" />
                <motion.span
                  aria-hidden
                  animate={{ x: [0, 8, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  className="absolute -bottom-2 -right-2 grid size-8 place-items-center rounded-full bg-night text-gold ring-1 ring-gold/50"
                >
                  <Hand className="size-4" />
                </motion.span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === 'fused' && (
          <div className="absolute inset-0 grid place-items-center">
            <FusedHeart />
          </div>
        )}
      </div>

      <div className="mt-6 min-h-28 text-center" aria-live="polite">
        <AnimatePresence mode="wait">
          {phase === 'fused' ? (
            <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <p className="font-script text-4xl text-gold-light">{fusion.done}</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-powder/80">{fusion.doneMessage}</p>
              <button
                type="button"
                onClick={replay}
                className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-full border border-white/20 px-5 text-sm text-powder/80 transition-colors hover:border-gold/50 hover:text-gold"
              >
                <RotateCcw className="size-4" aria-hidden />
                {fusion.replay}
              </button>
            </motion.div>
          ) : (
            <motion.div key="hint" exit={{ opacity: 0 }}>
              <p className="text-sm text-powder/75">{fusion.hint}</p>
              <button
                type="button"
                onClick={merge}
                disabled={phase !== 'apart'}
                className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-full bg-linear-to-r from-crimson to-crimson-light px-6 text-sm font-semibold text-white neon-glow disabled:opacity-60"
              >
                <Heart className="size-4 fill-white" aria-hidden />
                {fusion.button}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/**
 * « L'éclipse des regards » : pile de cartes 3D. Recto, un regard de Douno ;
 * verso, celui de Moro et une citation. La dernière carte ouvre la fusion des deux photos.
 */
export default function EclipseGallery() {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [flipped, setFlipped] = useState(false)
  const [reachedEnd, setReachedEnd] = useState(false)
  const last = cards.length - 1

  const go = (step) => {
    const next = index + step
    if (next < 0 || next > last) return
    vibrate(HAPTICS.tap)
    setDirection(step)
    setFlipped(false)
    setIndex(next)
    if (next === last) setReachedEnd(true)
  }

  const flip = () => {
    vibrate(HAPTICS.tap)
    setFlipped((f) => !f)
  }

  const visible = cards
    .map((card, i) => ({ card, i }))
    .slice(index, index + VISIBLE)
    .reverse()

  return (
    <Section id="eclipse">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-40 inset-y-0 bg-[radial-gradient(circle_at_50%_35%,rgba(251,113,133,0.14),transparent_60%)]"
      />
      <SectionHeading eyebrow={eclipse.eyebrow} title={eclipse.title} subtitle={eclipse.subtitle} icon={Eye} />

      <div className="mx-auto flex max-w-xs flex-col items-center short:max-w-[calc(78svh*3/4)]">
        <ul className="relative aspect-[3/4] w-full" aria-live="polite">
          <AnimatePresence initial={false} custom={direction}>
            {visible.map(({ card, i }) => (
              <StackCard
                key={i}
                card={card}
                depth={i - index}
                direction={direction}
                flipped={flipped}
                onFlip={flip}
                onSwipe={go}
              />
            ))}
          </AnimatePresence>
        </ul>

        <div className="mt-12 flex items-center gap-5">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index === 0}
            aria-label={eclipse.previous}
            className="glass grid size-12 place-items-center rounded-full text-blush transition-colors hover:text-gold disabled:opacity-40"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="flex items-center gap-2" aria-label={`${index + 1} / ${cards.length}`}>
            {cards.map((card, i) => (
              <span
                key={card.caption}
                className={`h-2 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-rose-gold' : 'w-2 bg-white/25'}`}
              />
            ))}
            <Heart className={`size-3.5 transition-colors ${reachedEnd ? 'fill-gold text-gold' : 'text-white/30'}`} aria-hidden />
          </div>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={index === last}
            aria-label={eclipse.next}
            className="glass grid size-12 place-items-center rounded-full text-blush transition-colors hover:text-gold disabled:opacity-40"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      {reachedEnd && <Fusion />}
    </Section>
  )
}
