import { useGSAP } from '@gsap/react'
import { AnimatePresence, motion } from 'framer-motion'
import gsap from 'gsap'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin'
import { Gem, RotateCcw, Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import { kintsugi } from '../data/content'
import { useConfetti } from '../hooks/useConfetti'
import { Section, SectionHeading } from './ui/Section'

gsap.registerPlugin(useGSAP, DrawSVGPlugin, MorphSVGPlugin)

const HEART = 'M100 175 C 40 130, 15 95, 25 65 C 35 35, 75 30, 100 58 C 125 30, 165 35, 175 65 C 185 95, 160 130, 100 175 Z'
const LEFT_HALF = 'M100 175 C 40 130, 15 95, 25 65 C 35 35, 75 30, 100 58 L 92 78 L 106 96 L 94 116 L 108 134 L 97 152 Z'
const RIGHT_HALF = 'M100 58 C 125 30, 165 35, 175 65 C 185 95, 160 130, 100 175 L 97 152 L 108 134 L 94 116 L 106 96 L 92 78 Z'
const CRACK = 'M100 58 L 92 78 L 106 96 L 94 116 L 108 134 L 97 152 L 100 175'
const INFINITY =
  'M100 108 C 80 72, 28 72, 28 108 C 28 144, 80 144, 100 108 C 120 72, 172 72, 172 108 C 172 144, 120 144, 100 108 Z'
const SPARKS = [
  [92, 78],
  [106, 96],
  [94, 116],
  [108, 134],
  [97, 152],
]
const DULL = '#475569'
const CRIMSON = '#E11D48'

export default function MendedHeart() {
  const scope = useRef(null)
  const timeline = useRef(null)
  const [status, setStatus] = useState('broken')
  const [step, setStep] = useState(-1)
  const { goldenBurst } = useConfetti()

  useGSAP(
    () => {
      gsap.set('.k-left', { x: -16, y: 4, rotation: -9, svgOrigin: '100 175' })
      gsap.set('.k-right', { x: 16, y: 4, rotation: 9, svgOrigin: '100 175' })
      gsap.set('.k-crack', { drawSVG: '0%' })
      gsap.set('.k-spark', { scale: 0, transformOrigin: '50% 50%' })
      gsap.set('.k-signature', { strokeDashoffset: 320, fillOpacity: 0 })
      gsap.set('.k-caption', { autoAlpha: 0, y: 12 })
      gsap.to('.k-float', { y: -6, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 })

      const tl = gsap.timeline({
        paused: true,
        onComplete: () => {
          setStatus('mended')
          goldenBurst()
        },
      })

      tl.call(() => setStep(0))
        .to(['.k-left', '.k-right'], { x: 0, y: 0, rotation: 0, duration: 1.4, ease: 'power3.inOut' })
        .to(['.k-left', '.k-right'], { fill: CRIMSON, duration: 1.2, ease: 'power1.inOut' }, '<0.3')
        .call(() => {
          setStep(1)
          navigator.vibrate?.(20)
        })
        .to('.k-crack', { drawSVG: '100%', duration: 1.3, ease: 'power2.inOut' })
        .to('.k-spark', { scale: 1, duration: 0.35, stagger: 0.14, ease: 'back.out(3)' }, '<0.15')
        .to('.k-spark', { scale: 0, duration: 0.4, stagger: 0.08 }, '>0.1')
        .to('.k-beat', { scale: 1.08, duration: 0.16, yoyo: true, repeat: 3, ease: 'power1.inOut', svgOrigin: '100 110' })
        .call(() => setStep(2))
        .set('.k-whole', { autoAlpha: 1 })
        .set(['.k-left', '.k-right'], { autoAlpha: 0 })
        .to('.k-crack', { autoAlpha: 0, duration: 0.4 }, '<')
        .to('.k-whole', { morphSVG: INFINITY, fillOpacity: 0, strokeWidth: 7, duration: 1.6, ease: 'power2.inOut' })
        .to('.k-whole', { morphSVG: HEART, fillOpacity: 1, strokeWidth: 0, duration: 1.4, ease: 'power2.inOut' }, '+=1.1')
        .to('.k-crack', { autoAlpha: 1, duration: 0.6 })
        .to('.k-signature', { strokeDashoffset: 0, duration: 1.6, ease: 'power1.inOut' }, '<')
        .to('.k-signature', { fillOpacity: 1, duration: 0.8 }, '-=0.5')
        .to('.k-caption', { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '<')

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) tl.timeScale(3)
      timeline.current = tl
    },
    { scope },
  )

  const mend = () => {
    if (status === 'mending') return
    setStatus('mending')
    timeline.current?.restart()
  }

  return (
    <Section id="kintsugi">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-40 inset-y-0 bg-[radial-gradient(circle_at_50%_45%,rgba(245,158,11,0.10),transparent_55%)]"
      />
      <SectionHeading eyebrow={kintsugi.eyebrow} title={kintsugi.title} subtitle={kintsugi.subtitle} icon={Gem} />

      <div ref={scope} className="mx-auto flex max-w-sm flex-col items-center">
        <svg viewBox="0 0 200 230" className="w-full max-w-[20rem] overflow-visible" role="img" aria-label="Un cœur brisé réparé avec de l’or">
          <defs>
            <linearGradient id="k-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FCD34D" />
              <stop offset="0.5" stopColor="#F59E0B" />
              <stop offset="1" stopColor="#b8862f" />
            </linearGradient>
            <filter id="k-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g className="k-float">
            <g className="k-beat">
              <path className="k-left" d={LEFT_HALF} fill={DULL} stroke="rgba(245,201,211,0.25)" strokeWidth="1" />
              <path className="k-right" d={RIGHT_HALF} fill={DULL} stroke="rgba(245,201,211,0.25)" strokeWidth="1" />
              <path
                className="k-whole"
                d={HEART}
                fill={CRIMSON}
                stroke="url(#k-gold)"
                strokeWidth="0"
                strokeLinejoin="round"
                visibility="hidden"
                opacity="0"
              />
              <path
                className="k-crack"
                d={CRACK}
                fill="none"
                stroke="url(#k-gold)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#k-glow)"
              />
              {SPARKS.map(([x, y]) => (
                <path
                  key={`${x}-${y}`}
                  className="k-spark"
                  d={`M${x} ${y - 7} L${x + 2} ${y - 2} L${x + 7} ${y} L${x + 2} ${y + 2} L${x} ${y + 7} L${x - 2} ${y + 2} L${x - 7} ${y} L${x - 2} ${y - 2} Z`}
                  fill="#fff4d6"
                />
              ))}
            </g>
          </g>

          <text
            className="k-signature font-script"
            x="100"
            y="218"
            textAnchor="middle"
            fontSize="26"
            fill="#F59E0B"
            stroke="#F59E0B"
            strokeWidth="0.6"
            strokeDasharray="320"
          >
            {kintsugi.signature}
          </text>
        </svg>

        <div className="mt-4 min-h-8 text-center">
          <AnimatePresence mode="wait">
            {status === 'mending' && step >= 0 && (
              <motion.p
                key={step}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="font-display text-xl italic text-gold-light"
              >
                {kintsugi.steps[step]}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <p className="k-caption mt-2 text-center font-display text-2xl font-medium italic leading-snug text-blush">
          {kintsugi.caption}
        </p>

        <motion.button
          type="button"
          onClick={mend}
          disabled={status === 'mending'}
          whileHover={{ scale: status === 'mending' ? 1 : 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-7 py-3.5 font-semibold text-gold-light shadow-[0_0_40px_-10px_rgba(245,158,11,0.8)] backdrop-blur transition-opacity disabled:opacity-50"
        >
          {status === 'mended' ? <RotateCcw className="size-4" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
          {status === 'mended' ? kintsugi.replay : kintsugi.cta}
        </motion.button>
      </div>
    </Section>
  )
}
