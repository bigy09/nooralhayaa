import femme1 from '../assets/femme 1.jpg'
import femme2 from '../assets/femme 2.jpg'
import femme3 from '../assets/femme 3.jpg'
import femme4 from '../assets/femme 4.jpg'
import femme5 from '../assets/femme 5.jpg'
import homme1 from '../assets/homme 1.jpg'
import homme2 from '../assets/homme 2.jpg'
import homme3 from '../assets/homme 3.jpg'
import homme4 from '../assets/homme 4.jpg'

const visualsByName = {
  // ── Femme ──────────────────────────────────────────────────────────────────
  'Abaya Nour': {
    image: femme1,
    background: 'linear-gradient(180deg, #dce6f5 0%, #b7c9e8 100%)',
  },
  'Robe Safa': {
    image: femme2,
    background: 'linear-gradient(180deg, #f4e0d0 0%, #c88a5a 100%)',
  },
  'Kimono Haya': {
    image: femme3,
    background: 'linear-gradient(180deg, #f5ede1 0%, #c49a6c 100%)',
  },
  'Robe Rahma': {
    image: femme4,
    background: 'linear-gradient(180deg, #f5e8d8 0%, #c0854d 100%)',
  },
  'Ensemble Samira': {
    image: femme5,
    background: 'linear-gradient(180deg, #e8e8e8 0%, #9ca3af 100%)',
  },

  // ── Homme ──────────────────────────────────────────────────────────────────
  'Boubou Omar': {
    image: homme1,
    background: 'linear-gradient(180deg, #dce4f0 0%, #3b4e72 100%)',
  },
  'Qamis Bilal': {
    image: homme2,
    background: 'linear-gradient(180deg, #f8f6ef 0%, #c8b96a 100%)',
  },
  'Boubou Nabil': {
    image: homme3,
    background: 'linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%)',
  },
  'Grand Boubou Youssef': {
    image: homme4,
    background: 'linear-gradient(180deg, #1e2d4a 0%, #0d1a2e 100%)',
  },
}

const fallbackByCategory = {
  kimonos: {
    image: femme3,
    background: 'linear-gradient(180deg, #f5ede1 0%, #c49a6c 100%)',
  },
  abaya: {
    image: femme1,
    background: 'linear-gradient(180deg, #dce6f5 0%, #b7c9e8 100%)',
  },
  robes: {
    image: femme2,
    background: 'linear-gradient(180deg, #f4e0d0 0%, #c88a5a 100%)',
  },
  boubou: {
    image: homme1,
    background: 'linear-gradient(180deg, #dce4f0 0%, #3b4e72 100%)',
  },
  qamis: {
    image: homme2,
    background: 'linear-gradient(180deg, #f8f6ef 0%, #c8b96a 100%)',
  },
}

export function getProductVisual(product) {
  if (!product) return fallbackByCategory.robes
  return visualsByName[product.name] || fallbackByCategory[product.categorySlug] || fallbackByCategory.robes
}
