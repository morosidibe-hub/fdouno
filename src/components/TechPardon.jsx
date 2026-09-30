import { AnimatePresence, motion, useInView } from 'framer-motion'
import { Code, Heart, Play, RotateCcw, Terminal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { tech } from '../data/content'
import { useConfetti } from '../hooks/useConfetti'
import { useTypewriter } from '../hooks/useTypewriter'
import { HAPTICS, vibrate } from '../lib/haptics'
import { EASE_OUT } from '../lib/motion'
import HeartBurst3D from './ui/HeartBurst3D'
import { Section, SectionHeading } from './ui/Section'

/** Groupes : commentaire, chaîne, mot-clé, nombre, identifiant « vivant », prénom, appel de fonction. */
const TOKEN_RE =
  /(\/\/.*$)|("[^"]*"?|`[^`]*`?)|\b(const|let|function|return|while|if|import|from|export|default)\b|\b(\d+)\b|\b(heart|love|isLoved|true|false)\b|\b(Moro|Douno)\b|([A-Za-z_]\w*)(?=\()/g
const TOKEN_CLASSES = [
  'text-powder/40 italic',
  'text-gold-light',
  'text-crimson-light',
  'text-gold',
  'text-gold',
  'font-semibold text-rose-gold [text-shadow:0_0_10px_rgba(244,63,94,0.7)]',
  'text-sky-300',
]

function highlight(line) {
  const parts = []
  let last = 0
  for (const match of line.matchAll(TOKEN_RE)) {
    if (match.index > last) parts.push(line.slice(last, match.index))
    const group = match.slice(1).findIndex(Boolean)
    parts.push(
      <span key={match.index} className={TOKEN_CLASSES[group]}>
        {match[0]}
      </span>,
    )
    last = match.index + match[0].length
  }
  if (last < line.length) parts.push(line.slice(last))
  return parts
}

const OUTPUT_TONES = {
  cmd: 'text-blush',
  info: 'text-powder/75',
  warn: 'text-amber-300',
  success: 'text-emerald-300',
  final: 'text-gold font-semibold',
}

function AttentionCounter({ running }) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!running) return
    let raf
    const startedAt = performance.now()
    const tick = (now) => {
      const t = (now - startedAt) / 1000
      if (t > 4) return setValue(Infinity)
      setValue(Math.floor(10 ** (t * 2.2)))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running])

  return <span className="tabular-nums text-gold">{value === Infinity ? '∞' : value.toLocaleString('fr-FR')}</span>
}

export default function TechPardon() {
  const editorRef = useRef(null)
  const terminalRef = useRef(null)
  const timers = useRef([])
  const inView = useInView(editorRef, { once: true, margin: '-120px' })
  const { typed, activeLine, done, skip } = useTypewriter(tech.code, {
    speed: 18,
    lineDelay: 110,
    startDelay: 400,
    enabled: inView,
  })
  const [phase, setPhase] = useState('idle')
  const [output, setOutput] = useState([])
  const [burstKey, setBurstKey] = useState(0)
  const { pardonBurst, heartRain } = useConfetti()

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  useEffect(() => {
    terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight, behavior: 'smooth' })
  }, [output])

  const run = () => {
    if (phase === 'running') return
    skip()
    timers.current.forEach(clearTimeout)
    timers.current = []
    setOutput([])
    setPhase('running')
    vibrate(HAPTICS.pardon)

    let at = 250
    tech.output.forEach((line, i) => {
      at += line.delay
      timers.current.push(
        setTimeout(() => {
          setOutput((o) => [...o, line])
          if (i === tech.output.length - 1) {
            setPhase('done')
            pardonBurst()
            heartRain(4000)
            setBurstKey((k) => k + 1)
            vibrate(HAPTICS.pardon)
          }
        }, at),
      )
    })
  }

  return (
    <Section id="code">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-40 inset-y-0 bg-[radial-gradient(circle_at_70%_50%,rgba(245,158,11,0.08),transparent_55%)]"
      />
      <SectionHeading eyebrow={tech.eyebrow} title={tech.title} icon={Code} />

      <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-14">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: EASE_OUT }}
          className="space-y-5 text-center text-base leading-relaxed text-powder/80 sm:text-lg lg:pt-6 lg:text-left"
        >
          {tech.intro.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <p className="font-script text-3xl text-gold">Compilé avec le cœur.</p>
        </motion.div>

        <motion.div
          ref={editorRef}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: EASE_OUT }}
          className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1120] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8),0_0_60px_-30px_rgba(244,63,94,0.6)]"
        >
          <div className="flex items-center gap-3 border-b border-white/5 bg-white/[0.03] px-4 py-3">
            <div className="flex gap-1.5" aria-hidden>
              <span className="size-3 rounded-full bg-[#ff5f57]" />
              <span className="size-3 rounded-full bg-[#febc2e]" />
              <span className="size-3 rounded-full bg-[#28c840]" />
            </div>
            <span className="rounded-md bg-white/5 px-3 py-1 font-mono text-xs text-powder/80">{tech.filename}</span>
            <span className="ml-auto hidden font-mono text-[11px] uppercase tracking-[0.2em] text-gold/60 sm:inline">
              Moro Code Lab
            </span>
          </div>

          <pre className="overflow-x-auto px-2 py-4 font-mono text-[12px] leading-6 sm:px-4 sm:text-[13.5px]">
            <code>
              {typed.map((line, i) => (
                <span key={i} className="flex">
                  <span className="w-8 shrink-0 select-none pr-3 text-right text-white/20">{i + 1}</span>
                  <span className="whitespace-pre text-blush/90">
                    {highlight(line)}
                    {i === activeLine && !done && (
                      <span className="ml-px inline-block h-4 w-[7px] translate-y-[3px] animate-pulse bg-gold/80" />
                    )}
                  </span>
                </span>
              ))}
            </code>
          </pre>

          <div className="border-t border-white/5 bg-black/30">
            <div className="flex items-center gap-2 px-4 pt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-powder/40">
              <Terminal className="size-3.5" aria-hidden />
              Terminal
            </div>
            <div ref={terminalRef} className="h-40 overflow-y-auto px-4 py-3 font-mono text-[12px] leading-6 sm:text-[13px]" aria-live="polite">
              {output.length === 0 && <p className="text-powder/30">$ en attente d’exécution…</p>}
              <AnimatePresence initial={false}>
                {output.map((line) => (
                  <motion.p
                    key={line.text}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className={OUTPUT_TONES[line.tone]}
                  >
                    {line.text}
                  </motion.p>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/5 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono text-[11px] text-powder/50">
              attention = <AttentionCounter running={phase !== 'idle'} />
            </p>
            <motion.button
              type="button"
              onClick={run}
              disabled={phase === 'running'}
              whileHover={{ scale: phase === 'running' ? 1 : 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-linear-to-r from-gold to-gold-light px-6 py-3 text-sm font-semibold text-ink-950 shadow-[0_0_30px_-8px_rgba(245,158,11,0.9)] disabled:cursor-wait disabled:opacity-70"
            >
              {phase === 'running' ? (
                <Heart className="size-4 animate-pulse fill-ink-950" aria-hidden />
              ) : phase === 'done' ? (
                <RotateCcw className="size-4" aria-hidden />
              ) : (
                <Play className="size-4 fill-ink-950" aria-hidden />
              )}
              {phase === 'running' ? 'Exécution…' : phase === 'done' ? tech.rerun : tech.run}
            </motion.button>
          </div>
        </motion.div>
      </div>
      <HeartBurst3D burstKey={burstKey} />
    </Section>
  )
}
