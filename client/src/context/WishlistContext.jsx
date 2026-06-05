import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react'

const WishlistContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'TOGGLE': {
      const exists = state.items.some((i) => i.id === action.product.id)
      return {
        ...state,
        items: exists
          ? state.items.filter((i) => i.id !== action.product.id)
          : [...state.items, action.product],
      }
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) }
    case 'CLEAR':
      return { ...state, items: [] }
    case 'SET':
      return { ...state, items: action.items }
    default:
      return state
  }
}

export function WishlistProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { items: [] })
  const hydrated = useRef(false)

  const toggle = useCallback((product) => dispatch({ type: 'TOGGLE', product }), [])
  const remove = useCallback((id) => dispatch({ type: 'REMOVE', id }), [])
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), [])
  const isLiked = useCallback((id) => state.items.some((i) => i.id === id), [state.items])

  useEffect(() => {
    let alive = true
    fetch('/api/wishlist')
      .then((response) => response.json())
      .then((data) => {
        if (!alive || !Array.isArray(data.items)) return
        dispatch({ type: 'SET', items: data.items })
        hydrated.current = true
      })
      .catch(() => {
        hydrated.current = true
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!hydrated.current) return
    fetch('/api/wishlist', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: state.items }),
    }).catch(() => {})
  }, [state.items])

  return (
    <WishlistContext.Provider value={{ items: state.items, count: state.items.length, toggle, remove, clear, isLiked }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider')
  return ctx
}
