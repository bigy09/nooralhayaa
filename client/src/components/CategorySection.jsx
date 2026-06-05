import ProductCard from './ProductCard'

export default function CategorySection({ category, products }) {
  return (
    <section className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden bg-white">
      <header className="px-5 py-3.5 border-b border-gray-50">
        <h2 className="font-bold text-gray-900 text-sm tracking-wide">{category.name}</h2>
      </header>

      {products.length === 0 ? (
        <p className="text-center text-gray-300 text-xs py-10">Aucun produit disponible</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {products.map(product => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
