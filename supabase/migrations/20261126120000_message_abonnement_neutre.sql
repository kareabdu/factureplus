-- =============================================================================
-- Message d'abonnement expiré neutre (refus App Store du 26/11/2026)
-- L'erreur levée à l'expiration est affichée telle quelle par les apps iOS / Android
-- déjà publiées : elle ne doit contenir aucune invitation à payer.
-- Même fonction que 20261114120000_suppression_compte.sql, seul le message change ;
-- l'indice « abonnement_expire » reste le repère technique.
-- =============================================================================
create or replace function prive.exiger_abonnement()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_equipe uuid;
begin
  -- Rôle service (fonctions Edge, maintenance) ou suppression de compte : pas de contrôle
  if (select auth.uid()) is null or current_setting('prive.suppression_compte', true) = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'DELETE' then v_equipe := old.equipe_id; else v_equipe := new.equipe_id; end if;
  if not prive.abonnement_actif(v_equipe) then
    raise exception 'Votre accès a expiré : vos données sont en lecture seule.'
      using errcode = 'P0001', hint = 'abonnement_expire';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
