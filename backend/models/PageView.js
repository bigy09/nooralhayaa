import mongoose from 'mongoose';

// Compteur de visites léger : un document par jour+page, incrémenté à chaque
// visite. Pas de tracking individuel (pas de cookie/IP stocké) — juste un
// compteur agrégé, cohérent avec le besoin "compteur global + par page".
const pageViewSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, index: true }, // YYYY-MM-DD (UTC)
    path: { type: String, required: true, index: true },
    count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

pageViewSchema.index({ date: 1, path: 1 }, { unique: true });

export const PageView = mongoose.model('PageView', pageViewSchema);
