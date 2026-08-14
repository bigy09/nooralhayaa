import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, ArrowLeft, Heart } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { formatPrice } from '../utils/payment'
import { getProductVisual } from '../utils/productVisuals'

export default function CartPage() {
  const { items, total, remove, updateQty, count } = useCart()
  const { toggle, isLiked } = useWishlist()

  if (count === 0) {
    return (
      <div className="min-h-screen bg-[#F9EAE1] pt-32 pb-16">
        <div className="max-w-xl mx-auto px-4 text-center">
          <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-[0_12px_35px_rgba(140,98,57,0.12)]">
              <ShoppingBag size={40} className="text-[#C5A059]" />
            </div>
            <h1 className="text-2xl font-semibold text-[#8C6239]">Votre panier est vide</h1>
            <p className="mt-3 text-[#8C6239]/65 text-sm leading-relaxed">Découvrez nos collections et ajoutez vos articles préférés.</p>
            <Link to="/shop" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#8C6239] px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#C5A059]">
              <ArrowLeft size={16} /> Explorer la boutique
            </Link>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9EAE1] pt-32 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#C5A059] font-semibold mb-2">Mon panier</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-[#8C6239]">
            Panier · <span className="text-[#C5A059]">{count} article{count > 1 ? 's' : ''}</span>
          </h1>
        </div>
        <div className="grid lg:grid-cols-[1fr_340px] gap-8">
          <ul className="space-y-4">
            <AnimatePresence>
              {items.map((item) => {
                const visual = getProductVisual(item)
                const liked = isLiked(item.id)
                return (
                  <motion.li
                    key={item.key}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -60 }}
                    transition={{ duration: 0.3 }}
                    className="flex gap-4 rounded-[1.5rem] border border-[#C5A059]/15 bg-white p-4 shadow-[0_8px_25px_rgba(140,98,57,0.08)]"
                  >
                    <Link to={`/product/${item.id}`} className="relative h-28 w-24 flex-shrink-0 overflow-hidden rounded-[1rem]">
                      <div className="absolute inset-0" style={{ background: visual.background }} />
                      <img src={visual.image} alt={item.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    </Link>
                    <div className="flex flex-1 min-w-0 flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link to={`/product/${item.id}`} className="font-semibold text-[#8C6239] hover:text-[#C5A059] transition-colors line-clamp-1">{item.name}</Link>
                          <p className="mt-0.5 text-xs text-[#8C6239]/55">Taille : {item.selectedSize}</p>
                          <p className="mt-1 text-sm font-semibold text-[#C5A059]">{formatPrice(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggle(item)} className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition-all ${liked ? 'border-red-300 text-red-400 bg-red-50' : 'border-[#C5A059]/25 text-[#8C6239]/40 hover:border-red-300 hover:text-red-400'}`}>
                            <Heart size={13} fill={liked ? 'currentColor' : 'none'} />
                          </button>
                          <button onClick={() => remove(item.key)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#C5A059]/25 text-[#8C6239]/40 transition-all hover:border-red-300 hover:text-red-400">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-xl border border-[#d9c5b2] overflow-hidden">
                          <button onClick={() => item.qty === 1 ? remove(item.key) : updateQty(item.key, item.qty - 1)} className="h-8 w-8 inline-flex items-center justify-center text-[#8C6239] hover:bg-[#F9EAE1] transition-colors"><Minus size={12} /></button>
                          <span className="inline-flex min-w-8 items-center justify-center text-sm font-semibold text-[#8C6239]">{item.qty}</span>
                          <button onClick={() => updateQty(item.key, item.qty + 1)} className="h-8 w-8 inline-flex items-center justify-center text-[#8C6239] hover:bg-[#F9EAE1] transition-colors"><Plus size={12} /></button>
                        </div>
                        <p className="font-bold text-[#8C6239]">{formatPrice(item.price * item.qty)}</p>
                      </div>
                    </div>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
          <div className="lg:sticky lg:top-28 h-fit">
            <div className="rounded-[1.75rem] border border-[#C5A059]/20 bg-white p-6 shadow-[0_18px_50px_rgba(140,98,57,0.10)]">
              <h2 className="text-lg font-semibold text-[#8C6239] mb-5">Récapitulatif</h2>
              <div className="space-y-3 text-sm text-[#8C6239]/75">
                <div className="flex justify-between"><span>Sous-total</span><span className="font-medium text-[#8C6239]">{formatPrice(total)}</span></div>
                <p className="text-xs text-[#8C6239]/50">Frais de livraison calculés à l'étape suivante selon ta zone.</p>
                <div className="border-t border-[#F9EAE1] pt-4 flex justify-between text-base font-bold text-[#8C6239]"><span>Total</span><span className="text-[#C5A059]">{formatPrice(total)}</span></div>
              </div>
              <Link to="/checkout" className="mt-6 flex items-center justify-center gap-2 w-full rounded-full bg-[#8C6239] py-4 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#C5A059]">Commander <ArrowRight size={16} /></Link>
              <Link to="/shop" className="mt-3 block text-center text-sm text-[#8C6239]/50 hover:text-[#C5A059] transition-colors">Continuer mes achats</Link>
              <Link to="/wishlist" className="mt-2 flex items-center justify-center gap-1.5 text-sm text-[#8C6239]/50 hover:text-[#C5A059] transition-colors"><Heart size={13} /> Voir mes favoris</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
