# Déploiement complet sur Cloudflare (Pages + Workers)

Ce guide explique comment déployer le frontend sur Cloudflare Pages et migrer/héberger le backend en tant que Cloudflare Worker.

1) Pré-requis
- Avoir un compte Cloudflare
- Créer un API Token avec permissions `Account:Workers Scripts`, `Account:Pages` et `Account:Workers KV` si nécessaire
- Obtenir `ACCOUNT_ID` et `ZONE_ID` (si vous utilisez routes)
- Créer les secrets GitHub: `CF_API_TOKEN`, `CF_ACCOUNT_ID`, `CF_PAGES_PROJECT_NAME`, `CF_WORKER_NAME`

2) Frontend (Cloudflare Pages)
- Le workflow GitHub Actions `.github/workflows/deploy-cloudflare.yml` construit `frontend` et déploie le dossier `frontend/dist` vers Cloudflare Pages.
- Configurez un projet Pages sur Cloudflare (link to repo) puis définissez `CF_PAGES_PROJECT_NAME` comme nom du projet Pages.

3) Backend (Cloudflare Workers) — options
- Option A (recommandée pour serverless): Porter votre API Express vers Cloudflare Workers using `hono` or `worktop`.
  - Migrer les routes: créer `workers/index.js` ou un petit service bundlé.
  - Persistance: remplacer MongoDB par Cloudflare D1 (SQL), Workers KV (clé-valeur) ou R2 (objets). Le projet utilise un `mockDb` — utile pour démarrer.
  - Tests locaux: `wrangler dev`

- Option B (héberger Node complet ailleurs): Garder le backend sur Railway/Render et pointer `VITE_API_BASE_URL` vers l'URL publique.

4) Déploiement automatique
- Frontend: le workflow `deploy-cloudflare.yml` se charge du `npm run build --prefix frontend` puis `pages-action` déploie.
- Workers: le job `deploy-workers` invoque `wrangler publish` dans `workers/`. Remplissez `workers/wrangler.toml` avec `account_id` et `name`, et ajoutez `CF_API_TOKEN` secret.

5) Étapes recommandées pour migrer le backend
- Identifier les endpoints essentiels dans `backend/index.js`.
- Créer un nouveau petit projet Worker (dans `workers/`) et implémenter les routes en priorité: auth, products, categories, orders.
- Utiliser Workers KV pour sessions/refresh tokens, et D1 or R2 pour données produit si vous avez besoin de stockage persistant.
- Tester localement: `wrangler dev` et ajuster CORS (le frontend est servi depuis Pages).

6) Commandes utiles
```bash
# Build frontend locally
npm run build --prefix frontend

# Test Worker locally (requiert wrangler)
wrangler dev workers/index.js --local

# Publish worker (via wrangler)
cd workers
wrangler publish --name my-worker
```

Si tu veux, je peux:
- Préparer un portage automatique minimal (scaffold) des routes les plus importantes
- Créer et configurer les workflows et fichiers secrets (je fournis les commandes à exécuter pour push)

Dis-moi si tu veux que je crée un portage automatique des routes `auth` et `products` dans `workers/` maintenant.

7) Configuration des secrets GitHub et Wrangler

- Dans le dépôt GitHub, créez ces secrets (Settings → Secrets → Actions):
  - `CF_API_TOKEN` — API token Cloudflare avec permissions Pages + Workers
  - `CF_ACCOUNT_ID` — ton Account ID Cloudflare
  - `CF_PAGES_PROJECT_NAME` — nom du projet Pages créé sur Cloudflare
  - `CF_WORKER_NAME` — nom souhaité pour le Worker

- Pour les secrets Worker (wrangler), depuis ta machine (avec wrangler installé):

```bash
# se connecter au compte Cloudflare
wrangler login

# définir un secret pour le worker (ex: admin credentials)
cd workers
wrangler secret put ADMIN_EMAIL     # coller la valeur quand demandé
wrangler secret put ADMIN_PASSWORD  # coller la valeur quand demandé
```

Ajoutez aussi les secrets JWT pour le Worker :

```bash
wrangler secret put JWT_SECRET
wrangler secret put JWT_REFRESH_SECRET
```

8) Commandes pour push et déploiement (local)

```bash
# Initialiser le repo local si nécessaire
git remote add origin git@github.com:your-username/nooralhaya.git
git add .
git commit -m "Add Cloudflare Pages + Workers deploy"
git push origin main

# Après push, GitHub Actions s'exécutera et déployera Pages.

# Pour publier le Worker manuellement depuis local
cd workers
npm ci
npm install -g wrangler
wrangler publish --name my-worker
```

9) Remarques finales

- Le Worker fourni est un scaffold minimal — il embarque des données statiques (`workers/data.json`) et un login mock basé sur des secrets. Pour une API complète, il faudra migrer la logique d'`express` (routes, validation, JWT, stockage) vers Workers (Hono/Worktop) et remplacer MongoDB par D1/KV/R2.
- Si tu veux, je peux poursuivre et convertir `auth` (register/login/refresh) + `products` endpoints en Worker complet (avec JWT via `jose`) — veux-tu que je le fasse maintenant ?

