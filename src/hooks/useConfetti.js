import confetti from 'canvas-confetti'
import { useMemo } from 'react'

const HEART_PATH =
  'M167 72c19,-38 37,-56 75,-56 42,0 76,33 76,75 0,76 -76,151 -151,227 -76,-76 -151,-151 -151,-227 0,-42 33,-75 75,-75 38,0 57,18 76,56z'
const GOLD = ['#F59E0B', '#FCD34D', '#D97706', '#FEF3C7']
const ROMANCE = ['#E11D48', '#F43F5E', '#FB7185', '#FECDD3']

let heartShape
const getHeart = () => (heartShape ??= confetti.shapeFromPath({ path: HEART_PATH }))

const base = { disableForReducedMotion: true, zIndex: 60 }

export function useConfetti() {
  return useMemo(() => {
    const heartBurst = (origin = { x: 0.5, y: 0.6 }) =>
      confetti({
        ...base,
        particleCount: 45,
        spread: 80,
        startVelocity: 36,
        scalar: 1.7,
        shapes: [getHeart()],
        colors: ROMANCE,
        origin,
      })

    const goldenBurst = () => {
      const fire = (ratio, opts) =>
        confetti({ ...base, origin: { y: 0.7 }, colors: GOLD, particleCount: Math.floor(220 * ratio), ...opts })
      fire(0.25, { spread: 26, startVelocity: 55 })
      fire(0.2, { spread: 60 })
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
      fire(0.1, { spread: 120, startVelocity: 45 })
    }

    const heartRain = (duration = 3500) => {
      const end = Date.now() + duration
      const frame = () => {
        confetti({
          ...base,
          particleCount: 2,
          startVelocity: 0,
          ticks: 320,
          gravity: 0.55,
          scalar: 1.6,
          drift: (Math.random() - 0.5) * 0.8,
          shapes: [getHeart()],
          colors: [...ROMANCE, GOLD[0]],
          origin: { x: Math.random(), y: -0.05 },
        })
        if (Date.now() < end) requestAnimationFrame(frame)
      }
      frame()
    }

    const fireworks = (duration = 5000) => {
      const end = Date.now() + duration
      const id = setInterval(() => {
        const left = end - Date.now()
        if (left <= 0) return clearInterval(id)
        const particleCount = Math.ceil(50 * (left / duration))
        for (const x of [0.2, 0.8]) {
          confetti({
            ...base,
            particleCount,
            spread: 360,
            startVelocity: 30,
            ticks: 70,
            scalar: 1.2,
            shapes: ['circle', getHeart()],
            colors: [...GOLD, ...ROMANCE],
            origin: { x: x + (Math.random() - 0.5) * 0.2, y: Math.random() * 0.4 + 0.1 },
          })
        }
      }, 250)
    }

    /** Salve massive or et rose : deux canons latéraux, puis une gerbe de cœurs au centre. */
    const pardonBurst = () => {
      const colors = [...GOLD, ...ROMANCE]
      const cannon = (angle, x) =>
        confetti({
          ...base,
          particleCount: 90,
          angle,
          spread: 70,
          startVelocity: 62,
          scalar: 1.1,
          origin: { x, y: 0.85 },
          colors,
          shapes: ['circle', 'square', getHeart()],
        })
      cannon(60, 0)
      cannon(120, 1)
      setTimeout(() => {
        confetti({ ...base, particleCount: 110, spread: 160, startVelocity: 42, scalar: 1.9, origin: { y: 0.55 }, colors, shapes: [getHeart()] })
      }, 260)
    }

    return { heartBurst, goldenBurst, heartRain, fireworks, pardonBurst }
  }, [])
}
