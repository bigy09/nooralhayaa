import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    description: String,
    image: String,
    // Sous-catégorie : référence vers la catégorie parente, null si catégorie racine.
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    // Utilisé pour le réordonnancement manuel dans le back office (ordre d'affichage croissant).
    order: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  { timestamps: true }
);

export const Category = mongoose.model('Category', categorySchema);
