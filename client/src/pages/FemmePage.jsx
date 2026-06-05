import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Heart } from 'lucide-react'
import { useProducts } from '../hooks/useApi'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { formatPrice } from '../utils/payment'
import { getProductVisual } from '../utils/productVisuals'

const womenKeywords = ['abaya', 'kimono', 'robe', 'nour', 'haya', 'safa', 'rahma', 'samira']

function FemmeCard({ product, index }) {
  const { add } = useCart()
  const { toggle, isLiked } = useWishlist()
  const visual = getProductVisual(product)

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      whileHover={{ y: -6, scale: 1.01 }}
      className="group relative overflow-hidden rounded-[1.85rem] border-2 border-white bg-[#f4d3cb]/35 shadow-[0_18px_40px_rgba(140,98,57,0.12)] transition-all hover:shadow-[0_26px_52px_rgba(140,98,57,0.2)]"
    >
      <div className="pointer-events-none absolute -top-8 left-3 h-20 w-20 rounded-full border-[6px] border-[#f0b8b3] bg-[#f9deda]/70 blur-[0.2px]" />
      <Link to={`/product/${product.id}`} className="relative block aspect-[3/4] overflow-hidden">
        <div className="absolute inset-0" style={{ background: visual.background }} />
        <img src={visual.image} alt={product.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/20 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8C6239]">{product.categorySlug}</span>
        <button
          onClick={(event) => {
            event.preventDefault()
            toggle(product)
          }}
          className={`absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition-all hover:scale-110 ${isLiked(product.id) ? 'text-red-400' : 'text-[#8C6239]/40 hover:text-red-400'}`}
        >
          <Heart size={14} fill={isLiked(product.id) ? 'currentColor' : 'none'} />
        </button>
      </Link>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <Link to={`/product/${product.id}`} className="text-lg font-semibold text-[#8C6239] hover:text-[#C5A059] transition-colors">{product.name}</Link>
          <span className="text-sm font-semibold text-[#C5A059] whitespace-nowrap">{formatPrice(product.price)}</span>
        </div>
        <p className="mt-3 min-h-[44px] text-sm leading-relaxed text-[#8C6239]/68">{product.description}</p>
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => add({ ...product, selectedSize: product.sizes?.[0] || 'M' })}
            className="flex-1 rounded-full bg-[#8C6239] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[#C5A059]"
          >
            Ajouter au panier
          </button>
          <Link to={`/product/${product.id}`} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#C5A059]/30 text-[#8C6239] hover:border-[#C5A059] hover:text-[#C5A059] transition-all">
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </motion.article>
  )
}

export default function FemmePage() {
  const { products, loading } = useProducts({})
  const femmeProducts = products.filter((product) => womenKeywords.some((keyword) => product.name.toLowerCase().includes(keyword)))

  return (
    <div className="min-h-screen bg-[#F9EAE1] pt-32 pb-16">
      <section className="max-w-7xl mx-auto px-4">
        <div className="overflow-hidden rounded-[2rem] border border-[#C5A059]/20 bg-white shadow-[0_18px_60px_rgba(140,98,57,0.10)] px-6 py-10 md:px-10 md:py-12">
          <p className="text-xs uppercase tracking-[0.35em] text-[#C5A059] font-semibold">Univers</p>
          <h1 className="mt-4 text-3xl md:text-5xl font-semibold text-[#8C6239] leading-tight">Collection Femme</h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#8C6239]/72 md:text-base">Une selection dediee aux silhouettes feminines, fluides et elegantes, avec un style moderne et premium.</p>
          <div className="mt-6 inline-flex rounded-full border border-[#C5A059]/25 bg-[#fffdfa] p-1 text-sm">
            <Link to="/femme" className="rounded-full bg-[#8C6239] px-4 py-2 font-semibold text-white">Femme</Link>
            <Link to="/shop" className="rounded-full px-4 py-2 font-semibold text-[#8C6239] hover:bg-[#F9EAE1]">Tout</Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 mt-8">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="aspect-[4/5] rounded-[1.6rem] bg-white animate-pulse" />
            ))}
          </div>
        ) : femmeProducts.length === 0 ? (
          <div className="rounded-[2rem] bg-white px-6 py-20 text-center shadow-[0_18px_50px_rgba(140,98,57,0.08)]">
            <p className="text-lg font-medium text-[#8C6239]">Aucun article trouve dans la section Femme</p>
            <Link to="/shop" className="mt-4 inline-flex rounded-full bg-[#8C6239] px-5 py-3 text-sm font-semibold text-white">Voir toute la boutique</Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {femmeProducts.map((product, index) => (
              <FemmeCard key={product.id} product={product} index={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
