-- Bon de livraison : nom du livreur, saisi à la création du bon et affiché sur le PDF.

alter table public.documents add column livreur text check (char_length(livreur) <= 100);

drop function public.creer_bl(uuid);

-- Bon de livraison généré depuis une facture validée (validé d'office, sans effet sur le stock)
create or replace function public.creer_bl(p_facture uuid, p_livreur text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  d public.documents;
  v_id uuid;
begin
  select * into d from public.documents where id = p_facture;
  perform prive.verifier_membre(d.equipe_id);
  if d.type <> 'facture' or d.statut not in ('emis', 'paye') then
    raise exception 'Le bon de livraison se crée depuis une facture validée';
  end if;
  insert into public.documents (equipe_id, type, date, client_id, client_nom, client_telephone, client_adresse,
    notes, livreur, source_id, user_id)
  values (d.equipe_id, 'bl', current_date, d.client_id, d.client_nom, d.client_telephone, d.client_adresse,
    'Facture ' || d.numero, nullif(left(trim(p_livreur), 100), ''), d.id, (select auth.uid()))
  returning id into v_id;
  insert into public.document_lignes (document_id, equipe_id, position, produit_id, designation,
    description, unite, prix_unitaire, quantite, taxable, total)
  select v_id, equipe_id, position, produit_id, designation, description, unite, prix_unitaire,
    quantite, taxable, total
  from public.document_lignes where document_id = p_facture;
  perform prive.recalculer_document(v_id);
  perform public.valider_document(v_id);
  return v_id;
end;
$$;

revoke all on function public.creer_bl(uuid, text) from public, anon;
grant execute on function public.creer_bl(uuid, text) to authenticated;
