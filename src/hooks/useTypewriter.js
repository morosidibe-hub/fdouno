import { useCallback, useEffect, useState } from 'react'

/**
 * Délai « humain » après un caractère : on marque une pause après la ponctuation,
 * on accélère au milieu des mots, avec une légère irrégularité.
 * @param {string} char dernier caractère tapé
 * @param {number} speed délai de base en ms
 */
function humanDelay(char, speed) {
  if ('.!?…'.includes(char)) return speed * 9
  if (',;:'.includes(char)) return speed * 5
  if (char === ' ') return speed * (1.2 + Math.random() * 0.6)
  return speed * (0.45 + Math.random() * 0.9)
}

/**
 * Tape une liste de lignes caractère par caractère, avec un rythme naturel.
 * `lines` doit être une référence stable (constante de module ou useMemo).
 * @param {string[]} lines
 * @param {{ speed?: number, lineDelay?: number, startDelay?: number, enabled?: boolean }} [options]
 */
export function useTypewriter(lines, { speed = 50, lineDelay = 600, startDelay = 0, enabled = true } = {}) {
  const [pos, setPos] = useState({ line: 0, char: 0 })
  const done = pos.line >= lines.length

  useEffect(() => {
    if (!enabled || done) return
    const atLineEnd = pos.char >= lines[pos.line].length
    const isFirst = pos.line === 0 && pos.char === 0
    const lastChar = lines[pos.line][pos.char - 1] ?? ''
    const delay = isFirst ? startDelay : atLineEnd ? lineDelay : humanDelay(lastChar, speed)

    const id = setTimeout(() => {
      setPos((p) => (atLineEnd ? { line: p.line + 1, char: 0 } : { line: p.line, char: p.char + 1 }))
    }, delay)
    return () => clearTimeout(id)
  }, [enabled, done, pos, lines, speed, lineDelay, startDelay])

  const skip = useCallback(() => setPos({ line: lines.length, char: 0 }), [lines.length])

  const typed = lines.map((line, i) => {
    if (i < pos.line) return line
    if (i === pos.line) return line.slice(0, pos.char)
    return ''
  })

  return { typed, activeLine: Math.min(pos.line, lines.length - 1), done, skip }
}
