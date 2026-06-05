import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Heart, Search, SlidersHorizontal, X } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { useCategories } from '../hooks/useApi'
import { formatPrice } from '../utils/payment'
import { getProductVisual } from '../utils/productVisuals'
import { LOCAL_PRODUCTS } from '../data/products'

function normalizeProduct(product) {
  if (!product) return product
  return {
    ...product,
    id: product.id || product._id,
  }
}

function ShopCard({ product, index }) {
  const { add } = useCart()
  const { toggle, isLiked } = useWishlist()
  const visual = getProductVisual(product)

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -6, scale: 1.01 }}
      className="group relative overflow-hidden rounded-[1.85rem] border-2 border-white bg-[#f4d3cb]/35 shadow-[0_18px_40px_rgba(140,98,57,0.12)] transition-all hover:shadow-[0_26px_52px_rgba(140,98,57,0.2)]"
    >
      <div className="pointer-events-none absolute -top-8 left-3 h-20 w-20 rounded-full border-[6px] border-[#f0b8b3] bg-[#f9deda]/70 blur-[0.2px]" />
      <div className="pointer-events-none absolute right-4 bottom-3 rounded-full bg-white/85 px-3 py-1 text-[10px] font-medium text-[#C5A059] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        Voir details
      </div>
      <Link to={`/product/${product.id}`} className="relative block aspect-[3/4] overflow-hidden">
        <div className="absolute inset-0" style={{ background: visual.background }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.35),transparent_35%)]" />
        <img
          src={visual.image}
          alt={product.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/20 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8C6239]">
          {product.categorySlug}
        </span>
        <button
          onClick={(e) => { e.preventDefault(); toggle(product) }}
          className={`absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition-all hover:scale-110 ${isLiked(product.id) ? 'text-red-400' : 'text-[#8C6239]/40 hover:text-red-400'}`}
        >
          <Heart size={14} fill={isLiked(product.id) ? 'currentColor' : 'none'} />
        </button>
      </Link>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link to={`/product/${product.id}`} className="text-lg font-semibold text-[#8C6239] hover:text-[#C5A059] transition-colors">
              {product.name}
            </Link>

          </div>
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
          <Link
            to={`/product/${product.id}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#C5A059]/30 text-[#8C6239] hover:border-[#C5A059] hover:text-[#C5A059] transition-all"
          >
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </motion.article>
  )
}

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { categories } = useCategories()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState(searchParams.get('search') || '')

  const activeCategory = searchParams.get('category') || ''
  const searchQuery = searchParams.get('search') || ''
  const sortBy = searchParams.get('sort') || 'featured'

  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (activeCategory) qs.set('category', activeCategory)
    if (searchQuery) qs.set('search', searchQuery)
    fetch(`/api/products${qs.toString() ? `?${qs.toString()}` : ''}`)
      .then((response) => response.json())
      .then((data) => {
        let result = Array.isArray(data) && data.length > 0 ? data.map(normalizeProduct) : [...LOCAL_PRODUCTS]
        if (activeCategory) result = result.filter(p => p.categorySlug === activeCategory)
        if (searchQuery) {
          const s = searchQuery.toLowerCase()
          result = result.filter(p => p.name.toLowerCase().includes(s) || p.description?.toLowerCase().includes(s))
        }
        if (sortBy === 'price-asc') result.sort((a, b) => a.price - b.price)
        if (sortBy === 'price-desc') result.sort((a, b) => b.price - a.price)
        if (sortBy === 'rating') result.sort((a, b) => b.rating - a.rating)
        if (sortBy === 'featured') result.sort((a, b) => Number(b.featured) - Number(a.featured))
        setProducts(result)
        setLoading(false)
      })
      .catch(() => {
        let result = [...LOCAL_PRODUCTS].map(normalizeProduct)
        if (activeCategory) result = result.filter(p => p.categorySlug === activeCategory)
        if (sortBy === 'price-asc') result.sort((a, b) => a.price - b.price)
        if (sortBy === 'price-desc') result.sort((a, b) => b.price - a.price)
        if (sortBy === 'rating') result.sort((a, b) => b.rating - a.rating)
        if (sortBy === 'featured') result.sort((a, b) => Number(b.featured) - Number(a.featured))
        setProducts(result)
        setLoading(false)
      })
  }, [activeCategory, searchQuery, sortBy])

  function setParam(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  function handleSearchSubmit(event) {
    event.preventDefault()
    setParam('search', searchValue.trim())
  }

  const activeLabel = useMemo(() => {
    if (searchQuery) return `Recherche : ${searchQuery}`
    if (activeCategory) return categories.find((category) => category.slug === activeCategory)?.name || 'Boutique'
    return 'Toute la boutique'
  }, [searchQuery, activeCategory, categories])

  return (
    <div className="min-h-screen bg-[#F9EAE1] pt-32 pb-16">
      <section className="max-w-7xl mx-auto px-4">
        <div className="overflow-hidden rounded-[2rem] border border-[#C5A059]/20 bg-white shadow-[0_18px_60px_rgba(140,98,57,0.10)]">
          <div className="grid gap-8 px-6 py-10 md:px-10 md:py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#C5A059] font-semibold">Boutique</p>
              <h1 className="mt-4 text-3xl md:text-5xl font-semibold text-[#8C6239] leading-tight">Selection de la boutique</h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#8C6239]/72 md:text-base">Filtre rapidement et ajoute au panier.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8C6239]/45" />
                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Rechercher une piece..."
                  className="w-full rounded-full border border-[#C5A059]/25 bg-[#fffdfa] py-3.5 pl-11 pr-4 text-sm text-[#8C6239] outline-none focus:border-[#C5A059]"
                />
              </form>
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#C5A059]/25 px-4 py-3 text-sm text-[#8C6239] bg-[#fffdfa]">
                  <SlidersHorizontal size={15} />
                  <select
                    value={sortBy}
                    onChange={(event) => setParam('sort', event.target.value)}
                    className="bg-transparent outline-none"
                  >
                    <option value="featured">Selection maison</option>
                    <option value="price-asc">Prix croissant</option>
                    <option value="price-desc">Prix decroissant</option>
                    <option value="rating">Mieux notes</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 mt-8">
        <div className="inline-flex rounded-full border border-[#C5A059]/25 bg-[#fffdfa] p-1 text-sm">
          <Link to="/femme" className="rounded-full px-4 py-2 font-semibold text-[#8C6239] hover:bg-[#F9EAE1]">Femme</Link>
          <Link to="/homme" className="rounded-full px-4 py-2 font-semibold text-[#8C6239] hover:bg-[#F9EAE1]">Homme</Link>
          <Link to="/shop" className="rounded-full bg-[#8C6239] px-4 py-2 font-semibold text-white">Tout</Link>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setParam('category', '')}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${!activeCategory ? 'bg-[#8C6239] text-white' : 'bg-white text-[#8C6239] border border-[#C5A059]/20'}`}
          >
            Tout
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setParam('category', activeCategory === category.slug ? '' : category.slug)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${activeCategory === category.slug ? 'bg-[#C5A059] text-white' : 'bg-white text-[#8C6239] border border-[#C5A059]/20 hover:border-[#C5A059]'}`}
            >
              {category.name}
            </button>
          ))}
          {searchQuery && (
            <span className="inline-flex items-center gap-2 rounded-full bg-[#fffdfa] border border-[#C5A059]/20 px-4 py-2.5 text-sm text-[#8C6239]">
              {activeLabel}
              <button onClick={() => { setSearchValue(''); setParam('search', '') }} className="text-[#C5A059] hover:text-[#8C6239]">
                <X size={14} />
              </button>
            </span>
          )}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 mt-8">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-[#8C6239]">{activeLabel}</h2>
            {!loading && <p className="mt-1 text-sm text-[#8C6239]/60">{products.length} article{products.length > 1 ? 's' : ''}</p>}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="aspect-[4/5] rounded-[1.6rem] bg-white animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-[2rem] bg-white px-6 py-20 text-center shadow-[0_18px_50px_rgba(140,98,57,0.08)]">
            <p className="text-lg font-medium text-[#8C6239]">Aucune piece trouvee</p>
            <button
              onClick={() => { setSearchValue(''); setSearchParams({}) }}
              className="mt-4 inline-flex rounded-full bg-[#8C6239] px-5 py-3 text-sm font-semibold text-white"
            >
              Reinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {products.map((product, index) => (
              <ShopCard key={product.id} product={product} index={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
