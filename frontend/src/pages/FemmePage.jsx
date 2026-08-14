import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useProducts } from '../hooks/useApi'
import ProductCard2 from '../components/ProductCard2'
import CategoryFilter from '../components/CategoryFilter'

const filters = [
  { label: 'Abayas & Kimonos', value: 'kimonos' },
  { label: 'Ensembles Pantalon', value: 'ensembles-pantalon' },
  { label: 'Jupes', value: 'jupes' },
  { label: 'Voiles', value: 'voiles' },
  { label: 'Jilbebs & Khimars', value: 'jilbebs-khimars' },
  { label: 'Accessoires', value: 'accessoires' },
  { label: 'Boubous', value: 'boubou' },
]

export default function FemmePage() {
  const [activeFilter, setActiveFilter] = useState('kimonos')
  const { products, loading } = useProducts({ category: activeFilter })
  const activeFilterLabel = filters.find((filter) => filter.value === activeFilter)?.label || 'Articles'

  return (
    <div className="min-h-screen bg-[#F9EAE1] pt-32 pb-16">
      <section className="max-w-7xl mx-auto px-4 mt-8">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.32em] text-[#C5A059] font-semibold">Femme</p>
          <h1 className="mt-3 text-4xl font-semibold text-[#8C6239]">Filtrer par catégorie</h1>
          <p className="mt-3 max-w-2xl mx-auto text-sm leading-7 text-[#8C6239]/75">
            Choisis une catégorie pour afficher les articles correspondants.
          </p>
        </div>

        <div className="mb-8">
          <CategoryFilter
            title="Catégories Femme"
            categories={filters}
            activeCategory={activeFilter}
            onChange={setActiveFilter}
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
