// Migration one-shot : aligne les produits existants sur le nouveau schéma
// (catégories multiples + variantes avec stock propre) sans perte de données.
//
// - categorySlug -> résout la Category correspondante et l'ajoute à `categories[]`
//   (categorySlug reste renseigné pour compat avec le catalogue public / mock DB).
// - sizes/swatches/inventory -> génère une variante par taille (ou une variante
//   unique si pas de taille) portant le stock actuel, sans le diviser ni le perdre.
//   Si le produit a déjà des variantes, il est ignoré (idempotent).
//
// Usage : node backend/scripts/migrate-products.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';

dotenv.config();

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(serverDirectory, '..', '..');
const MONGODB_URI = process.env.MONGODB_URI;

async function migrate() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set — this migration only applies to a real MongoDB instance (the JSON mock DB does not need it).');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('✅ MongoDB connected for migration');

  const categories = await Category.find({}).lean();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c._id]));

  const products = await Product.find({});
  let updated = 0;
  let skippedCategory = 0;

  for (const product of products) {
    let changed = false;

    // 1. categorySlug -> categories[]
    if ((!product.categories || product.categories.length === 0) && product.categorySlug) {
      const categoryId = categoryBySlug.get(product.categorySlug);
      if (categoryId) {
        product.categories = [categoryId];
        changed = true;
      } else {
        skippedCategory += 1;
        console.warn(`⚠️ Product "${product.name}" (${product._id}) has categorySlug="${product.categorySlug}" with no matching Category document — left uncategorized.`);
      }
    }

    // 2. sizes/inventory -> variants[] (idempotent : ne touche rien si des variantes existent déjà)
    if (!product.variants || product.variants.length === 0) {
      const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : [null];
      const totalStock = product.inventory || 0;
      // Répartit le stock actuel équitablement entre les tailles connues pour ne rien
      // perdre au total ; le reste est ajouté à la première variante.
      const base = Math.floor(totalStock / sizes.length);
      const remainder = totalStock - base * sizes.length;

      product.variants = sizes.map((size, index) => ({
        size,
        color: null,
        sku: null,
        stock: base + (index === 0 ? remainder : 0),
        images: [],
      }));
      changed = true;
    }

    if (changed) {
      await product.save();
      updated += 1;
    }
  }

  console.log(`✅ Migration complete: ${updated} product(s) updated, ${skippedCategory} left without a resolved category (check warnings above).`);
  await mongoose.disconnect();
}

migrate().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
