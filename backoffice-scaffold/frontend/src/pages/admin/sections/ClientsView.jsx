import { colors, card, table, th, td } from '../../../styles/theme.js';

export default function ClientsView({ clients }) {
  return (
    <div style={{ ...card, overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px', borderBottom: `1px solid ${colors.border}` }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>Clients</h2>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Email</th>
              <th style={th}>Inscription</th>
              <th style={th}>Commandes</th>
              <th style={th}>Dépense totale</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td style={td}>{client.email}</td>
                <td style={{ ...td, color: colors.textSoft }}>{new Date(client.createdAt).toLocaleDateString('fr-FR')}</td>
                <td style={{ ...td, color: colors.textSoft }}>{client.ordersCount}</td>
                <td style={{ ...td, fontWeight: 700, color: colors.gold }}>{Number(client.totalSpent || 0).toLocaleString('fr-FR')} F CFA</td>
              </tr>
            ))}
            {clients.length === 0 && <tr><td style={td} colSpan={4}>Aucun client.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
