const HEART_PATH =
  'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'

/** Couleurs RGB (sans alpha) partagées par tous les moteurs Canvas. */
export const PALETTE = {
  gold: '245,158,11',
  goldLight: '252,211,77',
  neon: '244,63,94',
  crimson: '225,29,72',
  roseGold: '251,113,133',
  blush: '255,241,242',
}

/**
 * Surface de dessin hors écran : OffscreenCanvas quand il est disponible,
 * sinon un <canvas> détaché du DOM (iOS < 16.4).
 * @param {number} size
 */
function createSurface(size) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(size, size)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  return canvas
}

/** Halo radial pré-rendu : `drawImage` est bien plus rapide que `shadowBlur` sur mobile. */
export function createGlowSprite(rgb, size = 64) {
  const surface = createSurface(size)
  const ctx = surface.getContext('2d')
  const r = size / 2
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r)
  gradient.addColorStop(0, `rgba(${rgb},1)`)
  gradient.addColorStop(0.18, `rgba(${rgb},0.55)`)
  gradient.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return surface
}

/** Cœur lumineux pré-rendu, avec halo intégré. */
export function createHeartSprite(rgb, size = 64) {
  const surface = createSurface(size)
  const ctx = surface.getContext('2d')
  const scale = (size * 0.62) / 24
  ctx.translate(size * 0.19, size * 0.21)
  ctx.scale(scale, scale)
  ctx.shadowColor = `rgba(${rgb},0.9)`
  ctx.shadowBlur = 10
  ctx.fillStyle = `rgb(${rgb})`
  ctx.fill(new Path2D(HEART_PATH))
  return surface
}

/** Pétale de sakura pré-rendu (dégradé rose, encoche en pointe). */
export function createPetalSprite(size = 48) {
  const surface = createSurface(size)
  const ctx = surface.getContext('2d')
  const w = size
  const h = size
  const gradient = ctx.createLinearGradient(0, h, 0, 0)
  gradient.addColorStop(0, 'rgba(251,113,133,0.95)')
  gradient.addColorStop(1, 'rgba(255,228,236,0.95)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.moveTo(w * 0.5, h * 0.95)
  ctx.bezierCurveTo(w * 0.05, h * 0.7, w * 0.08, h * 0.2, w * 0.38, h * 0.08)
  ctx.lineTo(w * 0.5, h * 0.2)
  ctx.lineTo(w * 0.62, h * 0.08)
  ctx.bezierCurveTo(w * 0.92, h * 0.2, w * 0.95, h * 0.7, w * 0.5, h * 0.95)
  ctx.fill()
  return surface
}

/** Courbe paramétrique du cœur : x ∈ [-16, 16], y ∈ [-12, 17] (y vers le bas). */
export function heartCurve(t) {
  return {
    x: 16 * Math.sin(t) ** 3,
    y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
  }
}

/** Canvas net sur écrans Retina, avec un ratio plafonné pour préserver les 60 FPS. */
export function fitCanvas(canvas, width, height) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
  canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0)
}

export const clamp01 = (v) => Math.min(1, Math.max(0, v))

/**
 * Teinte HSL → chaîne « r,g,b » utilisable par `createGlowSprite`.
 * @param {number} h teinte en degrés
 * @param {number} s saturation ∈ [0, 1]
 * @param {number} l luminosité ∈ [0, 1]
 */
export function hslToRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l)
  const f = (n) => {
    const k = (n + h / 30) % 12
    return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255)
  }
  return `${f(0)},${f(8)},${f(4)}`
}

/** Rebond léger en fin de course, pour un mouvement organique. */
export function easeOutBack(t, overshoot = 1.6) {
  const c3 = overshoot + 1
  return 1 + c3 * (t - 1) ** 3 + overshoot * (t - 1) ** 2
}
