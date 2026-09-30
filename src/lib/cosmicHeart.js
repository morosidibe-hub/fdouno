import { PALETTE, clamp01, createGlowSprite, heartCurve, hslToRgb } from './canvas'

const TAU = Math.PI * 2
/** Décalage vertical recentrant la courbe du cœur (y ∈ [-12, 17]). */
const HEART_OFFSET_Y = 2.5
const OUTLINE_POINTS = 240
const HALF = OUTLINE_POINTS / 2
const SEGMENT = 4
const GUIDE_STEP = 6
const RING_POINTS = 120
const HUE_STEPS = 36
const TRAIL = 16
const MAX_SPARKS = 420

/** Chronologie (ms) : attente, tracé du contour, arrivée des dernières étoiles, explosion. */
const DRAW_DELAY = 700
const DRAW_DURATION = 3800
const GATHER_DURATION = 1800
const EXPLOSION_DURATION = 1300

/** Orbite du cœur lui-même : ellipse képlérienne (vitesse variable), période en secondes. */
const HEART_ORBIT = { a: 1, e: 0.3, incl: 1.05, node: 0.25, period: 18 }

/**
 * Planètes en orbite autour du cœur, placé au foyer de chaque ellipse (lois de Kepler).
 * `a` est exprimé en demi-largeurs de cœur ; `incl` incline le plan de l'orbite vers l'écran.
 */
const PLANETS = [
  { a: 0.92, e: 0.45, incl: 1.2, node: -0.45, period: 9, hue: 190, size: 1.1, phase: 0 },
  { a: 1.08, e: 0.3, incl: 1.3, node: 0.4, period: 14, hue: 45, size: 1.35, phase: 2.2 },
  { a: 0.66, e: 0.55, incl: 1.02, node: 1.62, period: 6, hue: 300, size: 0.9, phase: 4.1 },
]

const hueAt = (x, y) => ((Math.atan2(y, x) / TAU) * 360 + 360) % 360
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
const easeOutCubic = (t) => 1 - (1 - t) ** 3

const OUTLINE = Array.from({ length: OUTLINE_POINTS + 1 }, (_, i) => {
  const p = heartCurve((i / OUTLINE_POINTS) * TAU)
  const y = p.y - HEART_OFFSET_Y
  return { x: p.x, y, hue: hueAt(p.x, y) }
})

/** Moment du tracé (∈ [0, 1]) où l'un des deux crayons atteint le point d'indice i. */
const drawFractionAt = (i) => (i <= HALF ? i / HALF : (OUTLINE_POINTS - i) / HALF)

/** Anomalie excentrique E (équation de Kepler M = E − e·sin E), par Newton. */
function eccentricAnomaly(M, e) {
  let E = M
  for (let i = 0; i < 5; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
  return E
}

/** Position 3D (foyer à l'origine) sur une orbite inclinée, puis tournée dans le plan de l'écran. */
function orbitPosition(orbit, E) {
  const px = orbit.a * (Math.cos(E) - orbit.e)
  const py = orbit.a * Math.sqrt(1 - orbit.e ** 2) * Math.sin(E)
  const yi = py * Math.cos(orbit.incl)
  const cn = Math.cos(orbit.node)
  const sn = Math.sin(orbit.node)
  return { x: px * cn - yi * sn, y: px * sn + yi * cn, z: py * Math.sin(orbit.incl) }
}

function insideHeart(x, y) {
  let inside = false
  for (let i = 0, j = OUTLINE_POINTS - 1; i < OUTLINE_POINTS; j = i++) {
    const a = OUTLINE[i]
    const b = OUTLINE[j]
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

/**
 * Poussière d'étoiles : elle dérive dans l'espace, puis chaque grain rejoint le cœur
 * au moment où le crayon passe devant sa place (contour) ou à la fin du tracé (intérieur).
 */
function createDust(count, width, height) {
  return Array.from({ length: count }, (_, i) => {
    const onOutline = i % 3 === 0
    let tx
    let ty
    let activateAt
    if (onOutline) {
      const t = Math.random() * TAU
      const p = heartCurve(t)
      const k = 0.95 + Math.random() * 0.07
      tx = p.x * k
      ty = (p.y - HEART_OFFSET_Y) * k
      activateAt = DRAW_DELAY + (t <= Math.PI ? t / Math.PI : (TAU - t) / Math.PI) * DRAW_DURATION
    } else {
      do {
        tx = (Math.random() * 2 - 1) * 16
        ty = -14.5 + Math.random() * 29
      } while (!insideHeart(tx, ty))
      activateAt = DRAW_DELAY + DRAW_DURATION * (0.6 + Math.random() * 0.4) + Math.random() * GATHER_DURATION
    }
    return {
      tx,
      ty,
      hue: hueAt(tx, ty),
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: onOutline ? 1.4 + Math.random() * 1.6 : 0.8 + Math.random() * 1.8,
      activateAt,
      seed: Math.random() * TAU,
      twinkle: 0.8 + Math.random() * 2.4,
    }
  })
}

function createStars(count) {
  return Array.from({ length: count }, () => ({
    x: -0.05 + Math.random() * 1.1,
    y: -0.05 + Math.random() * 1.1,
    size: Math.random() < 0.85 ? 1 : 2,
    depth: 0.2 + Math.random() * 0.8,
    twinkle: 0.6 + Math.random() * 2.5,
    seed: Math.random() * TAU,
  }))
}

/** Enveloppe « lub-dub » d'un battement de cœur, pour une phase ∈ [0, 1[. */
function lubDub(phase) {
  const first = Math.max(0, 1 - phase * 7) ** 2
  const second = Math.max(0, 1 - Math.abs(phase - 0.25) * 9) ** 2 * 0.6
  return first + second
}

/**
 * Scène cosmique de la porte d'entrée : un cœur arc-en-ciel se dessine trait par trait,
 * les étoiles viennent le remplir, il voyage sur une orbite elliptique entouré de planètes
 * képlériennes, d'étoiles filantes et d'ondes de choc. Tout est piloté par une seule boucle.
 * @param {{ coarse: boolean, reduceMotion: boolean }} options
 */
export function createCosmicHeart({ coarse, reduceMotion }) {
  const hueSprites = Array.from({ length: HUE_STEPS }, (_, i) => createGlowSprite(hslToRgb((i / HUE_STEPS) * 360, 1, 0.62)))
  const white = createGlowSprite(PALETTE.blush)
  const hueSprite = (h) => hueSprites[(Math.round((h / 360) * HUE_STEPS) % HUE_STEPS + HUE_STEPS) % HUE_STEPS]

  const planets = PLANETS.map((p) => ({
    ...p,
    ring: Array.from({ length: RING_POINTS + 1 }, (_, i) => orbitPosition(p, (i / RING_POINTS) * TAU)),
    trail: [],
    pos: { x: 0, y: 0, z: 0 },
  }))
  const stars = createStars(coarse ? 90 : 160)
  const sparks = []
  const waves = []

  let width = 0
  let height = 0
  let dust = []
  let startAt = 0
  let drawnAt = 0
  let openedAt = 0
  let proximity = 0
  let beatClock = 0
  let hueShift = 0
  let orbitClock = 0
  let heartClock = 0
  let shooting = null
  let nextShootAt = 0

  const spark = (x, y, vx, vy, hue, life, size) => {
    if (sparks.length >= MAX_SPARKS) return
    sparks.push({ x, y, vx, vy, hue, life, max: life, size })
  }

  const burst = (x, y, count, speed, hueBase) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * TAU
      const v = speed * (0.3 + Math.random() * 0.7)
      spark(x, y, Math.cos(angle) * v, Math.sin(angle) * v, hueBase + Math.random() * 360, 700 + Math.random() * 900, 14 + Math.random() * 18)
    }
  }

  const drawStars = (ctx, now, ox, oy) => {
    ctx.fillStyle = '#fff1f2'
    for (const s of stars) {
      const glow = 0.5 + 0.5 * Math.sin(now * 0.001 * s.twinkle + s.seed)
      ctx.globalAlpha = (0.15 + glow * 0.6) * s.depth
      ctx.fillRect(s.x * width - ox * s.depth * 1.5, s.y * height - oy * s.depth * 1.5, s.size, s.size)
    }
  }

  const drawShootingStar = (ctx, now) => {
    if (reduceMotion) return
    if (!shooting && now > nextShootAt) {
      const angle = Math.PI * (0.12 + Math.random() * 0.12)
      shooting = {
        x: width * (0.1 + Math.random() * 0.8),
        y: height * Math.random() * 0.3,
        angle: Math.random() < 0.5 ? angle : Math.PI - angle,
        born: now,
      }
      nextShootAt = now + 3000 + Math.random() * 3500
    }
    if (!shooting) return
    const t = (now - shooting.born) / 900
    if (t >= 1) {
      shooting = null
      return
    }
    const dist = t * width * 0.6
    const hx = shooting.x + Math.cos(shooting.angle) * dist
    const hy = shooting.y + Math.sin(shooting.angle) * dist
    const tail = 150 * (1 - t * 0.4)
    const tx = hx - Math.cos(shooting.angle) * tail
    const ty = hy - Math.sin(shooting.angle) * tail
    const alpha = Math.sin(Math.PI * t)
    const gradient = ctx.createLinearGradient(hx, hy, tx, ty)
    gradient.addColorStop(0, `rgba(255,255,255,${alpha})`)
    gradient.addColorStop(0.3, `hsla(${(hueShift + 200) % 360},100%,75%,${alpha * 0.5})`)
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.globalAlpha = 1
    ctx.strokeStyle = gradient
    ctx.lineWidth = 1.8
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(hx, hy)
    ctx.lineTo(tx, ty)
    ctx.stroke()
    ctx.globalAlpha = alpha
    ctx.drawImage(white, hx - 12, hy - 12, 24, 24)
  }

  const drawRings = (ctx, cx, cy, R, front, alpha) => {
    if (alpha <= 0) return
    ctx.globalAlpha = 1
    ctx.lineWidth = front ? 1.4 : 1
    ctx.setLineDash(front ? [] : [2, 7])
    for (const p of planets) {
      ctx.strokeStyle = `hsla(${(p.hue + hueShift * 0.3) % 360},100%,70%,${alpha * (front ? 0.5 : 0.22)})`
      ctx.beginPath()
      let pen = false
      for (const q of p.ring) {
        if (q.z >= 0 === front) {
          const x = cx + q.x * R
          const y = cy + q.y * R
          if (pen) ctx.lineTo(x, y)
          else ctx.moveTo(x, y)
          pen = true
        } else {
          pen = false
        }
      }
      ctx.stroke()
    }
    ctx.setLineDash([])
  }

  const drawPlanets = (ctx, cx, cy, R, front, alpha) => {
    if (alpha <= 0) return
    for (const p of planets) {
      if (p.pos.z >= 0 !== front) continue
      const depthAlpha = alpha * (front ? 1 : 0.55)
      const sprite = hueSprite(p.hue + hueShift * 0.3)
      for (let k = p.trail.length - 1; k > 0; k--) {
        const q = p.trail[k]
        const persp = 1 + q.z * 0.35
        const size = R * 0.07 * p.size * persp * (1 - k / TRAIL)
        ctx.globalAlpha = depthAlpha * (1 - k / TRAIL) * 0.7
        ctx.drawImage(sprite, cx + q.x * R - size / 2, cy + q.y * R - size / 2, size, size)
      }
      const persp = 1 + p.pos.z * 0.35
      const x = cx + p.pos.x * R
      const y = cy + p.pos.y * R
      const glow = R * 0.2 * p.size * persp
      const core = R * 0.07 * p.size * persp
      ctx.globalAlpha = depthAlpha
      ctx.drawImage(sprite, x - glow / 2, y - glow / 2, glow, glow)
      ctx.drawImage(white, x - core / 2, y - core / 2, core, core)
    }
  }

  const strokeOutline = (ctx, cx, cy, s, count, intensity, alpha) => {
    if (count <= 0 || alpha <= 0) return
    ctx.globalAlpha = 1
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const passes = [
      { width: 10, light: 55, a: 0.1 },
      { width: 4.2, light: 62, a: 0.32 },
      { width: 1.7, light: 86, a: 0.95 },
    ]
    for (const pass of passes) {
      ctx.lineWidth = pass.width * intensity
      for (const side of [1, -1]) {
        for (let k = 0; k < count; k += SEGMENT) {
          const end = Math.min(k + SEGMENT, count)
          const start = side === 1 ? k : OUTLINE_POINTS - k
          ctx.beginPath()
          ctx.moveTo(cx + OUTLINE[start].x * s, cy + OUTLINE[start].y * s)
          for (let j = k + 1; j <= end; j++) {
            const q = OUTLINE[side === 1 ? j : OUTLINE_POINTS - j]
            ctx.lineTo(cx + q.x * s, cy + q.y * s)
          }
          ctx.strokeStyle = `hsla(${(OUTLINE[start].hue + hueShift) % 360},100%,${pass.light}%,${pass.a * alpha})`
          ctx.stroke()
        }
      }
    }
  }

  return {
    resize(w, h) {
      width = w
      height = h
      if (!dust.length) dust = createDust(coarse ? 480 : 820, w, h)
    },

    /** Supernova : la poussière est soufflée, trois ondes arc-en-ciel balaient l'écran. */
    unlock(now) {
      openedAt = now
      const cx = width / 2
      const cy = height * 0.42
      for (const p of dust) {
        const angle = Math.atan2(p.y - cy, p.x - cx)
        const speed = 6 + Math.random() * 14
        p.vx = Math.cos(angle) * speed
        p.vy = Math.sin(angle) * speed
      }
      const far = Math.hypot(width, height) * 0.7
      for (let i = 0; i < 3; i++) waves.push({ born: now + i * 140, duration: 1200, r0: 20, r1: far, squash: 1, hue: i * 120 })
      burst(cx, cy, 120, 9, hueShift)
    },

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} now
     * @param {number} dt pas normalisé (1 = 60 FPS)
     * @param {{ proximity: number, hold: boolean }} input
     * @returns {{ ox: number, oy: number, finished: boolean }} décalage orbital du cœur
     */
    frame(ctx, now, dt, { proximity: target, hold }) {
      startAt ||= now
      nextShootAt ||= now + 2500
      const elapsed = reduceMotion ? Infinity : now - startAt
      const seconds = (dt * 16.67) / 1000
      proximity += (target - proximity) * 0.1 * dt

      const cx0 = width / 2
      const cy0 = height * 0.42
      const progress = clamp01((elapsed - DRAW_DELAY) / DRAW_DURATION)
      const drawn = easeInOutCubic(progress)
      const count = Math.floor(drawn * HALF)

      if (progress >= 1 && !drawnAt) {
        drawnAt = now
        if (!reduceMotion) {
          waves.push({ born: now, duration: 1400, r0: 10, r1: Math.min(width, height) * 0.7, squash: 0.42, hue: 0 })
          waves.push({ born: now + 120, duration: 1200, r0: 10, r1: Math.min(width, height) * 0.5, squash: 1, hue: 180 })
        }
      }

      if (!reduceMotion) {
        hueShift += dt * 16.67 * (0.035 + proximity * 0.12)
        orbitClock += seconds * (1 + proximity * 2.5)
        if (!hold) heartClock += seconds * (1 - proximity * 0.85)
      }

      // Le cœur parcourt sa propre ellipse : lent à l'aphélie, rapide au périhélie.
      const heartE = eccentricAnomaly((TAU * heartClock) / HEART_ORBIT.period, HEART_ORBIT.e)
      const heartPos = orbitPosition(HEART_ORBIT, heartE)
      const amplitude = Math.min(width * 0.06, 30)
      const ox = heartPos.x * amplitude
      const oy = heartPos.y * amplitude
      const depth = 1 + heartPos.z * 0.045
      const cx = cx0 + ox
      const cy = cy0 + oy

      const bpm = 62 + proximity * 80
      beatClock += seconds * (bpm / 60)
      const beat = lubDub(beatClock % 1)
      const beatGain = drawnAt ? clamp01((now - drawnAt) / 800) : 0
      const fade = openedAt ? Math.max(0, 1 - (now - openedAt) / EXPLOSION_DURATION) : 1
      const expand = 1 + (1 - fade) * 0.9
      const base = Math.min((width * 0.72) / 32, (height * 0.36) / 29)
      const s = base * (1 + beat * (0.06 + proximity * 0.05) * beatGain + proximity * 0.1) * depth * expand
      const R = 16 * base * depth * expand
      const orbitAlpha = clamp01((elapsed - DRAW_DELAY - DRAW_DURATION * 0.3) / 1500) * fade

      for (const p of planets) {
        p.pos = orbitPosition(p, eccentricAnomaly((TAU * orbitClock) / p.period + p.phase, p.e))
        p.trail.unshift(p.pos)
        if (p.trail.length > TRAIL) p.trail.pop()
      }

      ctx.clearRect(0, 0, width, height)
      drawStars(ctx, now, ox, oy)
      ctx.globalCompositeOperation = 'lighter'
      drawShootingStar(ctx, now)
      drawRings(ctx, cx, cy, R, false, orbitAlpha)
      drawPlanets(ctx, cx, cy, R, false, orbitAlpha)

      const damping = 0.86 ** dt
      const drift = 0.97 ** dt
      const heartAlpha = (0.55 + proximity * 0.35) * fade
      for (const p of dust) {
        const active = elapsed >= p.activateAt
        if (openedAt) {
          p.vx *= drift
          p.vy *= drift
        } else if (active) {
          const tx = cx + p.tx * s + Math.sin(now * 0.002 + p.seed) * 0.6
          const ty = cy + p.ty * s + Math.cos(now * 0.0017 + p.seed) * 0.6
          p.vx = (p.vx + (tx - p.x) * 0.018 * dt) * damping
          p.vy = (p.vy + (ty - p.y) * 0.018 * dt) * damping
        } else {
          if (p.x < -10) p.x += width + 20
          else if (p.x > width + 10) p.x -= width + 20
          if (p.y < -10) p.y += height + 20
          else if (p.y > height + 10) p.y -= height + 20
        }
        p.x += p.vx * dt
        p.y += p.vy * dt

        let size
        if (active || openedAt) {
          const since = elapsed - p.activateAt
          const ignite = since < 450 ? 1 - since / 450 : 0
          // En vol vers le cœur, l'étoile reste fine et nette ; elle s'épanouit à l'arrivée.
          const travel = openedAt ? 0 : clamp01((Math.abs(cx + p.tx * s - p.x) + Math.abs(cy + p.ty * s - p.y)) / 160)
          size = p.size * (5 + beat * 2 * beatGain + proximity * 3) * (1 + ignite * 1.6) * (1 - travel * 0.6)
          ctx.globalAlpha = heartAlpha
          ctx.drawImage(hueSprite(p.hue + hueShift), p.x - size / 2, p.y - size / 2, size, size)
        } else {
          const glow = 0.5 + 0.5 * Math.sin(now * 0.001 * p.twinkle + p.seed)
          size = p.size * 2.6
          ctx.globalAlpha = 0.15 + glow * 0.4
          ctx.drawImage(white, p.x - size / 2, p.y - size / 2, size, size)
        }
      }

      // Constellation-guide : les étoiles du contour attendent que le crayon les relie.
      const guideAlpha = drawnAt ? Math.max(0, 1 - (now - drawnAt) / 1000) : clamp01((elapsed - 200) / 500)
      if (guideAlpha > 0 && !openedAt) {
        for (let i = 0; i < OUTLINE_POINTS; i += GUIDE_STEP) {
          const q = OUTLINE[i]
          const passed = drawn >= drawFractionAt(i)
          const size = passed ? 22 : 9 + 3 * Math.sin(now * 0.004 + i)
          ctx.globalAlpha = guideAlpha * (passed ? 0.9 : 0.5)
          ctx.drawImage(passed ? hueSprite(q.hue + hueShift) : white, cx + q.x * s - size / 2, cy + q.y * s - size / 2, size, size)
        }
      }

      const intensity = 1 + beat * 0.6 * beatGain + proximity * 0.5
      strokeOutline(ctx, cx, cy, s, count, intensity, fade)

      // Deux comètes partent de l'encoche et dessinent chacune une moitié du cœur.
      if (progress > 0 && progress < 1 && !openedAt) {
        for (const index of [count, OUTLINE_POINTS - count]) {
          const q = OUTLINE[index]
          const x = cx + q.x * s
          const y = cy + q.y * s
          const hue = q.hue + hueShift
          ctx.globalAlpha = 1
          ctx.drawImage(hueSprite(hue), x - 34, y - 34, 68, 68)
          ctx.drawImage(white, x - 14, y - 14, 28, 28)
          for (let n = 0; n < 2; n++) {
            const angle = Math.random() * TAU
            const v = 0.5 + Math.random() * 1.8
            spark(x, y, Math.cos(angle) * v, Math.sin(angle) * v, hue + Math.random() * 40, 500 + Math.random() * 600, 10 + Math.random() * 12)
          }
        }
      }
      if (drawnAt === now && !reduceMotion) {
        const tip = OUTLINE[HALF]
        burst(cx + tip.x * s, cy + tip.y * s, 90, 5, hueShift)
      }

      const sparkDrag = 0.96 ** dt
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i]
        p.life -= dt * 16.67
        if (p.life <= 0) {
          sparks[i] = sparks[sparks.length - 1]
          sparks.pop()
          continue
        }
        p.vx *= sparkDrag
        p.vy = p.vy * sparkDrag + 0.02 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        const k = p.life / p.max
        const size = p.size * (0.4 + k * 0.6)
        ctx.globalAlpha = k
        ctx.drawImage(hueSprite(p.hue), p.x - size / 2, p.y - size / 2, size, size)
      }

      drawRings(ctx, cx, cy, R, true, orbitAlpha)
      drawPlanets(ctx, cx, cy, R, true, orbitAlpha)

      ctx.globalAlpha = 1
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i]
        const t = (now - w.born) / w.duration
        if (t < 0) continue
        if (t >= 1) {
          waves.splice(i, 1)
          continue
        }
        const r = w.r0 + easeOutCubic(t) * w.r1
        for (let j = 0; j < 3; j++) {
          ctx.strokeStyle = `hsla(${(w.hue + j * 50 + hueShift) % 360},100%,65%,${(1 - t) * 0.55})`
          ctx.lineWidth = (1 - t) * 6 + 0.5
          ctx.beginPath()
          ctx.ellipse(cx, cy, r + j * 6, (r + j * 6) * w.squash, 0, 0, TAU)
          ctx.stroke()
        }
      }

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      return { ox, oy, finished: Boolean(openedAt) && now - openedAt > EXPLOSION_DURATION }
    },
  }
}
