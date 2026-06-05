function abbreviate(name) {
  const parts = name.split(' ')
  if (parts.length <= 1) return name
  const [first, ...rest] = parts
  const abbreviated = first.length > 8 ? `${first.slice(0, 7)}...` : first
  return `${abbreviated}\n${rest.join(' ')}`
}

export default function ShopHeader({ categories, activeCategory, onSelectCategory }) {
  return (
    <div className="bg-white">
      {/* Banner */}
      <div className="h-32 bg-gradient-to-br from-rose-50 via-orange-50 to-rose-100 relative overflow-hidden">
        <div className="absolute top-3 right-12 w-14 h-9 bg-amber-200/80 rounded rotate-[14deg] skew-x-6 shadow-sm" />
        <div className="absolute top-4 right-9 w-9 h-7 bg-amber-300/60 rounded -rotate-[5deg]" />
        <div className="absolute top-1 right-16 w-4 h-4 rounded-full bg-amber-100/80" />
        <div className="absolute bottom-4 left-8 w-6 h-6 rounded-full bg-rose-200/60" />
      </div>

      {/* Logo circle */}
      <div className="flex justify-center -mt-9 relative z-10">
        <div className="w-[72px] h-[72px] rounded-full bg-white ring-4 ring-white shadow-md flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.95 5.5 4 9 4 12.5 4 17.19 7.58 21 12 21s8-3.81 8-8.5C20 9 17.05 5.5 12 2zm0 17c-3.31 0-6-2.91-6-6.5 0-2.79 2.11-5.6 6-8.75 3.89 3.15 6 5.96 6 8.75C18 16.09 15.31 19 12 19z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Name & tagline */}
      <div className="text-center mt-2 px-4">
        <h1 className="text-[18px] font-bold tracking-wide text-gray-900 leading-tight">
          Noor Al Hayaa
        </h1>
        <p className="text-xs text-gray-400 mt-0.5 tracking-wide italic">
          L&apos;élégance guidée par la pudeur
        </p>
      </div>

      {/* Category thumbnails */}
      {categories.length > 0 && (
        <div className="flex justify-center gap-5 mt-4 pb-4 px-4">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(activeCategory === cat.slug ? null : cat.slug)}
              className="flex flex-col items-center gap-1.5 group focus:outline-none"
            >
              <div
                className={`w-14 h-[68px] rounded-xl overflow-hidden flex border shadow-sm transition-all duration-150 ${
                  activeCategory === cat.slug
                    ? 'border-gray-400 ring-2 ring-gray-200'
                    : 'border-gray-100 group-hover:border-gray-300'
                }`}
              >
                {cat.swatches.map((color, i) => (
                  <div key={i} className="flex-1 h-full" style={{ backgroundColor: color }} />
                ))}
              </div>
              <span
                className={`text-[10px] leading-tight text-center whitespace-pre-wrap max-w-[60px] transition-colors ${
                  activeCategory === cat.slug
                    ? 'font-semibold text-gray-900'
                    : 'text-gray-500 group-hover:text-gray-700'
                }`}
              >
                {abbreviate(cat.name)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
