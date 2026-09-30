import { motion } from 'framer-motion'
import { EASE_OUT } from '../../lib/motion'

export function Section({ id, className = '', children }) {
  return (
    <section id={id} className={`relative scroll-mt-4 px-5 py-24 sm:px-8 md:py-32 ${className}`}>
      <div className="relative mx-auto max-w-6xl">{children}</div>
    </section>
  )
}

export function SectionHeading({ eyebrow, title, subtitle, icon: Icon }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.8, ease: EASE_OUT }}
      className="mx-auto mb-14 max-w-2xl text-center"
    >
      <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">
        {Icon && <Icon className="size-3.5" aria-hidden />}
        {eyebrow}
      </p>
      <h2 className="font-display text-4xl font-semibold leading-[1.1] text-blush sm:text-5xl md:text-6xl">{title}</h2>
      {subtitle && <p className="mt-5 text-base leading-relaxed text-powder/70 sm:text-lg">{subtitle}</p>}
    </motion.header>
  )
}
