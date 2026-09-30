import { useEffect, useRef } from 'react'
import { createCosmicHeart } from '../../lib/cosmicHeart'

/**
 * Canvas plein écran du cœur cosmique (voir `lib/cosmicHeart`).
 * @param {{
 *   centerY: number,
 *   proximityRef: { current: number },
 *   unlockedRef: { current: boolean },
 *   explosionDuration: number,
 *   onExploded?: () => void,
 * }} props
 */
export default function CosmicHeart({ centerY, proximityRef, unlockedRef, explosionDuration, onExploded }) {
  const canvasRef = useRef(null)
  const onExplodedRef = useRef(onExploded)

  useEffect(() => {
    onExplodedRef.current = onExploded
  }, [onExploded])

  useEffect(
    () =>
      createCosmicHeart(canvasRef.current, {
        centerY,
        proximityRef,
        unlockedRef,
        explosionDuration,
        reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        onExploded: () => onExplodedRef.current?.(),
      }),
    [centerY, proximityRef, unlockedRef, explosionDuration],
  )

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0" />
}
