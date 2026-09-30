import { AnimatePresence, motion } from 'framer-motion'
import { Heart, MailOpen, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { openWhen } from '../data/content'
import { EASE_OUT } from '../lib/motion'
import { Section, SectionHeading } from './ui/Section'

const STORAGE_KEY = 'fdd-open-when'
const ENVELOPE_TINTS = [
  'from-ink-700 to-ink-900',
  'from-crimson/70 to-ink-900',
  'from-[#6b2a4a] to-ink-900',
  'from-[#7a4a1f] to-ink-900',
]

function readOpened() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function WaxSeal({ broken }) {
  return (
    <motion.span
      aria-hidden
      animate={broken ? { scale: [1, 1.25, 0.9], rotate: [0, -12, 8], opacity: 0.55 } : { scale: 1, rotate: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative grid size-12 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#F43F5E,#9f1239_70%)] shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_-3px_6px_rgba(0,0,0,0.35)] ring-2 ring-[#9f1239]/60"
    >
      <Heart className="size-5 fill-blush/80 text-blush/80" />
      {broken && <span className="absolute h-[2px] w-9 rotate-45 rounded bg-night/70" />}
    </motion.span>
  )
}

function Envelope({ letter, index, opened, onOpen }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, delay: (index % 2) * 0.12, ease: EASE_OUT }}
    >
      <motion.button
        type="button"
        onClick={onOpen}
        whileHover={{ y: -6, rotate: index % 2 ? 1 : -1 }}
        whileTap={{ scale: 0.97 }}
        className={`group relative block aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br text-left shadow-xl shadow-black/40 ${ENVELOPE_TINTS[index % ENVELOPE_TINTS.length]}`}
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[58%] bg-linear-to-b from-white/10 to-white/[0.02] [clip-path:polygon(0_0,100%_0,50%_100%)]"
        />
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-black/15 [clip-path:polygon(0_100%,50%_0,100%_100%)]" />
        <span className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2">
          <WaxSeal broken={opened} />
        </span>
        <span className="absolute inset-x-0 bottom-0 p-4">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-gold/80">
            Ouvre-moi quand…
          </span>
          <span className="mt-1 block font-display text-xl font-semibold leading-tight text-blush sm:text-2xl">
            {letter.when}
          </span>
        </span>
        {opened && (
          <span className="absolute right-3 top-3 rounded-full bg-black/30 px-2 py-0.5 text-[10px] uppercase tracking-widest text-powder/70">
            Ouverte
          </span>
        )}
      </motion.button>
    </motion.li>
  )
}

function LetterModal({ letter, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      root.style.overflow = previous
    }
  }, [onClose])

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Ouvre-moi quand ${letter.when}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[65] grid place-items-center bg-night/80 p-5 backdrop-blur-md"
    >
      <motion.article
        onClick={(e) => e.stopPropagation()}
        initial={{ rotateX: -75, scaleY: 0.3, opacity: 0, y: 60 }}
        animate={{ rotateX: 0, scaleY: 1, opacity: 1, y: 0 }}
        exit={{ rotateX: 40, scaleY: 0.4, opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 90, damping: 16 }}
        style={{ transformPerspective: 1200, transformOrigin: '50% 0%' }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-linear-to-br from-blush via-[#f8e8e3] to-gold-light p-7 text-ink-900 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)] sm:p-9"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40 [background:repeating-linear-gradient(0deg,transparent_0_31px,rgba(51,65,85,0.08)_31px_32px)]"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label={openWhen.close}
          className="absolute right-2 top-2 grid size-12 place-items-center rounded-full bg-ink-900/10 text-ink-900 transition-colors hover:bg-ink-900/20"
        >
          <X className="size-4" />
        </button>
        <MailOpen className="relative size-6 text-crimson" aria-hidden />
        <p className="relative mt-4 font-script text-3xl text-crimson sm:text-4xl">Ouvre-moi quand {letter.when}</p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="relative mt-5 font-display text-xl italic leading-relaxed sm:text-[1.35rem]"
        >
          {letter.body}
        </motion.p>
        <p className="relative mt-6 text-right font-script text-3xl text-crimson">— Moro</p>
      </motion.article>
    </motion.div>
  )
}

export default function OpenWhen() {
  const [active, setActive] = useState(null)
  const [opened, setOpened] = useState(readOpened)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...opened]))
  }, [opened])

  const open = (i) => {
    setActive(i)
    setOpened((prev) => new Set(prev).add(i))
  }

  return (
    <Section id="ouvre-moi">
      <SectionHeading eyebrow={openWhen.eyebrow} title={openWhen.title} subtitle={openWhen.subtitle} icon={MailOpen} />

      <ul className="mx-auto grid max-w-3xl grid-cols-1 gap-5 sm:grid-cols-2">
        {openWhen.letters.map((letter, i) => (
          <Envelope key={letter.when} letter={letter} index={i} opened={opened.has(i)} onOpen={() => open(i)} />
        ))}
      </ul>

      <AnimatePresence>
        {active !== null && <LetterModal letter={openWhen.letters[active]} onClose={() => setActive(null)} />}
      </AnimatePresence>
    </Section>
  )
}
