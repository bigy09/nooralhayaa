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

Si la table `orders` existait déjà avant l'ajout du paiement, exécuter aussi
[`migrations/20260915_orders_payment_fields.sql`](migrations/20260915_orders_payment_fields.sql)
dans le SQL Editor Supabase. Le message `Could not find the 'paymentMethod'
column of 'orders' in the schema cache` signifie que cette mise à niveau n'a
pas encore été appliquée.

Le backend détecte maintenant `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` et utilise l'adaptateur Supabase pour l'authentification, le catalogue et les commandes. Sans ces deux variables, il conserve le repli MongoDB/mock.

Après avoir exécuté le schéma et ajouté les variables dans Render, redéployez le backend puis vérifiez `/api/health` :

```json
{"status":"ok","database":"connected","mode":"supabase"}
```

Les agrégations analytiques avancées et la migration des anciennes données MongoDB restent à traiter séparément.
