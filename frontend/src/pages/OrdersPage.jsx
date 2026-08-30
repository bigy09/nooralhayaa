import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock3, MessageCircle, Package, Smartphone, Truck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { formatPrice } from '../utils/payment'

function statusStyle(status) {
  const map = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
    shipped: 'bg-violet-100 text-violet-700 border-violet-200',
    delivered: 'bg-gray-100 text-gray-700 border-gray-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
  }
  return map[status] || 'bg-gray-100 text-gray-700 border-gray-200'
}

function statusLabel(status) {
  const map = {
    pending: 'En attente de paiement',
    confirmed: 'En cours',
    shipped: 'Expediee',
    delivered: 'Livree',
    cancelled: 'Annulee',
  }
  return map[status] || status
}

const CANCELLATION_WINDOW_MS = 10 * 60 * 1000
// Rafraîchit "mes commandes" périodiquement pour refléter les changements de
// statut faits côté admin sans que le client ait à recharger la page.
const POLL_INTERVAL_MS = 20 * 1000

function useCountdown(target) {
  const [remaining, setRemaining] = useState(() => target - Date.now())
  useEffect(() => {
    const interval = setInterval(() => setRemaining(target - Date.now()), 1000)
    return () => clearInterval(interval)
  }, [target])
  return remaining
}

function CancelOrderButton({ order, onCancelled }) {
  const { authFetch } = useAuth()
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const deadline = new Date(order.createdAt).getTime() + CANCELLATION_WINDOW_MS
  const remaining = useCountdown(deadline)

  if (order.status !== 'pending' || remaining <= 0) return null

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)

  async function handleCancel() {
    setCancelling(true)
    setError('')
    try {
      await authFetch(`/api/orders/${order._id || order.id}/cancel`, { method: 'POST' })
      onCancelled(order._id || order.id)
    } catch (err) {
      setError(err.message || "Impossible d'annuler la commande.")
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="mt-3 flex flex-col items-end gap-1">
      <button
        onClick={handleCancel}
        disabled={cancelling}
        className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-60"
      >
        Annuler la commande ({minutes}:{String(seconds).padStart(2, '0')})
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function paymentLabel(method) {
  if (method === 'wave') return { text: 'Wave', icon: Smartphone }
  if (method === 'moov') return { text: 'Moov Money', icon: Smartphone }
  if (method === 'mtn') return { text: 'MTN Money', icon: Smartphone }
  if (method === 'orange') return { text: 'Orange Money', icon: Smartphone }
  return { text: 'Mobile Money', icon: MessageCircle }
}

export default function OrdersPage() {
  const { authFetch } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    function load() {
      authFetch('/api/orders/mine')
        .then((data) => {
          if (cancelled) return
          setOrders(Array.isArray(data) ? [...data].reverse() : [])
          setLoading(false)
        })
        .catch(() => {
          if (!cancelled) setLoading(false)
        })
    }

    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [authFetch])

  function handleCancelled(orderId) {
    setOrders((prev) => prev.map((order) => ((order._id || order.id) === orderId ? { ...order, status: 'cancelled' } : order)))
  }

  const stats = useMemo(() => {
    const pending = orders.filter((order) => order.status === 'pending').length
    const confirmed = orders.filter((order) => order.status === 'confirmed').length
    const total = orders.reduce((sum, order) => sum + (Number(order.total) || 0), 0)
    return { pending, confirmed, total }
  }, [orders])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9EAE1] pt-32 pb-20">
        <div className="max-w-6xl mx-auto px-4 space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-[1.5rem] bg-white animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9EAE1] pt-32 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[#8C6239]/70 hover:text-[#C5A059] transition-colors mb-8">
          <ArrowLeft size={15} /> Retour a l'accueil
        </Link>

        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#C5A059] font-semibold mb-2">Historique</p>
          <h1 className="text-3xl md:text-4xl font-semibold text-[#8C6239]">Mes commandes</h1>
        </div>

        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#C5A059]/15 bg-white px-4 py-3 shadow-[0_10px_25px_rgba(140,98,57,0.08)]">
            <p className="text-xs uppercase tracking-[0.14em] text-[#8C6239]/55">Commandes</p>
            <p className="mt-1 text-2xl font-semibold text-[#8C6239]">{orders.length}</p>
          </div>
          <div className="rounded-2xl border border-[#C5A059]/15 bg-white px-4 py-3 shadow-[0_10px_25px_rgba(140,98,57,0.08)]">
            <p className="text-xs uppercase tracking-[0.14em] text-[#8C6239]/55">En attente</p>
            <p className="mt-1 text-2xl font-semibold text-[#8C6239]">{stats.pending}</p>
          </div>
          <div className="rounded-2xl border border-[#C5A059]/15 bg-white px-4 py-3 shadow-[0_10px_25px_rgba(140,98,57,0.08)]">
            <p className="text-xs uppercase tracking-[0.14em] text-[#8C6239]/55">Total depense</p>
            <p className="mt-1 text-2xl font-semibold text-[#C5A059]">{formatPrice(stats.total)}</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-[1.9rem] border border-[#C5A059]/18 bg-white px-6 py-16 text-center shadow-[0_20px_45px_rgba(140,98,57,0.10)]">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#F9EAE1]">
              <Package size={30} className="text-[#C5A059]" />
            </div>
            <h2 className="text-xl font-semibold text-[#8C6239]">Aucune commande enregistree</h2>
            <p className="mt-2 text-sm text-[#8C6239]/65">Tes commandes apparaitront ici des la premiere validation.</p>
            <Link to="/shop" className="mt-7 inline-flex rounded-full bg-[#8C6239] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#C5A059]">
              Decouvrir la boutique
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {orders.map((order, index) => {
              const payment = paymentLabel(order.paymentMethod)
              return (
                <motion.li
                  key={order._id || order.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.05 }}
                  className="rounded-[1.75rem] border border-[#C5A059]/18 bg-white p-6 shadow-[0_14px_35px_rgba(140,98,57,0.09)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#f1e2d7] pb-4">
                    <div>
                      <p className="text-sm font-semibold text-[#8C6239]">Commande {order.orderNumber || `#${order.id}`}</p>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[#8C6239]/55">
                        <Clock3 size={12} />
                        {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                      <CancelOrderButton order={order} onCancelled={handleCancelled} />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
                    <ul className="space-y-2">
                      {order.items.map((item, idx) => {
                        const size = item.size || item.selectedSize || 'N/A'
                        const quantity = Number(item.quantity ?? item.qty ?? 1)
                        return (
                        <li key={item.key || item.productId || idx} className="flex items-center justify-between text-sm">
                          <span className="text-[#8C6239]/75">{item.name} · {size} x{quantity}</span>
                          <span className="font-medium text-[#8C6239]">{formatPrice(item.price * quantity)}</span>
                        </li>
                        )
                      })}
                    </ul>

                    <div className="rounded-2xl border border-[#C5A059]/15 bg-[#fffaf5] px-4 py-3 lg:min-w-[210px]">
                      <p className="text-xs uppercase tracking-[0.12em] text-[#8C6239]/55">Client</p>
                      <p className="mt-1 text-sm font-semibold text-[#8C6239]">{order.customer.name}</p>
                      <p className="text-xs text-[#8C6239]/65">{order.customer.phone}</p>

                      <p className="mt-3 text-xs uppercase tracking-[0.12em] text-[#8C6239]/55">Paiement</p>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-[#8C6239]">
                        <payment.icon size={13} className="text-[#C5A059]" /> {payment.text}
                      </p>

                      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#8C6239]/55">
                        <Truck size={12} className="text-[#C5A059]" /> Livraison suivie
                      </p>

                      <div className="mt-4 border-t border-[#eedccf] pt-3 flex items-center justify-between text-sm font-semibold">
                        <span className="text-[#8C6239]">Total</span>
                        <span className="text-[#C5A059]">{formatPrice(order.total)}</span>
                      </div>
                    </div>
                  </div>
                </motion.li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
