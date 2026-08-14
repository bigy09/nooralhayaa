# Architecture back-office — Analyse et scaffold minimal

## 1. Contexte et périmètre

- Dépôt analysé : `c:\Users\HP ELITEBOOK\Documents\APP ASSATA`
- Périmètre ciblé : back-office de gestion et admin API
- Objectif : reproduire fidèlement l’architecture, les patterns de sécurité, et la résilience du site existant sur ce dépôt.
- Scope du back-office actuel : `frontend/src/pages/admin/*`, `frontend/src/context/AuthContext.jsx`, `backend/index.js`, `backend/models/User.js`, `backend/models/AuditLog.js`, `backend/seed.js`.

## 2. Inventaire et analyse du back-office existant

### 2.1 Frontend admin

- Pages principales :
  - `frontend/src/pages/admin/AdminLogin.jsx`
  - `frontend/src/pages/admin/AdminDashboard.jsx`
- Protection de navigation : `frontend/src/components/ProtectedAdminRoute.jsx`
- Authentification gérée par `frontend/src/context/AuthContext.jsx`
  - Séparation `adminToken` / `userToken`
  - Stockage JWT dans `localStorage`
  - Refresh token côté serveur via cookie `httpOnly`
- Routes principales utilisées par l’admin :
  - `/api/admin/stats`
  - `/api/admin/orders`
  - `/api/admin/products`
  - `/api/admin/clients`
  - `/api/admin/discussions`
  - `/api/admin/analytics`
  - `/api/admin/audit-logs`

### 2.2 Backend API

- Application monolithe Express dans `backend/index.js`
- Authentification / admin / API publiques dans un seul fichier
- Modèles Mongoose et MongoDB :
  - `backend/models/User.js`
  - `backend/models/AuditLog.js`
  - `backend/models/Product.js`, `Category.js`, `Banner.js`, `Order.js`, `Cart.js`, `Wishlist.js`
- Gestion de la base :
  - `backend/db-adapter.js` connecte MongoDB ou bascule vers une base mock
- Endpoints principaux back-office :
  - `POST /api/auth/admin/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `GET /api/admin/orders`
  - `PUT /api/admin/orders/:id`
  - `GET /api/admin/products`
  - `POST /api/admin/products`
  - `PUT /api/admin/products/:id`
  - `GET /api/admin/stats`
  - `GET /api/admin/clients`
  - `GET /api/admin/discussions`
  - `GET /api/admin/analytics`
  - `GET /api/admin/audit-logs`

### 2.3 Services tiers et infra

- Base de données actuelle : MongoDB (`MONGODB_URI`)
- Paiement : service Wave (`backend/services/WavePaymentService.js`)
- Email : `backend/services/EmailService.js`
- Déploiement ciblé : Railway (`railway.toml`)
- Build back-office existant : front et backend installés séparément, le backend sert le build frontend en production.

### 2.4 Gestion des secrets

- Fichier `.env.example` liste les variables sensibles :
  - `MONGODB_URI`
  - `JWT_SECRET`, `JWT_REFRESH_SECRET`
  - `CORS_ORIGINS`
  - `EMAIL_USER`, `EMAIL_PASSWORD`
  - `WAVE_API_KEY`, `STRIPE_SECRET_KEY`
- `.gitignore` exclut `.env`, `backend/.env`, et les dossiers de dépendances.

### 2.5 CI/CD existant

- Pipeline actuel manifesté via `railway.toml`
  - Build avec Nixpacks
  - Commandes : `npm install --prefix backend && npm install --prefix frontend && npm run build --prefix frontend`
  - Start : `npm start`
  - Healthcheck : `/api/health`
- Pas de workflow GitHub Actions existant dans le dépôt.

## 3. Patterns de sécurité observés

### 3.1 Authentification et session

- JWT pour access tokens
- Refresh tokens signés distincts et stockés dans des cookies `httpOnly`
- Séparation des rôles `user` / `admin`
- Protection d’endpoint via `verifyToken` + `requireAdmin`
- Validation des entrées avec `zod`
- Hash bcrypt pour les mots de passe
- Stockage des refresh tokens sous forme hachée (`sha256`) dans la DB

### 3.2 Contrôles d’accès

- RBAC simple sur rôle admin
- Routes admin explicitement protégées
- Vérification des rôles dans `backend/middleware/auth.js`

### 3.3 Politique CORS / headers

- `helmet()` activé
- CORS whitelist configurée via `CORS_ORIGINS`
- `credentials: true` pour cookies

### 3.4 Protection contre les attaques

- Limiteur de taux sur auth (`express-rate-limit`)
- Taille JSON limitée (`1mb`)
- Validation input via `zod` pour prévenir injection et malformations
- Absence partielle de CSP et de protection CSRF explicite

### 3.5 Secrets et dépendances

- Secrets contenus dans `.env` non versionnés
- Dépendances verrouillées via `package-lock.json`
- Certaines versions datées, à auditer pour vulnérabilités

## 4. Patterns de stabilité observés

- Healthcheck `/api/health`
- Timeout MongoDB explicite dans `db-adapter.js`
- Redémarrage Railway configuré `ON_FAILURE`, `MaxRetries=5`
- Basculement vers base mock si MongoDB indisponible
- Rate limiting et validation d’entrée pour limiter les erreurs applicatives

### 4.1 Lacunes identifiées

- Pas de circuit breaker explicite
- Pas de monitoring centralisé
- Pas de logs structurés JSON
- Pas de sauvegarde automatique de DB décrite dans le code
- Pas de gestion de déconnexion propre SIGTERM/SIGINT

## 5. Architecture cible recommandée

### 5.1 Proposition technologique

- Frontend admin : React + Vite + Tailwind (ou CSS simple)
- Backend admin API : Node.js + Express + MongoDB + Mongoose
- Base de données : MongoDB Atlas pour production + replica set + sauvegardes automatiques
- Auth : JWT access token court, refresh token long via cookie `httpOnly`, admin login séparé
- Infra : Docker + Railway / GitHub Actions
- CDN : Cloudflare ou Railway CDN pour les assets statiques du frontend
- Reverse proxy / LB : Railway / Cloudflare / ALB selon besoin

### 5.2 Séparation des responsabilités

- `admin-ui/` : interface admin React et pages de gestion
- `admin-api/` : API Express dédiée à l’administration et au RBAC
- `db/` : scripts de migration / seed / audits
- `infra/` : Dockerfiles, railway manifest, GitHub Actions

### 5.3 Modèle de déploiement

- Staging en premier : deploy automatique depuis branche `develop`
- Production à partir de `main`
- Build containers Docker pour backend + frontend
- Scans sécurité sur image 
- Verification smoke post-deploy via `/api/health`
- Rollback automatique sur échec de healthcheck ou de smoke test

### 5.4 Améliorations de sécurité à reproduire et renforcer

- Auth admin + refresh token sécurisé
- Stockage minimal des secrets dans Git
- Déploiement des secrets via Vault / Railway secrets / AWS Secrets Manager
- Rotation des clés JWT + API keys
- Least privilege pour la base Mongo
- CSP stricte sur le frontend admin
- Protection CSRF sur routes de mutation si cookies utilisés
- 2FA/TOTP ou SSO pour les accès admin
- Audit trail immuable avec horodatage, IP, user-agent, action, cible
- Rate limiting sur auth et endpoints critiques
- Protection brute force et verrouillage adaptatif

## 6. Spécification RBAC complète

### 6.1 Rôles

- `admin`
  - Supervision complète du back-office
  - Gestion des commandes, produits, clients, analytics, audit logs
- `operator` (optionnel)
  - Gère commandes et produits
  - Pas d’accès aux utilisateurs/admin/settings
- `viewer` (optionnel)
  - Lecture seule des statistiques et des commandes

### 6.2 Permissions

- `admin`
  - `manage:orders`
  - `manage:products`
  - `manage:clients`
  - `view:analytics`
  - `view:audit-logs`
  - `manage:admin-users`
- `operator`
  - `manage:orders`
  - `manage:products`
  - `view:analytics`
- `viewer`
  - `read:orders`
  - `read:analytics`

### 6.3 Application RBAC

- Middleware `authorize(roleOrPermission)` pour chaque route critique
- Reject 403 si rôle insuffisant
- Exemple de mapping :
  - `/api/admin/orders` : `requireRole('admin', 'operator')`
  - `/api/admin/products` : `requireRole('admin', 'operator')`
  - `/api/admin/audit-logs` : `requireRole('admin')`
  - `/api/admin/settings` : `requireRole('admin')`

### 6.4 Gestion des sessions admin

- Access tokens valides 5 à 15 minutes
- Refresh tokens valables 30 jours, stockés `httpOnly`
- Révocation possible via `logout-all`
- Rotation du refresh token à chaque refresh

## 7. Scaffold minimal proposé

### 7.1 Arbre de fichiers recommandé

```
backoffice-scaffold/
  .env.example
  .gitignore
  railway.toml
  README.md
  backend/
    package.json
    Dockerfile
    src/
      app.js
      server.js
      routes/
        auth.js
        admin.js
      middleware/
        auth.js
      db/
        seed-admin.js
        migrations/
          0001-create-admin-user.js
  frontend/
    package.json
    vite.config.js
    src/
      App.jsx
      context/
        AuthContext.jsx
      pages/admin/
        AdminLogin.jsx
        AdminDashboard.jsx
      utils/
        api.js
```

### 7.2 Fichiers d’exemple fournis

- `backoffice-scaffold/.env.example`
- `backoffice-scaffold/backend/Dockerfile`
- `backoffice-scaffold/backend/package.json`
- `backoffice-scaffold/backend/src/app.js`
- `backoffice-scaffold/backend/src/server.js`
- `backoffice-scaffold/backend/src/routes/auth.js`
- `backoffice-scaffold/backend/src/routes/admin.js`
- `backoffice-scaffold/backend/src/middleware/auth.js`
- `backoffice-scaffold/backend/src/db/seed-admin.js`
- `backoffice-scaffold/frontend/package.json`
- `backoffice-scaffold/frontend/vite.config.js`
- `backoffice-scaffold/frontend/src/App.jsx`
- `backoffice-scaffold/frontend/src/context/AuthContext.jsx`
- `backoffice-scaffold/frontend/src/pages/admin/AdminLogin.jsx`
- `backoffice-scaffold/frontend/src/pages/admin/AdminDashboard.jsx`
- `backoffice-scaffold/frontend/src/utils/api.js`

## 8. CI/CD et vérifications automatiques

### 8.1 Pipeline proposé

1. `checkout`
2. `install backend && install frontend`
3. `lint` backend + frontend
4. `test:unit`
5. `test:integration`
6. `build frontend`
7. `static analysis` (ESLint, Snyk/Trivy)
8. `docker build` + `trivy image`
9. `deploy staging`
10. `smoke tests` sur `/api/health`
11. `deploy production`

### 8.2 Scans de sécurité

- `trivy fs` et `trivy image`
- `npm audit` ou `npm audit --json`
- `dependabot` / `renovate`
- `pre-commit` + `detect-secrets`

### 8.3 Policy as code

- Règle : pas de secrets en clair
- Règle : version des dépendances fixée
- Règle : CSP activée
- Règle : healthcheck exposé

## 9. Observabilité et résilience

### 9.1 Logs, traces, metrics

- Logs structurés JSON
- Correlation ID dans headers
- Traces distribuées via OpenTelemetry
- Metrics exposées sur `/api/metrics`
- Monitoring possible avec Grafana/Prometheus
- Alertes sur erreurs 5xx, taux d’auth échoué, latence

### 9.2 Healthchecks et readiness

- `GET /api/health` → `200` si app + DB OK
- `GET /api/ready` → `200` si dépendances connectées
- `GET /api/live` → `200` si process alive

### 9.3 Backup et reprise

- MongoDB Atlas : snapshots journaliers
- Export automatique des collections critiques
- Stockage des backups hors site
- Test de restauration trimestriel

## 10. Runbook incidents

- DB indisponible : vérifier Mongo Atlas, restaurer snapshot, redémarrage container
- Auth échouée : vérifier secrets JWT, rotation refresh tokens, logs de refus
- Admin locked out : exécuter `seed-admin.js` ou réparer l’utilisateur dans la base
- Carte de débit API : surveiller `WAVE_API_KEY`, renouveler clé, redémarrer service
- Erreur 500 back-office : consulter logs structurés + traces OpenTelemetry

## 11. Critères d’acceptation

- `npm install && npm run dev` doit fonctionner localement
- Admin login + dashboard fonctionnels
- `POST /api/auth/admin/login` + `/api/admin/orders` passés
- `GET /api/health` OK après déploiement staging
- `admin` seed user créé automatiquement via script
- Pas de secret en clair dans Git
- CSP et CORS configurés
- Dépendances figées et auditables
- Pipeline CI exécute lint, tests, build, scan et smoke tests
- RBAC appliqué sur toutes les routes admin
- Audit trail enregistrant les actions critiques

---

## 12. Notes de livraison

- Les fichiers de scaffold minimal sont ajoutés sous `backoffice-scaffold/`
- Le document décrit la stratégie du back-office et la reproduction de l’architecture existante
- Les outils sont alignés sur l’infrastructure Railway déjà utilisée dans le dépôt
