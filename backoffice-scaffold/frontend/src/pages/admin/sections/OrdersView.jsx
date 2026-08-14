import { useMemo, useState } from 'react';
import { colors, card, badge, button, table, th, td } from '../../../styles/theme.js';

const STATUS_LABEL = {
  pending: { label: 'En attente', tone: 'warning' },
  confirmed: { label: 'Confirmée', tone: 'info' },
  shipped: { label: 'Expédiée', tone: 'info' },
  delivered: { label: 'Livrée', tone: 'success' },
  cancelled: { label: 'Annulée', tone: 'danger' },
};

const FILTERS = [
  { key: '', label: 'Toutes' },
  { key: 'pending', label: 'En attente' },
  { key: 'inProgress', label: 'En cours' },
  { key: 'delivered', label: 'Livrée' },
  { key: 'cancelled', label: 'Annulée' },
];

const PAYMENT_LABELS = { wave: 'Wave', moov: 'Moov Money', mtn: 'MTN Money', orange: 'Orange Money' };

export default function OrdersView({ orders, onUpdateStatus }) {
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState(null);

  const filtered = useMemo(() => {
    if (!filter) return orders;
    if (filter === 'inProgress') return orders.filter((o) => ['confirmed', 'shipped'].includes(o.status));
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const expandedOrder = filtered.find((o) => o._id === expanded);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <button
            key={f.key || 'all'}
            onClick={() => setFilter(f.key)}
            style={{ ...button(filter === f.key ? 'primary' : 'ghost'), padding: '6px 14px' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Commande</th>
                <th style={th}>Client</th>
                <th style={th}>Montant</th>
                <th style={th}>Statut</th>
                <th style={th} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const status = STATUS_LABEL[order.status] || STATUS_LABEL.pending;
                return (
                  <tr key={order._id}>
                    <td style={td}>
                      <p style={{ fontWeight: 600 }}>{order.orderNumber}</p>
                      <p style={{ fontSize: 12, color: colors.textSoft }}>{new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>
                    </td>
                    <td style={td}>
                      <p>{order.customer?.name}</p>
                      <p style={{ fontSize: 12, color: colors.textSoft }}>{order.customer?.phone}</p>
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: colors.gold }}>{Number(order.total || 0).toLocaleString('fr-FR')} F CFA</td>
                    <td style={td}><span style={badge(status.tone)}>{status.label}</span></td>
                    <td style={td}>
                      <button onClick={() => setExpanded(expanded === order._id ? null : order._id)} style={button('ghost')}>
                        {expanded === order._id ? 'Fermer' : 'Détails'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td style={td} colSpan={5}>Aucune commande.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {expandedOrder && (
        <div style={{ ...card, padding: 20, marginTop: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 12 }}>Détails de {expandedOrder.orderNumber}</h3>
          <p style={{ fontSize: 13, marginBottom: 12 }}>Paiement : <strong>{PAYMENT_LABELS[expandedOrder.paymentMethod] || expandedOrder.paymentMethod}</strong></p>

          <ul style={{ marginBottom: 12, fontSize: 13, color: colors.text }}>
            {(expandedOrder.items || []).map((item, idx) => (
              <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>{item.name} {item.size ? `(${item.size})` : ''} × {item.quantity}</span>
                <span>{Number((item.price || 0) * (item.quantity || 0)).toLocaleString('fr-FR')} F CFA</span>
              </li>
            ))}
          </ul>

          <select
            value={expandedOrder.status}
            onChange={(e) => onUpdateStatus(expandedOrder._id, e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${colors.border}`, marginBottom: 12 }}
          >
            <option value="pending">En attente</option>
            <option value="confirmed">Confirmée (décrémente le stock)</option>
            <option value="shipped">Expédiée</option>
            <option value="delivered">Livrée</option>
            <option value="cancelled">Annulée (restaure le stock si déjà confirmée)</option>
          </select>

          {expandedOrder.customer?.phone && (
            <a
              href={`https://wa.me/${(expandedOrder.customer.phone || '').replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(`Bonjour ${expandedOrder.customer?.name || ''}, votre commande ${expandedOrder.orderNumber} est en cours de traitement.`)}`}
              target="_blank"
              rel="noreferrer"
              style={{ ...button('success'), display: 'inline-block', textDecoration: 'none' }}
            >
              Contacter (WhatsApp)
            </a>
          )}
        </div>
      )}
    </div>
  );
}
