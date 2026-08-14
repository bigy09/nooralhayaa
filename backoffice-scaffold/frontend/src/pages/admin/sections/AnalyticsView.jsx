import { colors, card } from '../../../styles/theme.js';

const PAYMENT_LABELS = { wave: 'Wave', moov: 'Moov Money', mtn: 'MTN Money', orange: 'Orange Money' };
const STATUS_LABELS = { pending: 'En attente', confirmed: 'Confirmée', shipped: 'Expédiée', delivered: 'Livrée', cancelled: 'Annulée' };

function Panel({ title, rows, renderRow }) {
  return (
    <div style={{ ...card, padding: 18 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.text, marginBottom: 10 }}>{title}</h3>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(renderRow)}
        {rows.length === 0 && <li style={{ fontSize: 13, color: colors.textSoft }}>Aucune donnée.</li>}
      </ul>
    </div>
  );
}

export default function AnalyticsView({ analytics }) {
  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
      <Panel
        title="Répartition paiements"
        rows={analytics.paymentBreakdown}
        renderRow={(row) => (
          <li key={row._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: colors.text }}>
            <span>{PAYMENT_LABELS[row._id] || row._id}</span>
            <strong>{Number(row.amount || 0).toLocaleString('fr-FR')} F CFA ({row.count})</strong>
          </li>
        )}
      />
      <Panel
        title="Répartition statuts"
        rows={analytics.statusBreakdown}
        renderRow={(row) => (
          <li key={row._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: colors.text }}>
            <span>{STATUS_LABELS[row._id] || row._id}</span>
            <strong>{row.count}</strong>
          </li>
        )}
      />
      <div style={{ gridColumn: '1 / -1' }}>
        <Panel
          title="Top produits"
          rows={analytics.topProducts}
          renderRow={(row) => (
            <li key={row._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: colors.text }}>
              <span>{row._id}</span>
              <strong>{Number(row.revenue || 0).toLocaleString('fr-FR')} F CFA ({row.quantity})</strong>
            </li>
          )}
        />
      </div>
    </div>
  );
}
