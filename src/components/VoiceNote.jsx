import { motion, useInView, useReducedMotion } from 'framer-motion'
import { Mic, Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { config, photos, voice } from '../data/content'
import { createAudioContext, probeAudio } from '../lib/audioEngines'
import { fitCanvas, heartCurve } from '../lib/canvas'
import { HAPTICS, vibrate } from '../lib/haptics'
import { Section, SectionHeading } from './ui/Section'

const SIZE = 260
const POINTS = 160
const SCALE = 4.7
/** Décalage vertical recentrant la courbe (y ∈ [-12, 17]). */
const CENTER_Y = 2.5
const MAX_DISPLACEMENT = 30
const LOG_SPREAD = 4
const BAR_COUNT = 40
const BAR_HEIGHT = 44
/** Empreinte vocale affichée au repos, façon message vocal. */
const IDLE_BARS = Float32Array.from(
  { length: BAR_COUNT },
  (_, i) => 0.25 + 0.45 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.43)) + 0.12 * Math.sin(i * 0.31),
)

/**
 * Contour du cœur précalculé : position, normale sortante et poids de chaque point.
 * Le poids atténue l'encoche du haut et la pointe du bas pour garder une silhouette nette.
 */
const RAW_POINTS = Array.from({ length: POINTS }, (_, i) => {
  const { x, y } = heartCurve((i / POINTS) * Math.PI * 2)
  return { x: x * SCALE, y: (y - CENTER_Y) * SCALE }
})
const OUTLINE = RAW_POINTS.map((p, i) => {
  const prev = RAW_POINTS[(i - 1 + POINTS) % POINTS]
  const next = RAW_POINTS[(i + 1) % POINTS]
  const tx = next.x - prev.x
  const ty = next.y - prev.y
  const len = Math.hypot(tx, ty) || 1
  let nx = ty / len
  let ny = -tx / len
  if (nx * p.x + ny * p.y < 0) {
    nx = -nx
    ny = -ny
  }
  const f = (i < POINTS / 2 ? i : POINTS - i) / (POINTS / 2)
  const notch = Math.min(1, f / 0.22) ** 2
  const tip = Math.min(1, (1 - f) / 0.12)
  return { x: p.x, y: p.y, nx, ny, f, weight: notch * tip * (0.45 + 0.55 * Math.sin(Math.PI * f)) }
})
const amplitudes = new Float32Array(POINTS)
const scratch = new Float32Array(POINTS)

/** Lissage circulaire à 3 points, appliqué `passes` fois, pour une onde organique. */
function smooth(values, passes) {
  for (let p = 0; p < passes; p++) {
    for (let i = 0; i < POINTS; i++) {
      scratch[i] = (values[(i - 1 + POINTS) % POINTS] + values[i] * 2 + values[(i + 1) % POINTS]) / 4
    }
    values.set(scratch)
  }
}

const formatTime = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00')

/**
 * Trace les contours du cœur déformés par le spectre.
 * Le spectre est replié en miroir pour que les deux lobes vibrent symétriquement.
 * @param {CanvasRenderingContext2D} ctx
 * @param {(i: number) => number} amplitude amplitude ∈ [0, 1] du point i
 * @param {number} progress avancement de la lecture ∈ [0, 1]
 * @param {number} energy niveau global ∈ [0, 1]
 */
function drawHeartWave(ctx, amplitude, progress, energy) {
  const c = SIZE / 2
  ctx.clearRect(0, 0, SIZE, SIZE)
  ctx.save()
  ctx.translate(c, c)
  ctx.lineJoin = 'round'

  const halo = ctx.createRadialGradient(0, 0, 10, 0, 0, SIZE * 0.5)
  halo.addColorStop(0, `rgba(244,63,94,${0.12 + energy * 0.3})`)
  halo.addColorStop(1, 'rgba(244,63,94,0)')
  ctx.fillStyle = halo
  ctx.fillRect(-c, -c, SIZE, SIZE)

  const rings = [
    { gain: 1, width: 2.4, color: `rgba(244,63,94,${0.55 + energy * 0.45})`, blur: 18 },
    { gain: 0.55, width: 1.4, color: 'rgba(251,113,133,0.55)', blur: 8 },
    { gain: 0.2, width: 1, color: 'rgba(245,158,11,0.45)', blur: 0 },
  ]
  for (const ring of rings) {
    ctx.beginPath()
    OUTLINE.forEach((p, i) => {
      const d = amplitude(i) * MAX_DISPLACEMENT * ring.gain
      const x = p.x + p.nx * d
      const y = p.y + p.ny * d
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.shadowColor = ring.color
    ctx.shadowBlur = ring.blur
    ctx.strokeStyle = ring.color
    ctx.lineWidth = ring.width
    ctx.stroke()
  }

  if (progress > 0) {
    ctx.shadowBlur = 12
    ctx.shadowColor = 'rgba(245,158,11,0.9)'
    ctx.strokeStyle = '#F59E0B'
    ctx.lineWidth = 3.2
    ctx.beginPath()
    const end = Math.floor(progress * POINTS)
    for (let i = 0; i <= end && i < POINTS; i++) {
      const p = OUTLINE[i]
      const d = amplitude(i) * MAX_DISPLACEMENT
      if (i === 0) ctx.moveTo(p.x + p.nx * d, p.y + p.ny * d)
      else ctx.lineTo(p.x + p.nx * d, p.y + p.ny * d)
    }
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * Barres d'onde en direct : dorées pour la partie écoutée, rosées pour la suite.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Float32Array} levels hauteur ∈ [0, 1] de chaque barre
 * @param {number} width largeur CSS du canvas
 * @param {number} progress avancement de la lecture ∈ [0, 1]
 */
function drawBars(ctx, levels, width, progress) {
  ctx.clearRect(0, 0, width, BAR_HEIGHT)
  const step = width / BAR_COUNT
  const barWidth = Math.max(2, step * 0.55)
  const played = progress * BAR_COUNT
  for (let i = 0; i < BAR_COUNT; i++) {
    const h = Math.max(3, levels[i] * (BAR_HEIGHT - 4))
    ctx.fillStyle = i < played ? '#F59E0B' : 'rgba(251,113,133,0.55)'
    ctx.beginPath()
    ctx.roundRect(i * step + (step - barWidth) / 2, (BAR_HEIGHT - h) / 2, barWidth, h, barWidth / 2)
    ctx.fill()
  }
}

/** Bouton lecture/pause en forme de cœur. */
const HEART_PATH =
  'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'

/** Message vocal de Moro. N'apparaît que si `config.voiceSrc` existe dans public/. */
export default function VoiceNote({ onPlayingChange }) {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    let cancelled = false
    probeAudio(config.voiceSrc).then((found) => !cancelled && setAvailable(found))
    return () => {
      cancelled = true
    }
  }, [])

  return available ? <VoicePlayer onPlayingChange={onPlayingChange} /> : null
}

/** Cœur lumineux flottant dont le contour pulse en temps réel avec la voix. */
function VoicePlayer({ onPlayingChange }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [time, setTime] = useState({ current: 0, duration: 0 })
  const audioRef = useRef(null)
  const canvasRef = useRef(null)
  const barsRef = useRef(null)
  const beatRef = useRef(null)
  const graphRef = useRef(null)
  const onPlayingChangeRef = useRef(onPlayingChange)
  const inView = useInView(canvasRef, { margin: '80px' })
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    onPlayingChangeRef.current = onPlayingChange
  }, [onPlayingChange])

  // Une seule boucle rAF, active uniquement quand le cœur est à l'écran :
  // spectre réel pendant la lecture, respiration douce au repos.
  useEffect(() => {
    if (!inView) return
    const canvas = canvasRef.current
    fitCanvas(canvas, SIZE, SIZE)
    const ctx = canvas.getContext('2d')
    const barsCanvas = barsRef.current
    const barsWidth = barsCanvas.clientWidth || 260
    fitCanvas(barsCanvas, barsWidth, BAR_HEIGHT)
    const barsCtx = barsCanvas.getContext('2d')
    const bars = new Float32Array(IDLE_BARS)
    let raf = 0

    const frame = (now) => {
      const graph = graphRef.current
      const audio = audioRef.current
      const playing = audio && !audio.paused && graph
      let amplitude
      let energy = 0

      if (playing) {
        const { data } = graph
        graph.analyser.getByteFrequencyData(data)
        // La voix se concentre sous ~6 kHz : seul le premier quart du spectre est utilisé.
        // L'énergie globale et une ondulation qui la suit gardent tout le contour vivant,
        // même là où tombent les aigus, plus faibles.
        const usable = Math.floor(data.length * 0.25)
        let sum = 0
        for (let i = 0; i < usable; i++) sum += data[i]
        energy = sum / usable / 255
        for (let i = 0; i < POINTS; i++) {
          const { f, weight } = OUTLINE[i]
          // Répartition logarithmique (comme l'oreille) + compensation des aigus, plus faibles.
          const pos = ((2 ** (f * LOG_SPREAD) - 1) / (2 ** LOG_SPREAD - 1)) * (usable - 1)
          const lo = Math.floor(pos)
          const hi = Math.min(lo + 1, usable - 1)
          const band = Math.min(1, ((data[lo] + (data[hi] - data[lo]) * (pos - lo)) / 255) * (1 + f * 1.4))
          const ripple = (0.5 + 0.5 * Math.sin(i * 0.9 - now * 0.012)) * energy * 0.35
          amplitudes[i] = (energy * 0.45 + band * 0.4 + ripple) * weight
        }
        smooth(amplitudes, 5)
        amplitude = (i) => amplitudes[i]
        // Barres centrées sur les graves de la voix : attaque rapide, retombée douce.
        for (let i = 0; i < BAR_COUNT; i++) {
          const bin = Math.floor(((2 ** ((Math.abs(i - BAR_COUNT / 2) / (BAR_COUNT / 2)) * 3) - 1) / 7) * (usable - 1))
          const target = Math.min(1, (data[bin] / 255) * 1.15 + energy * 0.2)
          bars[i] += (target - bars[i]) * (target > bars[i] ? 0.6 : 0.15)
        }
      } else {
        const breath = reduceMotion ? 0 : 0.5 + Math.sin(now * 0.0025) * 0.5
        energy = breath * 0.15
        amplitude = (i) => (reduceMotion ? 0 : (0.06 + Math.sin(i * 0.35 + now * 0.004) * 0.04) * (0.6 + breath * 0.4))
        for (let i = 0; i < BAR_COUNT; i++) bars[i] += (IDLE_BARS[i] - bars[i]) * 0.08
      }

      const progress = audio?.duration ? audio.currentTime / audio.duration : 0
      drawHeartWave(ctx, amplitude, progress, energy)
      drawBars(barsCtx, bars, barsWidth, progress)
      if (beatRef.current) beatRef.current.style.transform = playing ? `scale(${1 + energy * 0.35})` : ''
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [inView, reduceMotion])

  useEffect(() => () => graphRef.current?.ctx.close(), [])

  const setPlaying = (value) => {
    setIsPlaying(value)
    onPlayingChangeRef.current?.(value)
  }

  const toggle = async () => {
    const audio = audioRef.current
    if (!graphRef.current) {
      const ctx = createAudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.72
      ctx.createMediaElementSource(audio).connect(analyser)
      analyser.connect(ctx.destination)
      graphRef.current = { ctx, analyser, data: new Uint8Array(analyser.frequencyBinCount) }
    }
    if (isPlaying) {
      audio.pause()
      return
    }
    vibrate(HAPTICS.tap)
    try {
      await graphRef.current.ctx.resume()
      await audio.play()
    } catch {
      setPlaying(false)
    }
  }

  return (
    <Section id="voix">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-40 inset-y-0 bg-[radial-gradient(circle_at_50%_55%,rgba(225,29,72,0.18),transparent_55%)]"
      />
      <SectionHeading eyebrow={voice.eyebrow} title={voice.title} subtitle={voice.subtitle} icon={Mic} />

      <div className="glass-card mx-auto flex max-w-md flex-col items-center p-5 shadow-[0_0_60px_-20px_rgba(225,29,72,0.6)] sm:p-6">
        <div className="flex w-full items-center gap-3">
          <span className="relative size-12 shrink-0 overflow-hidden rounded-full border-2 border-rose-gold/70 shadow-[0_0_18px_-4px_rgba(244,63,94,0.8)]">
            <img src={photos.moro[0]} alt={voice.from} className="size-full object-cover" loading="lazy" decoding="async" />
            {isPlaying && <span aria-hidden className="absolute inset-0 animate-ping rounded-full border-2 border-crimson-light/60" />}
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="font-script text-2xl leading-none text-powder">{voice.from}</p>
            <p className="mt-1 truncate text-xs uppercase tracking-[0.2em] text-powder/55">{voice.label}</p>
          </div>
          <Mic aria-hidden className={`size-5 shrink-0 ${isPlaying ? 'text-crimson-light' : 'text-powder/40'}`} />
        </div>

        <motion.div
          className="relative grid place-items-center"
          style={{ width: SIZE, height: SIZE }}
          animate={reduceMotion ? undefined : { y: [0, -8, 0], rotate: [-1.5, 1.5, -1.5] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <canvas ref={canvasRef} aria-hidden className="absolute inset-0" />
          <motion.button
            type="button"
            onClick={toggle}
            aria-label={isPlaying ? voice.pause : voice.play}
            aria-pressed={isPlaying}
            whileTap={{ scale: 0.88 }}
            animate={isPlaying || reduceMotion ? { scale: 1 } : { scale: [1, 1.1, 1, 1.14, 1] }}
            transition={isPlaying ? { duration: 0.2 } : { duration: 1.4, repeat: Infinity, times: [0, 0.14, 0.28, 0.42, 0.7] }}
            className="relative -mt-3 grid size-24 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
          >
            <span ref={beatRef} className="absolute inset-0 grid place-items-center will-change-transform">
              <svg viewBox="0 0 24 24" aria-hidden className="size-full drop-shadow-[0_0_18px_rgba(244,63,94,0.85)]">
                <defs>
                  <linearGradient id="voice-heart" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#F43F5E" />
                    <stop offset="100%" stopColor="#E11D48" />
                  </linearGradient>
                </defs>
                <path d={HEART_PATH} fill="url(#voice-heart)" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" />
              </svg>
            </span>
            <span className="relative -mt-2 text-white">
              {isPlaying ? <Pause className="size-7 fill-white" /> : <Play className="ml-0.5 size-7 fill-white" />}
            </span>
          </motion.button>
        </motion.div>

        <canvas
          ref={barsRef}
          aria-hidden
          className="h-11 w-full cursor-pointer"
          onClick={(e) => {
            const audio = audioRef.current
            if (!audio?.duration) return
            const rect = e.currentTarget.getBoundingClientRect()
            audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration
          }}
        />
        <div className="mt-2 flex w-full justify-between font-mono text-xs tabular-nums text-powder/60">
          <span>{formatTime(time.current)}</span>
          <span>{formatTime(time.duration)}</span>
        </div>
        <p className={`mt-4 font-display text-lg italic text-powder/80 transition-opacity ${isPlaying ? 'opacity-0' : ''}`}>
          {voice.play}
        </p>

        <audio
          ref={audioRef}
          src={config.voiceSrc}
          preload="metadata"
          playsInline
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onLoadedMetadata={(e) => {
            const { duration } = e.currentTarget
            setTime((t) => ({ ...t, duration }))
          }}
          onTimeUpdate={(e) => {
            const { currentTime, duration } = e.currentTarget
            setTime({ current: currentTime, duration })
          }}
        />
      </div>
    </Section>
  )
}
