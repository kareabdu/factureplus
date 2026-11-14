-- Ventes : retrouver les articles saisis librement, et « Client de passage » par défaut.

-- Articles saisis librement (lignes sans produit du catalogue) des factures, proformas et bons
-- de livraison de l'équipe, sans doublon (désignation insensible à la casse et aux espaces),
-- avec les prix, unité et taxe de la dernière saisie. De la saisie la plus récente à la plus ancienne.
-- security invoker : la RLS de documents / document_lignes s'applique.
create or replace function public.articles_libres(p_equipe uuid, p_recherche text default null, p_limite int default 30)
returns table (designation text, prix_unitaire bigint, unite text, taxable boolean, utilisations bigint, derniere_date date)
language sql stable security invoker set search_path = '' as $$
  with lignes as (
    select l.designation, l.prix_unitaire, l.unite, l.taxable, d.date, d.created_at, l.position,
           lower(regexp_replace(trim(l.designation), '\s+', ' ', 'g')) as cle
    from public.document_lignes l
    join public.documents d on d.id = l.document_id
    where l.equipe_id = p_equipe and l.produit_id is null
      and (coalesce(trim(p_recherche), '') = '' or l.designation ilike '%' || trim(p_recherche) || '%')
  ),
  derniers as (
    select distinct on (cle) cle, trim(designation) as designation, prix_unitaire, unite, taxable, date, created_at
    from lignes
    order by cle, created_at desc, position desc
  )
  select d.designation, d.prix_unitaire, d.unite, d.taxable,
         (select count(*) from lignes x where x.cle = d.cle) as utilisations, d.date as derniere_date
  from derniers d
  order by d.created_at desc, d.designation
  limit greatest(1, least(coalesce(p_limite, 30), 100));
$$;

revoke all on function public.articles_libres(uuid, text, int) from public, anon;
grant execute on function public.articles_libres(uuid, text, int) to authenticated;

-- Validation : une facture sans client est adressée au « Client de passage ».
-- (Les proformas et bons de livraison exigent toujours un client.)
create or replace function public.valider_document(p_document uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  d public.documents;
  par public.parametres;
  v_numero text;
begin
  select * into d from public.documents where id = p_document for update;
  perform prive.verifier_membre(d.equipe_id);
  if d.statut <> 'brouillon' then raise exception 'Document déjà validé'; end if;
  if not exists (select 1 from public.document_lignes where document_id = p_document) then
    raise exception 'Ajoutez au moins une ligne';
  end if;
  if trim(d.client_nom) = '' then
    if d.type = 'facture' then
      update public.documents set client_nom = 'Client de passage' where id = p_document;
    else
      raise exception 'Indiquez le client';
    end if;
  end if;
  select * into par from public.parametres where equipe_id = d.equipe_id;
  v_numero := prive.formater_numero(par.format_numero,
    case d.type when 'facture' then par.prefixe_facture when 'proforma' then par.prefixe_proforma else par.prefixe_bl end,
    extract(year from d.date)::int, prive.prochain_numero(d.equipe_id, d.type::text, d.date));
  update public.documents set statut = 'emis', numero = v_numero, valide_le = now() where id = p_document;
  perform prive.synchroniser_stock_document(p_document);
  return v_numero;
end;
$$;
