# Migration Supabase

Le schéma PostgreSQL est dans `supabase/schema.sql`.

## Mise en place gratuite

1. Créer un projet Supabase Free.
2. Ouvrir **SQL Editor**.
3. Coller le contenu de `schema.sql` et cliquer sur **Run**.
4. Dans **Project Settings > API**, récupérer `Project URL`.
5. Dans **Project Settings > API**, récupérer la clé `service_role` uniquement pour Render.

Variables Render à ajouter :

```env
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role
```

Ne jamais mettre `SUPABASE_SERVICE_ROLE_KEY` dans le frontend, Cloudflare Pages ou Git.

## État de la migration

Le backend actuel utilise encore Mongoose pour ses routes. Le fichier SQL constitue le socle de migration; l'adaptateur Supabase doit être activé après création du projet et vérification des variables Render. Tant que cette activation n'est pas faite, ne retirez pas `MONGODB_URI` du backend de production.
