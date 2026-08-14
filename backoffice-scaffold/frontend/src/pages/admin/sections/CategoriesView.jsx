import { useState } from 'react';
import { colors, card, input, button, table, th, td } from '../../../styles/theme.js';

export default function CategoriesView({ categories, onCreate, onUpdate, onDelete }) {
  const [form, setForm] = useState({ name: '', description: '', image: '', parent: '' });
  const [editingId, setEditingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  // Suppression bloquée par l'API (409) : on garde le conflit en mémoire pour proposer
  // la réaffectation ou la suppression forcée plutôt que de juste afficher une erreur.
  const [blockedDeletion, setBlockedDeletion] = useState(null); // { category, productCount }

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback({ type: '', message: '' });
    try {
      if (editingId) {
        await onUpdate(editingId, { ...form, parent: form.parent || null });
        setEditingId(null);
      } else {
        await onCreate({ ...form, parent: form.parent || null });
      }
      setForm({ name: '', description: '', image: '', parent: '' });
      setFeedback({ type: 'success', message: 'Enregistré.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Erreur' });
    }
  }

  function startEdit(category) {
    setEditingId(category._id);
    setForm({ name: category.name, description: category.description || '', image: category.image || '', parent: category.parent || '' });
  }

  async function attemptDelete(category) {
    try {
      await onDelete(category._id);
      setBlockedDeletion(null);
    } catch (error) {
      if (error.productCount) {
        setBlockedDeletion({ category, productCount: error.productCount });
      } else {
        setFeedback({ type: 'error', message: error.message || 'Erreur lors de la suppression' });
      }
    }
  }

  async function resolveBlockedDeletion(mode, reassignTo) {
    const { category } = blockedDeletion;
    try {
      if (mode === 'reassign') await onDelete(category._id, { reassignTo });
      else await onDelete(category._id, { force: true });
      setBlockedDeletion(null);
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Erreur lors de la suppression' });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ ...card, overflow: 'hidden' }}>
        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${colors.border}` }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>Catégories</h2>
          <p style={{ fontSize: 13, color: colors.textSoft }}>{categories.length} catégorie(s)</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Nom</th>
                <th style={th}>Slug</th>
                <th style={th}>Sous-catégorie de</th>
                <th style={th} />
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat._id}>
                  <td style={td}>{cat.name}</td>
                  <td style={{ ...td, color: colors.textSoft }}>{cat.slug}</td>
                  <td style={{ ...td, color: colors.textSoft }}>{categories.find((c) => c._id === cat.parent)?.name || '—'}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => startEdit(cat)} style={button('ghost')}>Éditer</button>
                      <button onClick={() => attemptDelete(cat)} style={button('danger')}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && <tr><td style={td} colSpan={4}>Aucune catégorie.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {blockedDeletion && (
        <div style={{ ...card, padding: 20, borderColor: 'rgba(185,28,28,0.3)' }}>
          <p style={{ fontSize: 14, color: colors.text, marginBottom: 12 }}>
            « {blockedDeletion.category.name} » est utilisée par <strong>{blockedDeletion.productCount}</strong> produit(s).
            Réaffecte-les vers une autre catégorie avant de supprimer, ou force la suppression (les produits perdront cette catégorie).
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              onChange={(e) => e.target.value && resolveBlockedDeletion('reassign', e.target.value)}
              defaultValue=""
              style={{ ...input, width: 240 }}
            >
              <option value="" disabled>Réaffecter vers…</option>
              {categories.filter((c) => c._id !== blockedDeletion.category._id).map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
            <button onClick={() => resolveBlockedDeletion('force')} style={button('danger')}>Forcer la suppression</button>
            <button onClick={() => setBlockedDeletion(null)} style={button('ghost')}>Annuler</button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ ...card, padding: 20, display: 'grid', gap: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>{editingId ? 'Modifier la catégorie' : 'Créer une catégorie'}</h3>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <input style={input} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Nom" required />
          <select style={input} value={form.parent} onChange={(e) => setForm((p) => ({ ...p, parent: e.target.value }))}>
            <option value="">Catégorie racine (pas de parent)</option>
            {categories.filter((c) => c._id !== editingId).map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>
        <input style={input} value={form.image} onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))} placeholder="URL image (optionnel)" />
        <textarea style={{ ...input, minHeight: 70 }} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description (optionnel)" />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button type="submit" style={button('primary')}>{editingId ? 'Enregistrer' : 'Créer'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', description: '', image: '', parent: '' }); }} style={button('ghost')}>Annuler</button>}
          {feedback.message && <span style={{ fontSize: 13, color: feedback.type === 'success' ? colors.success : colors.danger }}>{feedback.message}</span>}
        </div>
      </form>
    </div>
  );
}
