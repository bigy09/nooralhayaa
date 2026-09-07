import nourah1 from '../assets/robe nourah.jpg'
import nourah2 from '../assets/robe nourah 2.jpg'
import nadira1 from '../assets/robe nadira.jpg'
import nadira2 from '../assets/robe-nadira.jpg'
import meetah1 from '../assets/tunique meetah.jpg'
import meetah2 from '../assets/tunique meetah (2).jpg'
import meetah3 from '../assets/tunique  meetah.jpg'
import anta1 from '../assets/Boubou anta.jpg'
import anta2 from '../assets/boubou anta (2).jpg'
import fatim from '../assets/abaya fatim.jpg'
import aicha from '../assets/boubou aicha.jpg'
import roky from '../assets/boubou roky.jpg'
import mouna from '../assets/abaya mouna.jpg'
import makila1 from '../assets/ensemble makila.jpg'
import makila2 from '../assets/Ensemble makila (2).jpg'

const visualsById = {
  f1: nourah1,
  f2: nourah2,
  f3: nadira1,
  f4: nadira2,
  f5: meetah1,
  f6: meetah2,
  f7: meetah3,
  f8: anta1,
  f9: anta2,
  f10: fatim,
  f11: aicha,
  f12: roky,
  f13: mouna,
  f14: makila1,
  f15: makila2,
}

const visualsByName = {
  'Robe Nourah': nourah1,
  'Robe Nadira': nadira1,
  'Tunique Meetah': meetah1,
  'Boubou Anta': anta1,
  'Abaya Fatim': fatim,
  'Boubou Aïcha': aicha,
  'Boubou Roky': roky,
  'Abaya Mouna': mouna,
  'Ensemble Makila': makila1,
}

const descriptionsById = {
  f1: 'Robe longue bleu marine a motifs geometriques multicolores, portee sur un mannequin avec un turban beige.',
  f2: 'Robe longue rose pale a motifs floraux rouges et verts, portee sur un mannequin avec un turban rose.',
  f3: 'Robe longue rose poudree a motifs floraux et manches longues, portee avec un voile rose sur un mannequin.',
  f4: 'Robe longue blanche a fleurs bleues, portee avec un voile bleu marine sur un mannequin.',
  f5: 'Ensemble visible compose d une tunique longue verte a motif feuillage, d un pantalon blanc et d un voile blanc.',
  f6: 'Ensemble visible compose d une tunique longue rose fuchsia a motif graphique, d un pantalon blanc et d un voile blanc.',
  f7: 'Ensemble visible compose d une tunique longue gris anthracite a motif feuillage, d un pantalon gris et d un voile blanc.',
  f8: 'Tenue longue bleu marine vue de dos, portee avec un voile bleu marine sur un mannequin.',
  f9: 'Tenue longue bleu clair vue de dos, portee avec un voile bleu marine sur un mannequin.',
  f10: 'Robe longue gris lavande a motifs dores, portee avec un voile dore sur un mannequin.',
  f11: 'Robe longue blanche et prune a motifs abstraits, portee avec un voile violet sur un mannequin.',
  f12: 'Robe ample bleue a motif abstrait, portee avec un voile vert clair sur un mannequin.',
  f13: 'Robe longue blanche et noire a motif ondule, portee avec un voile gris sur un mannequin.',
  f14: 'Robe longue noire a fleurs roses, portee avec un voile noir sur un mannequin.',
  f15: 'Robe longue bleue a fleurs claires, portee avec un voile noir sur un mannequin.',
}

const defaultBackground = 'linear-gradient(180deg, #f5ede1 0%, #c49a6c 100%)'

const fallbackByCategory = {
  kimonos: {
    image: mouna,
    background: defaultBackground,
  },
  abaya: {
    image: fatim,
    background: defaultBackground,
  },
  robes: {
    image: nourah1,
    background: defaultBackground,
  },
  boubou: {
    image: anta1,
    background: defaultBackground,
  },
  qamis: {
    image: anta1,
    background: defaultBackground,
  },
}

export function getProductVisual(product) {
  if (!product) return fallbackByCategory.robes
  const image = visualsById[product.id] || visualsByName[product.name?.trim()]
  return image
    ? { image, background: defaultBackground }
    : fallbackByCategory[product.categorySlug] || fallbackByCategory.robes
}

export function getProductImageAlt(product) {
  if (!product) return 'Article de mode Noor Al Hayaa'
  return descriptionsById[product.id]
    || `${product.name} - article de mode presente sur un mannequin`
}
