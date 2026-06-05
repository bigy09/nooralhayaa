import { Link } from 'react-router-dom'
import { Globe, Camera, MessageCircle, Phone, Mail, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 pt-10 pb-6">
        <div className="flex flex-col items-center mb-6">
          <span className="text-2xl font-bold tracking-widest mb-1">
            <span className="text-[#C5A059] mr-1">*</span>NOOR AL HAYAA
          </span>
          <p className="text-[#C5A059] text-xs tracking-widest italic">Mode modeste</p>
        </div>

        <ul className="flex flex-wrap justify-center gap-6 md:gap-10 mb-8 text-sm">
          {[['Accueil', '/'], ['Boutique', '/shop'], ['Femme', '/femme'], ['Homme', '/homme'], ['Panier', '/cart'], ['Commandes', '/orders']].map(([label, to]) => (
            <li key={to + label}>
              <Link to={to} className="text-white/70 hover:text-[#C5A059] transition-colors">{label}</Link>
            </li>
          ))}
        </ul>

        <ul className="flex justify-center gap-6 mb-8">
          <li>
            <a href="https://facebook.com" rel="noreferrer" target="_blank" className="text-white/50 hover:text-[#C5A059] transition-colors">
              <span className="sr-only">Facebook</span>
              <Globe size={22} />
            </a>
          </li>
          <li>
            <a href="https://instagram.com" rel="noreferrer" target="_blank" className="text-white/50 hover:text-[#C5A059] transition-colors">
              <span className="sr-only">Instagram</span>
              <Camera size={22} />
            </a>
          </li>
          <li>
            <a href="https://wa.me/2250702396063" rel="noreferrer" target="_blank" className="text-white/50 hover:text-[#C5A059] transition-colors">
              <span className="sr-only">WhatsApp</span>
              <MessageCircle size={22} />
            </a>
          </li>
        </ul>

        <div className="flex flex-wrap justify-center gap-6 text-xs text-white/40">
          <span className="flex items-center gap-1.5"><Phone size={11} className="text-[#C5A059]" />+225 07 02 39 60 63</span>
          <span className="flex items-center gap-1.5"><Mail size={11} className="text-[#C5A059]" />contact@nooralhayaa.com</span>
          <span className="flex items-center gap-1.5"><MapPin size={11} className="text-[#C5A059]" />Dakar, Senegal</span>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between text-xs text-white/30 gap-2">
          <span>(c) 2026 NOOR AL HAYAA. Tous droits reserves.</span>
          <span>Paiement Mobile Money • Contact WhatsApp</span>
        </div>
      </div>
    </footer>
  )
}
