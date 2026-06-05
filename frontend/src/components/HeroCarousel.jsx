import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import carousel1 from '../assets/carousel 1.jpg'
import carousel2 from '../assets/carousel 2.jpg'
import carousel3 from '../assets/carousel 3.jpg'
import carousel4 from '../assets/carousel 4.jpg'

const INTERVAL = 5000

const BACKDROPS = [
  'linear-gradient(115deg, #8c6239 0%, #c5a059 38%, #f9eae1 100%)',
  'linear-gradient(115deg, #5f3f24 0%, #8c6239 35%, #f9eae1 100%)',
  'linear-gradient(115deg, #754c24 0%, #c5a059 40%, #f9eae1 100%)',
]

const CAROUSEL_IMAGES = [carousel1, carousel2, carousel3, carousel4]

const DEFAULT_BANNERS = [
  { id: 1, title: 'Nouvelle Collection', subtitle: 'Kimonos & Ensembles raffinés', slug: 'kimonos', cta: 'Découvrir' },
  { id: 2, title: 'Élégance & Pudeur', subtitle: 'Robes longues pour chaque occasion', slug: 'robes', cta: 'Voir les robes' },
  { id: 3, title: 'Ensembles Pantalons', subtitle: 'Confort et style au quotidien', slug: 'pantalons', cta: 'Explorer' },
  { id: 4, title: 'Collection Homme', subtitle: 'Styles modernes et intemporels', slug: 'homme', cta: 'Parcourir' },
]

export default function HeroCarousel({ banners = [] }) {
  const [idx, setIdx] = useState(0)
  const [dir, setDir] = useState(1)
  const [paused, setPaused] = useState(false)

  // Use default banners if none provided or empty
  const activeBanners = banners.length > 0 ? banners : DEFAULT_BANNERS

  const go = useCallback((next) => {
    setDir(next > idx ? 1 : -1)
    setIdx(next)
  }, [idx])

  useEffect(() => {
    if (paused || activeBanners.length < 2) return
    const t = setTimeout(() => go((idx + 1) % activeBanners.length), INTERVAL)
    return () => clearTimeout(t)
  }, [idx, paused, activeBanners.length, go])

  if (!activeBanners.length) return <div className="bg-[#8c6239] animate-pulse" style={{ height: 'clamp(420px, 70vh, 700px)' }} />

  const slide = activeBanners[idx]
  const slideImage = CAROUSEL_IMAGES[idx % CAROUSEL_IMAGES.length]
  const variants = {
    enter: { x: dir > 0 ? '100%' : '-100%', opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: dir > 0 ? '-100%' : '100%', opacity: 0 },
  }

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      style={{ height: 'clamp(420px, 70vh, 700px)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      <AnimatePresence initial={false} custom={dir}>
        <motion.div
          key={slide.id}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'tween', duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="absolute inset-0"
          style={{ background: BACKDROPS[(slide.id - 1) % BACKDROPS.length] }}
        >
          <div
            className="absolute inset-0 bg-center bg-cover"
            style={{ 
              backgroundImage: `url(${slideImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              imageRendering: 'crisp-edges',
            }}
          />
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute inset-0 opacity-20 overflow-hidden">
            <div className="absolute top-8 right-8 w-96 h-96 rounded-full bg-white" />
            <div className="absolute -bottom-24 -left-12 w-80 h-80 rounded-full bg-white" />
            <div className="absolute top-1/3 left-1/3 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-[#c5a059]/40" />
            <div className="absolute top-0 left-0 right-0 bottom-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.35),transparent_55%)]" />
          </div>
          <div className="absolute inset-0" style={{ background: BACKDROPS[(slide.id - 1) % BACKDROPS.length], opacity: 0.22 }} />
          <div className="absolute inset-0 bg-black/22" />
        </motion.div>
      </AnimatePresence>

      {/* Text overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center text-white z-20 px-6"
        style={{ paddingTop: '90px' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center max-w-3xl"
          >
            <h2 className="text-3xl md:text-6xl font-bold mb-3 text-[#F9EAE1] leading-tight drop-shadow-lg">
              {slide.title}
            </h2>
            <p className="text-base md:text-xl mb-7 text-white/90 drop-shadow max-w-2xl">{slide.subtitle}</p>
            <Link
              to={`/shop?category=${slide.slug}`}
              className="bg-[#8C6239] text-white px-6 py-3 md:px-8 md:py-4 text-sm md:text-xl font-bold hover:bg-[#C5A059] transition-all duration-300 rounded shadow-xl"
            >
              {typeof slide.cta === 'object' ? slide.cta.text : slide.cta}
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Arrows */}
      <button
        onClick={() => go((idx - 1 + activeBanners.length) % activeBanners.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 flex items-center justify-center text-white bg-black/30 hover:bg-black/55 rounded-full transition-colors"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        onClick={() => go((idx + 1) % activeBanners.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 flex items-center justify-center text-white bg-black/30 hover:bg-black/55 rounded-full transition-colors"
      >
        <ChevronRight size={22} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex gap-2">
        {activeBanners.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className={`rounded-full transition-all duration-300 ${i === idx ? 'w-6 h-2.5 bg-[#F9EAE1]' : 'w-2.5 h-2.5 bg-white/55 hover:bg-white/90'}`}
          />
        ))}
      </div>
    </div>
  )
}
