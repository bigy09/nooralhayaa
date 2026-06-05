export default function ProductCard({ product }) {
  const price = product.price.toLocaleString('fr-FR')

  return (
    <button className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left">
      <div className="flex-1 min-w-0 pr-3">
        <p className="text-sm font-medium text-gray-900 truncate leading-snug">
          {product.name}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{price} F CFA</p>
      </div>

      {/* Swatch thumbnail — 2 color panels side by side representing garment variants */}
      <div className="flex flex-shrink-0 rounded-xl overflow-hidden shadow-sm border border-gray-100">
        {product.swatches.map((color, i) => (
          <div
            key={i}
            className="w-7 h-16"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </button>
  )
}
