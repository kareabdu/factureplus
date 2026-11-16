-- =============================================================================
-- FacturePlus — Rappels d'abonnement par e-mail
--
-- Les apps iOS / Android n'affichent aucun paiement (règles des stores) : l'utilisateur est prévenu
-- par e-mail, avec le lien vers le site, quand son essai ou son abonnement se termine.
--   • « fin_proche » : essai ou abonnement en cours qui se termine dans 2 jours au plus ;
--   • « expire »     : accès terminé depuis 2 jours au plus.
-- Un rappel par type et par date de fin (table rappels_abonnement), jamais deux fois.
-- Envoi : chaque jour à 9 h (UTC) pg_cron appelle la fonction Edge « rappels-abonnement », qui réserve
-- les rappels (reserver_rappels_abonnement, rôle service) et les envoie par Resend.
-- profils.rappels_email : l'utilisateur peut les désactiver (Mon compte).
-- =============================================================================

alter table public.profils add column if not exists rappels_email boolean not null default true;
grant update (rappels_email) on public.profils to authenticated;

-- Journal des rappels envoyés (lié au compte : supprimé avec lui)
create table public.rappels_abonnement (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  type       text not null check (type in ('fin_proche', 'expire')),
  etat       text not null check (etat in ('essai', 'actif')),
  fin        date not null,
  envoye_le  timestamptz not null default now(),
  unique (user_id, type, fin)
);
alter table public.rappels_abonnement enable row level security;
revoke all on public.rappels_abonnement from anon, authenticated;

-- Rappels à envoyer aujourd'hui, réservés (enregistrés) dans la même opération : un appel en double
-- ne renvoie rien. Administrateurs de la plateforme et comptes sans e-mail exclus.
create or replace function public.reserver_rappels_abonnement(p_aujourdhui date default current_date)
returns table (id bigint, email text, nom text, type text, etat text, fin date)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  return query
  with comptes as (
    select p.id as user_id, p.email, p.nom_complet,
      -- Abonnement payé en cours, sinon essai
      case when p.abonnement_statut = 'actif' and p.abonnement_fin is not null
             and p.abonnement_fin >= coalesce(p.essai_fin::date, p.abonnement_fin) then 'actif' else 'essai' end as etat,
      case when p.abonnement_statut = 'actif' and p.abonnement_fin is not null
             and p.abonnement_fin >= coalesce(p.essai_fin::date, p.abonnement_fin) then p.abonnement_fin
           else p.essai_fin::date end as fin
    from public.profils p
    where p.rappels_email and p.email is not null and not prive.est_admin_plateforme(p.id)
  ), candidats as (
    select c.user_id, c.email, c.nom_complet, c.etat, c.fin,
      case when c.fin >= p_aujourdhui and c.fin <= p_aujourdhui + 2 then 'fin_proche'
           when c.fin < p_aujourdhui and c.fin >= p_aujourdhui - 2 then 'expire' end as type
    from comptes c where c.fin is not null
  ), nouveaux as (
    insert into public.rappels_abonnement as r (user_id, type, etat, fin)
    select c.user_id, c.type, c.etat, c.fin from candidats c where c.type is not null
    on conflict (user_id, type, fin) do nothing
    returning r.id, r.user_id, r.type, r.etat, r.fin
  )
  select n.id, c.email, c.nom_complet, n.type, n.etat, n.fin
  from nouveaux n join candidats c on c.user_id = n.user_id and c.type = n.type
  order by n.id;
end;
$$;

revoke all on function public.reserver_rappels_abonnement(date) from public, anon, authenticated;
grant execute on function public.reserver_rappels_abonnement(date) to service_role;

-- Envoi quotidien (pg_cron + pg_net, disponibles sur Supabase)
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_cron;
    create extension if not exists pg_net with schema extensions;
    perform cron.schedule('rappels-abonnement', '0 9 * * *', $cron$
      select net.http_post(
        url := (select valeur from prive.configuration where cle = 'url_fonctions') || '/rappels-abonnement',
        body := '{}'::jsonb, headers := '{"Content-Type": "application/json"}'::jsonb)
    $cron$);
  end if;
end;
$$;
