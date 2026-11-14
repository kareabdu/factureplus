-- Notifications push (mobile) : stock bas et rupture.
--
-- • appareils_push : un jeton Expo par appareil, rattaché à l'utilisateur connecté (RPC ci-dessous).
-- • alertes_stock.niveau_notifie : dernier niveau signalé pour l'alerte active (« bas » puis « rupture ») :
--   une alerte ne notifie qu'une fois par niveau, tant qu'elle reste active (pas de doublons quand le
--   stock continue de baisser). Une alerte résolue puis rouverte (réapprovisionnement puis nouvelle baisse)
--   notifie de nouveau.
-- • notifications_push : file d'envoi, remplie par déclencheur et vidée par la fonction Edge « push-stock »
--   (rôle service), appelée par pg_net après chaque ajout. Tables techniques : pas de contrôle d'abonnement
--   (elles suivent les mouvements de stock, eux-mêmes contrôlés).

-- -----------------------------------------------------------------------------
-- Appareils
-- -----------------------------------------------------------------------------
create table public.appareils_push (
  jeton      text primary key check (jeton ~ '^(Exponent|Expo)PushToken\[[A-Za-z0-9_-]+\]$' and length(jeton) <= 200),
  user_id    uuid not null references auth.users (id) on delete cascade,
  plateforme text not null check (plateforme in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index appareils_push_user_idx on public.appareils_push (user_id);

alter table public.appareils_push enable row level security;
revoke all on public.appareils_push from anon, authenticated;
grant select on public.appareils_push to authenticated;
create policy appareils_push_lecture on public.appareils_push for select to authenticated
  using (user_id = (select auth.uid()));

-- Enregistre (ou rattache au compte connecté) le jeton de cet appareil.
create or replace function public.enregistrer_appareil_push(p_jeton text, p_plateforme text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Connectez-vous d''abord.' using errcode = '42501'; end if;
  insert into public.appareils_push (jeton, user_id, plateforme)
  values (trim(p_jeton), (select auth.uid()), p_plateforme)
  on conflict (jeton) do update set user_id = excluded.user_id, plateforme = excluded.plateforme, updated_at = now();
end;
$$;

-- Désactivation sur cet appareil, ou déconnexion.
create or replace function public.retirer_appareil_push(p_jeton text)
returns void language sql security definer set search_path = '' as $$
  delete from public.appareils_push where jeton = trim(p_jeton) and user_id = (select auth.uid());
$$;

revoke all on function public.enregistrer_appareil_push(text, text), public.retirer_appareil_push(text) from public, anon;
grant execute on function public.enregistrer_appareil_push(text, text), public.retirer_appareil_push(text) to authenticated;

-- -----------------------------------------------------------------------------
-- File d'envoi
-- -----------------------------------------------------------------------------
create table public.notifications_push (
  id          bigint generated always as identity primary key,
  equipe_id   uuid not null references public.equipes (id) on delete cascade,
  produit_id  uuid not null,
  niveau      text not null check (niveau in ('bas', 'rupture')),
  titre       text not null,
  corps       text not null,
  tentatives  int not null default 0,
  envoyee_le  timestamptz,
  created_at  timestamptz not null default now(),
  foreign key (produit_id, equipe_id) references public.produits (id, equipe_id) on delete cascade
);
create index notifications_push_attente_idx on public.notifications_push (id) where envoyee_le is null;

alter table public.notifications_push enable row level security;
revoke all on public.notifications_push from anon, authenticated;

-- Adresse des fonctions Edge (prive n'est pas exposé par l'API)
create table if not exists prive.configuration (
  cle    text primary key,
  valeur text not null
);
revoke all on prive.configuration from public, anon, authenticated;
insert into prive.configuration (cle, valeur)
values ('url_fonctions', 'https://munketogvbztfvoiryeh.supabase.co/functions/v1')
on conflict (cle) do nothing;

-- pg_net (requêtes HTTP asynchrones, envoyées après validation de la transaction) si disponible
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net with schema extensions;
  end if;
end;
$$;

-- Réveille la fonction Edge d'envoi. Ne fait jamais échouer le mouvement de stock d'origine.
create or replace function prive.declencher_envoi_push()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'net' and p.proname = 'http_post') then
    return null;
  end if;
  select valeur into v_url from prive.configuration where cle = 'url_fonctions';
  if v_url is null then return null; end if;
  execute 'select net.http_post(url := $1, body := $2, headers := $3)'
    using v_url || '/push-stock', '{}'::jsonb, '{"Content-Type": "application/json"}'::jsonb;
  return null;
exception when others then
  return null;
end;
$$;

create trigger envoyer after insert on public.notifications_push
  for each statement execute function prive.declencher_envoi_push();

-- -----------------------------------------------------------------------------
-- Alertes → notifications
-- -----------------------------------------------------------------------------
alter table public.alertes_stock
  add column niveau_notifie text check (niveau_notifie in ('bas', 'rupture'));

-- Les alertes déjà actives sont considérées comme signalées (pas de rafale au déploiement)
update public.alertes_stock
set niveau_notifie = case when quantite <= 0 then 'rupture' else 'bas' end
where statut = 'active';

create or replace function prive.notifier_alerte_stock()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_niveau text;
  p public.produits;
  v_qte text;
begin
  if new.statut <> 'active' then return new; end if;
  -- « insert … on conflict do update » (prive.synchroniser_alerte) passe aussi par ici avant de détecter
  -- le conflit : l'alerte active existante est alors traitée par le déclencheur de mise à jour.
  if tg_op = 'INSERT' and exists (select 1 from public.alertes_stock a
                                  where a.produit_id = new.produit_id and a.statut = 'active') then
    return new;
  end if;
  v_niveau := case when new.quantite <= 0 then 'rupture' else 'bas' end;
  if new.niveau_notifie = 'rupture' or new.niveau_notifie = v_niveau then return new; end if;

  new.niveau_notifie := v_niveau;
  new.notifiee := true;
  -- Seulement si un membre de l'équipe a activé les notifications sur un appareil
  if exists (select 1 from public.appareils_push a join public.membres_equipe m on m.user_id = a.user_id
             where m.equipe_id = new.equipe_id) then
    select * into p from public.produits where id = new.produit_id;
    v_qte := trim(to_char(new.quantite, 'FM999999999990.###'));
    v_qte := rtrim(v_qte, '.');
    insert into public.notifications_push (equipe_id, produit_id, niveau, titre, corps)
    values (new.equipe_id, new.produit_id, v_niveau,
      case v_niveau when 'rupture' then 'Rupture de stock' else 'Stock bas' end,
      case v_niveau
        when 'rupture' then format('%s : stock épuisé.', p.nom)
        else format('%s : plus que %s %s en stock (seuil %s).', p.nom, v_qte, p.unite,
                    rtrim(trim(to_char(new.seuil, 'FM999999999990.###')), '.'))
      end);
  end if;
  return new;
end;
$$;

create trigger notifier before insert or update of quantite, statut on public.alertes_stock
  for each row execute function prive.notifier_alerte_stock();

-- Réservation d'un lot à envoyer (fonction Edge, rôle service) : chaque notification n'est prise qu'une
-- fois (verrou « skip locked »), avec les jetons des membres de l'équipe. Les anciennes sont purgées.
create or replace function public.reserver_notifications_push(p_limite int default 100)
returns table (id bigint, produit_id uuid, niveau text, titre text, corps text, jetons text[])
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.notifications_push n where n.created_at < now() - interval '30 days';
  return query
  with choisies as (
    select n.id from public.notifications_push n
    where n.envoyee_le is null and n.tentatives < 3 and n.created_at > now() - interval '1 day'
    order by n.id limit greatest(1, least(coalesce(p_limite, 100), 500))
    for update skip locked
  ), reservees as (
    update public.notifications_push n set envoyee_le = now(), tentatives = n.tentatives + 1
    from choisies c where n.id = c.id
    returning n.id, n.equipe_id, n.produit_id, n.niveau, n.titre, n.corps
  )
  select r.id, r.produit_id, r.niveau, r.titre, r.corps,
    array(select a.jeton from public.appareils_push a join public.membres_equipe m on m.user_id = a.user_id
          where m.equipe_id = r.equipe_id order by a.jeton)
  from reservees r order by r.id;
end;
$$;

revoke all on function public.reserver_notifications_push(int) from public, anon, authenticated;
grant execute on function public.reserver_notifications_push(int) to service_role;
