import { motion } from 'framer-motion'
import { ChevronDown, Heart, Music } from 'lucide-react'
import { hero } from '../data/content'
import { useTypewriter } from '../hooks/useTypewriter'
import { EASE_OUT } from '../lib/motion'

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.9, delay: i * 0.25, ease: EASE_OUT } }),
}

export default function Hero({ onStart, ready = true }) {
  const { typed, activeLine, done } = useTypewriter(hero.lines, {
    speed: 55,
    lineDelay: 450,
    startDelay: 1100,
    enabled: ready,
  })
  const lastLine = hero.lines.length - 1

  return (
    <section className="relative flex min-h-svh items-center justify-center overflow-hidden px-5 pb-24 pt-20 sm:px-8 short:pb-16 short:pt-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(225,29,72,0.30),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(245,158,11,0.12),transparent_55%)]"
      />
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.p
          initial={{ opacity: 0, scale: 0.95 }}
          animate={ready ? { opacity: 1, scale: 1 } : undefined}
          transition={{ duration: 1.2, ease: EASE_OUT }}
          className="font-script text-3xl text-gold sm:text-4xl short:text-2xl"
        >
          {hero.dedication}
        </motion.p>

        <h1
          aria-label={hero.lines.join(' ')}
          className="mt-6 font-display text-[2.5rem] font-semibold leading-[1.08] text-blush sm:text-6xl md:text-7xl short:mt-3 short:text-4xl"
        >
          {hero.lines.map((line, i) => (
            <span key={line} aria-hidden className="grid">
              <span className="invisible col-start-1 row-start-1">{line}</span>
              <span
                className={`col-start-1 row-start-1 ${i === lastLine ? 'animate-shimmer text-gradient-gold italic' : ''}`}
              >
                {typed[i]}
                {i === activeLine && (
                  <span className="ml-1 inline-block h-[0.85em] w-[3px] translate-y-[0.1em] animate-pulse rounded-full bg-gold align-baseline" />
                )}
              </span>
            </span>
          ))}
        </h1>

        <motion.div initial="hidden" animate={done ? 'visible' : 'hidden'} className="mt-10 short:mt-6">
          <motion.p
            variants={reveal}
            className="mx-auto max-w-2xl text-base leading-relaxed text-powder/80 sm:text-lg"
          >
            {hero.message}
          </motion.p>

          <motion.p variants={reveal} custom={1} className="mt-6 font-script text-2xl text-gold/90 sm:text-3xl short:mt-3">
            {hero.signature}
          </motion.p>

          <motion.div variants={reveal} custom={2} className="mt-10 flex flex-col items-center gap-4 short:mt-6">
            <motion.button
              type="button"
              onClick={onStart}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="group relative inline-flex items-center gap-3 rounded-full bg-linear-to-r from-crimson to-crimson-light px-8 py-4 text-base font-semibold text-white shadow-[0_0_40px_-6px_rgba(225,29,72,0.7)] transition-shadow hover:shadow-[0_0_60px_-4px_rgba(244,63,94,0.9)]"
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-crimson/30 [animation-duration:2.4s]" />
              <Heart className="relative size-5 fill-white transition-transform group-hover:scale-125" aria-hidden />
              <span className="relative">{hero.cta}</span>
            </motion.button>
            <p className="inline-flex items-center gap-2 text-xs text-powder/60">
              <Music className="size-3.5" aria-hidden />
              {hero.soundHint}
            </p>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: done ? 1 : 0, y: [0, 8, 0] }}
        transition={{ opacity: { delay: 1.5 }, y: { duration: 2, repeat: Infinity } }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-gold/60"
      >
        <ChevronDown className="size-6" />
      </motion.div>
    </section>
  )
}
