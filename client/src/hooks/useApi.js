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

export function useProducts(params = {}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams(params).toString()
    fetch(buildApiUrl(`/api/products${qs ? '?' + qs : ''}`))
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data.map(normalizeProduct))
        } else {
          // Fallback local si API vide ou indisponible
          let filtered = LOCAL_PRODUCTS
          if (params.category) filtered = filtered.filter(p => p.categorySlug === params.category)
          if (params.featured === 'true') filtered = filtered.filter(p => p.featured)
          if (params.search) {
            const s = params.search.toLowerCase()
            filtered = filtered.filter(p => p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s))
          }
          setProducts(filtered.map(normalizeProduct))
        }
        setLoading(false)
      })
      .catch(() => {
        let filtered = LOCAL_PRODUCTS
        if (params.category) filtered = filtered.filter(p => p.categorySlug === params.category)
        if (params.featured === 'true') filtered = filtered.filter(p => p.featured)
        setProducts(filtered.map(normalizeProduct))
        setLoading(false)
      })
  }, [JSON.stringify(params)])

  return { products, loading }
}

export function useProduct(id) {
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(buildApiUrl(`/api/products/${id}`))
      .then(r => r.json())
      .then(data => {
        if (data && data.name) {
          setProduct(normalizeProduct(data))
        } else {
          setProduct(LOCAL_PRODUCTS.find(p => p.id === id) || null)
        }
        setLoading(false)
      })
      .catch(() => {
        setProduct(LOCAL_PRODUCTS.find(p => p.id === id) || null)
        setLoading(false)
      })
  }, [id])

  return { product, loading }
}

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(buildApiUrl('/api/categories'))
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCategories(data)
        } else {
          setCategories(LOCAL_CATEGORIES)
        }
        setLoading(false)
      })
      .catch(() => { setCategories(LOCAL_CATEGORIES); setLoading(false) })
  }, [])
  return { categories, loading }
}

export function useBanners() {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch(buildApiUrl('/api/banners')).then(r => r.json()).then(data => { setBanners(data); setLoading(false) }).catch(() => { setBanners([]); setLoading(false) })
  }, [])
  return { banners, loading }
}
