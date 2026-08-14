import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { colors } from '../../styles/theme.js';
import DashboardView from './sections/DashboardView.jsx';
import OrdersView from './sections/OrdersView.jsx';
import ProductsView from './sections/ProductsView.jsx';
import CategoriesView from './sections/CategoriesView.jsx';
import ClientsView from './sections/ClientsView.jsx';
import AnalyticsView from './sections/AnalyticsView.jsx';
import SettingsView from './sections/SettingsView.jsx';

const MENU = [
  { key: 'dashboard', label: 'Tableau de bord' },
  { key: 'orders', label: 'Commandes' },
  { key: 'products', label: 'Produits' },
  { key: 'categories', label: 'Catégories' },
  { key: 'clients', label: 'Clients' },
  { key: 'analytics', label: 'Analytique' },
  { key: 'settings', label: 'Paramètres' },
];

const EMPTY_STATS = { todayOrders: 0, todaySales: 0, monthSales: 0, pendingOrders: 0, inProgressOrders: 0, weekly: [], recentOrders: [], lowStockProducts: [], todayPageViews: 0, totalPageViews: 0 };
const EMPTY_ANALYTICS = { paymentBreakdown: [], statusBreakdown: [], topProducts: [] };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { authFetch, logoutAdmin } = useAuth();

  const [activeView, setActiveView] = useState('dashboard');
  const [chartTab, setChartTab] = useState('sales');
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState(EMPTY_STATS);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);
  const [auditLogs, setAuditLogs] = useState([]);
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadStats(), loadOrders(), loadCategories()]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (activeView === 'products') loadProducts();
    if (activeView === 'categories') loadCategories();
    if (activeView === 'clients') loadClients();
    if (activeView === 'analytics') loadAnalytics();
    if (activeView === 'settings') loadAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, productSearch]);

  async function loadStats() {
    const data = await authFetch('/api/admin/stats');
    setStats({ ...EMPTY_STATS, ...data });
  }
  async function loadOrders() {
    const data = await authFetch('/api/admin/orders?limit=50');
    setOrders(Array.isArray(data.orders) ? data.orders : []);
  }
  async function loadProducts() {
    const q = new URLSearchParams({ limit: '50' });
    if (productSearch.trim()) q.set('search', productSearch.trim());
    const data = await authFetch(`/api/admin/products?${q.toString()}`);
    setProducts(Array.isArray(data.products) ? data.products : []);
  }
  async function loadCategories() {
    const data = await authFetch('/api/admin/categories');
    setCategories(Array.isArray(data.categories) ? data.categories : []);
  }
  async function loadClients() {
    const data = await authFetch('/api/admin/clients');
    setClients(Array.isArray(data.clients) ? data.clients : []);
  }
  async function loadAnalytics() {
    const data = await authFetch('/api/admin/analytics');
    setAnalytics({ ...EMPTY_ANALYTICS, ...data });
  }
  async function loadAuditLogs() {
    const data = await authFetch('/api/admin/audit-logs?limit=20');
    setAuditLogs(Array.isArray(data.logs) ? data.logs : []);
  }

  async function updateOrderStatus(orderId, status) {
    await authFetch(`/api/admin/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await Promise.all([loadOrders(), loadStats()]);
  }

  async function createProduct(payload) {
    await authFetch('/api/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    await loadProducts();
  }
  async function updateProduct(id, patch) {
    await authFetch(`/api/admin/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    await loadProducts();
  }
  async function deleteProduct(id) {
    await authFetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    await loadProducts();
  }
  async function uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    return authFetch('/api/admin/uploads', { method: 'POST', body: formData });
  }

  async function createCategory(payload) {
    await authFetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    await loadCategories();
  }
  async function updateCategory(id, payload) {
    await authFetch(`/api/admin/categories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    await loadCategories();
  }
  async function deleteCategory(id, { reassignTo, force } = {}) {
    const q = new URLSearchParams();
    if (reassignTo) q.set('reassignTo', reassignTo);
    if (force) q.set('force', 'true');
    await authFetch(`/api/admin/categories/${id}${q.toString() ? `?${q}` : ''}`, { method: 'DELETE' });
    await Promise.all([loadCategories(), loadProducts()]);
  }

  async function changePassword(form) {
    await authFetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setTimeout(async () => {
      await logoutAdmin();
      navigate('/admin/login');
    }, 1000);
  }

  if (loading) {
    return <div style={{ minHeight: '100vh', background: colors.bg, paddingTop: 120, textAlign: 'center', color: colors.textSoft }}>Chargement du back office…</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(180deg, ${colors.bg}, ${colors.bg2})` }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', borderBottom: `1px solid ${colors.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: colors.text }}>Back Office — Noor Al Hayaa</h1>
            <p style={{ fontSize: 13, color: colors.textSoft }}>Service admin séparé</p>
          </div>
          <button
            onClick={async () => { await logoutAdmin(); navigate('/admin/login'); }}
            style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#fee2e2', color: '#b91c1c', fontWeight: 600, cursor: 'pointer' }}
          >
            Déconnexion
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px', display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>
        <aside style={{ background: '#fff', border: `1px solid ${colors.border}`, borderRadius: 14, padding: 12 }}>
          {MENU.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveView(item.key)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 10,
                border: 'none',
                marginBottom: 4,
                fontSize: 14,
                cursor: 'pointer',
                background: activeView === item.key ? colors.bg2 : 'transparent',
                color: colors.text,
                fontWeight: activeView === item.key ? 700 : 500,
              }}
            >
              {item.label}
            </button>
          ))}
        </aside>

        <section>
          {activeView === 'dashboard' && <DashboardView stats={stats} chartTab={chartTab} setChartTab={setChartTab} />}
          {activeView === 'orders' && <OrdersView orders={orders} onUpdateStatus={updateOrderStatus} />}
          {activeView === 'products' && (
            <ProductsView
              products={products}
              categories={categories}
              search={productSearch}
              onSearch={setProductSearch}
              onCreate={createProduct}
              onUpdate={updateProduct}
              onDelete={deleteProduct}
              onUpload={uploadImage}
            />
          )}
          {activeView === 'categories' && (
            <CategoriesView categories={categories} onCreate={createCategory} onUpdate={updateCategory} onDelete={deleteCategory} />
          )}
          {activeView === 'clients' && <ClientsView clients={clients} />}
          {activeView === 'analytics' && <AnalyticsView analytics={analytics} />}
          {activeView === 'settings' && <SettingsView auditLogs={auditLogs} onChangePassword={changePassword} />}
        </section>
      </main>
    </div>
  );
}
