-- =============================================================================
-- FacturePlus — Abonnement (Unitech Pay : Wave, Orange Money), administration
-- de la plateforme et blocage des modifications quand l'accès a expiré.
--
-- État d'accès d'un compte (prive.etat_abonnement) :
--   admin   : administrateur de la plateforme (accès permanent) ;
--   actif   : abonnement payé dont la date de fin n'est pas dépassée ;
--   essai   : période d'essai en cours ;
--   expire  : sinon. L'équipe passe alors en lecture seule : un déclencheur
--             refuse toute écriture sur les tables métier (écritures directes
--             comme RPC). Règle reprise côté client dans packages/core/src/abonnement.ts.
--
-- Les paiements sont créés et confirmés uniquement par les fonctions Edge
-- (rôle service) : webhook signé d'Unitech Pay ou vérification de la transaction.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tarifs (FCFA) et durées : source unique côté serveur
-- -----------------------------------------------------------------------------
create or replace function public.tarifs_abonnement()
returns table (plan text, montant bigint, duree_jours integer)
language sql immutable set search_path = '' as $$
  values ('mensuel'::text, 2900::bigint, 30), ('annuel', 29000, 365)
$$;

revoke all on function public.tarifs_abonnement() from public;
grant execute on function public.tarifs_abonnement() to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Administrateurs de la plateforme (pas d'accès direct : fonctions seulement)
-- -----------------------------------------------------------------------------
create table public.administrateurs_plateforme (
  utilisateur_id uuid primary key references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now()
);

alter table public.administrateurs_plateforme enable row level security;
revoke all on public.administrateurs_plateforme from anon, authenticated;

create or replace function prive.est_admin_plateforme(p_utilisateur uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.administrateurs_plateforme
    where utilisateur_id = coalesce(p_utilisateur, (select auth.uid()))
  );
$$;

create or replace function prive.verifier_admin_plateforme()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not prive.est_admin_plateforme() then
    raise exception 'Réservé aux administrateurs de FacturePlus' using errcode = '42501';
  end if;
end;
$$;

grant execute on function prive.est_admin_plateforme(uuid), prive.verifier_admin_plateforme() to authenticated;

create or replace function public.suis_admin_plateforme()
returns boolean language sql stable security definer set search_path = '' as $$
  select prive.est_admin_plateforme();
$$;

revoke all on function public.suis_admin_plateforme() from public, anon;
grant execute on function public.suis_admin_plateforme() to authenticated;

-- -----------------------------------------------------------------------------
-- État d'accès et blocage des écritures
-- -----------------------------------------------------------------------------
create or replace function prive.etat_abonnement(p_utilisateur uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when prive.est_admin_plateforme(p.id) then 'admin'
    when p.abonnement_statut = 'actif' and p.abonnement_fin >= current_date then 'actif'
    when p.essai_fin > now() then 'essai'
    else 'expire'
  end
  from public.profils p where p.id = p_utilisateur;
$$;

-- Accès de l'équipe = accès de son propriétaire
create or replace function prive.abonnement_actif(p_equipe uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.membres_equipe m
    where m.equipe_id = p_equipe and m.role = 'proprietaire'
      and prive.etat_abonnement(m.user_id) <> 'expire'
  );
$$;

grant execute on function prive.etat_abonnement(uuid), prive.abonnement_actif(uuid) to authenticated;

create or replace function prive.exiger_abonnement()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_equipe uuid;
begin
  -- Rôle service (fonctions Edge, maintenance) : pas de contrôle
  if (select auth.uid()) is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'DELETE' then v_equipe := old.equipe_id; else v_equipe := new.equipe_id; end if;
  if not prive.abonnement_actif(v_equipe) then
    raise exception 'Abonnement expiré : abonnez-vous pour continuer à modifier vos données.'
      using errcode = 'P0001', hint = 'abonnement_expire';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'parametres', 'categories', 'fournisseurs', 'produits', 'produit_fournisseurs',
    'mouvements_stock', 'alertes_stock', 'inventaires', 'inventaire_lignes',
    'clients', 'documents', 'document_lignes', 'reglements', 'achats', 'achat_lignes', 'depenses'
  ] loop
    execute format(
      'create trigger a_exiger_abonnement before insert or update or delete on public.%I
         for each row execute function prive.exiger_abonnement()', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Paiements d'abonnement
-- -----------------------------------------------------------------------------
create table public.paiements_abonnement (
  id              uuid primary key default gen_random_uuid(),
  utilisateur_id  uuid not null references auth.users (id) on delete cascade,
  plan            text not null check (plan in ('mensuel', 'annuel')),
  montant         bigint not null check (montant > 0),
  moyen           text not null check (moyen in ('wave', 'orange_maxit', 'orange_qr', 'manuel')),
  telephone       text check (telephone is null or length(telephone) <= 30),
  reference       text check (reference is null or length(reference) <= 200),
  transaction_id  text check (transaction_id is null or length(transaction_id) <= 200),
  statut          text not null default 'en_attente' check (statut in ('en_attente', 'paye', 'echoue', 'annule')),
  montant_recu    bigint,
  created_at      timestamptz not null default now(),
  paye_le         timestamptz
);

create index paiements_abonnement_utilisateur_idx on public.paiements_abonnement (utilisateur_id, created_at desc);
create index paiements_abonnement_reference_idx on public.paiements_abonnement (reference) where reference is not null;
create index paiements_abonnement_transaction_idx on public.paiements_abonnement (transaction_id) where transaction_id is not null;

alter table public.paiements_abonnement enable row level security;
revoke all on public.paiements_abonnement from anon, authenticated;
grant select on public.paiements_abonnement to authenticated;
create policy paiements_abonnement_lecture on public.paiements_abonnement for select to authenticated
  using (utilisateur_id = (select auth.uid()) or prive.est_admin_plateforme());

-- Confirme un paiement (idempotent) et prolonge l'abonnement. Rôle service uniquement.
-- Renouvellement avant échéance : la nouvelle période s'ajoute à la date de fin en cours.
create or replace function public.activer_paiement_abonnement(
  p_paiement uuid, p_montant_recu bigint, p_transaction text default null
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_paiement public.paiements_abonnement;
  v_profil   public.profils;
  v_jours    integer;
  v_base     date;
begin
  select * into v_paiement from public.paiements_abonnement where id = p_paiement for update;
  if not found then
    raise exception 'Paiement introuvable';
  end if;
  if v_paiement.statut = 'paye' then
    return false;
  end if;
  if p_montant_recu is null or p_montant_recu < v_paiement.montant then
    raise exception 'Montant reçu (%) inférieur au montant attendu (%)', p_montant_recu, v_paiement.montant;
  end if;

  select duree_jours into v_jours from public.tarifs_abonnement() where plan = v_paiement.plan;
  select * into v_profil from public.profils where id = v_paiement.utilisateur_id for update;
  v_base := current_date;
  if v_profil.abonnement_statut = 'actif' and v_profil.abonnement_fin > current_date then
    v_base := v_profil.abonnement_fin;
  end if;

  update public.paiements_abonnement
  set statut = 'paye', paye_le = now(), montant_recu = p_montant_recu,
      transaction_id = coalesce(nullif(p_transaction, ''), transaction_id)
  where id = p_paiement;

  update public.profils
  set abonnement_statut = 'actif', abonnement_plan = v_paiement.plan, abonnement_fin = v_base + v_jours
  where id = v_paiement.utilisateur_id;
  return true;
end;
$$;

create or replace function public.marquer_paiement_abonnement(p_paiement uuid, p_statut text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_statut not in ('echoue', 'annule') then
    raise exception 'Statut invalide';
  end if;
  update public.paiements_abonnement set statut = p_statut
  where id = p_paiement and statut = 'en_attente';
end;
$$;

revoke all on function public.activer_paiement_abonnement(uuid, bigint, text),
  public.marquer_paiement_abonnement(uuid, text) from public, anon, authenticated;
grant execute on function public.activer_paiement_abonnement(uuid, bigint, text),
  public.marquer_paiement_abonnement(uuid, text) to service_role;

-- -----------------------------------------------------------------------------
-- Administration de la plateforme
-- -----------------------------------------------------------------------------
create or replace function public.admin_statistiques()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
begin
  perform prive.verifier_admin_plateforme();
  with etats as (select prive.etat_abonnement(id) as etat, created_at from public.profils)
  select jsonb_build_object(
    'utilisateurs', (select count(*) from etats),
    'nouveaux_7_jours', (select count(*) from etats where created_at > now() - interval '7 days'),
    'en_essai', (select count(*) from etats where etat = 'essai'),
    'abonnes', (select count(*) from etats where etat = 'actif'),
    'expires', (select count(*) from etats where etat = 'expire'),
    'revenus_mois', (select coalesce(sum(montant), 0) from public.paiements_abonnement
                     where statut = 'paye' and paye_le >= date_trunc('month', now())),
    'revenus_total', (select coalesce(sum(montant), 0) from public.paiements_abonnement where statut = 'paye'),
    'paiements_en_attente', (select count(*) from public.paiements_abonnement
                             where statut = 'en_attente' and created_at > now() - interval '1 day')
  ) into v;
  return v;
end;
$$;

create or replace function public.admin_utilisateurs(p_recherche text default null)
returns table (
  id uuid, email text, nom_complet text, telephone text, created_at timestamptz,
  essai_fin timestamptz, abonnement_statut text, abonnement_plan text, abonnement_fin date,
  etat text, entreprise text, documents bigint, derniere_activite timestamptz
) language plpgsql stable security definer set search_path = '' as $$
begin
  perform prive.verifier_admin_plateforme();
  return query
  select p.id, p.email, p.nom_complet, p.telephone, p.created_at,
         p.essai_fin, p.abonnement_statut, p.abonnement_plan, p.abonnement_fin,
         prive.etat_abonnement(p.id),
         e.nom,
         (select count(*) from public.documents d where d.equipe_id = e.id),
         (select max(d.updated_at) from public.documents d where d.equipe_id = e.id)
  from public.profils p
  left join lateral (
    select eq.id, eq.nom from public.membres_equipe m join public.equipes eq on eq.id = m.equipe_id
    where m.user_id = p.id and m.role = 'proprietaire' order by m.created_at limit 1
  ) e on true
  where p_recherche is null or trim(p_recherche) = ''
     or p.email ilike '%' || trim(p_recherche) || '%'
     or p.nom_complet ilike '%' || trim(p_recherche) || '%'
     or e.nom ilike '%' || trim(p_recherche) || '%'
  order by p.created_at desc;
end;
$$;

create or replace function public.admin_paiements(p_limite integer default 200)
returns table (
  id uuid, utilisateur_id uuid, email text, plan text, montant bigint, moyen text,
  statut text, reference text, created_at timestamptz, paye_le timestamptz
) language plpgsql stable security definer set search_path = '' as $$
begin
  perform prive.verifier_admin_plateforme();
  return query
  select pa.id, pa.utilisateur_id, p.email, pa.plan, pa.montant, pa.moyen,
         pa.statut, pa.reference, pa.created_at, pa.paye_le
  from public.paiements_abonnement pa left join public.profils p on p.id = pa.utilisateur_id
  order by pa.created_at desc
  limit least(greatest(p_limite, 1), 1000);
end;
$$;

-- Activation manuelle (paiement reçu hors Unitech Pay, geste commercial) ou fin d'accès.
-- p_plan null : l'abonnement et l'essai sont arrêtés immédiatement.
create or replace function public.admin_definir_abonnement(
  p_utilisateur uuid, p_plan text, p_fin date default null, p_montant bigint default 0
) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform prive.verifier_admin_plateforme();
  if not exists (select 1 from public.profils where id = p_utilisateur) then
    raise exception 'Utilisateur introuvable';
  end if;
  if p_plan is null then
    update public.profils
    set abonnement_statut = 'expire', essai_fin = least(essai_fin, now())
    where id = p_utilisateur;
    return;
  end if;
  if p_plan not in ('mensuel', 'annuel') then
    raise exception 'Plan invalide';
  end if;
  if p_fin is null or p_fin < current_date then
    raise exception 'La date de fin doit être aujourd''hui ou plus tard';
  end if;
  update public.profils
  set abonnement_statut = 'actif', abonnement_plan = p_plan, abonnement_fin = p_fin
  where id = p_utilisateur;
  if coalesce(p_montant, 0) > 0 then
    insert into public.paiements_abonnement (utilisateur_id, plan, montant, moyen, statut, montant_recu, paye_le)
    values (p_utilisateur, p_plan, p_montant, 'manuel', 'paye', p_montant, now());
  end if;
end;
$$;

create or replace function public.admin_prolonger_essai(p_utilisateur uuid, p_jours integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform prive.verifier_admin_plateforme();
  if p_jours is null or p_jours not between 1 and 365 then
    raise exception 'Nombre de jours invalide (1 à 365)';
  end if;
  update public.profils
  set essai_fin = greatest(essai_fin, now()) + make_interval(days => p_jours)
  where id = p_utilisateur;
  if not found then
    raise exception 'Utilisateur introuvable';
  end if;
end;
$$;

revoke all on function public.admin_statistiques(), public.admin_utilisateurs(text), public.admin_paiements(integer),
  public.admin_definir_abonnement(uuid, text, date, bigint), public.admin_prolonger_essai(uuid, integer)
  from public, anon;
grant execute on function public.admin_statistiques(), public.admin_utilisateurs(text), public.admin_paiements(integer),
  public.admin_definir_abonnement(uuid, text, date, bigint), public.admin_prolonger_essai(uuid, integer)
  to authenticated;
