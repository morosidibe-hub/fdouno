/** Motifs de vibration (ms) : vibration, pause, vibration… */
export const HAPTICS = {
  tap: 12,
  unlock: [30, 60, 90],
  heartbeat: [60, 90, 60, 400, 60, 90, 60],
  victory: [80, 60, 80, 60, 200],
  pardon: [100, 50, 100],
}

/**
 * Vibration sur les appareils compatibles (Android/Chrome).
 * Sans effet sur iOS, qui n'expose pas l'API Vibration.
 * @param {number | number[]} pattern
 */
export function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // Certains navigateurs lèvent une erreur hors geste utilisateur : on ignore.
  }
}
