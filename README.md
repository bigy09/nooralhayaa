# APP ASSATA Web

Base full-stack en JavaScript avec React/Vite pour le frontend et Node/Express pour le backend.

## Structure

- `client` : interface React
- `server` : API Express

## Demarrage

Installer les dependances dans chaque dossier :

```bash
npm install
npm install --prefix client
npm install --prefix server
```

Lancer le frontend et le backend ensemble :

```bash
npm run dev
```

## Endpoints disponibles

- `GET /api/health`
- `GET /api/highlights`

## Deploiement Railway

Ce repo est configure pour Railway avec [railway.toml](railway.toml).

1. Connecter le repo `bigy09/nooralhayaa` dans Railway.
2. Creer un nouveau projet Railway depuis ce repo.
3. Ajouter les variables serveur (`MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS`, etc.) depuis [.env.example](.env.example).
4. Definir `VITE_API_BASE_URL` avec l'URL publique Railway de l'app.
5. Lancer le deploy: le backend sert aussi le frontend build en production.