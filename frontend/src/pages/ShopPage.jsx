import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useProducts } from '../hooks/useApi'
import ProductCard2 from '../components/ProductCard2'
import { LOCAL_CATEGORIES, LOCAL_PRODUCTS } from '../data/products'

function ShopCard({ product, index }) {
  return <ProductCard2 product={product} index={index} />
}

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const activeCategory = searchParams.get('category') || ''
  const searchQuery = searchParams.get('search') || ''
  const sortBy = searchParams.get('sort') || 'featured'
  const genderFilter = searchParams.get('gender') || ''

  const categorize = (category) => {
    if (!category) return 'all'
    if (category.group) return category.group
    if (['kimonos', 'abayas-kimonos', 'robes', 'ensembles-pantalon', 'boubou', 'boubous'].includes(category.slug)) return 'femme'
    if (['tuniques'].includes(category.slug)) return 'homme'
    // treat boubou as homme so it is hidden from public listing
    if (['accessoires'].includes(category.slug)) return 'both'
    return 'all'
  }

  const availableSlugs = new Set(LOCAL_PRODUCTS.map((product) => product.categorySlug))
  const normalizedCategories = LOCAL_CATEGORIES.filter((category) => availableSlugs.has(category.slug) || category.slug === 'kimonos').map((category) => ({
    ...category,
    group: categorize(category),
  }))
  const filteredCategories = normalizedCategories
  const femaleCategories = filteredCategories.filter((category) => category.group === 'femme')
  const maleCategories = filteredCategories.filter((category) => category.group === 'homme')
  const selectedCategory = filteredCategories.find((category) => category.slug === activeCategory)
  const isMaleCategory = selectedCategory?.group === 'homme'
  const categoryAliases = {
    kimonos: 'abayas-kimonos',
  }
  const requestCategory = isMaleCategory ? '' : (categoryAliases[activeCategory] || activeCategory)

  const { products, loading } = useProducts({
    ...(requestCategory ? { category: requestCategory } : {}),
    ...(searchQuery ? { search: searchQuery } : {}),
    ...(genderFilter ? { gender: genderFilter } : {}),
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
              <h1 className="mt-4 text-3xl md:text-5xl font-semibold text-[#8C6239] leading-tight">Sélection de la boutique</h1>
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
                  <option value="featured">Sélection maison</option>
                  <option value="price-asc">Prix croissant</option>
                  <option value="price-desc">Prix décroissant</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 mt-6">
        {selectedCategory && (
          <div className="mb-4 rounded-3xl border border-[#C5A059]/20 bg-white px-5 py-4 text-sm text-[#8C6239] shadow-[0_12px_30px_rgba(140,98,57,0.08)]">
            Filtre actif : <span className="font-semibold">{selectedCategory.name}</span>
          </div>
        )}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setSearchParams({})}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${!activeCategory ? 'bg-[#8C6239] text-white' : 'bg-white text-[#8C6239] border border-[#C5A059]/20'}`}
          >
            Tout
          </button>
        </div>
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-[#C5A059]/15 bg-white p-4 shadow-[0_12px_30px_rgba(140,98,57,0.06)]">
          <label className="flex min-w-36 flex-1 flex-col gap-1 text-xs font-semibold text-[#8C6239]">
            Genre
            <select value={genderFilter} onChange={(event) => setParam('gender', event.target.value)} className="rounded-full border border-[#C5A059]/25 bg-white px-3 py-2 text-sm font-normal outline-none">
              <option value="">Femme et homme</option>
              <option value="femme">Femme</option>
              <option value="homme">Homme</option>
            </select>
          </label>
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
