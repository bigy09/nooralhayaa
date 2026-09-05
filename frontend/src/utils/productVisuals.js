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
  const image = visualsById[product.id]
  return image
    ? { image, background: defaultBackground }
    : fallbackByCategory[product.categorySlug] || fallbackByCategory.robes
}
