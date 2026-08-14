import { colors, card } from '../../../styles/theme.js';

function MiniChart({ data, metric }) {
  const maxValue = Math.max(1, ...data.map((d) => Number(d[metric] || 0)));
  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
        {data.map((item) => {
          const value = Number(item[metric] || 0);
          const height = `${Math.max(6, Math.round((value / maxValue) * 100))}%`;
          return (
            <div key={item.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
              <div title={`${item.day}: ${value.toLocaleString('fr-FR')}`} style={{ width: '100%', borderRadius: '6px 6px 0 0', background: colors.gold, height }} />
              <span style={{ fontSize: 11, color: colors.textSoft }}>{item.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardView({ stats, chartTab, setChartTab }) {
  const tiles = [
    { label: 'Commandes du jour', value: stats.todayOrders },
    { label: 'En attente', value: stats.pendingOrders },
    { label: 'En cours', value: stats.inProgressOrders },
    { label: 'Ventes mensuelles', value: `${Number(stats.monthSales || 0).toLocaleString('fr-FR')} F CFA` },
    { label: 'Visites aujourd’hui', value: stats.todayPageViews || 0 },
    { label: 'Visites totales', value: stats.totalPageViews || 0 },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {tiles.map((tile) => (
          <div key={tile.label} style={{ ...card, padding: 20 }}>
            <p style={{ fontSize: 13, color: colors.textSoft, marginBottom: 8 }}>{tile.label}</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: colors.text }}>{tile.value}</p>
          </div>
        ))}
      </div>

      <div style={{ ...card, padding: 16, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>Semaine</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ key: 'sales', label: 'Ventes' }, { key: 'orders', label: 'Commandes' }, { key: 'views', label: 'Visites' }].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setChartTab(tab.key)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  fontSize: 12,
                  border: `1px solid ${colors.border}`,
                  background: chartTab === tab.key ? colors.text : 'transparent',
                  color: chartTab === tab.key ? '#fff' : colors.text,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <MiniChart data={stats.weekly} metric={chartTab} />
      </div>

      {stats.lowStockProducts?.length > 0 && (
        <div style={{ ...card, padding: 16, marginBottom: 24, borderColor: 'rgba(185,28,28,0.25)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 8 }}>⚠️ Stock faible</h2>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stats.lowStockProducts.map((p) => (
              <li key={p._id} style={{ fontSize: 13, color: colors.text, display: 'flex', justifyContent: 'space-between' }}>
                <span>{p.name}</span>
                <strong>{p.inventory} en stock</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={card}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>Commandes récentes</h2>
        </div>
        <ul>
          {stats.recentOrders.map((order) => (
            <li key={order._id} style={{ padding: '12px 18px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{order.orderNumber}</p>
                <p style={{ fontSize: 12, color: colors.textSoft }}>{order.customer?.name || 'Client'} · {order.customer?.phone || ''}</p>
              </div>
              <p style={{ fontSize: 13, fontWeight: 700, color: colors.gold }}>{Number(order.total || 0).toLocaleString('fr-FR')} F CFA</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
