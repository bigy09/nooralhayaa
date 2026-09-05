import { useEffect, useState } from 'react'
import { LOCAL_PRODUCTS, LOCAL_CATEGORIES } from '../data/products'
import { buildApiUrl } from '../utils/api'

function normalizeProduct(product) {
  if (!product) return product
  return {
    ...product,
    id: product.id || product._id,
  }
}

function isCurrentLocalCatalogProduct(product) {
  return LOCAL_PRODUCTS.some((localProduct) => localProduct.name === product.name)
}

function filterLocalProducts(params, blockedCategorySlugs) {
  let filtered = LOCAL_PRODUCTS
  if (params.category) filtered = filtered.filter((product) => product.categorySlug === params.category)
  if (params.featured === 'true') filtered = filtered.filter((product) => product.featured)
  if (params.search) {
    const search = params.search.toLowerCase()
    filtered = filtered.filter((product) => (
      product.name.toLowerCase().includes(search) || product.description.toLowerCase().includes(search)
    ))
  }
  return filtered.filter((product) => !blockedCategorySlugs.includes(product.categorySlug)).map(normalizeProduct)
}

// Retombe sur le catalogue statique local si l'API est indisponible, mais ne le
// fait plus silencieusement : on logue l'erreur et on expose un flag `error` pour
// que l'UI puisse, si elle le souhaite, avertir que les données affichées peuvent
// être obsolètes plutôt que de laisser croire que tout va bien.
function logFallback(context, error) {
  console.error(`[useApi] ${context} failed, falling back to local catalog data:`, error)
}

export function useProducts(params = {}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Categories that must be hidden (partie Homme)
  const BLOCKED_CATEGORY_SLUGS = ['boubou', 'tuniques']

  useEffect(() => {
    setLoading(true)
    setError(null)
    const query = { ...params }
    if (query.isVisible === undefined) query.isVisible = 'true'
    const qs = new URLSearchParams(query).toString()
    fetch(buildApiUrl(`/api/products${qs ? '?' + qs : ''}`))
      .then(r => r.json())
        .then(data => {
        if (Array.isArray(data)) {
          const apiProducts = data.map(normalizeProduct).filter(p => !BLOCKED_CATEGORY_SLUGS.includes(p.categorySlug))
          const hasCurrentCatalog = apiProducts.some(isCurrentLocalCatalogProduct)
          setProducts(hasCurrentCatalog ? apiProducts : filterLocalProducts(params, BLOCKED_CATEGORY_SLUGS))
        } else {
          logFallback('GET /api/products (unexpected response shape)', data)
          setError('api-unavailable')
          setProducts(filterLocalProducts(params, BLOCKED_CATEGORY_SLUGS))
        }
        setLoading(false)
      })
      .catch((err) => {
        logFallback('GET /api/products', err)
        setError('api-unavailable')
        setProducts(filterLocalProducts(params, BLOCKED_CATEGORY_SLUGS))
        setLoading(false)
      })
  }, [JSON.stringify(params)])

  return { products, loading, error }
}

export function useProduct(id) {
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    fetch(buildApiUrl(`/api/products/${id}`))
      .then(r => r.json())
      .then(data => {
        if (data && data.name) {
          setProduct(normalizeProduct(data))
        } else {
          logFallback(`GET /api/products/${id} (unexpected response shape)`, data)
          setError('api-unavailable')
          setProduct(LOCAL_PRODUCTS.find(p => p.id === id) || null)
        }
        setLoading(false)
      })
      .catch((err) => {
        logFallback(`GET /api/products/${id}`, err)
        setError('api-unavailable')
        setProduct(LOCAL_PRODUCTS.find(p => p.id === id) || null)
        setLoading(false)
      })
  }, [id])

  return { product, loading, error }
}

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  useEffect(() => {
    fetch(buildApiUrl('/api/categories'))
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data)
        } else {
          logFallback('GET /api/categories (empty response)', data)
          setError('api-unavailable')
          setCategories(LOCAL_CATEGORIES)
        }
        setLoading(false)
      })
      .catch((err) => {
        logFallback('GET /api/categories', err)
        setError('api-unavailable')
        setCategories(LOCAL_CATEGORIES)
        setLoading(false)
      })
  }, [])
  return { categories, loading, error }
}

export function useBanners() {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  useEffect(() => {
    fetch(buildApiUrl('/api/banners'))
      .then(r => r.json())
      .then(data => { setBanners(data); setLoading(false) })
      .catch((err) => {
        logFallback('GET /api/banners', err)
        setError('api-unavailable')
        setBanners([])
        setLoading(false)
      })
  }, [])
  return { banners, loading, error }
}
