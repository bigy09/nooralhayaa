import { useEffect, useState } from 'react';
import { colors, card, input, button } from '../../../styles/theme.js';

const EMPTY_VARIANT = { size: '', color: '', sku: '', stock: '0', images: '' };

function toFormState(product) {
  if (!product) {
    return {
      name: '', description: '', price: '0', comparePrice: '', sku: '', weight: '',
      dimensionsLength: '', dimensionsWidth: '', dimensionsHeight: '',
      categories: [], isVisible: true, featured: false, rating: '0', images: '',
      variants: [{ ...EMPTY_VARIANT }],
    };
  }
  return {
    name: product.name || '',
    description: product.description || '',
    price: String(product.price ?? 0),
    comparePrice: product.comparePrice != null ? String(product.comparePrice) : '',
    sku: product.sku || '',
    weight: product.weight != null ? String(product.weight) : '',
    dimensionsLength: product.dimensions?.length != null ? String(product.dimensions.length) : '',
    dimensionsWidth: product.dimensions?.width != null ? String(product.dimensions.width) : '',
    dimensionsHeight: product.dimensions?.height != null ? String(product.dimensions.height) : '',
    categories: (product.categories || []).map((c) => (typeof c === 'string' ? c : c._id)),
    isVisible: product.isVisible !== false,
    featured: Boolean(product.featured),
    rating: String(product.rating ?? 0),
    images: (product.images || []).join(', '),
    variants: product.variants?.length
      ? product.variants.map((v) => ({ size: v.size || '', color: v.color || '', sku: v.sku || '', stock: String(v.stock ?? 0), images: (v.images || []).join(', ') }))
      : [{ ...EMPTY_VARIANT }],
  };
}

// Formulaire de création/édition produit : catégories multiples, prix barré, SKU,
// poids/dimensions, éditeur de variantes (taille/couleur/SKU/stock propre), upload
// d'image (fichier réel, plutôt que des URLs texte).
export default function ProductForm({ product, categories, onSubmit, onCancel, onUpload }) {
  const [form, setForm] = useState(() => toFormState(product));
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [uploading, setUploading] = useState(false);

  useEffect(() => setForm(toFormState(product)), [product]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCategory(id) {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(id) ? prev.categories.filter((c) => c !== id) : [...prev.categories, id],
    }));
  }

  function updateVariant(index, key, value) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === index ? { ...v, [key]: value } : v)),
    }));
  }

  function addVariant() {
    setForm((prev) => ({ ...prev, variants: [...prev.variants, { ...EMPTY_VARIANT }] }));
  }

  function removeVariant(index) {
    setForm((prev) => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }));
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await onUpload(file);
      updateField('images', form.images ? `${form.images}, ${url}` : url);
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || "Échec de l'upload" });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    if (form.categories.length === 0) {
      setFeedback({ type: 'error', message: 'Sélectionne au moins une catégorie.' });
      return;
    }

    const variants = form.variants
      .filter((v) => v.size || v.color || Number(v.stock) > 0)
      .map((v) => ({
        size: v.size || null,
        color: v.color || null,
        sku: v.sku || null,
        stock: Number(v.stock) || 0,
        images: v.images.split(',').map((i) => i.trim()).filter(Boolean),
      }));

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      comparePrice: form.comparePrice ? Number(form.comparePrice) : null,
      sku: form.sku.trim() || null,
      weight: form.weight ? Number(form.weight) : null,
      dimensions: (form.dimensionsLength || form.dimensionsWidth || form.dimensionsHeight)
        ? {
            length: form.dimensionsLength ? Number(form.dimensionsLength) : undefined,
            width: form.dimensionsWidth ? Number(form.dimensionsWidth) : undefined,
            height: form.dimensionsHeight ? Number(form.dimensionsHeight) : undefined,
          }
        : null,
      categories: form.categories,
      inventory: variants.reduce((sum, v) => sum + v.stock, 0),
      isVisible: form.isVisible,
      isOutOfStock: variants.length > 0 && variants.every((v) => v.stock <= 0),
      featured: form.featured,
      rating: Number(form.rating) || 0,
      images: form.images.split(',').map((i) => i.trim()).filter(Boolean),
      sizes: [...new Set(variants.map((v) => v.size).filter(Boolean))],
      swatches: [...new Set(variants.map((v) => v.color).filter(Boolean))].map((color) => ({ name: color, color })),
      variants,
    };

    try {
      await onSubmit(payload);
      setFeedback({ type: 'success', message: product ? 'Produit mis à jour.' : 'Produit créé.' });
      if (!product) setForm(toFormState(null));
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Erreur lors de l’enregistrement' });
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ ...card, padding: 20, display: 'grid', gap: 14 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>{product ? `Modifier « ${product.name} »` : 'Créer un nouveau produit'}</h3>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <input style={input} value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Nom du produit" required />
        <input style={input} value={form.sku} onChange={(e) => updateField('sku', e.target.value)} placeholder="SKU / référence" />
      </div>

      <textarea style={{ ...input, minHeight: 90 }} value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Description" />

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <input style={input} type="number" min="0" value={form.price} onChange={(e) => updateField('price', e.target.value)} placeholder="Prix (F CFA)" required />
        <input style={input} type="number" min="0" value={form.comparePrice} onChange={(e) => updateField('comparePrice', e.target.value)} placeholder="Prix barré / promo (optionnel)" />
        <input style={input} type="number" min="0" step="0.1" value={form.weight} onChange={(e) => updateField('weight', e.target.value)} placeholder="Poids (kg, optionnel)" />
        <input style={input} type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(e) => updateField('rating', e.target.value)} placeholder="Note (0-5)" />
      </div>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <input style={input} type="number" min="0" value={form.dimensionsLength} onChange={(e) => updateField('dimensionsLength', e.target.value)} placeholder="Longueur (cm)" />
        <input style={input} type="number" min="0" value={form.dimensionsWidth} onChange={(e) => updateField('dimensionsWidth', e.target.value)} placeholder="Largeur (cm)" />
        <input style={input} type="number" min="0" value={form.dimensionsHeight} onChange={(e) => updateField('dimensionsHeight', e.target.value)} placeholder="Hauteur (cm)" />
      </div>

      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 8 }}>Catégories (au moins une)</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {categories.map((cat) => {
            const active = form.categories.includes(cat._id);
            return (
              <button
                type="button"
                key={cat._id}
                onClick={() => toggleCategory(cat._id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  fontSize: 12,
                  border: `1px solid ${colors.border}`,
                  background: active ? colors.text : 'transparent',
                  color: active ? '#fff' : colors.text,
                  cursor: 'pointer',
                }}
              >
                {cat.name}
              </button>
            );
          })}
          {categories.length === 0 && <span style={{ fontSize: 13, color: colors.textSoft }}>Crée d'abord une catégorie dans l'onglet Catégories.</span>}
        </div>
      </div>

      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 8 }}>Variantes (taille / couleur / stock propre)</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {form.variants.map((variant, index) => (
            <div key={index} style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr 1fr 100px auto', alignItems: 'center' }}>
              <input style={input} value={variant.size} onChange={(e) => updateVariant(index, 'size', e.target.value)} placeholder="Taille (ex: M)" />
              <input style={input} value={variant.color} onChange={(e) => updateVariant(index, 'color', e.target.value)} placeholder="Couleur (ex: Noir)" />
              <input style={input} value={variant.sku} onChange={(e) => updateVariant(index, 'sku', e.target.value)} placeholder="SKU variante" />
              <input style={input} type="number" min="0" value={variant.stock} onChange={(e) => updateVariant(index, 'stock', e.target.value)} placeholder="Stock" />
              <button type="button" onClick={() => removeVariant(index)} style={button('danger')}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addVariant} style={{ ...button('ghost'), marginTop: 8 }}>+ Ajouter une variante</button>
        <p style={{ fontSize: 12, color: colors.textSoft, marginTop: 6 }}>Le stock total du produit est calculé automatiquement à partir des variantes.</p>
      </div>

      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 8 }}>Images</p>
        <input style={input} value={form.images} onChange={(e) => updateField('images', e.target.value)} placeholder="URLs séparées par des virgules" />
        <label style={{ display: 'inline-block', marginTop: 8 }}>
          <span style={{ ...button('ghost'), display: 'inline-block' }}>{uploading ? 'Envoi en cours…' : '+ Uploader une image'}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} style={{ display: 'none' }} disabled={uploading} />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.text }}>
          <input type="checkbox" checked={form.isVisible} onChange={(e) => updateField('isVisible', e.target.checked)} /> Visible en boutique
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.text }}>
          <input type="checkbox" checked={form.featured} onChange={(e) => updateField('featured', e.target.checked)} /> Mis en avant
        </label>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button type="submit" style={button('primary')}>{product ? 'Enregistrer' : 'Créer le produit'}</button>
        {onCancel && <button type="button" onClick={onCancel} style={button('ghost')}>Annuler</button>}
        {feedback.message && <span style={{ fontSize: 13, color: feedback.type === 'success' ? colors.success : colors.danger }}>{feedback.message}</span>}
      </div>
    </form>
  );
}
