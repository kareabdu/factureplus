-- =============================================================================
-- FacturePlus — Modèle de document (facture, proforma, bon de livraison)
--
-- Quatre mises en page au choix, avec la couleur de l'entreprise (couleur_document) :
--   classique : logo et entreprise à gauche, numéro / dates / solde à droite
--   bandeau   : entreprise à gauche, client à droite, ligne d'informations en dessous
--   client    : entreprise en haut, client à gauche, informations en colonne à droite
--   moderne   : en-tête sur fond gris, titre du document en couleur
-- =============================================================================

alter table public.parametres
  add column modele_document text not null default 'classique'
  check (modele_document in ('classique', 'bandeau', 'client', 'moderne'));

-- Modifiable par les administrateurs, comme les autres paramètres
grant update (modele_document) on public.parametres to authenticated;
