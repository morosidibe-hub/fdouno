const midiToFreq = (m) => 440 * 2 ** ((m - 69) / 12)

// Fmaj7 → G → Em7 → Am7 : une progression douce et mélancolique.
const PROGRESSION = [
  { bass: 41, notes: [53, 57, 60, 64] },
  { bass: 43, notes: [55, 59, 62, 67] },
  { bass: 40, notes: [52, 55, 59, 62] },
  { bass: 45, notes: [57, 60, 64, 67] },
]
const BPM = 68
const BEAT = 60 / BPM
const ARPEGGIO = [0, 1, 2, 3, 2, 1, 2, 3]
const LOOKAHEAD = 0.3
const DUCKED_RATIO = 0.15

export const createAudioContext = () => new (window.AudioContext || window.webkitAudioContext)()

/** Vérifie qu'un fichier audio existe vraiment (le serveur de dev renvoie index.html sinon). */
export async function probeAudio(src) {
  try {
    const res = await fetch(src, { method: 'HEAD' })
    return res.ok && (res.headers.get('content-type') ?? '').startsWith('audio')
  } catch {
    return false
  }
}

function createReverb(ctx, seconds = 3.5, decay = 2.5) {
  const length = ctx.sampleRate * seconds
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const data = impulse.getChannelData(c)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay
  }
  const convolver = ctx.createConvolver()
  convolver.buffer = impulse
  return convolver
}

/** Socle commun : gain maître, analyseur de spectre et atténuation (ducking). */
class BaseEngine {
  constructor(volume) {
    this.ctx = createAudioContext()
    this.volume = volume
    this.playing = false
    this.ducked = false

    this.master = this.ctx.createGain()
    this.master.gain.value = 0
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 256
    this.analyser.smoothingTimeConstant = 0.82
    this.spectrum = new Uint8Array(this.analyser.frequencyBinCount)

    // Analyseur dédié aux basses : réaction rapide et marge haute pour ne pas saturer sur la grosse caisse.
    this.bassAnalyser = this.ctx.createAnalyser()
    this.bassAnalyser.fftSize = 256
    this.bassAnalyser.smoothingTimeConstant = 0.45
    this.bassAnalyser.minDecibels = -75
    this.bassAnalyser.maxDecibels = -5
    this.bassSpectrum = new Uint8Array(this.bassAnalyser.frequencyBinCount)

    this.master.connect(this.analyser)
    this.master.connect(this.bassAnalyser)
    this.master.connect(this.ctx.destination)
  }

  get targetVolume() {
    return this.ducked ? this.volume * DUCKED_RATIO : this.volume
  }

  fadeTo(value, seconds) {
    const now = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(now)
    this.master.gain.setValueAtTime(this.master.gain.value, now)
    this.master.gain.linearRampToValueAtTime(value, now + seconds)
  }

  duck(on) {
    this.ducked = on
    if (this.playing) this.fadeTo(this.targetVolume, 0.8)
  }

  /**
   * À appeler pendant un geste (toucher) : déverrouille l'audio sur iOS en silence,
   * pour pouvoir lancer le fondu plus tard, hors geste.
   */
  async prime() {
    await this.ctx.resume()
  }

  getSpectrum() {
    this.analyser.getByteFrequencyData(this.spectrum)
    return this.spectrum
  }

  getBassSpectrum() {
    this.bassAnalyser.getByteFrequencyData(this.bassSpectrum)
    return this.bassSpectrum
  }

  getLevel() {
    const spectrum = this.getSpectrum()
    const bins = 32
    let sum = 0
    for (let i = 0; i < bins; i++) sum += spectrum[i]
    return sum / (bins * 255)
  }

  destroy() {
    this.ctx.close()
  }
}

/** Mélodie générée en temps réel avec la Web Audio API : aucun fichier audio requis. */
export class AmbientSynth extends BaseEngine {
  constructor(volume = 0.7) {
    super(volume)
    this.step = 0
    this.nextTime = 0
    this.timer = null
    this.suspendTimer = null
    this.bus = this.ctx.createGain()

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 2400
    const dry = this.ctx.createGain()
    dry.gain.value = 0.7
    const wet = this.ctx.createGain()
    wet.gain.value = 0.5

    this.bus.connect(filter)
    filter.connect(dry).connect(this.master)
    filter.connect(createReverb(this.ctx)).connect(wet).connect(this.master)
  }

  voice(freq, time, { type = 'sine', attack = 0.01, hold = 0, release = 1.5, gain = 0.1 }) {
    const osc = this.ctx.createOscillator()
    const env = this.ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    env.gain.setValueAtTime(0.0001, time)
    env.gain.exponentialRampToValueAtTime(gain, time + attack)
    env.gain.setValueAtTime(gain, time + attack + hold)
    env.gain.exponentialRampToValueAtTime(0.0001, time + attack + hold + release)
    osc.connect(env).connect(this.bus)
    osc.start(time)
    osc.stop(time + attack + hold + release + 0.05)
  }

  schedule() {
    while (this.nextTime < this.ctx.currentTime + LOOKAHEAD) {
      const eighth = this.step % 8
      const chord = PROGRESSION[Math.floor(this.step / 8) % PROGRESSION.length]
      const t = this.nextTime

      if (eighth === 0) {
        const bar = BEAT * 4
        for (const n of chord.notes) {
          this.voice(midiToFreq(n), t, { type: 'triangle', attack: 1.2, hold: bar - 1.2, release: 1.8, gain: 0.03 })
        }
        this.voice(midiToFreq(chord.bass), t, { attack: 0.05, hold: bar * 0.6, release: 1.5, gain: 0.12 })
      }
      this.voice(midiToFreq(chord.notes[ARPEGGIO[eighth]] + 12), t, { attack: 0.005, release: 1.6, gain: 0.065 })

      this.nextTime += BEAT / 2
      this.step++
    }
  }

  async start() {
    this.playing = true
    clearTimeout(this.suspendTimer)
    await this.ctx.resume()
    if (this.nextTime < this.ctx.currentTime) this.nextTime = this.ctx.currentTime + 0.1
    this.schedule()
    this.timer ??= setInterval(() => this.schedule(), 100)
    this.fadeTo(this.targetVolume, 1.5)
    return true
  }

  stop() {
    this.playing = false
    this.fadeTo(0, 0.8)
    clearInterval(this.timer)
    this.timer = null
    this.suspendTimer = setTimeout(() => this.ctx.suspend(), 900)
  }

  destroy() {
    clearInterval(this.timer)
    clearTimeout(this.suspendTimer)
    super.destroy()
  }
}

/**
 * Lecture d'un vrai fichier audio (ex. public/music.mp3).
 * Le volume passe par un GainNode, car iOS ignore `audio.volume`.
 */
export class FilePlayer extends BaseEngine {
  constructor(src, volume = 0.7) {
    super(volume)
    this.audio = new Audio(src)
    this.audio.loop = true
    this.audio.preload = 'auto'
    this.audio.playsInline = true
    this.pauseTimer = null
    this.ctx.createMediaElementSource(this.audio).connect(this.master)
  }

  async prime() {
    try {
      await this.ctx.resume()
      await this.audio.play()
    } catch {
      // Le fondu réessaiera au prochain geste.
    }
  }

  async start() {
    this.playing = true
    clearTimeout(this.pauseTimer)
    try {
      await this.ctx.resume()
      await this.audio.play()
      this.fadeTo(this.targetVolume, 1.2)
      return true
    } catch {
      this.playing = false
      return false
    }
  }

  stop() {
    this.playing = false
    this.fadeTo(0, 0.6)
    this.pauseTimer = setTimeout(() => this.audio.pause(), 650)
  }

  destroy() {
    clearTimeout(this.pauseTimer)
    this.audio.pause()
    this.audio.removeAttribute('src')
    this.audio.load()
    super.destroy()
  }
}
