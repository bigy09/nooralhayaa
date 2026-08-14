import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Star, ShoppingBag, Heart } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { formatPrice } from '../utils/payment'

function Stars({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          size={11}
          className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
        />
      ))}
      <span className="text-[10px] text-gray-400 ml-1">{rating}</span>
    </div>
  )
}

export default function ProductCard2({ product, index = 0 }) {
  const { add } = useCart()
  const { toggle, isLiked } = useWishlist()

  function quickAdd(e) {
    e.preventDefault()
    add({ ...product, selectedSize: product.sizes?.[0] ?? 'M' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07, duration: 0.45 }}
    >
      <Link to={`/product/${product.id}`} className="group block">
        <div className="relative rounded-2xl overflow-hidden bg-gray-50 aspect-[3/4] sm:aspect-[4/5]">
          {/* Swatch visual (placeholder for real image) */}
          <div className="absolute inset-0 flex">
            {(product.swatches || []).map((swatch, i) => (
              <div
                key={i}
                className="flex-1 h-full transition-transform duration-500 group-hover:scale-110"
                style={{ backgroundColor: (swatch && (swatch.color || swatch)) || 'transparent' }}
              />
            ))}
          </div>

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

          {/* Badge featured */}
          {product.featured && (
            <span className="absolute top-2.5 left-2.5 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              ✦ Nouveau
            </span>
          )}

          {/* Wishlist */}
          <button
            onClick={(e) => { e.preventDefault(); toggle(product) }}
            className={`absolute top-2.5 right-2.5 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow transition-all opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-300 ${isLiked(product.id) ? 'text-red-400' : 'text-gray-500'}`}
            aria-label={isLiked(product.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart size={14} fill={isLiked(product.id) ? 'currentColor' : 'none'} />
          </button>

          {/* Quick add */}
          <motion.button
            onClick={quickAdd}
            whileTap={{ scale: 0.95 }}
            className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-2 bg-white/95 hover:bg-rose-600 hover:text-white text-gray-900 text-xs font-semibold py-2.5 rounded-xl shadow transition-all duration-300 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0"
          >
            <ShoppingBag size={13} />
            Ajouter au panier
          </motion.button>
        </div>

        <div className="mt-2.5 px-0.5">
          <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-sm font-bold text-rose-700">{formatPrice(product.price)}</p>
            <Stars rating={product.rating} />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
