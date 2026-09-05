import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight, Heart, ShoppingBag, Sparkles } from 'lucide-react'
import HeroCarousel from '../components/HeroCarousel'
import { useProducts, useCategories, useBanners } from '../hooks/useApi'
import { LOCAL_PRODUCTS } from '../data/products'
import { formatPrice } from '../utils/payment'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { getProductVisual } from '../utils/productVisuals'

const BRAND = {
  gold: '#C5A059',
  brown: '#8C6239',
  nude: '#F9EAE1',
}

const womenKeywords = ['abaya', 'kimono', 'robe', 'nour', 'haya', 'safa', 'rahma', 'samira']
const menKeywords = ['boubou', 'qamis', 'omar', 'bilal', 'nabil', 'youssef']

function SectionHeading({ eyebrow, title, body, align = 'left' }) {
  return (
    <div className={`max-w-2xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
      {eyebrow && <p className="text-xs tracking-[0.35em] uppercase text-[#C5A059] font-semibold mb-3">{eyebrow}</p>}
      <h2 className="text-3xl md:text-5xl font-semibold text-[#8C6239] leading-tight">{title}</h2>
      {body && <p className="mt-4 text-[#8C6239]/75 leading-relaxed text-sm md:text-base">{body}</p>}
    </div>
  )
}

function EditorialCard({ title, subtitle, description, image, background, to, accent, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay }}
      className="group relative rounded-[2rem] overflow-hidden border border-[#C5A059]/20 bg-white shadow-[0_25px_80px_rgba(140,98,57,0.12)]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white via-[#F9EAE1] to-[#f4dfd1]" />
      <div className="absolute inset-y-0 right-0 w-1/2 opacity-10 bg-[radial-gradient(circle_at_top_right,_#8C6239,_transparent_70%)]" />
      <div className="relative grid md:grid-cols-[1.1fr_0.9fr] min-h-[420px]">
        <div className="p-8 md:p-10 flex flex-col justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#C5A059]/30 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-[#C5A059]">
              <Sparkles size={12} /> {subtitle}
            </span>
            <h3 className="mt-6 text-3xl md:text-4xl font-semibold text-[#8C6239] leading-tight max-w-md">{title}</h3>
            <p className="mt-4 text-[#8C6239]/70 leading-relaxed max-w-lg">{description}</p>
          </div>
          <Link
            to={to}
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-3 rounded-full shadow-lg w-fit transition-all group-hover:translate-x-1"
            style={{ backgroundColor: accent }}
          >
            Explorer la sélection <ArrowRight size={16} />
          </Link>
        </div>
        <div className="relative min-h-[280px] overflow-hidden">
          <div className="absolute inset-6 rounded-[2rem] shadow-inner" style={{ background }} />
          <motion.img
            src={image}
            alt={title}
            className="absolute bottom-0 right-2 h-[92%] w-auto object-contain drop-shadow-[0_30px_35px_rgba(90,52,23,0.35)]"
            whileHover={{ y: -8, rotate: -2, scale: 1.03 }}
            transition={{ type: 'spring', stiffness: 180, damping: 16 }}
          />
        </div>
      </div>
    </motion.div>
  )
}

function CollectionCard({ product, index }) {
  const { add } = useCart()
  const { toggle, isLiked } = useWishlist()
  const visual = getProductVisual(product)

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.45, delay: index * 0.06 }}
      whileHover={{ y: -6, scale: 1.01 }}
      className="group relative overflow-hidden rounded-[1.9rem] border-2 border-white bg-[#f4d3cb]/35 shadow-[0_18px_45px_rgba(140,98,57,0.14)] transition-all hover:shadow-[0_26px_56px_rgba(140,98,57,0.2)]"
    >
      <div className="pointer-events-none absolute -top-8 left-3 z-[2] h-20 w-20 rounded-full border-[6px] border-[#f0b8b3] bg-[#f9deda]/70 blur-[0.2px]" />
      <div className="relative aspect-[3/4] overflow-hidden bg-[#f4e4d9]">
        <div className="absolute inset-0 opacity-95" style={{ background: visual.background }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.45),transparent_40%)]" />
        <motion.div
          className="absolute inset-x-6 bottom-0 top-10 rounded-t-[10rem] bg-white/12 backdrop-blur-[2px]"
          whileHover={{ scale: 1.02 }}
        />
        <motion.img
          src={visual.image}
          alt={product.name}
          className="absolute inset-x-0 bottom-0 h-full w-full object-cover"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.4 }}
        />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/18 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-[#8C6239] uppercase">
          {product.categorySlug}
        </span>
        <button
          onClick={(e) => { e.preventDefault(); toggle(product) }}
          className={`absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition-all hover:scale-110 ${isLiked(product.id) ? 'text-red-400' : 'text-[#8C6239]/40 hover:text-red-400'}`}
        >
          <Heart size={14} fill={isLiked(product.id) ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link to={`/product/${product.id}`} className="text-lg font-semibold text-[#8C6239] leading-tight hover:text-[#C5A059] transition-colors">
              {product.name}
            </Link>

          </div>
          <p className="text-base font-semibold text-[#C5A059] whitespace-nowrap">{formatPrice(product.price)}</p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[#8C6239]/70 min-h-[44px]">{product.description}</p>
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => add({ ...product, selectedSize: product.sizes?.[0] || 'M' })}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#8C6239] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[#C5A059]"
          >
            <ShoppingBag size={14} /> Ajouter
          </button>
          <Link
            to={`/product/${product.id}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#C5A059]/35 text-[#8C6239] transition-all hover:border-[#C5A059] hover:text-[#C5A059]"
          >
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </motion.article>
  )
}

function SegmentSlider({ id, title, subtitle, products }) {
  const [page, setPage] = useState(0)
  const perPage = 4
  const totalPages = Math.max(1, Math.ceil(products.length / perPage))
  const visible = products.slice(page * perPage, page * perPage + perPage)

  if (!products.length) return null

  return (
    <section id={id} className="max-w-7xl mx-auto px-4 py-16 md:py-20 scroll-mt-40">
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <SectionHeading eyebrow="Collection" title={title} body={subtitle} />
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={() => setPage((current) => (current - 1 + totalPages) % totalPages)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#C5A059]/25 bg-white text-[#8C6239] transition-all hover:border-[#C5A059] hover:text-[#C5A059]"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setPage((current) => (current + 1) % totalPages)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#C5A059]/25 bg-white text-[#8C6239] transition-all hover:border-[#C5A059] hover:text-[#C5A059]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <AnimatePresence mode="wait">
          {visible.map((product, index) => (
            <motion.div
              key={`${id}-${product.id}-${page}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
            >
              <CollectionCard product={product} index={index} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => setPage(index)}
              className={`h-2.5 rounded-full transition-all ${index === page ? 'w-7 bg-[#C5A059]' : 'w-2.5 bg-[#d9c1ae]'}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}

export default function HomePage() {
  const { banners } = useBanners()
  const { products, loading: productsLoading } = useProducts({})
  const { categories } = useCategories()

  const womenProducts = useMemo(() => {
    return products.filter((product) => womenKeywords.some((keyword) => product.name.toLowerCase().includes(keyword)))
  }, [products])

  const menProducts = useMemo(() => {
    const explicit = products.filter((product) => menKeywords.some((keyword) => product.name.toLowerCase().includes(keyword)))
    if (explicit.length) return explicit
    return products.filter((product) => product.categorySlug === 'pantalons').slice(0, 6)
  }, [products])

  const categoryCards = categories.map((category, index) => {
    const categorySlug = category.slug === 'kimonos' ? 'abayas-kimonos' : category.slug
    const categoryProduct = LOCAL_PRODUCTS.find((product) => product.categorySlug === categorySlug)
      || products.find((product) => product.categorySlug === category.slug)

    return {
      ...category,
      image: categoryProduct ? getProductVisual(categoryProduct).image : null,
      accent: index % 2 === 0 ? BRAND.brown : BRAND.gold,
    }
  }).filter((category) => category.image)

  const womenHeroVisual = getProductVisual(womenProducts[0] || products[0])
  const menHeroVisual = getProductVisual(menProducts[0] || products[1])

  return (
    <div className="min-h-screen bg-[#F9EAE1] text-[#8C6239]">
      <HeroCarousel banners={banners} />

      <section className="relative z-10 -mt-16 max-w-7xl mx-auto px-4 md:-mt-24">
        <div className="grid gap-5 lg:grid-cols-3">
          {categoryCards.map((category, index) => (
            <motion.div
              key={category.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              <Link
                to={`/shop?category=${category.slug}`}
                className="group relative block overflow-hidden rounded-[1.75rem] border border-white/60 bg-white/90 p-5 shadow-[0_18px_55px_rgba(140,98,57,0.18)] backdrop-blur-md"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white via-[#fdf5ef] to-[#f4dfd1]" />
                <div className="relative flex min-h-[260px] flex-col justify-between">
                  <div>
                    <span className="inline-flex rounded-full bg-[#F9EAE1] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#C5A059]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <h3 className="mt-5 text-2xl font-semibold capitalize text-[#8C6239]">{category.name}</h3>
                    <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#8C6239]/70">Pieces essentielles, coupe elegante.</p>
                  </div>
                  <div className="relative mt-6 h-36 overflow-hidden rounded-[1.5rem] bg-[#efe1d6]">
                    <div className="absolute inset-0 opacity-90" style={{ background: `linear-gradient(145deg, ${category.swatches?.[0] || BRAND.gold}, ${category.swatches?.[1] || BRAND.brown})` }} />
                    <motion.img
                      src={category.image}
                      alt={category.name}
                      className="absolute inset-0 h-full w-full object-cover opacity-95"
                      whileHover={{ scale: 1.06, x: -4 }}
                    />
                  </div>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#C5A059]">
                    Voir la collection <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="grid gap-6 lg:grid-cols-2">
          <EditorialCard
            title="Pour elle, des silhouettes fluides et affirmées"
            subtitle="Edition Femme"
            description="Une selection feminine sobre, elegante et moderne."
            image={womenHeroVisual.image}
            background={womenHeroVisual.background}
            to="/femme"
            accent={BRAND.brown}
          />
          <EditorialCard
            title="Pour lui, des coupes sobres au caractere fort"
            subtitle="Edition Homme"
            description="Une selection masculine nette, confortable et chic."
            image={menHeroVisual.image}
            background={menHeroVisual.background}
            to="/homme"
            accent={BRAND.gold}
            delay={0.12}
          />
        </div>
      </section>

      {!productsLoading && (
        <SegmentSlider
          id="femme"
          title="Sélection Femme"
          subtitle="Robes, kimonos et ensembles incontournables."
          products={womenProducts.length ? womenProducts : products.slice(0, 8)}
        />
      )}

      {/* Homme selection hidden — partie Homme indisponible */}
    </div>
  )
}
