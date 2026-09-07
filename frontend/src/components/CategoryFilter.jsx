export default function CategoryFilter({ title, categories, activeCategory, onChange }) {
  return (
    <div className="rounded-[1.85rem] border border-[#C5A059]/15 bg-white p-5 shadow-[0_18px_40px_rgba(140,98,57,0.08)]">
      <p className="mb-3 text-sm uppercase tracking-[0.3em] text-[#C5A059] font-semibold">{title}</p>
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => {
          const slug = category.slug ?? category.value
          const label = category.name ?? category.label
          const isActive = activeCategory === slug

          return (
            <button
              key={slug}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(slug)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-[#8C6239] text-white'
                  : 'bg-white text-[#8C6239] border border-[#C5A059]/20 hover:bg-[#F9EAE1]'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
