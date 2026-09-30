import { motion, useReducedMotion } from 'framer-motion'
import { Heart, Pause, Play } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { photos, player } from '../data/content'

/** Bandes de basses (bins FFT 256 ≈ 0–520 Hz) qui font battre les avatars. */
const BASS_BINS = [1, 2, 3]
const ATTACK = 0.55
const DECAY = 0.12
/** Retard de Douno sur Moro, en images : deux cœurs qui battent en écho (« lub-dub »). */
const ECHO_FRAMES = 7

/** Vitesse (par image) à laquelle le plancher remonte et le plafond redescend. */
const FLOOR_RISE = 0.004
const PEAK_FALL = 0.0025
/** Écart plancher/plafond minimal, pour ne pas amplifier un passage calme en bruit. */
const MIN_RANGE = 0.12

/**
 * Niveau de basses normalisé ∈ [0, 1]. Plancher et plafond suivent la chanson :
 * seuls les coups de grosse caisse ressortent, qu'elle soit mixée fort ou doucement.
 * @param {Uint8Array} spectrum
 * @param {{ floor: number, peak: number }} range mis à jour sur place
 */
function readBass(spectrum, range) {
  let sum = 0
  for (const bin of BASS_BINS) sum += spectrum[bin]
  const raw = sum / BASS_BINS.length / 255
  range.floor = raw < range.floor ? raw : range.floor + FLOOR_RISE
  range.peak = raw > range.peak ? raw : range.peak - PEAK_FALL
  const norm = (raw - range.floor) / Math.max(MIN_RANGE, range.peak - range.floor)
  return Math.min(1, Math.max(0, norm)) ** 1.5
}

/**
 * Avatar circulaire avec halo. Le halo et la photo sont pilotés hors React
 * (transform + opacity uniquement) pour rester sur le compositeur à 60 FPS.
 */
function Avatar({ src, alt, ring, photoRef, haloRef, className = '' }) {
  return (
    <span className={`relative grid size-11 place-items-center ${className}`}>
      <span
        ref={haloRef}
        aria-hidden
        className={`absolute -inset-2 rounded-full opacity-0 blur-md will-change-transform ${ring}`}
      />
      <span
        ref={photoRef}
        className="relative size-11 overflow-hidden rounded-full border-2 border-white/70 bg-ink-800 shadow-lg shadow-black/50 will-change-transform"
      >
        <img src={src} alt={alt} draggable={false} className="size-full object-cover" />
      </span>
    </span>
  )
}

/**
 * Lecteur flottant « Notre pure vérité » : avatars de Moro et Douno superposés
 * qui pulsent et s'illuminent en temps réel sur les basses de la chanson.
 * @param {{ isPlaying: boolean, source: 'file' | 'synth', toggle: () => void, getBassSpectrum: () => Uint8Array }} props
 */
export default function MusicPlayer({ isPlaying, source, toggle, getBassSpectrum }) {
  const reduceMotion = useReducedMotion()
  const moroPhoto = useRef(null)
  const moroHalo = useRef(null)
  const dounoPhoto = useRef(null)
  const dounoHalo = useRef(null)
  const heartRef = useRef(null)

  useEffect(() => {
    const targets = [moroPhoto, moroHalo, dounoPhoto, dounoHalo, heartRef].map((r) => r.current)
    const reset = () => {
      for (const el of targets) if (el) el.style.transform = ''
      if (moroHalo.current) moroHalo.current.style.opacity = '0'
      if (dounoHalo.current) dounoHalo.current.style.opacity = '0'
    }
    if (!isPlaying || reduceMotion) {
      reset()
      return
    }

    const history = new Float32Array(ECHO_FRAMES)
    let head = 0
    const range = { floor: 1, peak: 0 }
    let level = 0
    let raf = 0

    const apply = (photo, halo, value) => {
      photo.style.transform = `scale(${1 + value * 0.16})`
      halo.style.transform = `scale(${1 + value * 0.5})`
      halo.style.opacity = String(0.25 + value * 0.75)
    }

    const frame = () => {
      const bass = readBass(getBassSpectrum(), range)
      level += (bass - level) * (bass > level ? ATTACK : DECAY)
      const echoed = history[head]
      history[head] = level
      head = (head + 1) % ECHO_FRAMES

      apply(moroPhoto.current, moroHalo.current, level)
      apply(dounoPhoto.current, dounoHalo.current, echoed)
      heartRef.current.style.transform = `scale(${1 + Math.max(level, echoed) * 0.45})`
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      reset()
    }
  }, [isPlaying, getBassSpectrum, reduceMotion])

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2, duration: 0.8 }}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 sm:bottom-6 sm:right-6"
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={isPlaying ? player.pause : player.play}
        className="glass group flex min-h-14 items-center gap-3 rounded-full py-1.5 pl-2 pr-3 shadow-2xl shadow-black/50 transition-colors hover:border-gold/50"
      >
        <span className="relative flex items-center">
          <Avatar
            src={photos.moro[0]}
            alt="Moro"
            ring="bg-crimson-light"
            photoRef={moroPhoto}
            haloRef={moroHalo}
            className="z-10"
          />
          <Avatar
            src={photos.douno[0]}
            alt="Douno"
            ring="bg-gold"
            photoRef={dounoPhoto}
            haloRef={dounoHalo}
            className="-ml-3"
          />
          <span
            ref={heartRef}
            aria-hidden
            className="absolute -bottom-1 left-1/2 z-20 -ml-2.5 grid size-5 place-items-center rounded-full bg-night will-change-transform"
          >
            <Heart className={`size-3 fill-crimson-light text-crimson-light ${isPlaying ? '' : 'opacity-60'}`} />
          </span>
        </span>

        <span className="hidden min-w-0 flex-col text-left leading-tight min-[380px]:flex">
          <span className="font-script text-lg leading-none text-gold-light">
            {source === 'file' ? player.title : player.synth}
          </span>
          <span className="mt-0.5 text-[11px] text-blush/80">{isPlaying ? player.playing : player.paused}</span>
        </span>

        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-crimson to-crimson-light text-white shadow-[0_0_18px_-2px_rgba(244,63,94,0.8)]">
          {isPlaying ? <Pause className="size-4 fill-white" aria-hidden /> : <Play className="ml-0.5 size-4 fill-white" aria-hidden />}
        </span>
      </button>
    </motion.div>
  )
}
