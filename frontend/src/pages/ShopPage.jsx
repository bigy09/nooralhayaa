import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Heart, Search } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { useCategories, useProducts } from '../hooks/useApi'
import { formatPrice } from '../utils/payment'
import { getProductVisual } from '../utils/productVisuals'

function ShopCard({ product, index }) {
  const { add } = useCart()
  const { toggle, isLiked } = useWishlist()
  const visual = getProductVisual(product)
  const visualStyle = { background: visual.background }

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
          loading="lazy"
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
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const activeCategory = searchParams.get('category') || ''
  const searchQuery = searchParams.get('search') || ''
  const sortBy = searchParams.get('sort') || 'featured'
  const { categories } = useCategories()

  const categorize = (category) => {
    if (!category) return 'all'
    if (category.group) return category.group
    if (['kimonos', 'ensembles-pantalon', 'jupes', 'voiles', 'jilbebs-khimars'].includes(category.slug)) return 'femme'
    if (['tuniques'].includes(category.slug)) return 'homme'
    // treat boubou as homme so it is hidden from public listing
    if (['accessoires'].includes(category.slug)) return 'both'
    return 'all'
  }

  const normalizedCategories = (categories || []).map((category) => ({
    ...category,
    group: categorize(category),
  }))
  const filteredCategories = normalizedCategories
  const femaleCategories = filteredCategories.filter((category) => category.group === 'femme')
  const maleCategories = filteredCategories.filter((category) => category.group === 'homme')
  const selectedCategory = filteredCategories.find((category) => category.slug === activeCategory)
  const isMaleCategory = selectedCategory?.group === 'homme'
  const requestCategory = isMaleCategory ? '' : activeCategory

  const { products, loading } = useProducts({
    ...(requestCategory ? { category: requestCategory } : {}),
    ...(searchQuery ? { search: searchQuery } : {}),
  })

  useEffect(() => {
    setSearchInput(searchQuery)
  }, [searchQuery])

  const sortedProducts = useMemo(() => {
    const result = [...products]
    if (sortBy === 'price-asc') return result.sort((a, b) => a.price - b.price)
    if (sortBy === 'price-desc') return result.sort((a, b) => b.price - a.price)
    if (sortBy === 'rating') return result.sort((a, b) => b.rating - a.rating)
    if (sortBy === 'featured') return result.sort((a, b) => Number(b.featured) - Number(a.featured))
    return result
  }, [products, sortBy])

  function setParam(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  function handleSearch(event) {
    event.preventDefault()
    const trimmed = searchInput.trim()
    setParam('search', trimmed || '')
  }

  return (
    <div className="min-h-screen bg-[#F9EAE1] pt-32 pb-16">
      <section className="max-w-7xl mx-auto px-4">
        <div className="overflow-hidden rounded-[2rem] border border-[#C5A059]/20 bg-white shadow-[0_18px_60px_rgba(140,98,57,0.10)]">
          <div className="grid gap-8 px-6 py-10 md:px-10 md:py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#C5A059] font-semibold">Boutique</p>
              <h1 className="mt-4 text-3xl md:text-5xl font-semibold text-[#8C6239] leading-tight">Selection de la boutique</h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#8C6239]/72 md:text-base">Filtre rapidement, recherche et explore les articles visibles.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <form onSubmit={handleSearch} className="relative w-full">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8C6239]/50" />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Rechercher un article..."
                className="w-full rounded-full border border-[#C5A059]/20 bg-white/90 py-3 pl-12 pr-4 text-sm text-[#8C6239] outline-none transition focus:border-[#8C6239]"
              />
            </form>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#C5A059]/25 px-4 py-3 text-sm text-[#8C6239] bg-[#fffdfa]">
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
      </section>

      <section className="max-w-7xl mx-auto px-4 mt-6">
        {selectedCategory && (
          <div className="mb-4 rounded-3xl border border-[#C5A059]/20 bg-white px-5 py-4 text-sm text-[#8C6239] shadow-[0_12px_30px_rgba(140,98,57,0.08)]">
            Filtre active : <span className="font-semibold">{selectedCategory.name}</span>
          </div>
        )}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setParam('category', '')}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${!activeCategory ? 'bg-[#8C6239] text-white' : 'bg-white text-[#8C6239] border border-[#C5A059]/20'}`}
          >
            Tout
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.85rem] border border-[#C5A059]/15 bg-white p-5 shadow-[0_18px_40px_rgba(140,98,57,0.08)]">
            <p className="mb-3 text-sm uppercase tracking-[0.3em] text-[#C5A059] font-semibold">Femmes</p>
            <div className="flex flex-wrap gap-2">
              {femaleCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setParam('category', activeCategory === category.slug ? '' : category.slug)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${activeCategory === category.slug ? 'bg-[#8C6239] text-white' : 'bg-white text-[#8C6239] border border-[#C5A059]/20 hover:bg-[#F9EAE1]'}`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-[1.85rem] border border-[#C5A059]/15 bg-white p-5 shadow-[0_18px_40px_rgba(140,98,57,0.08)]">
            <p className="mb-3 text-sm uppercase tracking-[0.3em] text-[#C5A059] font-semibold">Hommes</p>
            <div className="flex flex-wrap gap-2">
              {maleCategories.map((category) => (
                <button
                  key={category.id}
                  disabled
                  aria-disabled="true"
                  className="rounded-full px-4 py-2 text-sm font-semibold text-[#8C6239]/50 bg-[#F9EAE1] border border-[#C5A059]/10 cursor-not-allowed opacity-70"
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 mt-8">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="aspect-[3/4] rounded-[1.6rem] bg-white animate-pulse" />
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="rounded-[2rem] bg-white px-6 py-20 text-center shadow-[0_18px_50px_rgba(140,98,57,0.08)]">
            <p className="text-lg font-medium text-[#8C6239]">Aucune piece trouvee</p>
            <button
              onClick={() => setSearchParams({})}
              className="mt-4 inline-flex rounded-full bg-[#8C6239] px-5 py-3 text-sm font-semibold text-white"
            >
              Reinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {sortedProducts.map((product, index) => (
              <ShopCard key={product.id} product={product} index={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
