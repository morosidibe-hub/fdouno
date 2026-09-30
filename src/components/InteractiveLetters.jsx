import { AnimatePresence, motion } from 'framer-motion'
import { Gem, HeartHandshake, Mail, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { letters } from '../data/content'
import { useConfetti } from '../hooks/useConfetti'
import { EASE_OUT } from '../lib/motion'
import { Section, SectionHeading } from './ui/Section'

const THEMES = {
  pardon: {
    label: 'Pardon',
    icon: HeartHandshake,
    front: 'from-crimson/30 via-ink-800/60 to-ink-950 border-crimson/30',
    badge: 'bg-crimson/20 text-crimson-light',
  },
  raison: {
    label: 'Raison de t’aimer',
    icon: Sparkles,
    front: 'from-powder/20 via-ink-800/60 to-ink-950 border-powder/25',
    badge: 'bg-powder/15 text-powder',
  },
  promesse: {
    label: 'Promesse',
    icon: Gem,
    front: 'from-gold/25 via-ink-800/60 to-ink-950 border-gold/30',
    badge: 'bg-gold/15 text-gold',
  },
}

function FlipCard({ card, index, flipped, onFlip }) {
  const ref = useRef(null)
  const theme = THEMES[card.category]
  const Icon = theme.icon

  const trackLight = (e) => {
    const rect = ref.current.getBoundingClientRect()
    ref.current.style.setProperty('--mx', `${e.clientX - rect.left}px`)
    ref.current.style.setProperty('--my', `${e.clientY - rect.top}px`)
  }

  return (
    <motion.li
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, delay: (index % 3) * 0.12, ease: EASE_OUT }}
      className="perspective-[1200px]"
    >
      <button
        ref={ref}
        type="button"
        onClick={onFlip}
        onPointerMove={trackLight}
        aria-pressed={flipped}
        aria-label={flipped ? `${card.front} : ${card.back}` : `Ouvrir la carte « ${card.front} »`}
        className="group relative block h-72 w-full rounded-3xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
      >
        <motion.div
          className="relative size-full transform-3d"
          animate={{ rotateY: flipped ? 180 : 0 }}
          whileHover={{ y: -6 }}
          transition={{ type: 'spring', stiffness: 110, damping: 16 }}
        >
          <div
            className={`absolute inset-0 flex flex-col justify-between overflow-hidden rounded-3xl border bg-linear-to-br p-6 shadow-xl shadow-black/30 backface-hidden ${theme.front}`}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: 'radial-gradient(260px circle at var(--mx) var(--my), rgba(255,255,255,0.14), transparent 70%)' }}
            />
            <span className={`relative inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${theme.badge}`}>
              <Icon className="size-3.5" aria-hidden />
              {theme.label}
            </span>
            <div className="relative">
              <Mail className="mb-4 size-8 text-gold/70 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110" aria-hidden />
              <h3 className="font-display text-3xl font-semibold leading-tight text-blush">{card.front}</h3>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-powder/50">Touche pour ouvrir</p>
            </div>
          </div>

          <div
            className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-3xl border border-gold/40 bg-linear-to-br from-blush via-powder to-gold-light p-6 text-ink-900 shadow-xl shadow-black/30 backface-hidden"
            style={{ transform: 'rotateY(180deg)' }}
          >
            <Icon className="size-5 text-crimson" aria-hidden />
            <p className="font-display text-xl font-medium italic leading-snug sm:text-[1.35rem]">{card.back}</p>
            <p className="self-end font-script text-2xl text-crimson">— Moro</p>
          </div>
        </motion.div>
      </button>
    </motion.li>
  )
}

export default function InteractiveLetters() {
  const [opened, setOpened] = useState(() => new Set())
  const celebrated = useRef(false)
  const { heartRain } = useConfetti()
  const total = letters.cards.length
  const allOpened = opened.size === total

  useEffect(() => {
    if (!allOpened || celebrated.current) return
    celebrated.current = true
    heartRain(2500)
  }, [allOpened, heartRain])

  const toggle = (i) =>
    setOpened((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  return (
    <Section id="lettres">
      <SectionHeading eyebrow={letters.eyebrow} title={letters.title} subtitle={letters.subtitle} icon={Mail} />

      <div className="mb-8 flex items-center justify-center gap-3 text-sm text-powder/70">
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-linear-to-r from-crimson-light to-gold"
            animate={{ width: `${(opened.size / total) * 100}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
          />
        </div>
        <span>
          {opened.size} / {total} lettres ouvertes
        </span>
      </div>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {letters.cards.map((card, i) => (
          <FlipCard key={card.front} card={card} index={i} flipped={opened.has(i)} onFlip={() => toggle(i)} />
        ))}
      </ul>

      <AnimatePresence>
        {allOpened && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: EASE_OUT }}
            className="mt-12 text-center font-script text-3xl text-gold sm:text-4xl"
          >
            {letters.completed}
          </motion.p>
        )}
      </AnimatePresence>
    </Section>
  )
}
