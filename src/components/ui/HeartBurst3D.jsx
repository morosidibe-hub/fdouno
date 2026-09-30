import { motion, useReducedMotion } from 'framer-motion'
import { Heart } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const COLORS = ['#E11D48', '#F43F5E', '#FB7185', '#F59E0B', '#FCD34D']
const DURATION = 4.2

/** Génère un vol de cœurs : position, taille, rotations 3D et délai aléatoires. */
function createHearts(count) {
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: 4 + Math.random() * 92,
    size: 22 + Math.random() * 34,
    delay: Math.random() * 0.9,
    drift: (Math.random() - 0.5) * 160,
    spinY: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 360),
    spinX: (Math.random() - 0.5) * 120,
    color: COLORS[id % COLORS.length],
  }))
}

/**
 * Cœurs 3D qui s'envolent en tournant sur eux-mêmes, par-dessus toute la page.
 * Chaque changement de `burstKey` (> 0) relance une volée ; l'overlay se retire seul.
 * @param {{ burstKey: number, count?: number }} props
 */
export default function HeartBurst3D({ burstKey, count = 18 }) {
  const reduceMotion = useReducedMotion()
  const [finishedKey, setFinishedKey] = useState(0)
  const hearts = useMemo(() => (burstKey ? createHearts(count) : []), [burstKey, count])

  useEffect(() => {
    if (!burstKey) return
    const timer = setTimeout(() => setFinishedKey(burstKey), (DURATION + 1) * 1000)
    return () => clearTimeout(timer)
  }, [burstKey])

  if (reduceMotion || hearts.length === 0 || finishedKey === burstKey) return null

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70] overflow-hidden [perspective:900px]">
      {hearts.map((h) => (
        <motion.div
          key={`${burstKey}-${h.id}`}
          className="absolute bottom-0 transform-3d"
          style={{ left: `${h.left}%` }}
          initial={{ y: '10vh', x: 0, rotateY: 0, rotateX: 0, scale: 0.3, opacity: 0 }}
          animate={{
            y: '-115vh',
            x: h.drift,
            rotateY: h.spinY,
            rotateX: h.spinX,
            scale: [0.3, 1.1, 1],
            opacity: [0, 1, 1, 0],
          }}
          transition={{ duration: DURATION, delay: h.delay, ease: [0.25, 0.6, 0.35, 1] }}
        >
          <Heart
            style={{ width: h.size, height: h.size, color: h.color, fill: h.color, filter: `drop-shadow(0 0 12px ${h.color})` }}
          />
        </motion.div>
      ))}
    </div>
  )
}
