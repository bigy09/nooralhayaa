import { useState } from 'react'

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
    </svg>
  )
}

function ChevronIcon({ open }) {
  return (
    <svg
      className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function SidebarAction({ icon, children }) {
  return (
    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
      <span className="flex-shrink-0 text-gray-400">{icon}</span>
      <span>{children}</span>
    </button>
  )
}

export default function Sidebar({ categories, activeCategory, onSelectCategory, isOpen }) {
  const [catOpen, setCatOpen] = useState(true)

  return (
    <aside
      className={[
        'fixed lg:static inset-y-0 left-0 z-30',
        'w-56 bg-white border-r border-gray-100',
        'flex flex-col transition-transform duration-200 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}
    >
      {/* Search */}
      <div className="px-4 py-3 border-b border-gray-100">
        <label className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 cursor-text">
          <SearchIcon />
          <input
            type="search"
            placeholder="Recherche"
            className="flex-1 min-w-0 bg-transparent text-sm outline-none text-gray-700 placeholder:text-gray-400"
          />
        </label>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-1">
        <button
          onClick={() => onSelectCategory(null)}
          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
            activeCategory === null ? 'font-semibold text-gray-900' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Accueil
        </button>

        {/* Catégorie accordion */}
        <div>
          <button
            onClick={() => setCatOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-gray-900"
          >
            <span>Catégorie</span>
            <ChevronIcon open={catOpen} />
          </button>
          {catOpen && (
            <ul className="pb-1">
              {categories.map(cat => (
                <li key={cat.id}>
                  <button
                    onClick={() => onSelectCategory(cat.slug)}
                    className={`w-full text-left pl-6 pr-4 py-2 text-sm transition-colors ${
                      activeCategory === cat.slug
                        ? 'text-gray-900 font-medium'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Utility links */}
        <div className="mt-2 pt-3 border-t border-gray-100 space-y-0.5">
          <SidebarAction icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
          }>
            Ajouter à l&apos;écran d&apos;accueil
          </SidebarAction>
          <SidebarAction icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17H5v-1a7 7 0 0 1 14 0v1h-4zM13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          }>
            Suivre
          </SidebarAction>
          <SidebarAction icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
            </svg>
          }>
            Partager
          </SidebarAction>
          <button className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>Français</span>
            </div>
            <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <button className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" />
          </svg>
          <span>Créez votre Take App</span>
        </button>
      </div>
    </aside>
  )
}
