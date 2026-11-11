-- =============================================================================
-- StockTracker — Ventes : clients, documents (facture, proforma, BL), règlements
--
-- Cycle : brouillon (modifiable) → validation (numéro sans trou, stock déduit pour
-- une facture) → règlements → payé. Une facture validée ne se modifie plus : on
-- l'annule (stock réinjecté) et on en refait une.
-- Le stock d'une facture est rapproché par prive.synchroniser_stock_document,
-- idempotent : delta = quantité requise − quantité déjà sortie pour ce document.
-- =============================================================================

create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  equipe_id   uuid not null references public.equipes (id) on delete cascade,
  nom         text not null check (length(trim(nom)) between 1 and 200),
  telephone   text check (telephone is null or length(telephone) <= 30),
  email       text check (email is null or length(email) <= 200),
  adresse     text check (adresse is null or length(adresse) <= 300),
  notes       text check (notes is null or length(notes) <= 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, equipe_id)
);

create index clients_equipe_nom_idx on public.clients (equipe_id, nom);

create trigger clients_updated_at before update on public.clients
  for each row execute function prive.maj_updated_at();

create type public.type_document as enum ('facture', 'proforma', 'bl');
create type public.statut_document as enum ('brouillon', 'emis', 'paye', 'accepte', 'refuse', 'annule');
create type public.mode_paiement as enum ('especes', 'wave', 'orange_money', 'carte', 'virement', 'cheque', 'credit', 'autre');

create table public.documents (
  id               uuid primary key default gen_random_uuid(),
  equipe_id        uuid not null references public.equipes (id) on delete cascade,
  type             public.type_document not null,
  statut           public.statut_document not null default 'brouillon',
  numero           text check (numero is null or length(numero) <= 60),
  date             date not null default current_date,
  echeance         date,
  client_id        uuid,
  client_nom       text not null default '' check (length(client_nom) <= 200),
  client_telephone text check (client_telephone is null or length(client_telephone) <= 30),
  client_adresse   text check (client_adresse is null or length(client_adresse) <= 300),
  conditions       text check (conditions is null or length(conditions) <= 1000),
  notes            text check (notes is null or length(notes) <= 2000),
  -- Taxe figée à l'enregistrement
  taxe_type        text not null default 'aucune',
  taxe_nom         text not null default 'TVA',
  taxe_taux        numeric(5, 2) not null default 0,
  taxe_incluse     boolean not null default false,
  sous_total       bigint not null default 0,
  base_taxable     bigint not null default 0,
  montant_taxe     bigint not null default 0,
  total            bigint not null default 0,
  montant_paye     bigint not null default 0 check (montant_paye >= 0),
  -- Proforma convertie, ou facture d'origine d'un BL
  source_id        uuid references public.documents (id) on delete set null,
  user_id          uuid references auth.users (id) on delete set null,
  valide_le        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, equipe_id),
  foreign key (client_id, equipe_id) references public.clients (id, equipe_id) on delete set null (client_id),
  constraint documents_numero_si_valide check ((statut = 'brouillon') = (numero is null))
);

create unique index documents_numero_unique on public.documents (equipe_id, type, numero) where numero is not null;
create index documents_equipe_idx on public.documents (equipe_id, type, date desc);
create index documents_client_idx on public.documents (client_id) where client_id is not null;

create trigger documents_updated_at before update on public.documents
  for each row execute function prive.maj_updated_at();

create table public.document_lignes (
  id             uuid primary key default gen_random_uuid(),
  document_id    uuid not null,
  equipe_id      uuid not null,
  position       int not null default 0,
  produit_id     uuid,
  designation    text not null check (length(trim(designation)) between 1 and 300),
  description    text check (description is null or length(description) <= 1000),
  unite          text check (unite is null or length(unite) <= 20),
  prix_unitaire  bigint not null check (prix_unitaire >= 0),
  quantite       numeric(14, 3) not null check (quantite > 0),
  taxable        boolean not null default true,
  total          bigint not null,
  foreign key (document_id, equipe_id) references public.documents (id, equipe_id) on delete cascade,
  foreign key (produit_id, equipe_id) references public.produits (id, equipe_id) on delete restrict
);

create index document_lignes_document_idx on public.document_lignes (document_id, position);

create table public.reglements (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null,
  equipe_id   uuid not null,
  montant     bigint not null check (montant > 0),
  mode        public.mode_paiement not null default 'especes',
  date        date not null default current_date,
  reference   text check (reference is null or length(reference) <= 60),
  user_id     uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  foreign key (document_id, equipe_id) references public.documents (id, equipe_id) on delete cascade
);

create index reglements_document_idx on public.reglements (document_id);

alter table public.mouvements_stock
  add foreign key (document_id) references public.documents (id) on delete restrict;

-- -----------------------------------------------------------------------------
-- Calculs
-- -----------------------------------------------------------------------------
-- Taxe (règles de l'ancienne app, lib/tax.js) : la base est la somme des lignes taxables.
create or replace function prive.recalculer_document(p_document uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  d public.documents;
  v_sous_total bigint;
  v_base bigint;
  v_taxe bigint := 0;
  v_total bigint;
begin
  select * into d from public.documents where id = p_document;
  select coalesce(sum(total), 0), coalesce(sum(total) filter (where taxable), 0)
    into v_sous_total, v_base
  from public.document_lignes where document_id = p_document;
  v_total := v_sous_total;
  if d.taxe_type <> 'aucune' and d.taxe_taux > 0 then
    if d.taxe_incluse and d.taxe_type <> 'deduction' then
      v_taxe := round(v_base - v_base / (1 + d.taxe_taux / 100));
    else
      v_taxe := round(v_base * d.taxe_taux / 100) * case when d.taxe_type = 'deduction' then -1 else 1 end;
      v_total := v_sous_total + v_taxe;
    end if;
  end if;
  update public.documents
  set sous_total = v_sous_total, base_taxable = v_base, montant_taxe = v_taxe, total = v_total
  where id = p_document;
end;
$$;

-- Rapprochement idempotent du stock d'un document.
-- Requis : lignes d'une facture émise ou payée ; 0 sinon (brouillon, annulée, proforma, BL).
create or replace function prive.synchroniser_stock_document(p_document uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare
  d public.documents;
  r record;
  v_n int := 0;
begin
  select * into d from public.documents where id = p_document;
  for r in
    with requis as (
      select produit_id, sum(quantite) as q
      from public.document_lignes
      where document_id = p_document and produit_id is not null
        and d.type = 'facture' and d.statut in ('emis', 'paye')
      group by produit_id
    ), deja as (
      select produit_id, -sum(variation) as q
      from public.mouvements_stock where document_id = p_document
      group by produit_id
    )
    select coalesce(a.produit_id, b.produit_id) as produit_id,
           coalesce(a.q, 0) - coalesce(b.q, 0) as delta
    from requis a
    full join deja b on b.produit_id = a.produit_id
    -- Les réinjections d'abord ; ordre stable des produits pour éviter les interblocages
    order by 2, 1
  loop
    if r.delta > 0 then
      perform prive.mouvementer(r.produit_id, 'sortie', r.delta, 'Facture', d.numero, p_document);
      v_n := v_n + 1;
    elsif r.delta < 0 then
      perform prive.mouvementer(r.produit_id, 'entree', -r.delta,
        case when d.statut = 'annule' then 'Annulation de facture' else 'Correction de facture' end, d.numero, p_document);
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC : enregistrement d'un brouillon (en-tête + lignes remplacées)
-- p_entete : { client_id, client_nom, client_telephone, client_adresse, date, echeance, conditions, notes }
-- p_lignes : [{ produit_id, designation, description, unite, prix_unitaire, quantite, taxable }]
-- -----------------------------------------------------------------------------
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
    if d.statut <> 'brouillon' then
      raise exception 'Document validé : il ne peut plus être modifié';
    end if;
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
    taxe_type = par.taxe_type, taxe_nom = par.taxe_nom, taxe_taux = par.taxe_taux, taxe_incluse = par.taxe_incluse
  where id = v_id;

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
  return v_id;
end;
$$;

create or replace function prive.libelle_type(p_type public.type_document)
returns text language sql immutable set search_path = '' as $$
  select case p_type when 'facture' then 'Facture' when 'proforma' then 'Proforma' else 'Bon de livraison' end;
$$;

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
  if trim(d.client_nom) = '' then raise exception 'Indiquez le client'; end if;
  select * into par from public.parametres where equipe_id = d.equipe_id;
  v_numero := prive.formater_numero(par.format_numero,
    case d.type when 'facture' then par.prefixe_facture when 'proforma' then par.prefixe_proforma else par.prefixe_bl end,
    extract(year from d.date)::int, prive.prochain_numero(d.equipe_id, d.type::text, d.date));
  update public.documents set statut = 'emis', numero = v_numero, valide_le = now() where id = p_document;
  perform prive.synchroniser_stock_document(p_document);
  return v_numero;
end;
$$;

create or replace function public.annuler_document(p_document uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  d public.documents;
begin
  select * into d from public.documents where id = p_document for update;
  perform prive.verifier_membre(d.equipe_id);
  if d.statut = 'brouillon' then raise exception 'Un brouillon se supprime, il ne s''annule pas'; end if;
  if d.statut = 'annule' then return; end if;
  update public.documents set statut = 'annule' where id = p_document;
  perform prive.synchroniser_stock_document(p_document);
end;
$$;

-- Proforma : acceptée (→ nouvelle facture brouillon) ou refusée
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
    conditions, notes, taxe_type, taxe_nom, taxe_taux, taxe_incluse, source_id, user_id)
  values (d.equipe_id, 'facture', d.client_id, d.client_nom, d.client_telephone, d.client_adresse,
    d.conditions, d.notes, d.taxe_type, d.taxe_nom, d.taxe_taux, d.taxe_incluse, d.id, (select auth.uid()))
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

create or replace function public.refuser_proforma(p_proforma uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  d public.documents;
begin
  select * into d from public.documents where id = p_proforma for update;
  perform prive.verifier_membre(d.equipe_id);
  if d.type <> 'proforma' or d.statut <> 'emis' then raise exception 'Proforma non validée'; end if;
  update public.documents set statut = 'refuse' where id = p_proforma;
end;
$$;

-- Bon de livraison généré depuis une facture validée (validé d'office, sans effet sur le stock)
create or replace function public.creer_bl(p_facture uuid)
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
    notes, source_id, user_id)
  values (d.equipe_id, 'bl', current_date, d.client_id, d.client_nom, d.client_telephone, d.client_adresse,
    'Facture ' || d.numero, d.id, (select auth.uid()))
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

-- -----------------------------------------------------------------------------
-- Règlements
-- -----------------------------------------------------------------------------
create or replace function public.enregistrer_reglement(
  p_document uuid, p_montant bigint, p_mode public.mode_paiement default 'especes',
  p_date date default current_date, p_reference text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  d public.documents;
  v_id uuid;
begin
  select * into d from public.documents where id = p_document for update;
  perform prive.verifier_membre(d.equipe_id);
  if d.type <> 'facture' or d.statut <> 'emis' then
    raise exception 'Seule une facture validée non soldée peut recevoir un règlement';
  end if;
  if p_montant is null or p_montant <= 0 then raise exception 'Montant invalide'; end if;
  if p_montant > d.total - d.montant_paye then
    raise exception 'Le règlement dépasse le reste à payer (%)', d.total - d.montant_paye;
  end if;
  insert into public.reglements (document_id, equipe_id, montant, mode, date, reference, user_id)
  values (p_document, d.equipe_id, p_montant, p_mode, coalesce(p_date, current_date),
    nullif(trim(p_reference), ''), (select auth.uid()))
  returning id into v_id;
  update public.documents set montant_paye = montant_paye + p_montant,
    statut = case when montant_paye + p_montant >= total then 'paye'::public.statut_document else statut end
  where id = p_document;
  return v_id;
end;
$$;

create or replace function public.supprimer_reglement(p_reglement uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  r public.reglements;
  d public.documents;
begin
  select * into r from public.reglements where id = p_reglement;
  if r.id is null then raise exception 'Règlement introuvable'; end if;
  select * into d from public.documents where id = r.document_id for update;
  perform prive.verifier_membre(d.equipe_id);
  if d.statut = 'annule' then raise exception 'Facture annulée'; end if;
  delete from public.reglements where id = p_reglement;
  update public.documents set montant_paye = montant_paye - r.montant, statut = 'emis' where id = d.id;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS et droits
-- -----------------------------------------------------------------------------
alter table public.clients enable row level security;
alter table public.documents enable row level security;
alter table public.document_lignes enable row level security;
alter table public.reglements enable row level security;

revoke all on public.clients, public.documents, public.document_lignes, public.reglements from anon, authenticated;

grant select, delete on public.clients to authenticated;
grant insert (equipe_id, nom, telephone, email, adresse, notes),
  update (nom, telephone, email, adresse, notes) on public.clients to authenticated;
create policy clients_membres on public.clients for all to authenticated
  using (prive.est_membre(equipe_id)) with check (prive.est_membre(equipe_id));

-- Documents : écriture par RPC ; suppression directe des seuls brouillons
grant select, delete on public.documents to authenticated;
create policy documents_lecture on public.documents for select to authenticated using (prive.est_membre(equipe_id));
create policy documents_suppression on public.documents for delete to authenticated
  using (prive.est_membre(equipe_id) and statut = 'brouillon');

grant select on public.document_lignes, public.reglements to authenticated;
create policy document_lignes_lecture on public.document_lignes for select to authenticated
  using (prive.est_membre(equipe_id));
create policy reglements_lecture on public.reglements for select to authenticated
  using (prive.est_membre(equipe_id));

revoke all on function public.enregistrer_document(uuid, public.type_document, uuid, jsonb, jsonb),
  public.valider_document(uuid), public.annuler_document(uuid), public.convertir_proforma(uuid),
  public.refuser_proforma(uuid), public.creer_bl(uuid),
  public.enregistrer_reglement(uuid, bigint, public.mode_paiement, date, text),
  public.supprimer_reglement(uuid) from public, anon;
grant execute on function public.enregistrer_document(uuid, public.type_document, uuid, jsonb, jsonb),
  public.valider_document(uuid), public.annuler_document(uuid), public.convertir_proforma(uuid),
  public.refuser_proforma(uuid), public.creer_bl(uuid),
  public.enregistrer_reglement(uuid, bigint, public.mode_paiement, date, text),
  public.supprimer_reglement(uuid) to authenticated;
