-- =============================================================================
-- FacturePlus — Stock négatif autorisé (réglage de l'entreprise)
--
-- parametres.autoriser_stock_negatif (oui par défaut) : une vente ou une sortie au-delà du stock
-- n'est plus refusée, la quantité passe en négatif (rupture, alerte « rupture »). Désactivé, le
-- comportement d'origine revient : « Stock insuffisant ».
-- Un ajustement (inventaire, correction) fixe toujours une quantité positive ou nulle.
-- =============================================================================

alter table public.parametres add column autoriser_stock_negatif boolean not null default true;
grant update (autoriser_stock_negatif) on public.parametres to authenticated;

alter table public.produits drop constraint if exists produits_quantite_check;

create or replace function prive.mouvementer(
  p_produit uuid, p_type public.type_mouvement, p_quantite numeric,
  p_motif text default null, p_reference text default null,
  p_document uuid default null, p_achat uuid default null, p_inventaire uuid default null
) returns numeric language plpgsql security definer set search_path = '' as $$
declare
  p public.produits;
  v_variation numeric;
  v_apres numeric;
begin
  if p_quantite is null or p_quantite < 0 or (p_type <> 'ajustement' and p_quantite = 0) then
    raise exception 'Quantité invalide';
  end if;

  select * into p from public.produits where id = p_produit for update;
  if p.id is null then raise exception 'Produit introuvable'; end if;

  v_variation := case p_type
    when 'entree' then p_quantite
    when 'sortie' then -p_quantite
    else p_quantite - p.quantite
  end;
  v_apres := p.quantite + v_variation;
  -- Stock négatif accepté si l'entreprise l'autorise (réglage par défaut) : la vente n'est pas bloquée
  if v_apres < 0 and not coalesce(
       (select par.autoriser_stock_negatif from public.parametres par where par.equipe_id = p.equipe_id), false) then
    raise exception 'Stock insuffisant pour « % » (disponible : %)', p.nom,
      trim(to_char(p.quantite, 'FM999999999990.###')) using errcode = 'P0001';
  end if;

  if v_variation <> 0 then
    update public.produits set quantite = v_apres where id = p_produit;
    insert into public.mouvements_stock (equipe_id, produit_id, type, variation, quantite_avant, quantite_apres,
      motif, reference, document_id, achat_id, inventaire_id, user_id)
    values (p.equipe_id, p_produit, p_type, v_variation, p.quantite, v_apres,
      nullif(trim(p_motif), ''), nullif(trim(p_reference), ''), p_document, p_achat, p_inventaire, (select auth.uid()));
  end if;

  perform prive.synchroniser_alerte(p_produit);
  return v_apres;
end;
$$;

