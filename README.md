# FacturePlus

Gestion de stock, ventes (factures, proformas, bons de livraison) et achats pour les commerçants.
Application **native Android et iOS** (Expo), **web** (Next.js), backend **Supabase**.

Réécriture de l'ancienne application générée avec base44 (conservée dans `legacy/` comme référence).

## Structure

```
apps/
  mobile/     Expo 58 — Android / iOS (scan code-barres, photos, PDF, partage WhatsApp)
  web/        Next.js 16 — application web
packages/
  core/       Code partagé : types, règles (montants, taxe, numéros), accès aux données, fournisseurs React
supabase/
  migrations/ Schéma SQL (tables, RLS, fonctions)
  tests/      Tests de la base (Postgres en mémoire, PGlite)
legacy/       Ancienne application base44 (lecture seule)
```

## Fonctionnalités (phase 1)

- Comptes (e-mail / mot de passe, mot de passe oublié par code), essai gratuit de 7 jours
- Produits : photo, code-barres (scan caméra sur mobile, douchette USB sur le web), catégories, prix, seuil d'alerte
- Stock : entrées, sorties, ajustements (journal inaltérable), alertes de stock bas, inventaires avec clôture
- Ventes : proformas → factures → bons de livraison, taxe (TVA incluse ou non, retenue), règlements
  (espèces, Wave, Orange Money…), PDF, impression, partage WhatsApp
- Achats fournisseurs : brouillon puis réception (entrée en stock, mise à jour du coût d'achat)
- Clients, fournisseurs, paramètres d'entreprise (logo, numérotation, mentions légales)
- Tableau de bord : ventes du mois, marge, impayés, valeur du stock, meilleures ventes

Différences voulues avec l'ancienne application :

- Toute la logique de stock est **dans la base** (fonctions SQL transactionnelles) : plus de double déduction ni de
  stock incohérent si la connexion coupe en cours d'opération.
- Le stock ne devient **jamais négatif** : une vente au-delà du stock disponible est refusée avec un message clair.
- Une facture **validée ne se modifie plus** : on l'annule (le stock est réintégré) et on en refait une.
- Numérotation **sans trou**, attribuée à la validation.

Hors phase 1 : multi-emplacements, équipe et journal d'activité, banque et rapprochement, dépenses,
livreurs, parrainage, paiement de l'abonnement (Wave / Orange Money), exports CSV, migration des données base44.

## Installation

```bash
pnpm install
```

Variables d'environnement (non versionnées), à partir des modèles :

- `apps/web/.env.local` ← `apps/web/.env.example`
- `apps/mobile/.env` ← `apps/mobile/.env.example`

## Base de données (Supabase)

1. Créer un projet Supabase, puis appliquer les migrations :
   ```bash
   npx supabase@latest login
   npx supabase@latest link --project-ref <ref-du-projet>
   pnpm db:push
   pnpm db:types
   ```
2. **Authentication → Email Templates → Reset Password** : afficher le code `{{ .Token }}` dans le message
   (le mot de passe oublié fonctionne par code à 6 chiffres, sur mobile comme sur le web).
3. **Authentication → URL Configuration** : ajouter l'URL du web (`http://localhost:3000/**` et la production)
   et `factureplus://**` aux « Redirect URLs » (lien de confirmation d'e-mail).
4. Le compartiment de stockage `produits` (photos, logos) est créé par la migration `20261111150852_tableau_de_bord.sql`.

Tester la base sans Supabase :

```bash
pnpm test:db
```

## Lancer

```bash
pnpm dev:mobile    # Expo (Android / iOS)
pnpm dev:web       # http://localhost:3000
pnpm typecheck
pnpm test:core
```

Le scan de code-barres, l'appareil photo et l'impression demandent un **build de développement**
(`npx eas-cli@latest build --profile development`) : Expo Go ne suffit pas pour tous les modules.
Les builds iOS se font via EAS (pas de compilation iOS sous Windows).
