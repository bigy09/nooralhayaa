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