import { useCallback, useEffect, useRef } from 'react'

/** Distance (px) entre le doigt / curseur et le bord du bouton qui déclenche la fuite. */
const DANGER_RADIUS = 80
/** Distance minimale (px) entre le pointeur et la nouvelle cachette. */
const SAFE_DISTANCE = DANGER_RADIUS * 1.6
/** Trajet minimal (px) pour que la fuite reste visible. */
const MIN_TRAVEL = 70
/** Ressort amorti (ζ ≈ 0,8) : glissade fluide, à peine un rebond à l'arrivée. */
const STIFFNESS = 0.07
const DAMPING = 0.42
const MAX_SPEED = 38
const CANDIDATES = 28
const AVOID_PADDING = 14
const ATTEMPT_COOLDOWN = 450
/** Délai minimal (ms) entre deux changements de cap, pour éviter tout tremblement. */
const REPICK_DELAY = 160

/**
 * Bouton qui fuit le doigt ou le curseur.
 *
 * - Dès que le pointeur entre dans un rayon de 80 px, le bouton choisit une position
 *   aléatoire dans l'arène, loin du pointeur et hors de la zone `avoidRef` (le « Oui »),
 *   puis y glisse grâce à un ressort amorti.
 * - Chaque entrée dans la zone de danger compte comme une tentative (`onAttempt`).
 *
 * Les lectures de layout sont regroupées en début de frame et la seule écriture
 * est un `transform` : aucun layout thrashing, aucun re-render React par frame.
 *
 * @param {object} options
 * @param {React.RefObject<HTMLElement>} options.arenaRef zone de jeu (position: relative)
 * @param {React.RefObject<HTMLElement>} options.buttonRef bouton fuyant (absolute, top/left 0)
 * @param {React.RefObject<HTMLElement>} options.avoidRef élément à ne jamais recouvrir
 * @param {React.RefObject<number>} options.scaleRef échelle visuelle courante du bouton
 * @param {boolean} options.enabled boucle active (section visible, question non résolue)
 * @param {() => void} options.onAttempt appelé à chaque tentative d'approche
 * @returns {{ kick: () => void }} `kick` envoie le bouton ailleurs (clic, clavier, tap direct)
 */
export function useEscapingButton({ arenaRef, buttonRef, avoidRef, scaleRef, enabled, onAttempt }) {
  const onAttemptRef = useRef(onAttempt)
  const stateRef = useRef({ x: Number.NaN, y: Number.NaN, tx: 0, ty: 0, vx: 0, vy: 0, inside: false, lastAttempt: 0, lastPick: 0 })
  const kickRef = useRef(null)

  useEffect(() => {
    onAttemptRef.current = onAttempt
  }, [onAttempt])

  useEffect(() => {
    const arena = arenaRef.current
    const button = buttonRef.current
    if (!enabled || !arena || !button) return

    const state = stateRef.current
    const pointer = { x: 0, y: 0, active: false }
    let kickRequested = false

    const attempt = (now) => {
      if (now - state.lastAttempt < ATTEMPT_COOLDOWN) return
      state.lastAttempt = now
      onAttemptRef.current?.()
    }

    const setPointer = (x, y) => {
      pointer.x = x
      pointer.y = y
      pointer.active = true
    }
    const onPointerMove = (e) => {
      if (e.pointerType !== 'touch') setPointer(e.clientX, e.clientY)
    }
    const onTouch = (e) => {
      const touch = e.touches[0]
      if (touch) setPointer(touch.clientX, touch.clientY)
    }
    const onRelease = () => {
      pointer.active = false
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('touchstart', onTouch, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchend', onRelease)
    window.addEventListener('touchcancel', onRelease)
    document.documentElement.addEventListener('mouseleave', onRelease)

    kickRef.current = () => {
      kickRequested = true
      attempt(performance.now())
    }

    /** Distance entre un point et le rectangle du bouton placé en (x, y). */
    const edgeDistance = (x, y, w, h, px, py) => Math.hypot(Math.max(x - px, 0, px - (x + w)), Math.max(y - py, 0, py - (y + h)))

    const overlapsAvoid = (x, y, w, h, avoid) =>
      avoid && x < avoid.x + avoid.w && x + w > avoid.x && y < avoid.y + avoid.h && y + h > avoid.y

    /**
     * Tire au hasard une cachette libre, loin de la menace (px, py).
     * À défaut de cachette sûre, retient la plus éloignée des candidates.
     */
    const pickTarget = (maxX, maxY, w, h, px, py, avoid) => {
      let fallback = null
      let fallbackScore = -Infinity
      for (let i = 0; i < CANDIDATES; i++) {
        const x = Math.random() * maxX
        const y = Math.random() * maxY
        if (overlapsAvoid(x, y, w, h, avoid)) continue
        const threat = edgeDistance(x, y, w, h, px, py)
        const travel = Math.hypot(x - state.x, y - state.y)
        if (threat >= SAFE_DISTANCE && travel >= MIN_TRAVEL) {
          state.tx = x
          state.ty = y
          return
        }
        const score = threat + travel * 0.25
        if (score > fallbackScore) {
          fallbackScore = score
          fallback = { x, y }
        }
      }
      if (fallback) {
        state.tx = fallback.x
        state.ty = fallback.y
      }
    }

    let raf = 0
    let last = performance.now()

    const frame = (now) => {
      const dt = Math.min((now - last) / 16.67, 2)
      last = now

      const a = arena.getBoundingClientRect()
      const avoidRect = avoidRef.current?.getBoundingClientRect()
      const w = button.offsetWidth
      const h = button.offsetHeight
      const maxX = Math.max(0, a.width - w)
      const maxY = Math.max(0, a.height - h)
      const avoid = avoidRect && {
        x: avoidRect.left - a.left - AVOID_PADDING,
        y: avoidRect.top - a.top - AVOID_PADDING,
        w: avoidRect.width + AVOID_PADDING * 2,
        h: avoidRect.height + AVOID_PADDING * 2,
      }

      if (Number.isNaN(state.x)) {
        state.x = state.tx = Math.min(maxX, a.width * 0.72 - w / 2)
        state.y = state.ty = maxY / 2
      }
      state.tx = Math.min(Math.max(state.tx, 0), maxX)
      state.ty = Math.min(Math.max(state.ty, 0), maxY)

      if (kickRequested) {
        kickRequested = false
        pickTarget(maxX, maxY, w, h, state.x + w / 2, state.y + h / 2, avoid)
      }

      if (pointer.active) {
        const px = pointer.x - a.left
        const py = pointer.y - a.top
        if (edgeDistance(state.x, state.y, w, h, px, py) < DANGER_RADIUS) {
          // On ne change de cap que si la cachette actuelle est elle aussi menacée.
          if (now - state.lastPick > REPICK_DELAY && edgeDistance(state.tx, state.ty, w, h, px, py) < SAFE_DISTANCE) {
            state.lastPick = now
            pickTarget(maxX, maxY, w, h, px, py, avoid)
          }
          if (!state.inside) {
            state.inside = true
            attempt(now)
          }
        } else {
          state.inside = false
        }
      } else {
        state.inside = false
      }

      // Le « Oui » grandit à chaque tentative : la cachette doit rester libre.
      if (overlapsAvoid(state.tx, state.ty, w, h, avoid)) {
        pickTarget(maxX, maxY, w, h, avoid.x + avoid.w / 2, avoid.y + avoid.h / 2, avoid)
      }

      state.vx += ((state.tx - state.x) * STIFFNESS - state.vx * DAMPING) * dt
      state.vy += ((state.ty - state.y) * STIFFNESS - state.vy * DAMPING) * dt
      const speed = Math.hypot(state.vx, state.vy)
      if (speed > MAX_SPEED) {
        state.vx *= MAX_SPEED / speed
        state.vy *= MAX_SPEED / speed
      }
      state.x = Math.min(Math.max(state.x + state.vx * dt, 0), maxX)
      state.y = Math.min(Math.max(state.y + state.vy * dt, 0), maxY)

      button.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) scale(${scaleRef.current})`
      button.style.opacity = '1'
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      kickRef.current = null
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('touchstart', onTouch)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchend', onRelease)
      window.removeEventListener('touchcancel', onRelease)
      document.documentElement.removeEventListener('mouseleave', onRelease)
    }
  }, [arenaRef, avoidRef, buttonRef, enabled, scaleRef])

  const kick = useCallback(() => kickRef.current?.(), [])
  return { kick }
}
