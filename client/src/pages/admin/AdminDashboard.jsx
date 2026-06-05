import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  ChevronDown,
  Clock,
  LogOut,
  Package,
  Search,
  Settings,
  TrendingUp,
  Users,
  MessageCircle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  confirmed: { label: 'Confirmee', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  shipped: { label: 'Expediee', color: 'bg-purple-100 text-purple-800', icon: Package },
  delivered: { label: 'Livree', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  cancelled: { label: 'Annulee', color: 'bg-red-100 text-red-800', icon: AlertCircle },
}

const PAYMENT_LABELS = {
  wave: 'Wave',
  moov: 'Moov Money',
  mtn: 'MTN Money',
  orange: 'Orange Money',
}

const MENU = [
  { key: 'dashboard', label: 'Tableau de bord', icon: TrendingUp },
  { key: 'orders', label: 'Ordres', icon: Package },
  { key: 'products', label: 'Produits', icon: BarChart3 },
  { key: 'clients', label: 'Clients', icon: Users },
  { key: 'discussions', label: 'Discussions', icon: MessageCircle },
  { key: 'analytics', label: 'Analytique', icon: BarChart3 },
  { key: 'settings', label: 'Parametres', icon: Settings },
]

function MiniChart({ data, metric }) {
  const maxValue = Math.max(1, ...data.map((d) => Number(d[metric] || 0)) )
  return (
    <div className="rounded-xl border border-[#C5A059]/15 bg-white p-4 shadow-sm">
      <div className="flex items-end gap-2 h-44">
        {data.map((item) => {
          const value = Number(item[metric] || 0)
          const h = `${Math.max(10, Math.round((value / maxValue) * 100))}%`
          return (
            <div key={`${item.day}-${metric}`} className="flex-1 flex flex-col items-center justify-end gap-2">
              <div title={`${item.day}: ${value.toLocaleString('fr-FR')}`} className="w-full rounded-t-md bg-[#C5A059]/85" style={{ height: h }} />
              <span className="text-[11px] text-[#8C6239]/60">{item.day}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { authFetch, logoutAdmin } = useAuth()

  const [activeView, setActiveView] = useState('dashboard')
  const [chartTab, setChartTab] = useState('sales')
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState({ todayOrders: 0, todaySales: 0, monthSales: 0, weekly: [], recentOrders: [] })
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [clients, setClients] = useState([])
  const [discussions, setDiscussions] = useState([])
  const [analytics, setAnalytics] = useState({ paymentBreakdown: [], statusBreakdown: [], topProducts: [] })
  const [auditLogs, setAuditLogs] = useState([])
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' })
  const [passwordFeedback, setPasswordFeedback] = useState({ type: '', message: '' })

  const [expandedOrder, setExpandedOrder] = useState(null)
  const [orderFilter, setOrderFilter] = useState('')
  const [productSearch, setProductSearch] = useState('')

  useEffect(() => {
    initLoad()
  }, [])

  async function initLoad() {
    setLoading(true)
    try {
      await Promise.all([loadStats(), loadOrders()])
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    const data = await authFetch('/api/admin/stats')
    setStats({
      todayOrders: data.todayOrders || 0,
      todaySales: data.todaySales || 0,
      monthSales: data.monthSales || 0,
      weekly: Array.isArray(data.weekly) ? data.weekly : [],
      recentOrders: Array.isArray(data.recentOrders) ? data.recentOrders : [],
    })
  }

  async function loadOrders() {
    const data = await authFetch('/api/admin/orders?limit=50')
    setOrders(Array.isArray(data.orders) ? data.orders : [])
  }

  async function loadProducts() {
    const q = new URLSearchParams({ limit: '50' })
    if (productSearch.trim()) q.set('search', productSearch.trim())
    const data = await authFetch(`/api/admin/products?${q.toString()}`)
    setProducts(Array.isArray(data.products) ? data.products : [])
  }

  async function loadClients() {
    const data = await authFetch('/api/admin/clients')
    setClients(Array.isArray(data.clients) ? data.clients : [])
  }

  async function loadDiscussions() {
    const data = await authFetch('/api/admin/discussions')
    setDiscussions(Array.isArray(data.discussions) ? data.discussions : [])
  }

  async function loadAnalytics() {
    const data = await authFetch('/api/admin/analytics')
    setAnalytics({
      paymentBreakdown: Array.isArray(data.paymentBreakdown) ? data.paymentBreakdown : [],
      statusBreakdown: Array.isArray(data.statusBreakdown) ? data.statusBreakdown : [],
      topProducts: Array.isArray(data.topProducts) ? data.topProducts : [],
    })
  }

  async function loadAuditLogs() {
    const data = await authFetch('/api/admin/audit-logs?limit=20')
    setAuditLogs(Array.isArray(data.logs) ? data.logs : [])
  }

  useEffect(() => {
    if (activeView === 'products') loadProducts()
    if (activeView === 'clients') loadClients()
    if (activeView === 'discussions') loadDiscussions()
    if (activeView === 'analytics') loadAnalytics()
    if (activeView === 'settings') loadAuditLogs()
  }, [activeView, productSearch])

  async function changePassword(event) {
    event.preventDefault()
    setPasswordFeedback({ type: '', message: '' })

    try {
      await authFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
      })

      setPasswordForm({ currentPassword: '', newPassword: '' })
      setPasswordFeedback({ type: 'success', message: 'Mot de passe modifie. Reconnectez-vous.' })

      setTimeout(async () => {
        await logoutAdmin()
        navigate('/admin/login')
      }, 1000)
    } catch (error) {
      setPasswordFeedback({ type: 'error', message: error.message || 'Erreur lors du changement de mot de passe' })
    }
  }

  async function updateOrderStatus(orderId, newStatus) {
    await authFetch(`/api/admin/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    await Promise.all([loadOrders(), loadStats()])
  }

  async function updateProduct(productId, patch) {
    await authFetch(`/api/admin/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    await loadProducts()
  }

  function exportProducts() {
    const rows = [
      ['Nom', 'Categorie', 'Prix', 'Inventaire', 'Visible', 'Epuisé'],
      ...products.map((p) => [p.name, p.categorySlug, p.price, p.inventory ?? 0, p.isVisible ? 'oui' : 'non', p.isOutOfStock ? 'oui' : 'non']),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'products-export.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const filteredOrders = useMemo(() => (orderFilter ? orders.filter((o) => o.status === orderFilter) : orders), [orders, orderFilter])

  if (loading) {
    return <div className="min-h-screen bg-[#F9EAE1] pt-32 px-6 text-[#8C6239]/70">Chargement dashboard admin...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9EAE1] to-[#F0E1D8]">
      <header className="sticky top-0 z-40 border-b border-[#C5A059]/20 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#8C6239]">Tableau de Bord Admin</h1>
            <p className="text-sm text-[#8C6239]/60">Noor Al Hayaa</p>
          </div>
          <button
            onClick={() => {
              logoutAdmin()
              navigate('/')
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors text-sm font-medium"
          >
            <LogOut size={16} /> Deconnexion
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-[250px_1fr] gap-6">
        <aside className="rounded-xl border border-[#C5A059]/15 bg-white p-4 h-fit">
          {MENU.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveView(item.key)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${activeView === item.key ? 'bg-[#F4DFD1] text-[#8C6239] font-semibold' : 'text-[#8C6239]/70 hover:bg-[#F9EAE1]'}`}
            >
              <span className="inline-flex items-center gap-2">
                <item.icon size={14} /> {item.label}
              </span>
            </button>
          ))}
        </aside>

        <section>
          {(activeView === 'dashboard' || activeView === 'orders') && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                { label: 'Commandes du jour', value: stats.todayOrders, icon: Package, color: 'text-[#C5A059]' },
                { label: 'Ventes du jour', value: `${stats.todaySales.toLocaleString('fr-FR')} F CFA`, icon: Clock, color: 'text-yellow-600' },
                { label: 'Ventes mensuelles', value: `${stats.monthSales.toLocaleString('fr-FR')} F CFA`, icon: TrendingUp, color: 'text-green-600' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-[#C5A059]/15 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-[#8C6239]/60">{stat.label}</p>
                    <stat.icon size={20} className={stat.color} />
                  </div>
                  <p className="text-3xl font-bold text-[#8C6239]">{stat.value}</p>
                </div>
              ))}
            </div>
          )}

          {activeView === 'dashboard' && (
            <>
              <div className="rounded-xl border border-[#C5A059]/15 bg-white p-4 shadow-sm mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-[#8C6239]">Semaine</h2>
                  <div className="flex items-center gap-2">
                    {[
                      { key: 'sales', label: 'Ventes' },
                      { key: 'orders', label: 'Ordres' },
                      { key: 'views', label: 'Vues' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setChartTab(tab.key)}
                        className={`px-3 py-1.5 rounded-full text-xs ${chartTab === tab.key ? 'bg-[#8C6239] text-white' : 'border border-[#C5A059]/25 text-[#8C6239]'}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
                <MiniChart data={stats.weekly} metric={chartTab} />
              </div>

              <div className="rounded-xl border border-[#C5A059]/15 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#F9EAE1]">
                  <h2 className="text-lg font-semibold text-[#8C6239]">Ordres recents</h2>
                </div>
                <ul className="divide-y divide-[#F9EAE1]">
                  {stats.recentOrders.map((order) => (
                    <li key={order._id} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#8C6239]">{order.orderNumber}</p>
                        <p className="text-xs text-[#8C6239]/55">{order.customer?.name || 'Client'} · {order.customer?.phone || ''}</p>
                      </div>
                      <p className="text-sm font-semibold text-[#C5A059]">{Number(order.total || 0).toLocaleString('fr-FR')} F CFA</p>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {activeView === 'orders' && (
            <>
              <div className="mb-4 flex items-center gap-2">
                {['', 'pending', 'confirmed', 'shipped', 'cancelled'].map((status) => (
                  <button
                    key={status || 'all'}
                    onClick={() => setOrderFilter(status)}
                    className={`px-3 py-1.5 rounded-full text-xs ${orderFilter === status ? 'bg-[#8C6239] text-white' : 'bg-white border border-[#C5A059]/25 text-[#8C6239]'}`}
                  >
                    {status === '' ? 'Tous' : status}
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-[#C5A059]/15 bg-white shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#F9EAE1]"><h2 className="text-lg font-semibold text-[#8C6239]">Liste des commandes</h2></div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F9EAE1]/30">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#8C6239]">Commande</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#8C6239]">Client</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#8C6239]">Montant</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#8C6239]">Statut</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[#8C6239]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F9EAE1]">
                      {filteredOrders.map((order) => {
                        const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
                        const isExpanded = expandedOrder === order._id
                        return (
                          <tr key={order._id} className="hover:bg-[#F9EAE1]/20 transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-[#8C6239]">{order.orderNumber}</p>
                              <p className="text-xs text-[#8C6239]/50 mt-1">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>
                            </td>
                            <td className="px-6 py-4"><p className="text-sm font-medium text-[#8C6239]">{order.customer?.name}</p><p className="text-xs text-[#8C6239]/50 mt-1">{order.customer?.phone}</p></td>
                            <td className="px-6 py-4"><p className="text-sm font-semibold text-[#C5A059]">{Number(order.total || 0).toLocaleString('fr-FR')} F CFA</p></td>
                            <td className="px-6 py-4"><div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${statusConfig.color}`}><statusConfig.icon size={14} />{statusConfig.label}</div></td>
                            <td className="px-6 py-4"><button onClick={() => setExpandedOrder(isExpanded ? null : order._id)} className="text-[#C5A059] hover:text-[#8C6239] transition-colors"><ChevronDown size={18} /></button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {expandedOrder && (
                <div className="mt-6 rounded-xl border border-[#C5A059]/15 bg-white shadow-sm p-6">
                  {filteredOrders.filter((o) => o._id === expandedOrder).map((order) => (
                    <div key={order._id}>
                      <h3 className="text-lg font-semibold text-[#8C6239] mb-4">Details de {order.orderNumber}</h3>
                      <div className="mb-4 text-sm text-[#8C6239]">Paiement: <strong>{PAYMENT_LABELS[order.paymentMethod] || order.paymentMethod}</strong></div>
                      <select value={order.status} onChange={(e) => updateOrderStatus(order._id, e.target.value)} className="w-full px-4 py-2 rounded-lg border border-[#C5A059]/25 bg-white text-sm text-[#8C6239] focus:outline-none focus:border-[#C5A059]">
                        <option value="pending">En attente</option>
                        <option value="confirmed">Confirmee</option>
                        <option value="shipped">Expediee</option>
                        <option value="delivered">Livree</option>
                        <option value="cancelled">Annulee</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeView === 'products' && (
            <div className="rounded-xl border border-[#C5A059]/15 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F9EAE1] flex flex-wrap gap-3 items-center justify-between">
                <h2 className="text-lg font-semibold text-[#8C6239]">Produits</h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8C6239]/55" />
                    <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Recherche nom/categorie" className="rounded-lg border border-[#C5A059]/25 py-2 pl-8 pr-3 text-sm" />
                  </div>
                  <button onClick={exportProducts} className="px-3 py-2 rounded-lg bg-[#8C6239] text-white text-xs font-semibold">Exporter</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F9EAE1]/30">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#8C6239]">Produit</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#8C6239]">Categorie</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#8C6239]">Prix</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#8C6239]">Inventaire</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#8C6239]">Visible</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#8C6239]">Epuisé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F9EAE1]">
                    {products.map((product) => (
                      <tr key={product._id}>
                        <td className="px-6 py-4 text-sm text-[#8C6239] font-medium">{product.name}</td>
                        <td className="px-6 py-4 text-sm text-[#8C6239]/75">{product.categorySlug}</td>
                        <td className="px-6 py-4 text-sm text-[#C5A059] font-semibold">{Number(product.price || 0).toLocaleString('fr-FR')} F CFA</td>
                        <td className="px-6 py-4 text-sm text-[#8C6239]/75">{product.inventory ?? 0}</td>
                        <td className="px-6 py-4"><button onClick={() => updateProduct(product._id, { isVisible: !product.isVisible })} className={`px-2.5 py-1 rounded-full text-xs ${product.isVisible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{product.isVisible ? 'Visible' : 'Masque'}</button></td>
                        <td className="px-6 py-4"><button onClick={() => updateProduct(product._id, { isOutOfStock: !product.isOutOfStock })} className={`px-2.5 py-1 rounded-full text-xs ${product.isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{product.isOutOfStock ? 'Oui' : 'Non'}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeView === 'clients' && (
            <div className="rounded-xl border border-[#C5A059]/15 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F9EAE1]"><h2 className="text-lg font-semibold text-[#8C6239]">Clients</h2></div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F9EAE1]/30">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#8C6239]">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#8C6239]">Inscription</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#8C6239]">Commandes</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[#8C6239]">Depense</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F9EAE1]">
                    {clients.map((client) => (
                      <tr key={client.id}>
                        <td className="px-6 py-4 text-sm text-[#8C6239]">{client.email}</td>
                        <td className="px-6 py-4 text-sm text-[#8C6239]/75">{new Date(client.createdAt).toLocaleDateString('fr-FR')}</td>
                        <td className="px-6 py-4 text-sm text-[#8C6239]/75">{client.ordersCount}</td>
                        <td className="px-6 py-4 text-sm text-[#C5A059] font-semibold">{Number(client.totalSpent || 0).toLocaleString('fr-FR')} F CFA</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeView === 'discussions' && (
            <div className="rounded-xl border border-[#C5A059]/15 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F9EAE1]"><h2 className="text-lg font-semibold text-[#8C6239]">Discussions clients</h2></div>
              <ul className="divide-y divide-[#F9EAE1]">
                {discussions.map((d) => (
                  <li key={d.id} className="px-6 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#8C6239]">{d.customerName} · {d.orderNumber}</p>
                      <p className="text-xs text-[#8C6239]/60">{d.customerPhone} · {Number(d.total || 0).toLocaleString('fr-FR')} F CFA</p>
                    </div>
                    {d.whatsappLink ? (
                      <a href={d.whatsappLink} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-full text-xs bg-[#25D366] text-white">Contacter</a>
                    ) : <span className="text-xs text-[#8C6239]/40">Sans numero</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {activeView === 'analytics' && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-[#C5A059]/15 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-[#8C6239] mb-3">Repartition paiements</h3>
                <ul className="space-y-2">
                  {analytics.paymentBreakdown.map((row) => (
                    <li key={row._id} className="text-sm text-[#8C6239] flex justify-between">
                      <span>{PAYMENT_LABELS[row._id] || row._id}</span>
                      <span className="font-semibold">{Number(row.amount || 0).toLocaleString('fr-FR')} F CFA ({row.count})</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-[#C5A059]/15 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-[#8C6239] mb-3">Repartition statuts</h3>
                <ul className="space-y-2">
                  {analytics.statusBreakdown.map((row) => (
                    <li key={row._id} className="text-sm text-[#8C6239] flex justify-between">
                      <span>{STATUS_CONFIG[row._id]?.label || row._id}</span>
                      <span className="font-semibold">{row.count}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-[#C5A059]/15 bg-white p-5 shadow-sm md:col-span-2">
                <h3 className="text-base font-semibold text-[#8C6239] mb-3">Top produits</h3>
                <ul className="space-y-2">
                  {analytics.topProducts.map((row) => (
                    <li key={row._id} className="text-sm text-[#8C6239] flex justify-between">
                      <span>{row._id}</span>
                      <span className="font-semibold">{Number(row.revenue || 0).toLocaleString('fr-FR')} F CFA ({row.quantity})</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeView === 'settings' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-[#C5A059]/15 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#8C6239] mb-2">Securite admin</h2>
                <p className="text-sm text-[#8C6239]/65 mb-4">Changer le mot de passe invalide toutes les sessions actives.</p>

                <form onSubmit={changePassword} className="space-y-3 max-w-md">
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Mot de passe actuel"
                    className="w-full px-3 py-2 rounded-lg border border-[#C5A059]/25 text-sm"
                    required
                  />
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Nouveau mot de passe (8+ caracteres)"
                    className="w-full px-3 py-2 rounded-lg border border-[#C5A059]/25 text-sm"
                    minLength={8}
                    required
                  />
                  <button type="submit" className="px-4 py-2 rounded-lg bg-[#8C6239] text-white text-sm font-semibold">Mettre a jour</button>
                  {passwordFeedback.message && (
                    <p className={`text-sm ${passwordFeedback.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                      {passwordFeedback.message}
                    </p>
                  )}
                </form>
              </div>

              <div className="rounded-xl border border-[#C5A059]/15 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#8C6239] mb-2">Journal d'audit</h2>
                <p className="text-sm text-[#8C6239]/65 mb-4">Dernieres actions sensibles effectuees par les admins.</p>
                <ul className="divide-y divide-[#F9EAE1]">
                  {auditLogs.map((log) => (
                    <li key={log._id} className="py-3">
                      <p className="text-sm font-medium text-[#8C6239]">{log.action}</p>
                      <p className="text-xs text-[#8C6239]/65">
                        {new Date(log.createdAt).toLocaleString('fr-FR')} · {log.actorEmail} · {log.targetType}:{log.targetId}
                      </p>
                    </li>
                  ))}
                  {auditLogs.length === 0 && <li className="py-2 text-sm text-[#8C6239]/55">Aucune entree.</li>}
                </ul>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
