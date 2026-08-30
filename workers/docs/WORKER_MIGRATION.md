# Migrer l'API vers Cloudflare Workers (guide rapide)

1) Choix d'approche
- Adapter selectivement quelques routes critiques vers Workers (edge functions) — garder le backend Node complet si vous avez besoin de MongoDB/long-running processes.
- Ou migrer complètement: remplacer Express par handlers Workers + client pour Supabase/Postgres.

2) Adapter une route d'exemple
- Utilisez `workers/adapter/express-to-worker.js` pour les handlers simples qui ne dépendent pas d'APIs Node natives (fs, multer, mongoose). Ce fichier montre comment transformer un handler express minimal en handler Worker.

3) Uploads
- Remplacez l'utilisation de `multer`/`fs` par R2 via `workers/r2-helper.js`.
- Exemple: uploader depuis le frontend en POST multipart/form-data → route Worker qui écrit dans R2 avec `UPLOADS.put(key, body)`.

4) Auth & sessions
- Préférez JWT stateless pour l'edge. Si vous utilisez `refresh tokens` et stockage sessions, gardez cette logique sur le backend Node managé.

5) Variables & secrets
- Déclarez `BACKEND_URL` (si proxy), `UPLOADS` binding and R2 bucket in `wrangler.toml` or via Cloudflare dashboard.

6) Tests locaux
- Installez `wrangler` et testez localement:

  ```bash
  npm i -g wrangler
  wrangler dev
  ```

7) Déploiement CI
- Poussez sur `main` pour déclencher `deploy-workers.yml`.
