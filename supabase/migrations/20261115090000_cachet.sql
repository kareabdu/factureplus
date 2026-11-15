-- =============================================================================
-- FacturePlus — Signature et cachet de l'entreprise sur les documents
--
-- parametres.signature_url (existante) et parametres.cachet_url : images déposées dans le
-- stockage « produits » (dossier de l'équipe), choisies dans Paramètres. Imprimées en bas à
-- droite des factures, proformas et bons de livraison (« Pour l'entreprise »).
-- =============================================================================

alter table public.parametres
  add column cachet_url text check (cachet_url is null or length(cachet_url) <= 500);

-- Modifiable par les administrateurs, comme les autres paramètres
grant update (cachet_url) on public.parametres to authenticated;
