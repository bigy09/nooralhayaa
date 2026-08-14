import mongoose from 'mongoose';

const dimensionsSchema = new mongoose.Schema(
  {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
  },
  { _id: false }
);

// Une variante = une combinaison taille/couleur avec son propre stock et SKU.
// C'est la source de vérité du stock quand des variantes sont définies ; le champ
// `inventory` au niveau produit reste en compat (somme des stocks de variantes,
// recalculée à chaque écriture) pour ne pas casser l'affichage vitrine existant.
const variantSchema = new mongoose.Schema(
  {
    size: { type: String, default: null },
    color: { type: String, default: null },
    sku: { type: String, default: null },
    stock: { type: Number, default: 0, min: 0 },
    images: [String],
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    description: String,
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    // Prix barré / promotionnel — optionnel, doit être supérieur à `price` s'il est défini.
    comparePrice: {
      type: Number,
      min: 0,
      default: null,
      validate: {
        validator(value) {
          return value == null || value >= this.price;
        },
        message: 'comparePrice doit être supérieur ou égal au prix courant',
      },
    },
    sku: {
      type: String,
      trim: true,
      default: null,
    },
    weight: { type: Number, min: 0, default: null },
    dimensions: { type: dimensionsSchema, default: null },
    inventory: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },
    isOutOfStock: {
      type: Boolean,
      default: false,
      index: true,
    },
    images: [String],
    // Champ historique, conservé pour compat avec le catalogue public (filtre par slug)
    // et la mock DB. Reste renseigné automatiquement à partir de `categories[0]`.
    categorySlug: {
      type: String,
      required: true,
      index: true,
    },
    // Relation plusieurs-à-plusieurs : un produit peut appartenir à plusieurs catégories.
    categories: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
      default: [],
      index: true,
    },
    variants: {
      type: [variantSchema],
      default: [],
    },
    swatches: [
      {
        name: String,
        color: String,
      },
    ],
    sizes: [String],
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviews: [
      {
        author: String,
        text: String,
        rating: Number,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Garde le champ `inventory` (stock global, utilisé par la vitrine et l'ancien admin)
// synchronisé avec la somme des stocks de variantes dès qu'au moins une variante existe.
productSchema.pre('save', function syncInventoryFromVariants() {
  if (Array.isArray(this.variants) && this.variants.length > 0) {
    this.inventory = this.variants.reduce((sum, variant) => sum + (variant.stock || 0), 0);
    this.isOutOfStock = this.inventory <= 0;
  }
});

export const Product = mongoose.model('Product', productSchema);
