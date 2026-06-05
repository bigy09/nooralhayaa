import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export default function CategoryGrid({ categories }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-900">Nos catégories</h2>
        <Link to="/shop" className="flex items-center gap-1 text-sm text-rose-600 font-medium hover:gap-2 transition-all">
          Tout voir <ArrowRight size={14} />
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {categories.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <Link
              to={`/shop?category=${cat.slug}`}
              className="group block rounded-2xl overflow-hidden relative aspect-square shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="absolute inset-0 flex">
                {cat.swatches.map((c, j) => (
                  <div key={j} className="flex-1 h-full transition-transform duration-500 group-hover:scale-105" style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <p className="absolute bottom-2.5 left-0 right-0 text-center text-xs font-bold text-white leading-tight px-1">
                {cat.name}
              </p>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
