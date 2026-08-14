import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, ShoppingBag, Search, User, Phone, Mail, Menu, X } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { useAuth } from '../context/AuthContext'
import { useSiteConfig } from '../hooks/useSiteConfig'
import { getProductVisual } from '../utils/productVisuals'
import { formatPrice } from '../utils/payment'
import logoNoor from '../assets/logo noor al.jpeg'

export default function Navbar() {
  const { count, items: cartItems, total } = useCart()
  const { count: wishCount, items: wishlistItems } = useWishlist()
  const { user, isUserAuthenticated, logoutUser } = useAuth()
  const { config } = useSiteConfig()
  const [scrolled, setScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openPreview, setOpenPreview] = useState('')
  const previewRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const whatsappNumber = config.whatsapp || '2250702396063'
  const managerWhatsAppLink = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=Bonjour%20Noor%20Al%20Hayaa%2C%20je%20souhaite%20des%20informations%20sur%20vos%20articles.`

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setOpenPreview('')
  }, [location.pathname])

  useEffect(() => {
    function handlePointerDown(event) {
      if (!openPreview) return
      if (previewRef.current && !previewRef.current.contains(event.target)) {
        setOpenPreview('')
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpenPreview('')
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openPreview])

  function handleSearch(e) {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const isHome = location.pathname === '/'
  const transparentMode = isHome && !scrolled
  const lightText = 'text-white'
  const surfaceTop = transparentMode
    ? 'bg-transparent border-transparent'
    : 'bg-[#8C6239] border-[#8C6239]'
  const surfaceBottom = transparentMode
    ? 'bg-transparent border-transparent'
    : 'bg-[#F9EAE1]/95 backdrop-blur-md border-[#C5A059]/25 shadow-[0_8px_20px_rgba(140,98,57,0.15)]'

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className={`border-b transition-all duration-500 ${surfaceTop}`}>
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logoNoor}
              alt="Noor Al Hayaa"
              className="h-9 w-auto rounded-md border border-white/20 shadow-sm"
            />
          </Link>

          <form onSubmit={handleSearch} className="hidden md:block flex-1 max-w-sm mx-4">
            <div className="relative">
              <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${transparentMode ? 'text-white/70' : 'text-[#8C6239]/70'}`} />
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher un article..."
                className={`w-full py-2 pl-8 pr-3 text-sm rounded-full outline-none border transition-all ${
                  transparentMode
                    ? 'bg-black/20 border-white/25 text-white placeholder-white/60 focus:border-white/50'
                    : 'bg-white/80 border-[#C5A059]/40 text-[#8C6239] placeholder-[#8C6239]/50 focus:border-[#C5A059]'
                }`}
              />
            </div>
          </form>

          <div ref={previewRef} className="relative flex items-center gap-3">
            <button
              onClick={() => setOpenPreview((current) => (current === 'wishlist' ? '' : 'wishlist'))}
              className={`relative transition-colors ${lightText}`}
              title="Mes favoris"
            >
              <Heart size={20} />
              {wishCount > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-400 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {wishCount > 9 ? '9+' : wishCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setOpenPreview((current) => (current === 'cart' ? '' : 'cart'))}
              className={`relative transition-colors ${lightText}`}
              title="Mon panier"
            >
              <ShoppingBag size={20} />
              {count > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-[#C5A059] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </button>
            {isUserAuthenticated ? (
              <>
                <div className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border transition-all ${
                    transparentMode
                      ? 'border-white/40 text-white hover:bg-white hover:text-[#8C6239]'
                      : 'border-[#C5A059] bg-[#C5A059] text-white hover:bg-white hover:text-[#8C6239]'
                  }`}>
                  <User size={12} /> {user?.name || 'Mon compte'}
                </div>
                <Link
                  to="/account"
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border transition-all ${
                    transparentMode
                      ? 'border-white/40 text-white hover:bg-white hover:text-[#8C6239]'
                      : 'border-[#C5A059] bg-[#C5A059] text-white hover:bg-white hover:text-[#8C6239]'
                  }`}
                >
                  Mon compte
                </Link>
                <button
                  onClick={logoutUser}
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border transition-all ${
                    transparentMode
                      ? 'border-white/40 text-white hover:bg-white hover:text-[#8C6239]'
                      : 'border-[#8C6239] bg-white text-[#8C6239] hover:bg-[#F9EAE1]'
                  }`}
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <Link
                to="/login"
                state={{ from: location.pathname }}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border transition-all ${
                  transparentMode
                    ? 'border-white/40 text-white hover:bg-white hover:text-[#8C6239]'
                    : 'border-[#8C6239] bg-[#8C6239] text-white hover:bg-[#C5A059]'
                }`}
              >
                <User size={12} /> Connexion
              </Link>
            )}
            <a
              href={managerWhatsAppLink}
              target="_blank"
              rel="noreferrer"
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border transition-all ${
                transparentMode
                  ? 'border-white/40 text-white hover:bg-white hover:text-[#8C6239]'
                  : 'border-[#25D366] bg-[#25D366] text-white hover:bg-white hover:text-[#25D366]'
              }`}
            >
              Discuter WhatsApp
            </a>
            <button
              onClick={() => setMobileOpen(v => !v)}
              className={`md:hidden ${lightText}`}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <AnimatePresence>
              {openPreview && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="absolute right-0 top-[calc(100%+12px)] w-80 max-h-105 overflow-auto rounded-[1.35rem] border border-[#C5A059]/25 bg-white p-3 shadow-[0_18px_45px_rgba(140,98,57,0.18)]"
                >
                  {openPreview === 'wishlist' ? (
                    <>
                      <div className="mb-2 px-2 py-1">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#C5A059]">Favoris</p>
                        <h3 className="text-sm font-semibold text-[#8C6239]">{wishCount} article{wishCount > 1 ? 's' : ''}</h3>
                      </div>
                      <div className="space-y-2">
                        {wishlistItems.length ? wishlistItems.slice(0, 4).map((item) => {
                          const visual = getProductVisual(item)
                          return (
                            <Link key={item.id} to={`/product/${item.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-[#F9EAE1] transition-colors">
                              <div className="relative h-12 w-10 overflow-hidden rounded-lg">
                                <div className="absolute inset-0" style={{ background: visual.background }} />
                                <img src={visual.image} alt={item.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-[#8C6239]">{item.name}</p>
                                <p className="text-[11px] text-[#C5A059]">{formatPrice(item.price)}</p>
                              </div>
                            </Link>
                          )
                        }) : (
                          <p className="px-2 py-5 text-center text-xs text-[#8C6239]/60">Aucun article liké pour le moment.</p>
                        )}
                      </div>
                      <Link to="/wishlist" className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[#8C6239] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#C5A059] transition-colors">
                        Voir tous les favoris
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="mb-2 px-2 py-1">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#C5A059]">Panier</p>
                        <h3 className="text-sm font-semibold text-[#8C6239]">{count} article{count > 1 ? 's' : ''}</h3>
                      </div>
                      <div className="space-y-2">
                        {cartItems.length ? cartItems.slice(0, 4).map((item) => {
                          const visual = getProductVisual(item)
                          return (
                            <Link key={item.key} to="/cart" className="flex items-center gap-3 rounded-xl p-2 hover:bg-[#F9EAE1] transition-colors">
                              <div className="relative h-12 w-10 overflow-hidden rounded-lg">
                                <div className="absolute inset-0" style={{ background: visual.background }} />
                                <img src={visual.image} alt={item.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-[#8C6239]">{item.name}</p>
                                <p className="text-[11px] text-[#8C6239]/60">x{item.qty} • {item.selectedSize}</p>
                              </div>
                              <p className="text-[11px] font-semibold text-[#C5A059]">{formatPrice(item.price * item.qty)}</p>
                            </Link>
                          )
                        }) : (
                          <p className="px-2 py-5 text-center text-xs text-[#8C6239]/60">Ton panier est vide.</p>
                        )}
                      </div>
                      <div className="mt-3 rounded-xl border border-[#C5A059]/20 bg-[#fffaf5] px-3 py-2 text-xs text-[#8C6239]">
                        Total: <span className="font-semibold text-[#C5A059]">{formatPrice(total)}</span>
                      </div>
                      <Link to="/cart" className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[#8C6239] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#C5A059] transition-colors">
                        Voir le panier
                      </Link>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <nav className={`border-b transition-all duration-500 ${surfaceBottom}`}>
        <div className="max-w-7xl mx-auto px-4 py-2 hidden md:flex justify-between items-center">
          <ul className="flex flex-wrap gap-1 text-sm font-medium">
            {[['Accueil', '/'], ['Boutique', '/shop'], ['Femme', '/femme'], ['Homme', '/homme']].map(([label, to]) => (
              <li key={to + label}>
                <Link
                  to={to}
                  className={`px-3 py-1.5 inline-block rounded-full transition-colors ${
                    label === 'Homme'
                      ? 'border border-[#8C6239]/15 bg-[#f7e6d5] text-[#8C6239] opacity-80 hover:text-[#8C6239]'
                      : transparentMode
                      ? 'text-white hover:text-[#F9EAE1]'
                      : 'text-[#8C6239] hover:text-[#C5A059]'
                  }`}
                  aria-disabled={label === 'Homme'}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className={`flex items-center gap-5 text-xs ${transparentMode ? 'text-white/85' : 'text-[#8C6239]/80'}`}>
            <span className="flex items-center gap-1.5"><Phone size={11} className="text-[#C5A059]" />+225 07 02 39 60 63</span>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="md:hidden bg-[#F9EAE1] border-t border-[#C5A059]/20 overflow-hidden shadow-lg"
          >
            <div className="px-4 py-4 space-y-1">
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C6239]/60 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Rechercher..."
                    className="w-full pl-8 pr-3 py-2 text-sm border border-[#C5A059]/35 rounded-full outline-none bg-white/90 text-[#8C6239]"
                  />
                </div>
              </form>
              {[
                ['Accueil', '/'], ['Boutique', '/shop'], ['Femme', '/femme'], ['Homme', '/homme'], ['Favoris', '/wishlist'], ['Panier', '/cart'], ['Mon compte', '/account'],
              ].map(([label, to]) => (
                <Link
                  key={to + label}
                  to={to}
                  className="block px-3 py-2.5 text-sm text-[#8C6239] hover:text-[#C5A059] hover:bg-[#fff5ef] rounded-lg transition-colors"
                >
                  {label}
                </Link>
              ))}
              <a
                href={managerWhatsAppLink}
                target="_blank"
                rel="noreferrer"
                className="block px-3 py-2.5 text-sm text-white bg-[#25D366] hover:bg-[#1fb657] rounded-lg transition-colors font-semibold"
              >
                Discuter avec le gerant sur WhatsApp
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
