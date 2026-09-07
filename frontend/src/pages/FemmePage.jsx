import { Link, useSearchParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useProducts } from '../hooks/useApi'
import ProductCard2 from '../components/ProductCard2'
import CategoryFilter from '../components/CategoryFilter'

const filters = [
  { name: 'Tous', slug: 'all' },
  { name: 'Abayas & Kimonos', slug: 'abayas-kimonos' },
  { name: 'Robes', slug: 'robes' },
  { name: 'Ensembles Pantalon', slug: 'ensembles-pantalon' },
  { name: 'Boubous', slug: 'boubous' },
]

export default function FemmePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeFilter = searchParams.get('category') || 'all'
  const query = useMemo(() => ({
    category: activeFilter === 'all' ? undefined : activeFilter,
  }), [activeFilter])
  const { products, loading } = useProducts(query)
  const activeFilterLabel = filters.find((filter) => filter.slug === activeFilter)?.name || 'Tous'

  return (
    <div className="min-h-screen bg-[#F9EAE1] pt-32 pb-16">
      <section className="max-w-7xl mx-auto px-4 mt-8">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.32em] text-[#C5A059] font-semibold">Femme</p>
          <h1 className="mt-3 text-4xl font-semibold text-[#8C6239]">Filtrer par catégorie</h1>
          <p className="mt-3 max-w-2xl mx-auto text-sm leading-7 text-[#8C6239]/75">
            Tous les produits pour femme sont visibles par défaut. Clique sur un filtre pour affiner la sélection.
          </p>
        </div>

        <div className="mb-8">
          <CategoryFilter
            title="Catégories Femme"
            categories={filters}
            activeCategory={activeFilter}
            onChange={(category) => {
              if (category === 'all') setSearchParams({})
              else setSearchParams({ category })
            }}
          />
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="aspect-[3/4] rounded-[1.6rem] bg-white animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-[2rem] bg-white px-6 py-20 text-center shadow-[0_18px_50px_rgba(140,98,57,0.08)]">
            <p className="text-lg font-medium text-[#8C6239]">Aucun {activeFilterLabel.toLowerCase()} trouvé</p>
            <p className="mt-2 text-sm text-[#8C6239]/65">Essaie un autre filtre ou explore la boutique.</p>
            <Link to="/shop" className="mt-4 inline-flex rounded-full bg-[#8C6239] px-5 py-3 text-sm font-semibold text-white">Voir toute la boutique</Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {products.map((product, index) => (
              <ProductCard2 key={product.id} product={product} index={index} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
