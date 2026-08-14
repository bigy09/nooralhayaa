// Réutilise le modèle Mongoose de l'app principale — une seule source de vérité,
// même base MongoDB, pas de schéma dupliqué à maintenir en synchro.
export { User } from '../../../../backend/models/User.js';
