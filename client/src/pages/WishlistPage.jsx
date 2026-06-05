import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, ShoppingBag, Trash2, ArrowLeft, ArrowRight } from 'lucide-react'
import { useWishlist } from '../context/WishlistContext'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/payment'
import { getProductVisual } from '../utils/productVisuals'

function WishlistCard({ product, index }) {
  const { remove } = useWishlist()
  const { add } = useCart()
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || 'M')
  const [movedToCart, setMovedToCart] = useState(false)
  const visual = getProductVisual(product)

  function handleAddToCart() {
    add({ ...product, selectedSize })
    setMovedToCart(true)
    setTimeout(() => setMovedToCart(false), 1800)
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -6, scale: 1.01 }}
      className="group relative overflow-hidden rounded-[1.9rem] border-2 border-white bg-[#f4d3cb]/35 shadow-[0_16px_40px_rgba(140,98,57,0.10)] transition-all hover:shadow-[0_26px_56px_rgba(140,98,57,0.2)] flex flex-col"
    >
      <div className="pointer-events-none absolute -top-8 left-3 z-[2] h-20 w-20 rounded-full border-[6px] border-[#f0b8b3] bg-[#f9deda]/70 blur-[0.2px]" />
      {/* Image */}
      <Link to={`/product/${product.id}`} className="relative block aspect-[3/4] overflow-hidden">
        <div className="absolute inset-0" style={{ background: visual.background }} />
        <img
          src={visual.image}
          alt={product.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/20 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8C6239]">
          {product.categorySlug}
        </span>
        {/* Remove from wishlist */}
        <button
          onClick={(e) => { e.preventDefault(); remove(product.id) }}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#C4542D] shadow-sm transition-all hover:scale-110"
          title="Retirer des favoris"
        >
          <Heart size={16} fill="currentColor" />
        </button>
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col p-5">
        <Link to={`/product/${product.id}`} className="text-base font-semibold text-[#8C6239] hover:text-[#C5A059] transition-colors">
          {product.name}
        </Link>
        <p className="mt-1 text-sm font-medium text-[#C5A059]">{formatPrice(product.price)}</p>

        {/* Size selector */}
        {product.sizes?.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-[#8C6239]/65">Taille</p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`h-8 min-w-8 rounded-lg px-3 text-xs font-medium border transition-all ${
                    selectedSize === size
                      ? 'border-[#8C6239] bg-[#F9EAE1] text-[#8C6239]'
                      : 'border-[#d9c5b2] text-[#8C6239]/60 hover:border-[#C5A059]'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={handleAddToCart}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition-all ${
              movedToCart
                ? 'bg-green-600 text-white'
                : 'bg-[#8C6239] text-white hover:bg-[#C5A059]'
            }`}
          >
            <ShoppingBag size={14} />
            {movedToCart ? 'Ajouté !' : 'Ajouter au panier'}
          </button>
          <button
            onClick={() => remove(product.id)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#C5A059]/30 text-[#8C6239]/50 transition-all hover:border-red-300 hover:text-red-400"
            title="Retirer"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </motion.article>
  )
}

export default function WishlistPage() {
  const { items, count, clear } = useWishlist()

  if (count === 0) {
    return (
      <div className="min-h-screen bg-[#F9EAE1] pt-32 pb-16">
        <div className="max-w-xl mx-auto px-4 text-center">
          <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-[0_12px_35px_rgba(140,98,57,0.12)]">
              <Heart size={40} className="text-[#C5A059]" />
            </div>
            <h1 className="text-2xl font-semibold text-[#8C6239]">Aucun article favori</h1>
            <p className="mt-3 text-[#8C6239]/65 text-sm leading-relaxed">
              Appuie sur le ❤ d'un article pour l'ajouter à tes favoris et le retrouver ici.
            </p>
            <Link
              to="/shop"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#8C6239] px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#C5A059]"
            >
              <ArrowLeft size={16} /> Découvrir la boutique
            </Link>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9EAE1] pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#C5A059] font-semibold mb-2">Mes favoris</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-[#8C6239]">
              Articles likés · <span className="text-[#C5A059]">{count}</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/cart"
              className="inline-flex items-center gap-2 rounded-full border border-[#C5A059]/40 bg-white px-5 py-2.5 text-sm font-medium text-[#8C6239] transition-all hover:border-[#C5A059] hover:text-[#C5A059]"
            >
              <ShoppingBag size={14} /> Voir le panier <ArrowRight size={14} />
            </Link>
            <button
              onClick={clear}
              className="inline-flex items-center gap-2 rounded-full border border-red-200 px-5 py-2.5 text-sm font-medium text-red-400 transition-all hover:border-red-400 hover:text-red-500"
            >
              <Trash2 size={14} /> Tout retirer
            </button>
          </div>
        </div>

        {/* Grid */}
        <AnimatePresence mode="popLayout">
          <motion.div layout className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((product, index) => (
              <WishlistCard key={product.id} product={product} index={index} />
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="mt-12 text-center">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-sm text-[#8C6239]/65 hover:text-[#C5A059] transition-colors"
          >
            <ArrowLeft size={14} /> Continuer mes achats
          </Link>
        </div>
      </div>
    </div>
  )
}
