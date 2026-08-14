import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react'
import { buildApiUrl } from '../utils/api'
import { getSessionId } from '../utils/session'

const CartContext = createContext(null)

function reducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const key = `${action.item.id}-${action.item.selectedSize}`
      const existing = state.items.find(i => i.key === key)
      if (existing) {
        return { ...state, items: state.items.map(i => i.key === key ? { ...i, qty: i.qty + 1 } : i) }
      }
      return { ...state, items: [...state.items, { ...action.item, key, qty: 1 }] }
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter(i => i.key !== action.key) }
    case 'UPDATE_QTY':
      return { ...state, items: state.items.map(i => i.key === action.key ? { ...i, qty: Math.max(1, action.qty) } : i) }
    case 'CLEAR':
      return { ...state, items: [] }
    case 'SET':
      return { ...state, items: action.items }
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, { items: [] })
  const hydrated = useRef(false)

  const add = useCallback((item) => dispatch({ type: 'ADD', item }), [])
  const remove = useCallback((key) => dispatch({ type: 'REMOVE', key }), [])
  const updateQty = useCallback((key, qty) => dispatch({ type: 'UPDATE_QTY', key, qty }), [])
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), [])

  useEffect(() => {
    let alive = true
    fetch(buildApiUrl('/api/cart'), {
      headers: {
        'x-session-id': getSessionId(),
      },
    })
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
    fetch(buildApiUrl('/api/cart'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': getSessionId(),
      },
      body: JSON.stringify({ items: state.items }),
    }).catch(() => {})
  }, [state.items])

  const total = state.items.reduce((sum, i) => sum + i.price * i.qty, 0)
  const count = state.items.reduce((sum, i) => sum + i.qty, 0)

  return (
    <CartContext.Provider value={{ items: state.items, total, count, add, remove, updateQty, clear }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
