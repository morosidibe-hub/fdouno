import { AnimatePresence, MotionConfig, motion, useScroll, useSpring } from 'framer-motion'
import { Heart } from 'lucide-react'
import { lazy, useCallback, useState } from 'react'
import Hero from './components/Hero'
import IntroGate from './components/IntroGate'
import MusicPlayer from './components/MusicPlayer'
import ParticleField from './components/ParticleField'
import SafeSection from './components/ui/SafeSection'
import { config, footer } from './data/content'
import { useAmbientMusic } from './hooks/useAmbientMusic'

// Chargées en arrière-plan pendant le rituel d'entrée, pour un premier affichage instantané sur mobile.
const JourneyMap = lazy(() => import('./components/JourneyMap'))
const BloomingFlower = lazy(() => import('./components/BloomingFlower'))
const InteractiveLetters = lazy(() => import('./components/InteractiveLetters'))
const EclipseGallery = lazy(() => import('./components/EclipseGallery'))
const VoiceNote = lazy(() => import('./components/VoiceNote'))
const MendedHeart = lazy(() => import('./components/MendedHeart'))
const TechPardon = lazy(() => import('./components/TechPardon'))
const OpenWhen = lazy(() => import('./components/OpenWhen'))
const LoveCoupons = lazy(() => import('./components/LoveCoupons'))
const Reconciliation = lazy(() => import('./components/Reconciliation'))

export default function App() {
  const music = useAmbientMusic({ src: config.musicSrc })
  const [entered, setEntered] = useState(false)
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })
  const { isPlaying, play, prime, duck } = music

  const beginMusic = () => {
    if (!isPlaying) play()
  }

  const start = () => {
    beginMusic()
    document.getElementById('voyage')?.scrollIntoView({ behavior: 'smooth' })
  }

  const enter = useCallback(() => setEntered(true), [])

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>{!entered && <IntroGate onPrime={prime} onUnlock={beginMusic} onEnter={enter} />}</AnimatePresence>

      <ParticleField getLevel={music.getLevel} />

      <motion.div
        aria-hidden
        style={{ scaleX }}
        className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-linear-to-r from-crimson via-rose-gold to-gold"
      />

      <main className="relative overflow-x-clip">
        <Hero onStart={start} ready={entered} />
        <SafeSection>
          <JourneyMap />
        </SafeSection>
        <SafeSection>
          <BloomingFlower />
        </SafeSection>
        <SafeSection>
          <InteractiveLetters />
        </SafeSection>
        <SafeSection>
          <EclipseGallery />
        </SafeSection>
        <SafeSection>
          <VoiceNote onPlayingChange={duck} />
        </SafeSection>
        <SafeSection>
          <MendedHeart />
        </SafeSection>
        <SafeSection>
          <TechPardon />
        </SafeSection>
        <SafeSection>
          <OpenWhen />
        </SafeSection>
        <SafeSection>
          <LoveCoupons />
        </SafeSection>
        <SafeSection>
          <Reconciliation />
        </SafeSection>
      </main>

      <footer className="relative border-t border-white/5 px-6 pb-28 pt-10 text-center text-sm text-powder/50 sm:pb-10">
        <Heart className="mx-auto mb-3 size-4 fill-crimson text-crimson" aria-hidden />
        <p className="mx-auto max-w-xl leading-relaxed">{footer.text}</p>
      </footer>

      {entered && <MusicPlayer {...music} />}
    </MotionConfig>
  )
}
