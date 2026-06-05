import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check, Globe, Heart, Link2, MessageCircle, Minus, Plus, Send, Share2, ShoppingBag } from 'lucide-react'
import { useProduct } from '../hooks/useApi'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { formatPrice } from '../utils/payment'
import { getProductVisual } from '../utils/productVisuals'

const panels = [
  {
    key: 'details',
    title: "Details de l'article",
    content: "Une piece pensee pour une allure elegante et actuelle. Le volume, le tissu et la coupe ont ete choisis pour offrir confort, presence et fluidite au quotidien comme lors des occasions speciales.",
  },
  {
    key: 'shipping',
    title: 'Politique de livraison',
    content: 'Livraison locale rapide et suivi de commande. Les delais varient selon la zone de destination et la disponibilite des pieces commandees.',
  },
]

export default function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { product, loading } = useProduct(id)
  const { add } = useCart()
  const [selectedSize, setSelectedSize] = useState(null)
  const [selectedSwatch, setSelectedSwatch] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [openPanel, setOpenPanel] = useState('details')
  const [shareOpen, setShareOpen] = useState(false)
  const [shareCopied, setShareCopied] = useState('')
  const { toggle, isLiked } = useWishlist()

  const visual = useMemo(() => getProductVisual(product), [product])
  const shareUrl = useMemo(() => {
    if (!product) return ''
    if (typeof window === 'undefined') return `/product/${product.id}`
    return `${window.location.origin}/product/${product.id}`
  }, [product])
  const shareText = useMemo(() => {
    if (!product) return ''
    return `${product.name} - ${formatPrice(product.price)}\nPhoto: ${visual.image}\nLien: ${shareUrl}`
  }, [product, visual.image, shareUrl])

  function handleAdd() {
    if (!product || !selectedSize) return
    for (let index = 0; index < quantity; index += 1) {
      add({ ...product, selectedSize, swatchIndex: selectedSwatch })
    }
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1600)
  }

  function handleBuyNow() {
    handleAdd()
    if (selectedSize) navigate('/checkout')
  }

  async function handleNativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `${product.name} - ${formatPrice(product.price)}\nPhoto: ${visual.image}`,
          url: shareUrl,
        })
        setShareOpen(false)
        return
      } catch {
        return
      }
    }
    setShareOpen((current) => !current)
  }

  function shareTo(network) {
    if (!shareUrl) return
    const encodedUrl = encodeURIComponent(shareUrl)
    const encodedText = encodeURIComponent(shareText)
    const encodedTitle = encodeURIComponent(`${product.name} - Photo: ${visual.image}`)
    const map = {
      whatsapp: `https://wa.me/?text=${encodedText}`,
      x: `https://twitter.com/intent/tweet?text=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    }
    window.open(map[network], '_blank', 'noopener,noreferrer')
    setShareOpen(false)
  }

  async function copyShareData() {
    if (!shareText) return
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText)
      setShareCopied('Lien copie')
      window.setTimeout(() => setShareCopied(''), 1600)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-36 pb-16 grid lg:grid-cols-[1.1fr_0.9fr] gap-8">
        <div className="aspect-[4/5] rounded-[2rem] bg-white animate-pulse" />
        <div className="space-y-4 pt-6">
          {[...Array(7)].map((_, index) => (
            <div key={index} className="h-6 rounded-xl bg-white animate-pulse" style={{ width: `${70 - index * 6}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="px-4 pt-40 text-center text-[#8C6239]">
        <p>Produit introuvable.</p>
        <Link to="/shop" className="mt-4 inline-block text-[#C5A059] underline">Retour a la boutique</Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-32 pb-16">
      <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-[#8C6239]/75 hover:text-[#C5A059] transition-colors mb-8">
        <ArrowLeft size={15} /> Retour a la boutique
      </Link>

      <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-8 xl:gap-10 items-start">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative overflow-hidden rounded-[2rem] border border-[#C5A059]/20 bg-white shadow-[0_25px_70px_rgba(140,98,57,0.12)]"
        >
          <div className="absolute inset-0" style={{ background: visual.background }} />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,0.42),transparent_36%)]" />
          <div className="absolute inset-6 rounded-[1.75rem] border border-white/50" />
          <div className="relative aspect-[4/5] p-6 md:p-10">
            <motion.img
              src={visual.image}
              alt={product.name}
              className="h-full w-full object-cover rounded-[1.5rem] shadow-[0_30px_50px_rgba(84,49,24,0.18)]"
              key={`${product.id}-${selectedSwatch}`}
              initial={{ opacity: 0.4, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
            />
            {product.featured && (
              <span className="absolute left-10 top-10 rounded-full bg-white/90 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#8C6239]">
                Nouveau
              </span>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-[2rem] border border-[#C5A059]/15 bg-white px-6 py-7 shadow-[0_18px_55px_rgba(140,98,57,0.10)] md:px-8"
        >
          <p className="text-xs uppercase tracking-[0.25em] text-[#C5A059]">{product.categorySlug}</p>
          <h1 className="mt-3 text-3xl md:text-4xl font-semibold text-[#8C6239]">{product.name}</h1>
          <p className="mt-2 text-sm text-[#8C6239]/55">SKU : 00{product.id}</p>

          <p className="mt-6 text-3xl font-medium text-[#C5A059]">{formatPrice(product.price)}</p>

          <div className="mt-8">
            <p className="text-sm font-medium text-[#8C6239] mb-2">Couleur</p>
            <div className="flex gap-2">
              {product.swatches.map((swatch, index) => (
                <button
                  key={swatch + index}
                  onClick={() => setSelectedSwatch(index)}
                  className={`h-9 w-9 rounded-full border-2 transition-all ${selectedSwatch === index ? 'border-[#8C6239] scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium text-[#8C6239] mb-2">Taille *</p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`h-11 min-w-11 rounded-xl px-4 text-sm font-medium border transition-all ${
                    selectedSize === size
                      ? 'border-[#8C6239] bg-[#F9EAE1] text-[#8C6239]'
                      : 'border-[#d9c5b2] text-[#8C6239]/70 hover:border-[#C5A059]'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-medium text-[#8C6239] mb-2">Quantite *</p>
            <div className="inline-flex items-center rounded-xl border border-[#cbb39b] overflow-hidden">
              <button
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="h-11 w-11 inline-flex items-center justify-center text-[#8C6239] hover:bg-[#F9EAE1]"
              >
                <Minus size={16} />
              </button>
              <span className="inline-flex min-w-12 items-center justify-center text-sm font-medium text-[#8C6239]">{quantity}</span>
              <button
                onClick={() => setQuantity((value) => value + 1)}
                className="h-11 w-11 inline-flex items-center justify-center text-[#8C6239] hover:bg-[#F9EAE1]"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={handleAdd}
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-none md:rounded-xl px-5 py-4 text-sm font-semibold transition-all ${
                added ? 'bg-green-600 text-white' : 'bg-[#C4542D] text-white hover:brightness-105'
              }`}
            >
              {added ? <><Check size={15} /> Ajoute au panier</> : <><ShoppingBag size={15} /> Ajouter au panier</>}
            </button>
            <button
              onClick={() => toggle(product)}
              className={`inline-flex h-[56px] w-[56px] items-center justify-center border transition-colors ${isLiked(product.id) ? 'border-red-400 text-red-400 bg-red-50' : 'border-[#E0B29C] text-[#E0B29C] hover:border-[#C4542D] hover:text-[#C4542D]'}`}
              title={isLiked(product.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Heart size={18} fill={isLiked(product.id) ? 'currentColor' : 'none'} />
            </button>
          </div>

          <button
            onClick={handleBuyNow}
            className="mt-3 w-full rounded-none md:rounded-xl bg-[#131313] px-5 py-4 text-sm font-semibold text-white transition-all hover:bg-black"
          >
            Commander et payer
          </button>

          {!selectedSize && <p className="mt-3 text-xs text-[#C4542D]">Choisis d'abord une taille pour commander.</p>}

          <div className="mt-8 border-t border-[#efe1d6] pt-6">
            {panels.map((panel) => {
              const open = openPanel === panel.key
              return (
                <div key={panel.key} className="border-b border-[#efe1d6] py-4 last:border-b-0">
                  <button
                    onClick={() => setOpenPanel(open ? '' : panel.key)}
                    className="flex w-full items-center justify-between gap-4 text-left"
                  >
                    <span className="text-[15px] uppercase tracking-[0.03em] text-[#C4542D]">{panel.title}</span>
                    <span className="text-xl text-[#C4542D]">{open ? '−' : '+'}</span>
                  </button>
                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="pt-4 pr-6 text-[15px] leading-8 text-[#8C6239]/76">{panel.content}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex items-center gap-4 text-sm text-[#8C6239]/65">
            <div className="relative">
              <button
                onClick={handleNativeShare}
                className="inline-flex items-center gap-2 hover:text-[#C5A059]"
              >
                <Share2 size={14} /> Partager
              </button>
              {shareOpen && (
                <div className="absolute left-0 top-[calc(100%+8px)] z-20 w-64 rounded-2xl border border-[#C5A059]/25 bg-white p-3 shadow-[0_18px_45px_rgba(140,98,57,0.18)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C5A059]">Partager cet article</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <button onClick={() => shareTo('whatsapp')} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#C5A059]/25 px-2 py-2 text-[#8C6239] hover:bg-[#F9EAE1]"><MessageCircle size={13} /> WhatsApp</button>
                    <button onClick={() => shareTo('x')} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#C5A059]/25 px-2 py-2 text-[#8C6239] hover:bg-[#F9EAE1]"><Send size={13} /> X</button>
                    <button onClick={() => shareTo('facebook')} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#C5A059]/25 px-2 py-2 text-[#8C6239] hover:bg-[#F9EAE1]"><Globe size={13} /> Facebook</button>
                    <button onClick={() => shareTo('telegram')} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#C5A059]/25 px-2 py-2 text-[#8C6239] hover:bg-[#F9EAE1]"><Send size={13} /> Telegram</button>
                  </div>
                  <button onClick={copyShareData} className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#C5A059]/25 px-2 py-2 text-xs text-[#8C6239] hover:bg-[#F9EAE1]"><Link2 size={13} /> Copier photo + lien</button>
                  {shareCopied && <p className="mt-2 text-center text-[11px] text-green-600">{shareCopied}</p>}
                </div>
              )}
            </div>
            <Link to="/cart" className="hover:text-[#C5A059]">Voir le panier</Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
