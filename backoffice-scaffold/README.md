# Backoffice Scaffold

Ce scaffold minimal fournit une architecture back-office admin séparée avec une API Node/Express et une interface React/Vite.

## Structure

- `backend/` : API admin et scripts de seed
- `frontend/` : interface admin React
- `.env.example` : variables d'environnement
- `railway.toml` : configuration de déploiement

## Installation

```bash
cd backoffice-scaffold
npm install --prefix backend
npm install --prefix frontend
```

## Développement local

```bash
npm run dev --prefix backend
npm run dev --prefix frontend
```

## Seed admin

```bash
npm run seed --prefix backend
```

## Déploiement

- `railway.toml` est fourni pour Railway
- `backend/Dockerfile` est fourni pour le container

## Endpoints principaux

- `POST /api/auth/admin/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/admin/stats`
- `GET /api/admin/audit-logs`
- `GET /api/health`
