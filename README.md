# APP ASSATA Web — Noor Al Hayaa

Boutique e-commerce (React/Vite + Node/Express + MongoDB) avec deux services :

- **App principale** (`backend/` + `frontend/`) : site vitrine, panier, checkout, et
  historiquement un back office intégré (`/admin`).
- **Back office admin** (`backoffice-scaffold/`) : service admin séparé (auth, produits,
  catégories, commandes, clients, analytique...) qui partage la même base MongoDB et
  les mêmes modèles Mongoose (`backend/models/*.js`) que l'app principale.

## Structure

```
backend/                 API Express du site principal (catalogue public, panier, checkout, auth)
frontend/                Site vitrine React
backoffice-scaffold/
  backend/               API Express dédiée au back office admin (réutilise backend/models/*.js)
  frontend/              Interface d'administration React (séparée du site vitrine)
uploads/                 Dossier partagé pour les images uploadées (servi par les deux services)
```

## Démarrage en local

Installer les dépendances de chaque service :

```bash
npm install
npm install --prefix backend
npm install --prefix frontend
npm install --prefix backoffice-scaffold/backend
npm install --prefix backoffice-scaffold/frontend
```

Lancer le site principal (frontend + backend) :

```bash
npm run dev
```

Lancer le back office admin (dans un autre terminal) :

```bash
npm run dev --prefix backoffice-scaffold/backend
npm run dev --prefix backoffice-scaffold/frontend
```

Sans `MONGODB_URI` valide, l'API principale retombe automatiquement sur une base
JSON locale (`backend/mockDb.js` / `backend/db.json`) pour le développement — les
données sont perdues au redémarrage. Le back office admin nécessite une vraie base
MongoDB (même `MONGODB_URI` que l'app principale) puisqu'il partage les collections.

## Variables d'environnement

Voir [.env.example](.env.example) (app principale) et
[backoffice-scaffold/.env.example](backoffice-scaffold/.env.example) (back office).
**Aucune valeur par défaut sensible n'est codée en dur** : `ADMIN_EMAIL` et
`ADMIN_PASSWORD` doivent être définis explicitement, sinon le bootstrap admin
échoue volontairement au démarrage plutôt que de retomber sur un compte connu.

Variables clés partagées entre les deux services (doivent avoir la **même valeur**) :

- `MONGODB_URI` — même base pour les deux, puisqu'ils partagent Product/Category/Order/User.
- `JWT_SECRET`, `JWT_REFRESH_SECRET` — sinon les tokens émis par un service sont
  invalides pour l'autre.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — compte admin bootstrapé au démarrage.

Variable spécifique au back office : `ASSET_BASE_URL` (URL publique du site
principal, ex. `https://votre-app.up.railway.app`) — utilisée pour construire les
URLs absolues des images uploadées depuis le back office.

## Migration des données produits existantes

Après avoir déployé les modèles étendus (catégories multiples, variantes avec
stock propre, prix barré, SKU...), lancer une fois sur la base réelle :

```bash
node backend/scripts/migrate-products.js
```

Ce script résout `categorySlug` vers `categories[]` et convertit `sizes`/`inventory`
en `variants[]` sans perte de stock. Il est idempotent (ne retouche pas les
produits qui ont déjà des variantes).

## Politique de stock

Le stock ne bouge **qu'à la validation admin** d'une commande (passage au statut
`confirmed`), jamais à la création de la commande côté client. Le décrément se fait
par variante (taille/couleur) via le back office admin ; si la commande est
annulée après confirmation, le stock est restauré.

## Endpoints principaux

App principale : catalogue public (`/api/products`, `/api/categories`, `/api/banners`),
panier/wishlist, auth (`/api/auth/*`), commandes (`/api/orders*`).

Back office admin (`backoffice-scaffold`) : `/api/auth/admin/login`, `/api/admin/products`,
`/api/admin/categories`, `/api/admin/orders`, `/api/admin/clients`, `/api/admin/discussions`,
`/api/admin/analytics`, `/api/admin/audit-logs`, `/api/admin/uploads`.

## Déploiement Railway

Chaque service a son propre [railway.toml](railway.toml) /
[backoffice-scaffold/railway.toml](backoffice-scaffold/railway.toml).

**App principale :**
1. Connecter le repo dans Railway, créer un projet depuis ce repo (racine).
2. Renseigner les variables serveur (`MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
   `CORS_ORIGINS`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `EMAIL_USER`, `EMAIL_PASSWORD`...)
   depuis [.env.example](.env.example).
3. Définir `VITE_API_BASE_URL` avec l'URL publique Railway de l'app.
4. Le backend sert aussi le frontend buildé en production (`frontend/dist`).

**Back office admin :**
1. Créer un second projet Railway pointant sur `backoffice-scaffold/`
   (`rootDirectory` ou déploiement du sous-dossier).
2. Renseigner les **mêmes** `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
   `ADMIN_EMAIL`, `ADMIN_PASSWORD` que l'app principale, plus `ASSET_BASE_URL`
   (URL publique de l'app principale, pour que les images uploadées soient
   servies correctement côté vitrine).
3. Définir `VITE_API_BASE_URL` (frontend admin) avec l'URL publique de ce service.

## État de l'ancien back office intégré

`frontend/src/pages/admin/` et les routes `/api/admin/*` de `backend/index.js`
restent fonctionnels pendant la période de transition, mais sont destinés à être
retirés une fois le nouveau back office (`backoffice-scaffold`) validé en usage réel
— voir [BACKOFFICE_ARCHITECTURE.md](BACKOFFICE_ARCHITECTURE.md).
