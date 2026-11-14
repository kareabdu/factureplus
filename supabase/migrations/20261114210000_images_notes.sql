-- =============================================================================
-- FacturePlus — Images dans les notes d'un document (facture, proforma, BL)
--
-- documents.images_notes : adresses publiques d'images déposées dans le stockage « produits »,
-- dossier de l'équipe (même espace que les logos et photos de produits). 4 images au plus.
-- Écrites par enregistrer_document (clé « images_notes » de l'en-tête), reprises à la conversion
-- d'une proforma en facture, imprimées sous les notes.
-- =============================================================================

alter table public.documents add column images_notes text[] not null default '{}'
  check (cardinality(images_notes) <= 4);

-- Images d'un en-tête : tableau JSON d'URL publiques du dossier de l'équipe, sans doublon, 4 au plus.
create or replace function prive.images_notes_valides(p_equipe uuid, p_images jsonb)
returns text[] language plpgsql immutable set search_path = '' as $$
declare
  v text[] := '{}';
  u text;
begin
  if p_images is null or jsonb_typeof(p_images) = 'null' then return v; end if;
  if jsonb_typeof(p_images) <> 'array' then raise exception 'Images des notes invalides'; end if;
  for u in select jsonb_array_elements_text(p_images) loop
    if u !~ '^https?://' or u not like '%/storage/v1/object/public/produits/' || p_equipe::text || '/%' or length(u) > 500 then
      raise exception 'Image des notes invalide';
    end if;
    if not u = any (v) then v := v || u; end if;
  end loop;
  if cardinality(v) > 4 then raise exception 'Quatre images au plus dans les notes'; end if;
  return v;
end;
$$;

create or replace function public.enregistrer_document(
  p_equipe uuid, p_type public.type_document, p_id uuid, p_entete jsonb, p_lignes jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := p_id;
  d public.documents;
  par public.parametres;
  l jsonb;
  v_pos int := 0;
  v_produit uuid;
  v_client uuid := nullif(p_entete ->> 'client_id', '')::uuid;
  v_client_nom text := trim(coalesce(p_entete ->> 'client_nom', ''));
  v_brouillon boolean := true;
  v_total bigint;
begin
  perform prive.verifier_membre(p_equipe);
  select * into par from public.parametres where equipe_id = p_equipe;

  if v_client is not null and v_client_nom = '' then
    select nom into v_client_nom from public.clients where id = v_client and equipe_id = p_equipe;
  end if;

  if v_id is null then
    insert into public.documents (equipe_id, type, user_id) values (p_equipe, p_type, (select auth.uid()))
    returning id into v_id;
  else
    select * into d from public.documents where id = v_id and equipe_id = p_equipe for update;
    if d.id is null then raise exception 'Document introuvable'; end if;
    v_brouillon := d.statut = 'brouillon';
    if not v_brouillon and trim(v_client_nom) = '' then raise exception 'Indiquez le client'; end if;
  end if;

  update public.documents set
    client_id = v_client,
    client_nom = v_client_nom,
    client_telephone = nullif(trim(p_entete ->> 'client_telephone'), ''),
    client_adresse = nullif(trim(p_entete ->> 'client_adresse'), ''),
    date = coalesce(nullif(p_entete ->> 'date', '')::date, current_date),
    echeance = nullif(p_entete ->> 'echeance', '')::date,
    conditions = coalesce(nullif(p_entete ->> 'conditions', ''), par.conditions_defaut),
    notes = nullif(p_entete ->> 'notes', ''),
    -- Clé absente (ancienne version de l'app) : images conservées
    images_notes = case when p_entete ? 'images_notes'
      then prive.images_notes_valides(p_equipe, p_entete -> 'images_notes') else images_notes end
  where id = v_id;

  -- Taxe : paramètres actuels pour un brouillon, taux figé pour un document validé
  if v_brouillon then
    update public.documents
    set taxe_type = par.taxe_type, taxe_nom = par.taxe_nom, taxe_taux = par.taxe_taux, taxe_incluse = par.taxe_incluse
    where id = v_id;
  end if;

  delete from public.document_lignes where document_id = v_id;
  for l in select * from jsonb_array_elements(coalesce(p_lignes, '[]'::jsonb)) loop
    v_produit := nullif(l ->> 'produit_id', '')::uuid;
    insert into public.document_lignes (document_id, equipe_id, position, produit_id, designation,
      description, unite, prix_unitaire, quantite, taxable, total)
    values (v_id, p_equipe, v_pos, v_produit, trim(l ->> 'designation'),
      nullif(l ->> 'description', ''), nullif(l ->> 'unite', ''),
      (l ->> 'prix_unitaire')::bigint, (l ->> 'quantite')::numeric, coalesce((l ->> 'taxable')::boolean, true),
      round((l ->> 'prix_unitaire')::bigint * (l ->> 'quantite')::numeric));
    v_pos := v_pos + 1;
  end loop;

  perform prive.recalculer_document(v_id);

  if not v_brouillon then
    if not exists (select 1 from public.document_lignes where document_id = v_id) then
      raise exception 'Un document validé doit garder au moins une ligne';
    end if;
    if d.type = 'facture' then
      select total into v_total from public.documents where id = v_id;
      if d.montant_paye > v_total then
        raise exception 'Le total (%) ne peut pas être inférieur au montant déjà encaissé (%)', v_total, d.montant_paye;
      end if;
      -- Payée / émise selon le nouveau total (une facture annulée le reste)
      if d.statut in ('emis', 'paye') then
        update public.documents
        set statut = case when d.montant_paye > 0 and d.montant_paye >= v_total
                          then 'paye'::public.statut_document else 'emis'::public.statut_document end
        where id = v_id;
      end if;
      -- Stock : sortie ou réinjection de la seule différence
      perform prive.synchroniser_stock_document(v_id);
    end if;
  end if;

  return v_id;
end;
$$;

revoke all on function public.enregistrer_document(uuid, public.type_document, uuid, jsonb, jsonb) from public, anon;
grant execute on function public.enregistrer_document(uuid, public.type_document, uuid, jsonb, jsonb) to authenticated;

-- Proforma acceptée → facture brouillon : images des notes reprises
create or replace function public.convertir_proforma(p_proforma uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  d public.documents;
  v_id uuid;
begin
  select * into d from public.documents where id = p_proforma for update;
  perform prive.verifier_membre(d.equipe_id);
  if d.type <> 'proforma' or d.statut not in ('emis', 'accepte') then
    raise exception 'Seule une proforma validée peut être convertie';
  end if;
  insert into public.documents (equipe_id, type, client_id, client_nom, client_telephone, client_adresse,
    conditions, notes, images_notes, taxe_type, taxe_nom, taxe_taux, taxe_incluse, source_id, user_id)
  values (d.equipe_id, 'facture', d.client_id, d.client_nom, d.client_telephone, d.client_adresse,
    d.conditions, d.notes, d.images_notes, d.taxe_type, d.taxe_nom, d.taxe_taux, d.taxe_incluse, d.id, (select auth.uid()))
  returning id into v_id;
  insert into public.document_lignes (document_id, equipe_id, position, produit_id, designation,
    description, unite, prix_unitaire, quantite, taxable, total)
  select v_id, equipe_id, position, produit_id, designation, description, unite, prix_unitaire,
    quantite, taxable, total
  from public.document_lignes where document_id = p_proforma;
  perform prive.recalculer_document(v_id);
  update public.documents set statut = 'accepte' where id = p_proforma;
  return v_id;
end;
$$;
