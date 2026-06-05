export default function TopBar({ onMenuClick }) {
  return (
    <header className="h-11 flex items-center px-4 border-b border-gray-100 bg-white flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 -ml-1.5 text-gray-600 hover:text-gray-900 transition-colors"
        aria-label="Ouvrir le menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex-1 flex justify-center">
        <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.95 5.5 4 9 4 12.5 4 17.19 7.58 21 12 21s8-3.81 8-8.5C20 9 17.05 5.5 12 2zm0 17c-3.31 0-6-2.91-6-6.5 0-2.79 2.11-5.6 6-8.75 3.89 3.15 6 5.96 6 8.75C18 16.09 15.31 19 12 19z" />
          </svg>
        </div>
      </div>

      <div className="flex items-center gap-2.5 text-gray-500">
        <button aria-label="Rechercher" className="p-1 hover:text-gray-900 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </button>
        <button aria-label="Panier" className="p-1 hover:text-gray-900 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" />
          </svg>
        </button>
      </div>
    </header>
  )
}
