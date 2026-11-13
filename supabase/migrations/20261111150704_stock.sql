-- =============================================================================
-- FacturePlus — Catalogue et stock
--
-- • categories, fournisseurs, produits (+ fournisseurs du produit)
-- • mouvements_stock : journal inaltérable, écrit uniquement par prive.mouvementer
-- • alertes_stock : synchronisées à chaque mouvement (seuil de réapprovisionnement)
-- • inventaires : comptage puis clôture (ajustements automatiques)
--
-- Stock unique par produit (pas de multi-emplacement en phase 1).
-- Le stock ne devient jamais négatif (l'ancienne app le ramenait silencieusement à 0).
-- =============================================================================

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  equipe_id   uuid not null references public.equipes (id) on delete cascade,
  nom         text not null check (length(trim(nom)) between 1 and 100),
  description text check (description is null or length(description) <= 500),
  couleur     text check (couleur is null or couleur ~ '^#[0-9A-Fa-f]{6}$'),
  created_at  timestamptz not null default now(),
  unique (equipe_id, nom),
  unique (id, equipe_id)
);

create table public.fournisseurs (
  id          uuid primary key default gen_random_uuid(),
  equipe_id   uuid not null references public.equipes (id) on delete cascade,
  nom         text not null check (length(trim(nom)) between 1 and 200),
  telephone   text check (telephone is null or length(telephone) <= 30),
  email       text check (email is null or length(email) <= 200),
  adresse     text check (adresse is null or length(adresse) <= 300),
  contact     text check (contact is null or length(contact) <= 120),
  notes       text check (notes is null or length(notes) <= 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, equipe_id)
);

create trigger fournisseurs_updated_at before update on public.fournisseurs
  for each row execute function prive.maj_updated_at();

create table public.produits (
  id             uuid primary key default gen_random_uuid(),
  equipe_id      uuid not null references public.equipes (id) on delete cascade,
  nom            text not null check (length(trim(nom)) between 1 and 200),
  reference      text check (reference is null or length(reference) <= 60),
  code_barres    text check (code_barres is null or length(code_barres) <= 64),
  categorie_id   uuid,
  description    text check (description is null or length(description) <= 2000),
  unite          text not null default 'Pcs' check (length(unite) between 1 and 20),
  prix_vente     bigint not null default 0 check (prix_vente >= 0),
  prix_achat     bigint not null default 0 check (prix_achat >= 0),
  seuil_alerte   numeric(14, 3) not null default 0 check (seuil_alerte >= 0),
  quantite       numeric(14, 3) not null default 0 check (quantite >= 0),
  image_url      text,
  actif          boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, equipe_id),
  foreign key (categorie_id, equipe_id) references public.categories (id, equipe_id) on delete set null (categorie_id)
);

create unique index produits_reference_unique on public.produits (equipe_id, reference) where reference is not null;
create unique index produits_code_barres_unique on public.produits (equipe_id, code_barres) where code_barres is not null;
create index produits_equipe_nom_idx on public.produits (equipe_id, nom);

create trigger produits_updated_at before update on public.produits
  for each row execute function prive.maj_updated_at();

create table public.produit_fournisseurs (
  produit_id     uuid not null,
  fournisseur_id uuid not null,
  equipe_id      uuid not null,
  reference      text check (reference is null or length(reference) <= 60),
  principal      boolean not null default false,
  primary key (produit_id, fournisseur_id),
  foreign key (produit_id, equipe_id) references public.produits (id, equipe_id) on delete cascade,
  foreign key (fournisseur_id, equipe_id) references public.fournisseurs (id, equipe_id) on delete cascade
);

create type public.type_mouvement as enum ('entree', 'sortie', 'ajustement');

create table public.mouvements_stock (
  id               bigint generated always as identity primary key,
  equipe_id        uuid not null references public.equipes (id) on delete cascade,
  produit_id       uuid not null,
  type             public.type_mouvement not null,
  -- Variation signée appliquée au stock (+ entrée, − sortie)
  variation        numeric(14, 3) not null,
  quantite_avant   numeric(14, 3) not null,
  quantite_apres   numeric(14, 3) not null,
  motif            text check (motif is null or length(motif) <= 200),
  reference        text check (reference is null or length(reference) <= 60),
  -- Origine (au plus une)
  document_id      uuid,
  achat_id         uuid,
  inventaire_id    uuid,
  user_id          uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  foreign key (produit_id, equipe_id) references public.produits (id, equipe_id) on delete restrict
);

create index mouvements_produit_idx on public.mouvements_stock (produit_id, created_at desc);
create index mouvements_equipe_idx on public.mouvements_stock (equipe_id, created_at desc);
create index mouvements_document_idx on public.mouvements_stock (document_id) where document_id is not null;
create index mouvements_achat_idx on public.mouvements_stock (achat_id) where achat_id is not null;

create table public.alertes_stock (
  id           uuid primary key default gen_random_uuid(),
  equipe_id    uuid not null references public.equipes (id) on delete cascade,
  produit_id   uuid not null,
  quantite     numeric(14, 3) not null,
  seuil        numeric(14, 3) not null,
  statut       text not null default 'active' check (statut in ('active', 'resolue')),
  notifiee     boolean not null default false,
  created_at   timestamptz not null default now(),
  resolue_le   timestamptz,
  foreign key (produit_id, equipe_id) references public.produits (id, equipe_id) on delete cascade
);

create unique index alertes_une_active on public.alertes_stock (produit_id) where statut = 'active';

create table public.inventaires (
  id             uuid primary key default gen_random_uuid(),
  equipe_id      uuid not null references public.equipes (id) on delete cascade,
  reference      text not null check (length(reference) <= 60),
  date           date not null default current_date,
  statut         text not null default 'brouillon' check (statut in ('brouillon', 'cloture')),
  notes          text check (notes is null or length(notes) <= 2000),
  ecarts         int not null default 0,
  user_id        uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  cloture_le     timestamptz,
  unique (id, equipe_id)
);

create table public.inventaire_lignes (
  inventaire_id      uuid not null,
  produit_id         uuid not null,
  equipe_id          uuid not null,
  quantite_theorique numeric(14, 3) not null,
  quantite_comptee   numeric(14, 3) check (quantite_comptee is null or quantite_comptee >= 0),
  primary key (inventaire_id, produit_id),
  foreign key (inventaire_id, equipe_id) references public.inventaires (id, equipe_id) on delete cascade,
  foreign key (produit_id, equipe_id) references public.produits (id, equipe_id) on delete cascade
);

alter table public.mouvements_stock
  add foreign key (inventaire_id) references public.inventaires (id) on delete restrict;

-- -----------------------------------------------------------------------------
-- Cœur : un mouvement de stock atomique
-- p_quantite : quantité entrée/sortie (> 0), ou nouvelle quantité pour un ajustement (≥ 0).
-- Retourne la nouvelle quantité.
-- -----------------------------------------------------------------------------
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
  if v_apres < 0 then
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

create or replace function prive.synchroniser_alerte(p_produit uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.produits;
begin
  select * into p from public.produits where id = p_produit;
  if p.actif and p.seuil_alerte > 0 and p.quantite <= p.seuil_alerte then
    insert into public.alertes_stock (equipe_id, produit_id, quantite, seuil)
    values (p.equipe_id, p.id, p.quantite, p.seuil_alerte)
    on conflict (produit_id) where statut = 'active'
    do update set quantite = excluded.quantite, seuil = excluded.seuil;
  else
    update public.alertes_stock set statut = 'resolue', resolue_le = now()
    where produit_id = p.id and statut = 'active';
  end if;
end;
$$;

-- Le seuil modifié sur la fiche produit met aussi l'alerte à jour
create or replace function prive.produit_seuil_modifie()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform prive.synchroniser_alerte(new.id);
  return new;
end;
$$;

create trigger produits_seuil_alerte after update of seuil_alerte, actif on public.produits
  for each row execute function prive.produit_seuil_modifie();

-- RPC publique : mouvement manuel
create or replace function public.mouvementer_stock(
  p_produit uuid, p_type public.type_mouvement, p_quantite numeric,
  p_motif text default null, p_reference text default null
) returns numeric language plpgsql security definer set search_path = '' as $$
begin
  perform prive.verifier_membre((select equipe_id from public.produits where id = p_produit));
  return prive.mouvementer(p_produit, p_type, p_quantite, p_motif, p_reference);
end;
$$;

-- Création d'un produit avec stock initial (référence automatique si activée)
create or replace function public.creer_produit(p_equipe uuid, p_produit jsonb, p_stock_initial numeric default 0)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_ref text := nullif(trim(p_produit ->> 'reference'), '');
  par public.parametres;
begin
  perform prive.verifier_membre(p_equipe);
  select * into par from public.parametres where equipe_id = p_equipe;
  if v_ref is null and par.ref_produit_auto then
    -- Compteur perpétuel (année fixe) pour les références produit
    v_ref := par.prefixe_ref_produit || lpad(prive.prochain_numero(p_equipe, 'produit', date '2000-01-01')::text, 4, '0');
  end if;
  insert into public.produits (equipe_id, nom, reference, code_barres, categorie_id, description, unite,
    prix_vente, prix_achat, seuil_alerte, image_url)
  values (p_equipe, trim(p_produit ->> 'nom'), v_ref, nullif(trim(p_produit ->> 'code_barres'), ''),
    nullif(p_produit ->> 'categorie_id', '')::uuid, nullif(p_produit ->> 'description', ''),
    coalesce(nullif(trim(p_produit ->> 'unite'), ''), par.unite_defaut, 'Pcs'),
    coalesce((p_produit ->> 'prix_vente')::bigint, 0), coalesce((p_produit ->> 'prix_achat')::bigint, 0),
    coalesce((p_produit ->> 'seuil_alerte')::numeric, 0), nullif(p_produit ->> 'image_url', ''))
  returning id into v_id;
  if coalesce(p_stock_initial, 0) > 0 then
    perform prive.mouvementer(v_id, 'entree', p_stock_initial, 'Stock initial');
  else
    perform prive.synchroniser_alerte(v_id);
  end if;
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Inventaires
-- -----------------------------------------------------------------------------
create or replace function public.creer_inventaire(p_equipe uuid, p_notes text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_n int;
begin
  perform prive.verifier_membre(p_equipe);
  v_n := prive.prochain_numero(p_equipe, 'inventaire');
  insert into public.inventaires (equipe_id, reference, notes, user_id)
  values (p_equipe, 'INV-' || extract(year from current_date)::int || '-' || lpad(v_n::text, 3, '0'),
    p_notes, (select auth.uid()))
  returning id into v_id;
  insert into public.inventaire_lignes (inventaire_id, produit_id, equipe_id, quantite_theorique)
  select v_id, p.id, p_equipe, p.quantite
  from public.produits p where p.equipe_id = p_equipe and p.actif;
  return v_id;
end;
$$;

create or replace function public.cloturer_inventaire(p_inventaire uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare
  inv public.inventaires;
  l record;
  v_ecarts int := 0;
begin
  select * into inv from public.inventaires where id = p_inventaire for update;
  perform prive.verifier_membre(inv.equipe_id);
  if inv.statut <> 'brouillon' then raise exception 'Inventaire déjà clôturé'; end if;
  for l in
    select il.produit_id, il.quantite_comptee, p.quantite as actuel
    from public.inventaire_lignes il join public.produits p on p.id = il.produit_id
    where il.inventaire_id = p_inventaire and il.quantite_comptee is not null
  loop
    -- Écart sur le stock actuel : les ventes faites pendant le comptage sont prises en compte
    if l.actuel <> l.quantite_comptee then
      perform prive.mouvementer(l.produit_id, 'ajustement', l.quantite_comptee, 'Inventaire', inv.reference,
        p_inventaire => p_inventaire);
      v_ecarts := v_ecarts + 1;
    end if;
  end loop;
  update public.inventaires set statut = 'cloture', ecarts = v_ecarts, cloture_le = now() where id = p_inventaire;
  return v_ecarts;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS et droits
-- -----------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.fournisseurs enable row level security;
alter table public.produits enable row level security;
alter table public.produit_fournisseurs enable row level security;
alter table public.mouvements_stock enable row level security;
alter table public.alertes_stock enable row level security;
alter table public.inventaires enable row level security;
alter table public.inventaire_lignes enable row level security;

revoke all on public.categories, public.fournisseurs, public.produits, public.produit_fournisseurs,
  public.mouvements_stock, public.alertes_stock, public.inventaires, public.inventaire_lignes
  from anon, authenticated;

-- Tables simples : CRUD par les membres
grant select, delete on public.categories, public.fournisseurs, public.produit_fournisseurs to authenticated;
grant insert (equipe_id, nom, description, couleur), update (nom, description, couleur) on public.categories to authenticated;
grant insert (equipe_id, nom, telephone, email, adresse, contact, notes),
  update (nom, telephone, email, adresse, contact, notes) on public.fournisseurs to authenticated;
grant insert (produit_id, fournisseur_id, equipe_id, reference, principal),
  update (reference, principal) on public.produit_fournisseurs to authenticated;

create policy categories_membres on public.categories for all to authenticated
  using (prive.est_membre(equipe_id)) with check (prive.est_membre(equipe_id));
create policy fournisseurs_membres on public.fournisseurs for all to authenticated
  using (prive.est_membre(equipe_id)) with check (prive.est_membre(equipe_id));
create policy produit_fournisseurs_membres on public.produit_fournisseurs for all to authenticated
  using (prive.est_membre(equipe_id)) with check (prive.est_membre(equipe_id));

-- Produits : création par RPC (stock initial), modification directe hors quantité.
-- Un produit avec des mouvements ne se supprime pas (clé étrangère) : on le désactive.
grant select, delete on public.produits to authenticated;
grant update (nom, reference, code_barres, categorie_id, description, unite, prix_vente, prix_achat,
  seuil_alerte, image_url, actif) on public.produits to authenticated;
create policy produits_lecture on public.produits for select to authenticated using (prive.est_membre(equipe_id));
create policy produits_maj on public.produits for update to authenticated
  using (prive.est_membre(equipe_id)) with check (prive.est_membre(equipe_id));
create policy produits_suppression on public.produits for delete to authenticated using (prive.est_membre(equipe_id));

-- Mouvements et alertes : lecture seule
grant select on public.mouvements_stock, public.alertes_stock to authenticated;
create policy mouvements_lecture on public.mouvements_stock for select to authenticated
  using (prive.est_membre(equipe_id));
create policy alertes_lecture on public.alertes_stock for select to authenticated
  using (prive.est_membre(equipe_id));

-- Inventaires : création/clôture par RPC, saisie du comptage en direct tant que brouillon
grant select, delete on public.inventaires to authenticated;
grant update (notes) on public.inventaires to authenticated;
grant select on public.inventaire_lignes to authenticated;
grant update (quantite_comptee) on public.inventaire_lignes to authenticated;
create policy inventaires_lecture on public.inventaires for select to authenticated using (prive.est_membre(equipe_id));
create policy inventaires_maj on public.inventaires for update to authenticated
  using (prive.est_membre(equipe_id) and statut = 'brouillon') with check (prive.est_membre(equipe_id));
create policy inventaires_suppression on public.inventaires for delete to authenticated
  using (prive.est_membre(equipe_id) and statut = 'brouillon');
create policy inventaire_lignes_lecture on public.inventaire_lignes for select to authenticated
  using (prive.est_membre(equipe_id));
create policy inventaire_lignes_maj on public.inventaire_lignes for update to authenticated
  using (prive.est_membre(equipe_id) and exists (
    select 1 from public.inventaires i where i.id = inventaire_id and i.statut = 'brouillon'))
  with check (prive.est_membre(equipe_id));

revoke all on function public.mouvementer_stock(uuid, public.type_mouvement, numeric, text, text),
  public.creer_produit(uuid, jsonb, numeric), public.creer_inventaire(uuid, text),
  public.cloturer_inventaire(uuid) from public, anon;
grant execute on function public.mouvementer_stock(uuid, public.type_mouvement, numeric, text, text),
  public.creer_produit(uuid, jsonb, numeric), public.creer_inventaire(uuid, text),
  public.cloturer_inventaire(uuid) to authenticated;
