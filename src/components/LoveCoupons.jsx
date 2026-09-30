import { motion } from 'framer-motion'
import { ChevronRight, Crown, Ear, PhoneCall, PhoneOff, Send, Sunset, Ticket, UtensilsCrossed } from 'lucide-react'
import { useState } from 'react'
import { config, coupons } from '../data/content'
import { EASE_OUT } from '../lib/motion'
import { Section, SectionHeading } from './ui/Section'

const ICONS = { Crown, Ear, PhoneCall, PhoneOff, Sunset, UtensilsCrossed }

const whatsappLink = (text) => `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(text)}`

function Coupon({ item, index, sent, onUse }) {
  const Icon = ICONS[item.icon] ?? Ticket
  return (
    <motion.li
      initial={{ opacity: 0, x: 40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.6, delay: Math.min(index, 3) * 0.1, ease: EASE_OUT }}
      className="w-[80%] shrink-0 snap-center sm:w-72"
    >
      <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-gold/30 bg-linear-to-br from-ink-800 via-ink-900 to-ink-950 shadow-xl shadow-black/40 [mask:radial-gradient(circle_at_0_62%,transparent_14px,#000_15px)_left/51%_100%_no-repeat,radial-gradient(circle_at_100%_62%,transparent_14px,#000_15px)_right/51%_100%_no-repeat]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-gold-light/15 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
        />
        <div className="flex flex-1 flex-col p-6 pb-5">
          <div className="flex items-center justify-between">
            <span className="grid size-11 place-items-center rounded-2xl bg-gold/15 text-gold">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold/60">
              N° {String(index + 1).padStart(2, '0')}
            </span>
          </div>
          <h3 className="mt-5 font-display text-2xl font-semibold leading-tight text-blush">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-powder/75">{item.text}</p>
        </div>

        <div className="border-t-2 border-dashed border-gold/25 p-5">
          <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-powder/50">{coupons.validity}</p>
          <motion.a
            href={whatsappLink(coupons.message(item.title))}
            target="_blank"
            rel="noreferrer"
            onClick={onUse}
            whileTap={{ scale: 0.96 }}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition-colors ${
              sent ? 'bg-crimson/80 text-white' : 'bg-linear-to-r from-gold to-gold-light text-ink-950'
            }`}
          >
            <Send className="size-4" aria-hidden />
            {sent ? coupons.used : coupons.use}
          </motion.a>
        </div>
      </div>
    </motion.li>
  )
}

export default function LoveCoupons() {
  const [sent, setSent] = useState(() => new Set())

  return (
    <Section id="bons">
      <SectionHeading eyebrow={coupons.eyebrow} title={coupons.title} subtitle={coupons.subtitle} icon={Ticket} />

      <p className="mb-4 flex items-center justify-center gap-1 text-xs text-powder/50 sm:hidden">
        {coupons.swipeHint}
        <ChevronRight className="size-3.5 animate-pulse" aria-hidden />
      </p>

      <ul className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-6 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
        {coupons.items.map((item, i) => (
          <Coupon
            key={item.title}
            item={item}
            index={i}
            sent={sent.has(i)}
            onUse={() => setSent((prev) => new Set(prev).add(i))}
          />
        ))}
      </ul>
    </Section>
  )
}
