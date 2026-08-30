# GitHub Secrets et variables d'environnement requises

Ajoutez ces secrets dans le dépôt GitHub (Settings → Secrets) avant d'activer les workflows CI:

- `CF_PAGES_API_TOKEN` : token Cloudflare Pages (scopes Pages:Edit)
- `CF_API_TOKEN` : token Cloudflare (Workers:Edit, R2:Write as needed)
- `CF_ACCOUNT_ID` : identifiant du compte Cloudflare
- `CF_PAGES_PROJECT_NAME` : nom du projet Pages (tel qu'il apparaît dans Cloudflare Pages)

# Backend / services
- `BACKEND_URL` : si vous utilisez le Worker en proxy vers l'API Node hébergée ailleurs (ex: https://my-backend.railway.app)
- `JWT_SECRET`, `JWT_REFRESH_SECRET` : secrets JWT (utilisés par le backend si vous déployez Node)
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` : pour bootstrap admin (optionnel)

# Supabase (si utilisé)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (ne pas exposer côté client)
- `SUPABASE_ANON_KEY` (pour client si nécessaire)

# R2 / Uploads
- `UPLOADS_R2_BUCKET` : nom du bucket R2 (peut aussi être mis dans `wrangler.toml`)

Remarque: ne stockez jamais les clés secrètes dans le dépôt. Utilisez les GitHub Secrets et les variables d'environnement de Cloudflare lors du déploiement.
