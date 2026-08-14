import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useProducts } from '../hooks/useApi'
import ProductCard2 from '../components/ProductCard2'

const filters = [
  { label: 'Boubous', value: 'boubou' },
  { label: 'Tuniques', value: 'tuniques' },
  { label: 'Accessoires', value: 'accessoires' },
]

export default function HommePage() {
  return (
    <div className="min-h-screen bg-[#F3EFE8] pt-32 pb-16 text-[#8C6239]">
      <section className="max-w-7xl mx-auto px-4 mt-8">
        <div className="mb-8 rounded-[2rem] border border-[#C5A059]/10 bg-[#ECE5DC] p-8 shadow-[0_18px_50px_rgba(140,98,57,0.05)] text-center opacity-90">
          <p className="text-xs uppercase tracking-[0.3em] text-[#8C6239]/60 font-semibold">Homme</p>
          <h1 className="mt-4 text-4xl font-semibold text-[#8C6239]/80">Homme</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#8C6239]/60">
            La collection homme est bientôt disponible. Nous y travaillons, reviens bientôt !
          </p>
          <div className="mt-6 inline-flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/shop" className="rounded-full bg-[#C5A059]/20 px-6 py-3 text-sm font-semibold text-[#8C6239]/70 transition-colors hover:bg-[#C5A059]/30">
              Voir la boutique
            </Link>
            <span className="rounded-full bg-[#D9C8B2] px-5 py-3 text-sm font-semibold text-[#8C6239]/70">
              Disponible bientôt
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
