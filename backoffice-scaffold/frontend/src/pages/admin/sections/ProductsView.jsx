import { useState } from 'react';
import { colors, card, input, button, badge, table, th, td } from '../../../styles/theme.js';
import ProductForm from './ProductForm.jsx';

export default function ProductsView({ products, categories, search, onSearch, onCreate, onUpdate, onDelete, onUpload }) {
  const [editing, setEditing] = useState(null); // product object or 'new' or null
  const [confirmDelete, setConfirmDelete] = useState(null);

  function categoryNames(product) {
    if (Array.isArray(product.categories) && product.categories.length && typeof product.categories[0] === 'object') {
      return product.categories.map((c) => c.name).join(', ');
    }
    return product.categorySlug || '—';
  }

  function exportCsv() {
    const rows = [
      ['Nom', 'SKU', 'Catégories', 'Prix', 'Prix barré', 'Stock', 'Visible', 'Épuisé'],
      ...products.map((p) => [p.name, p.sku || '', categoryNames(p), p.price, p.comparePrice || '', p.inventory ?? 0, p.isVisible ? 'oui' : 'non', p.isOutOfStock ? 'oui' : 'non']),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'products-export.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleDelete(product) {
    await onDelete(product._id);
    setConfirmDelete(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${colors.border}`, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>Produits</h2>
            <p style={{ fontSize: 13, color: colors.textSoft }}>{products.length} produit(s)</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...input, width: 220 }} value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Recherche nom/SKU" />
            <button onClick={exportCsv} style={button('ghost')}>Exporter CSV</button>
            <button onClick={() => setEditing('new')} style={button('primary')}>+ Nouveau produit</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Produit</th>
                <th style={th}>Catégories</th>
                <th style={th}>Prix</th>
                <th style={th}>Stock</th>
                <th style={th}>Ventes</th>
                <th style={th}>CA généré</th>
                <th style={th}>Statut</th>
                <th style={th} />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id}>
                  <td style={td}>
                    <p style={{ fontWeight: 600 }}>{product.name}</p>
                    {product.sku && <p style={{ fontSize: 12, color: colors.textSoft }}>SKU: {product.sku}</p>}
                  </td>
                  <td style={{ ...td, color: colors.textSoft }}>{categoryNames(product)}</td>
                  <td style={td}>
                    <span style={{ fontWeight: 700, color: colors.gold }}>{Number(product.price || 0).toLocaleString('fr-FR')} F CFA</span>
                    {product.comparePrice ? (
                      <div style={{ fontSize: 12, color: colors.textSoft, textDecoration: 'line-through' }}>{Number(product.comparePrice).toLocaleString('fr-FR')} F CFA</div>
                    ) : null}
                  </td>
                  <td style={td}>{product.inventory ?? 0}</td>
                  <td style={{ ...td, color: colors.textSoft }}>{product.unitsSold ?? 0} unité(s)</td>
                  <td style={{ ...td, fontWeight: 600 }}>{Number(product.revenue || 0).toLocaleString('fr-FR')} F CFA</td>
                  <td style={td}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={badge(product.isVisible ? 'success' : 'neutral')}>{product.isVisible ? 'Visible' : 'Masqué'}</span>
                      {product.isOutOfStock && <span style={badge('danger')}>Épuisé</span>}
                    </div>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setEditing(product)} style={button('ghost')}>Éditer</button>
                      <button onClick={() => onUpdate(product._id, { isVisible: !product.isVisible })} style={button('ghost')}>
                        {product.isVisible ? 'Masquer' : 'Rendre visible'}
                      </button>
                      {confirmDelete === product._id ? (
                        <>
                          <button onClick={() => handleDelete(product)} style={button('danger')}>Confirmer</button>
                          <button onClick={() => setConfirmDelete(null)} style={button('ghost')}>Non</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDelete(product._id)} style={button('danger')}>Supprimer</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && <tr><td style={td} colSpan={8}>Aucun produit.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <ProductForm
          product={editing === 'new' ? null : editing}
          categories={categories}
          onUpload={onUpload}
          onCancel={() => setEditing(null)}
          onSubmit={async (payload) => {
            if (editing === 'new') await onCreate(payload);
            else await onUpdate(editing._id, payload);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
