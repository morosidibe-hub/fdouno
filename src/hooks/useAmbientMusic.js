import { useCallback, useEffect, useRef, useState } from 'react'
import { AmbientSynth, FilePlayer, probeAudio } from '../lib/audioEngines'

const EMPTY_SPECTRUM = new Uint8Array(128)

/**
 * Musique d'ambiance : joue `src` s'il existe (ex. public/music.mp3),
 * sinon une mélodie générée en direct avec la Web Audio API.
 * `getLevel` / `getSpectrum` sont lus image par image par les animations Canvas.
 */
export function useAmbientMusic({ src = '/music.mp3', volume = 0.7 } = {}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [source, setSource] = useState('synth')
  const engineRef = useRef(null)

  // La détection se fait en amont : sur iOS, l'audio doit démarrer
  // de façon synchrone dans le geste de l'utilisateur.
  useEffect(() => {
    let cancelled = false
    probeAudio(src).then((found) => {
      if (!cancelled && found) setSource('file')
    })
    return () => {
      cancelled = true
    }
  }, [src])

  useEffect(() => () => engineRef.current?.destroy(), [])

  const ensureEngine = useCallback(
    () => (engineRef.current ??= source === 'file' ? new FilePlayer(src, volume) : new AmbientSynth(volume)),
    [source, src, volume],
  )

  /** Déverrouille l'audio en silence ; à appeler au début d'un geste. */
  const prime = useCallback(() => {
    ensureEngine().prime()
  }, [ensureEngine])

  const play = useCallback(() => {
    setIsPlaying(true)
    ensureEngine()
      .start()
      .then((ok) => {
        if (!ok) setIsPlaying(false)
      })
  }, [ensureEngine])

  const pause = useCallback(() => {
    engineRef.current?.stop()
    setIsPlaying(false)
  }, [])

  const toggle = useCallback(() => (isPlaying ? pause() : play()), [isPlaying, pause, play])
  const duck = useCallback((on) => engineRef.current?.duck(on), [])
  const getLevel = useCallback(() => engineRef.current?.getLevel() ?? 0, [])
  const getSpectrum = useCallback(() => engineRef.current?.getSpectrum() ?? EMPTY_SPECTRUM, [])
  const getBassSpectrum = useCallback(() => engineRef.current?.getBassSpectrum() ?? EMPTY_SPECTRUM, [])

  return { isPlaying, source, prime, play, pause, toggle, duck, getLevel, getSpectrum, getBassSpectrum }
}
