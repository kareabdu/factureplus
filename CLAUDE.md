# FacturePlus — instructions pour Claude Code

Gestion de stock, ventes (factures, proformas, bons de livraison) et achats pour commerçants d'Afrique de l'Ouest.
Android et iOS (Expo), web (Next.js), backend Supabase. Réécriture native de l'ancienne app base44 (dans `legacy/`).

Tout est en **français** : code (noms de variables, fonctions, tables), interface, messages d'erreur, commits.

## Environnement

- Windows, PowerShell. Si `pnpm` est refusé (politique d'exécution), utiliser `pnpm.cmd` / `npx.cmd`.
- Variables (non versionnées) : `apps/web/.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
  et `apps/mobile/.env` (`EXPO_PUBLIC_…`).
- Dépôt : https://github.com/kareabdu/factureplus, branche `main`.
  Toujours le compte GitHub **kareabdu** : remote `https://kareabdu@github.com/…`, identité locale
  `kareabdu <36815642+kareabdu@users.noreply.github.com>` (vérifier `git config user.name` avant de commiter).
- Supabase : projet « factureplus », id `munketogvbztfvoiryeh` (organisation AppliKare, eu-west-1).
- Site web en ligne : https://factureplus.kareapps.com (CNAME chez Namecheap), aussi https://factureplus-zeta.vercel.app ;
  URL du site Supabase = domaine kareapps ; les deux sont autorisés en redirection.
  Hébergé sur Vercel (projet `factureplus`, équipe kareabdou-3392, racine `apps/web`) : déployé à chaque push
  sur `main`. Variables `NEXT_PUBLIC_SUPABASE_*` définies dans Vercel (type Config).
- iOS se compile via EAS (`eas build -p ios`) : pas de build iOS local sous Windows.

## Commandes

```
pnpm install
pnpm dev:mobile       # Expo
pnpm dev:web          # http://localhost:3000
pnpm typecheck        # tsc sur core, web et mobile
pnpm test:core        # règles métier partagées
pnpm test:db          # tests SQL (PGlite, sans Supabase) — doivent tous passer
pnpm build:web
```

Avant chaque commit : `pnpm typecheck`, `pnpm test:core`, `pnpm test:db`, et `pnpm build:web` si le web a changé.
Après chaque modification : commiter et pousser sur `main` sans demander (vérifications ci-dessus d'abord).

## Structure

- `packages/core` (`@factureplus/core`) : types, règles métier (montants, taxe, numéros, plans) et accès aux données
  partagés web/mobile ; fournisseurs React dans `@factureplus/core/react`. Toute logique réutilisable va ici.
- `apps/mobile` : Expo 58, expo-router. Onglets natifs accueil / produits / ventes / plus ; écrans de pile
  et modales déclarés dans `src/app/_layout.tsx` (`Stack.Protected`). Composants d'interface dans
  `src/components/ui.tsx`, icônes (SF Symbols / Material) dans `icone.tsx`. Les écrans de sélection (scanner,
  choix de produit / client / fournisseur) renvoient leur valeur via `src/lib/selection.ts`.
  ⚠️ Lire `apps/mobile/AGENTS.md` : vérifier les API Expo 58 dans `node_modules` avant de les utiliser.
- `apps/web` : Next.js 16 (App Router, Tailwind 4, `cacheComponents`). Pages client sous `app/(espace)/…`,
  paramètres d'URL (`?id=`) lus dans un `<Suspense>`. Les layouts `(public)` et `(espace)` sont des fichiers
  serveur (`export const instant = false`) qui enveloppent `components/cadre-*.tsx`.
  ⚠️ Next.js 16 diffère des versions connues : lire `node_modules/next/dist/docs/` avant d'utiliser une API.
- Hors périmètre actuel (ne pas réintroduire sans demande) : multi-emplacements, gestion d'équipe et journal
  d'activité. La table `membres_equipe` existe mais chaque compte est seul dans son équipe.
- `supabase/migrations` : schéma SQL. `supabase/tests` : tests PGlite (`outils.mjs` imite Supabase).
- `legacy/` : ancien code base44 (référence fonctionnelle, ne pas modifier, ne pas importer).

## Règles de la base

- **RLS partout.** Lecture par `prive.est_membre(equipe_id)`. Écritures sensibles (stock, documents validés,
  numéros, règlements, achats, inventaires) uniquement via RPC `security definer set search_path = ''`.
  Les tables simples (catalogue, clients, fournisseurs) sont écrites directement, avec droits par colonne.
- Tout mouvement de stock passe par `prive.mouvementer(…)` : verrouille le produit, met à jour `produits.quantite`,
  refuse le stock négatif, synchronise `alertes_stock`, écrit `mouvements_stock` (inaltérable).
- Le stock d'une facture est rapproché par `prive.synchroniser_stock_document` (idempotent :
  delta = requis − déjà déduit par produit, d'après les mouvements liés au document). Requis = lignes si la
  facture est émise ou payée, 0 sinon (annulation = réinjection).
- Les règles de calcul dupliquées côté client (taxe : `packages/core/src/taxe.ts`, numéros : `numeros.ts`)
  doivent rester identiques au SQL ; `tests/regles.test.ts` reprend les cas de `ventes.test.mjs`.
- Montants entiers (`bigint`, devise sans décimales), quantités `numeric(14,3)`.
- Numérotation sans trou par `prive.prochain_numero(equipe, type, année)` (compteur verrouillé), attribuée à la validation.
- Une nouvelle migration s'accompagne d'un fichier `supabase/tests/<module>.test.mjs` ajouté à `test:db`.
- Rôles d'équipe (pour plus tard) : `proprietaire`, `admin`, `membre`. Paramètres : proprietaire/admin.
- **Abonnement** : `prive.etat_abonnement` (admin / actif / essai / expire, recopié dans `packages/core/src/regles-abonnement.ts`).
  Équipe dont le propriétaire est expiré = lecture seule : déclencheur `a_exiger_abonnement` sur chaque table métier
  (toute nouvelle table métier avec `equipe_id` doit le recevoir). Tarifs : `public.tarifs_abonnement()` = `PLANS_ABONNEMENT`.
- **Paiement Unitech Pay** (Wave, Orange Money Max It) : fonctions Edge `supabase/functions/unitech-*` (paiement, verifier avec JWT ;
  webhook signé HMAC et retour sans JWT). Paiements confirmés uniquement par `activer_paiement_abonnement` (rôle service).
  Secrets Supabase : `UNITECH_API_KEY`, `ORIGINES_WEB` (origines du site autorisées au retour, séparées par des virgules).
- **Administration de la plateforme** : table `administrateurs_plateforme` (alimentée à la main en SQL, jamais par migration),
  RPC `admin_*` contrôlées par `prive.verifier_admin_plateforme()`.
