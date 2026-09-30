import { AnimatePresence, motion, useInView } from 'framer-motion'
import { ArrowUp, Crown, Heart, MessageCircleHeart, Plane } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { config, reconciliation } from '../data/content'
import { useConfetti } from '../hooks/useConfetti'
import { useEscapingButton } from '../hooks/useEscapingButton'
import { HAPTICS, vibrate } from '../lib/haptics'
import { EASE_OUT } from '../lib/motion'
import { Section, SectionHeading } from './ui/Section'

const { noLabels, accepted, route } = reconciliation
const whatsappHref = `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(config.whatsappMessage)}`

/** Chronologie de la victoire (secondes) : billet, vol, tampon, bouton WhatsApp. */
const TIMELINE = { ticket: 0.5, flight: 1.2, flightDuration: 2.2, stamp: 3.4, reply: 3.9 }

/** Croissance de « Oui » : échelle max, impulsion à chaque tentative, marge minimale au bord de l'écran (px). */
const YES_MAX_SCALE = 1.6
const YES_POP = 1.15
const YES_EDGE_MARGIN = 6

/** Trajet Kamsar → Conakry : l'avion suit la ligne pointillée pendant que la trace se remplit. */
function FlightPath() {
  return (
    <div className="flex items-end justify-between gap-3 px-6 pt-6">
      <div>
        <p className="font-mono text-3xl font-bold leading-none">{route.from}</p>
        <p className="mt-1 text-xs font-medium text-ink-700/80">{route.fromCity}</p>
      </div>

      <div className="relative mb-3 h-6 flex-1" aria-hidden>
        <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-ink-900/25" />
        <motion.div
          className="absolute inset-x-0 top-1/2 h-0.5 origin-left -translate-y-px bg-linear-to-r from-crimson to-crimson-light"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: TIMELINE.flightDuration, delay: TIMELINE.flight, ease: [0.45, 0, 0.2, 1] }}
        />
        <motion.div
          className="absolute inset-0"
          initial={{ x: '0%' }}
          animate={{ x: '100%' }}
          transition={{ duration: TIMELINE.flightDuration, delay: TIMELINE.flight, ease: [0.45, 0, 0.2, 1] }}
        >
          <Plane className="absolute left-0 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rotate-45 fill-crimson text-crimson" />
        </motion.div>
      </div>

      <div className="text-right">
        <p className="font-mono text-3xl font-bold leading-none">{route.to}</p>
        <p className="mt-1 text-xs font-medium text-ink-700/80">{route.toCity}</p>
      </div>
    </div>
  )
}

/** Billet d'embarquement animé : il glisse et se redresse, l'avion vole, puis le tampon tombe. */
function BoardingPass() {
  return (
    <motion.div
      initial={{ y: 140, rotateX: 65, opacity: 0 }}
      animate={{ y: 0, rotateX: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 80, damping: 14, delay: TIMELINE.ticket }}
      style={{ transformPerspective: 1000 }}
      className="relative mx-auto mt-10 max-w-md overflow-hidden rounded-3xl bg-linear-to-br from-blush via-powder to-gold-light text-left text-ink-900 shadow-[0_30px_80px_-20px_rgba(244,63,94,0.55)]"
    >
      <div className="flex items-center justify-between gap-3 bg-night px-6 py-4 text-gold-light">
        <span className="font-display text-xl font-semibold tracking-wide">{reconciliation.ticketTitle}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/60 bg-linear-to-r from-gold to-gold-light px-3 py-1 font-mono text-[11px] font-bold tracking-[0.25em] text-night shadow-[0_0_16px_-2px_rgba(245,158,11,0.8)]">
          <Crown className="size-3.5" aria-hidden />
          VIP
        </span>
      </div>

      <FlightPath />

      <motion.div
        initial={{ scale: 2.6, rotate: -24, opacity: 0 }}
        animate={{ scale: 1, rotate: -8, opacity: 0.85 }}
        transition={{ type: 'spring', stiffness: 380, damping: 16, delay: TIMELINE.stamp }}
        onAnimationComplete={() => vibrate(HAPTICS.tap)}
        className="pointer-events-none absolute bottom-4 left-5 z-10 rounded-lg bg-blush/70 border-[3px] border-crimson px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-crimson"
      >
        {reconciliation.boarding}
      </motion.div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-6 py-6">
        {accepted.ticket.map(({ label, value }, i) => (
          <div key={label} className={i === 0 ? 'col-span-2' : ''}>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-700/70">{label}</dt>
            <dd className="mt-0.5 font-display text-lg font-semibold leading-tight">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="relative border-t-2 border-dashed border-ink-900/20 px-6 py-4">
        <span className="absolute -left-3 -top-3 size-6 rounded-full bg-night" />
        <span className="absolute -right-3 -top-3 size-6 rounded-full bg-night" />
        <div className="flex items-center justify-between gap-4">
          <div
            aria-hidden
            className="h-10 flex-1 bg-[repeating-linear-gradient(90deg,#0F172A_0_2px,transparent_2px_5px,#0F172A_5px_6px,transparent_6px_9px)] opacity-80"
          />
          <span className="font-mono text-xs font-semibold">MORO ❤ FDD</span>
        </div>
      </div>
    </motion.div>
  )
}

/** Écran de victoire : cœur, message, billet animé et ouverture de WhatsApp pré-rempli. */
function Victory() {
  return (
    <motion.div
      key="accepted"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: EASE_OUT }}
      className="text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.3, 1] }}
        transition={{ duration: 0.9, delay: 0.2 }}
        className="mx-auto grid size-20 place-items-center rounded-full bg-crimson/20 neon-glow"
      >
        <Heart className="size-10 fill-crimson-light text-crimson-light" aria-hidden />
      </motion.div>
      <h2 className="mt-6 font-script text-5xl text-gold sm:text-6xl">{accepted.title}</h2>
      <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-powder/85 sm:text-lg">{accepted.message}</p>

      <BoardingPass />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: TIMELINE.reply, ease: EASE_OUT }}
        className="mx-auto mt-10 flex max-w-md flex-col items-center"
      >
        <p className="text-sm text-powder/70">{accepted.replyHint}</p>
        <p className="glass mt-3 rounded-2xl rounded-bl-sm px-5 py-3 font-display text-lg italic text-blush">
          « {config.whatsappMessage} »
        </p>
        <motion.a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          onClick={() => vibrate(HAPTICS.tap)}
          animate={{
            boxShadow: [
              '0 0 20px -6px rgba(37,211,102,0.6)',
              '0 0 45px -4px rgba(37,211,102,0.95)',
              '0 0 20px -6px rgba(37,211,102,0.6)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          whileTap={{ scale: 0.96 }}
          className="mt-6 inline-flex min-h-14 items-center gap-2 rounded-full bg-[#25D366] px-8 py-4 text-lg font-bold text-ink-950"
        >
          <MessageCircleHeart className="size-6" aria-hidden />
          {accepted.reply}
        </motion.a>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm text-powder/80 transition-colors hover:border-gold/40 hover:text-gold"
        >
          <ArrowUp className="size-4" aria-hidden />
          {accepted.restart}
        </button>
      </motion.div>
    </motion.div>
  )
}

/**
 * La question finale. « Non » fuit le doigt (physique rAF dans un rayon de 80 px),
 * chaque tentative fait grandir, pulser et briller « Oui ». « Oui » lance la victoire.
 */
export default function Reconciliation() {
  const arenaRef = useRef(null)
  const yesRef = useRef(null)
  const noRef = useRef(null)
  const noScaleRef = useRef(1)
  const [attempts, setAttempts] = useState(0)
  const [isAccepted, setIsAccepted] = useState(false)
  const [maxYesScale, setMaxYesScale] = useState(YES_MAX_SCALE)
  const inView = useInView(arenaRef, { margin: '120px' })
  const { fireworks, heartBurst } = useConfetti()

  const onAttempt = useCallback(() => {
    setAttempts((a) => {
      noScaleRef.current = Math.max(0.7, 1 - (a + 1) * 0.05)
      return a + 1
    })
    vibrate(HAPTICS.tap)
  }, [])

  const { kick } = useEscapingButton({
    arenaRef,
    buttonRef: noRef,
    avoidRef: yesRef,
    scaleRef: noScaleRef,
    enabled: inView && !isAccepted,
    onAttempt,
  })

  const accept = () => {
    setIsAccepted(true)
    vibrate(HAPTICS.victory)
    heartBurst({ x: 0.5, y: 0.5 })
    fireworks(5000)
  }

  useEffect(() => {
    const arena = arenaRef.current
    const yes = yesRef.current
    if (!arena || !yes) return undefined
    const measure = () => {
      const r = yes.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const room = Math.min(cx, window.innerWidth - cx) - YES_EDGE_MARGIN
      const fit = (2 * room) / yes.offsetWidth / YES_POP
      setMaxYesScale(Math.min(YES_MAX_SCALE, Math.max(1.15, fit)))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(arena)
    return () => ro.disconnect()
  }, [isAccepted])

  const growth = Math.min(attempts, 6)
  const yesScale = 1 + ((maxYesScale - 1) * growth) / 6
  const glowAt = (boost) => `0 0 ${40 + growth * 10 + boost * 24}px ${-6 + growth * 2 + boost * 4}px rgba(244,63,94,${0.75 + growth * 0.03})`
  const glow = [glowAt(0), glowAt(1), glowAt(0)]

  return (
    <Section id="reponse" className="pb-36">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-40 inset-y-0 bg-[radial-gradient(circle_at_50%_60%,rgba(225,29,72,0.22),transparent_60%)]"
      />
      <AnimatePresence mode="wait">
        {!isAccepted ? (
          <motion.div key="question" exit={{ opacity: 0, scale: 0.95, filter: 'blur(6px)' }} transition={{ duration: 0.5 }}>
            <SectionHeading
              eyebrow={reconciliation.eyebrow}
              title={reconciliation.title}
              subtitle={reconciliation.subtitle}
              icon={Heart}
            />

            <div ref={arenaRef} className="glass relative mx-auto h-80 w-full max-w-xl select-none rounded-[2rem] sm:h-72">
              <div className="absolute inset-y-0 left-0 flex w-1/2 items-center justify-center sm:w-[55%]">
                <motion.button
                  ref={yesRef}
                  type="button"
                  onClick={accept}
                  animate={{
                    scale: attempts ? [yesScale * YES_POP, yesScale] : yesScale,
                    boxShadow: glow,
                  }}
                  whileTap={{ scale: yesScale * 0.94 }}
                  transition={{
                    scale: { duration: 0.55, ease: EASE_OUT },
                    boxShadow: { duration: Math.max(0.8, 1.6 - growth * 0.12), repeat: Infinity, ease: 'easeInOut' },
                  }}
                  className="relative z-10 inline-flex min-h-14 items-center gap-2 rounded-full bg-linear-to-r from-crimson to-crimson-light px-7 py-4 text-lg sm:px-9 font-bold text-white"
                >
                  <span className="absolute inset-0 animate-ping rounded-full bg-crimson-light/30 [animation-duration:2s]" />
                  {attempts > 0 && (
                    <motion.span
                      key={attempts}
                      aria-hidden
                      initial={{ scale: 1, opacity: 0.8 }}
                      animate={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="absolute inset-0 rounded-full border-2 border-rose-gold"
                    />
                  )}
                  <Heart className="relative size-5 fill-white" aria-hidden />
                  <span className="relative">{reconciliation.yes}</span>
                </motion.button>
              </div>

              <button
                ref={noRef}
                type="button"
                onClick={kick}
                style={{ opacity: 0 }}
                className="absolute left-0 top-0 min-h-12 whitespace-nowrap rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-powder/80 backdrop-blur-md will-change-transform"
              >
                {noLabels[Math.min(attempts, noLabels.length - 1)]}
              </button>
            </div>

            <p className="mt-5 h-5 text-center text-xs text-powder/55" aria-live="polite">
              {attempts > 0 && reconciliation.attempts(attempts)}
            </p>
          </motion.div>
        ) : (
          <Victory />
        )}
      </AnimatePresence>
    </Section>
  )
}
