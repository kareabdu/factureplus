-- =============================================================================
-- StockTracker — Socle : profils, équipes, paramètres, numérotation
--
-- Remplace le modèle base44 « team_id = id du propriétaire » par de vraies équipes.
-- Chaque table métier porte equipe_id ; la RLS isole les équipes.
-- Phase 1 : un compte = une équipe dont il est le seul membre (pas de gestion
-- d'équipe ni de journal d'activité). Le modèle permet de l'ouvrir plus tard.
-- =============================================================================

create schema if not exists prive;
revoke all on schema prive from public, anon;
grant usage on schema prive to authenticated;
-- Les fonctions privées ne sont pas appelables par défaut (seules celles utilisées par la RLS sont ouvertes).
alter default privileges in schema prive revoke execute on functions from public;

create type public.role_equipe as enum ('proprietaire', 'admin', 'membre');

create or replace function prive.maj_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profils (1–1 avec auth.users). Abonnement géré côté serveur uniquement.
-- -----------------------------------------------------------------------------
create table public.profils (
  id                 uuid primary key references auth.users (id) on delete cascade,
  email              text,
  nom_complet        text check (nom_complet is null or length(nom_complet) <= 120),
  telephone          text check (telephone is null or length(telephone) <= 30),
  essai_fin          timestamptz not null default now() + interval '7 days',
  abonnement_statut  text not null default 'essai'
                     check (abonnement_statut in ('essai', 'en_attente', 'actif', 'expire', 'aucun')),
  abonnement_plan    text check (abonnement_plan in ('mensuel', 'annuel')),
  abonnement_fin     date,
  code_parrainage    text unique,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger profils_updated_at before update on public.profils
  for each row execute function prive.maj_updated_at();

create or replace function prive.creer_profil()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profils (id, email, nom_complet)
  values (new.id, lower(new.email), nullif(trim(new.raw_user_meta_data ->> 'nom_complet'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema prive to supabase_auth_admin;
  end if;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function prive.creer_profil();

create or replace function prive.synchroniser_email_profil()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is distinct from old.email then
    update public.profils set email = lower(new.email) where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_updated after update of email on auth.users
  for each row execute function prive.synchroniser_email_profil();

-- -----------------------------------------------------------------------------
-- Équipes et membres
-- -----------------------------------------------------------------------------
create table public.equipes (
  id         uuid primary key default gen_random_uuid(),
  nom        text not null check (length(trim(nom)) between 2 and 200),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger equipes_updated_at before update on public.equipes
  for each row execute function prive.maj_updated_at();

create table public.membres_equipe (
  id         uuid primary key default gen_random_uuid(),
  equipe_id  uuid not null references public.equipes (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.role_equipe not null default 'membre',
  created_at timestamptz not null default now(),
  unique (equipe_id, user_id)
);

create index membres_equipe_user_idx on public.membres_equipe (user_id);

-- Fonctions d'aide à la sécurité
create or replace function prive.est_membre(p_equipe uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.membres_equipe
    where equipe_id = p_equipe and user_id = (select auth.uid())
  );
$$;

create or replace function prive.est_admin(p_equipe uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.membres_equipe
    where equipe_id = p_equipe and user_id = (select auth.uid())
      and role in ('proprietaire', 'admin')
  );
$$;

create or replace function prive.verifier_membre(p_equipe uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not prive.est_membre(p_equipe) then
    raise exception 'Accès refusé à cette équipe' using errcode = '42501';
  end if;
end;
$$;

grant execute on function prive.est_membre(uuid), prive.est_admin(uuid), prive.verifier_membre(uuid)
  to authenticated;

-- Une équipe garde toujours un propriétaire.
create or replace function prive.garder_proprietaire()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'proprietaire'
     and (tg_op = 'DELETE' or new.role <> 'proprietaire')
     and exists (select 1 from public.equipes where id = old.equipe_id)
     and not exists (
       select 1 from public.membres_equipe
       where equipe_id = old.equipe_id and role = 'proprietaire' and id <> old.id
     ) then
    raise exception 'Une équipe doit garder au moins un propriétaire';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger membres_garder_proprietaire before update or delete on public.membres_equipe
  for each row execute function prive.garder_proprietaire();

-- -----------------------------------------------------------------------------
-- Paramètres de l'équipe (entreprise, numérotation, taxe) — 1 par équipe
-- -----------------------------------------------------------------------------
create table public.parametres (
  equipe_id              uuid primary key references public.equipes (id) on delete cascade,
  nom_entreprise         text not null default '' check (length(nom_entreprise) <= 200),
  adresse                text check (adresse is null or length(adresse) <= 300),
  telephone              text check (telephone is null or length(telephone) <= 30),
  telephone2             text check (telephone2 is null or length(telephone2) <= 30),
  email                  text check (email is null or length(email) <= 200),
  site_web               text check (site_web is null or length(site_web) <= 200),
  identifiant_fiscal     text check (identifiant_fiscal is null or length(identifiant_fiscal) <= 50),
  rccm                   text check (rccm is null or length(rccm) <= 50),
  ninea                  text check (ninea is null or length(ninea) <= 50),
  devise                 text not null default 'XOF' check (length(devise) between 3 and 5),
  symbole_devise         text not null default 'FCFA' check (length(symbole_devise) <= 10),
  prefixe_facture        text not null default 'FAC-' check (length(prefixe_facture) <= 20),
  prefixe_proforma       text not null default 'PRO-' check (length(prefixe_proforma) <= 20),
  prefixe_bl             text not null default 'BL-' check (length(prefixe_bl) <= 20),
  prefixe_avoir          text not null default 'AV-' check (length(prefixe_avoir) <= 20),
  format_numero          text not null default '{PREFIX}{YYYY}-{N:04d}' check (length(format_numero) <= 60),
  prefixe_ref_produit    text not null default 'P-' check (length(prefixe_ref_produit) <= 20),
  ref_produit_auto       boolean not null default true,
  unite_defaut           text not null default 'Pcs' check (length(unite_defaut) <= 20),
  taxe_type              text not null default 'aucune'
                         check (taxe_type in ('aucune', 'total', 'deduction', 'par_article')),
  taxe_nom               text not null default 'TVA' check (length(taxe_nom) <= 30),
  taxe_taux              numeric(5, 2) not null default 0 check (taxe_taux between 0 and 100),
  taxe_incluse           boolean not null default false,
  pied_facture           text check (pied_facture is null or length(pied_facture) <= 1000),
  conditions_defaut      text check (conditions_defaut is null or length(conditions_defaut) <= 1000),
  logo_url               text,
  signature_url          text,
  couleur_document       text not null default '#147A2E' check (couleur_document ~ '^#[0-9A-Fa-f]{6}$'),
  updated_at             timestamptz not null default now()
);

create trigger parametres_updated_at before update on public.parametres
  for each row execute function prive.maj_updated_at();

-- Compteurs de numérotation (sans trou, verrouillés)
create table prive.compteurs (
  equipe_id uuid not null references public.equipes (id) on delete cascade,
  type      text not null,
  annee     int not null,
  dernier   int not null default 0,
  primary key (equipe_id, type, annee)
);

create or replace function prive.prochain_numero(p_equipe uuid, p_type text, p_date date default current_date)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v int;
  v_annee int := extract(year from p_date)::int;
begin
  insert into prive.compteurs (equipe_id, type, annee, dernier) values (p_equipe, p_type, v_annee, 1)
  on conflict (equipe_id, type, annee) do update set dernier = prive.compteurs.dernier + 1
  returning dernier into v;
  return v;
end;
$$;

-- Format « {PREFIX}{YYYY}-{N:04d} » (repris de l'ancienne app)
create or replace function prive.formater_numero(p_format text, p_prefixe text, p_annee int, p_n int)
returns text language plpgsql immutable set search_path = '' as $$
declare
  v text := replace(replace(p_format, '{PREFIX}', p_prefixe), '{YYYY}', p_annee::text);
  m text[] := regexp_match(v, '\{N:(\d+)d\}');
begin
  if m is not null then
    v := regexp_replace(v, '\{N:\d+d\}', lpad(p_n::text, greatest(m[1]::int, length(p_n::text)), '0'));
  else
    v := replace(v, '{N}', p_n::text);
  end if;
  return v;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS et droits
-- -----------------------------------------------------------------------------
alter table public.profils enable row level security;
alter table public.equipes enable row level security;
alter table public.membres_equipe enable row level security;
alter table public.parametres enable row level security;

revoke all on public.profils, public.equipes, public.membres_equipe, public.parametres from anon, authenticated;
revoke all on all tables in schema prive from public, anon, authenticated;
revoke all on all functions in schema prive from public, anon;

-- Profils : soi-même et ses collègues
grant select on public.profils to authenticated;
grant update (nom_complet, telephone) on public.profils to authenticated;
create policy profils_lecture on public.profils for select to authenticated using (
  id = (select auth.uid())
  or exists (
    select 1 from public.membres_equipe moi
    join public.membres_equipe lui on lui.equipe_id = moi.equipe_id
    where moi.user_id = (select auth.uid()) and lui.user_id = profils.id
  )
);
create policy profils_maj on public.profils for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Équipes
grant select on public.equipes to authenticated;
grant update (nom) on public.equipes to authenticated;
create policy equipes_lecture on public.equipes for select to authenticated using (prive.est_membre(id));
create policy equipes_maj on public.equipes for update to authenticated
  using (prive.est_admin(id)) with check (prive.est_admin(id));

-- Membres : lecture par les membres ; modification par RPC
grant select on public.membres_equipe to authenticated;
create policy membres_lecture on public.membres_equipe for select to authenticated
  using (prive.est_membre(equipe_id));

-- Paramètres : lecture membres, écriture admins
grant select on public.parametres to authenticated;
grant update (nom_entreprise, adresse, telephone, telephone2, email, site_web, identifiant_fiscal, rccm, ninea,
  devise, symbole_devise, prefixe_facture, prefixe_proforma, prefixe_bl, prefixe_avoir, format_numero,
  prefixe_ref_produit, ref_produit_auto, unite_defaut, taxe_type, taxe_nom, taxe_taux, taxe_incluse,
  pied_facture, conditions_defaut, logo_url, signature_url, couleur_document) on public.parametres to authenticated;
create policy parametres_lecture on public.parametres for select to authenticated using (prive.est_membre(equipe_id));
create policy parametres_maj on public.parametres for update to authenticated
  using (prive.est_admin(equipe_id)) with check (prive.est_admin(equipe_id));


-- -----------------------------------------------------------------------------
-- RPC
-- -----------------------------------------------------------------------------
create or replace function public.creer_equipe(p_nom text, p_devise text default 'XOF', p_symbole text default 'FCFA')
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Connexion requise' using errcode = '42501';
  end if;
  insert into public.equipes (nom, created_by) values (trim(p_nom), (select auth.uid())) returning id into v_id;
  insert into public.membres_equipe (equipe_id, user_id, role) values (v_id, (select auth.uid()), 'proprietaire');
  insert into public.parametres (equipe_id, nom_entreprise, devise, symbole_devise)
  values (v_id, trim(p_nom), upper(p_devise), p_symbole);
  return v_id;
end;
$$;

create or replace function public.mes_equipes()
returns table (id uuid, nom text, role public.role_equipe)
language sql stable security definer set search_path = '' as $$
  select e.id, e.nom, m.role
  from public.membres_equipe m join public.equipes e on e.id = m.equipe_id
  where m.user_id = (select auth.uid())
  order by m.created_at;
$$;

revoke all on function public.creer_equipe(text, text, text), public.mes_equipes() from public, anon;
grant execute on function public.creer_equipe(text, text, text), public.mes_equipes() to authenticated;
