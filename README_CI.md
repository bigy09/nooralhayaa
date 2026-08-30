# CI / GitHub Actions — configuration et secrets

Fichier workflows ajoutés:
- `.github/workflows/deploy-pages.yml` — construit le frontend (`frontend/`) et publie sur Cloudflare Pages.
- `.github/workflows/deploy-workers.yml` — installe `wrangler` et publie le Worker via `wrangler publish`.

Secrets GitHub à ajouter (Settings → Secrets → Actions):
- `CF_PAGES_API_TOKEN` — Cloudflare Pages API token (scopes: Pages:Edit)
- `CF_API_TOKEN` — Cloudflare API token (scopes: Workers:Edit, R2:Write if using R2)
- `CF_ACCOUNT_ID` — Cloudflare account ID
- `CF_PAGES_PROJECT_NAME` — nom du projet Pages

Variables d'environnement ou bindings Cloudflare à configurer:
- R2 binding: `UPLOADS` (défini dans `wrangler.toml` via `r2_buckets`)
- `BACKEND_URL` si vous utilisez le Worker comme proxy vers votre API Node

Tester localement:

1. Installer wrangler globalement (pour publier / dev local):

```bash
npm i -g wrangler
```

2. Lancer le Worker en local (depuis la racine du repo):

```bash
wrangler dev
```

3. Pour tester la build frontend localement:

```bash
cd frontend
npm ci
npm run build
# puis servir le dossier dist avec un serveur statique (ex: serve)
npx serve dist
```

Notes:
- Assurez-vous que `wrangler.toml` contient `account_id` correct et que `r2_buckets.bucket_name` correspond au bucket R2 créé.
- Les workflows CI se déclenchent sur `push` vers la branche `main` ; changez la branche dans les workflows si nécessaire.
