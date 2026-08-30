# Déploiement sur Cloudflare (Pages + Workers + R2) — guide rapide

Prérequis:
- Compte Cloudflare avec accès à Pages, Workers et R2
- Jetons API: `CF_PAGES_API_TOKEN` (Pages) et `CF_API_TOKEN` (Wrangler)
- Compte GitHub pour héberger le code

Fichiers ajoutés:
- `wrangler.toml` — configuration Worker + binding R2
- `workers/index.js` — scaffold Worker (proxy /api vers `BACKEND_URL`)
- `.github/workflows/deploy-pages.yml` — CI pour build frontend et déploiement Pages
- `.github/workflows/deploy-workers.yml` — CI pour publier le Worker via `wrangler`
- `.env.example` — variables d'environnement requises

Étapes rapides:
1. Créez un projet Cloudflare Pages et notez `CF_PAGES_PROJECT_NAME` et `CF_ACCOUNT_ID`.
2. Créez un API Token pour Pages et un pour Workers (scopes: Workers:edit, R2:write si besoin).
3. Ajoutez les secrets GitHub: `CF_PAGES_API_TOKEN`, `CF_API_TOKEN`, `CF_ACCOUNT_ID`, `CF_PAGES_PROJECT_NAME`.
4. Configurez R2 dans le dashboard et notez le `bucket_name` (mettre la valeur dans `wrangler.toml` ou via variables d'environnement).
5. Mettez à jour `wrangler.toml` `account_id` et `r2_buckets.bucket_name`.
6. Ajoutez la vraie `BACKEND_URL` (pointant sur votre API ou endpoint transformé) comme secret/env (GitHub secret or Workers variable).
7. Poussez sur `main` — les workflows construisent et publient automatiquement.

Migration de stockage/DB:
- Remplacez les écritures/lectures locales d'`uploads/` par l'API R2 (S3-like) dans votre code.
- Migrez les fichiers JSON vers Supabase/Postgres; configurez `SUPABASE_*` dans vos secrets.

Notes:
- Le Worker actuel est un scaffold: adaptez-le pour supporter l'auth, headers, CORS, etc.
- Si vous préférez ne pas adapter l'API en Worker, vous pouvez déployer l'API sur Railway/Render et définir `BACKEND_URL`.
