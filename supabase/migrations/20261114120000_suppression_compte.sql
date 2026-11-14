-- Suppression du compte par l'utilisateur lui-même (exigence App Store, règle 5.1.1 v).
-- Supprime les équipes dont il est propriétaire avec toutes leurs données, puis le compte
-- (profil, adhésions, paiements d'abonnement par cascade). Les fichiers du stockage sont
-- supprimés avant, côté client, par l'API Storage (packages/core/src/compte.ts).

-- Un compte expiré (lecture seule) doit pouvoir être supprimé : le contrôle d'abonnement
-- s'efface pendant la suppression (indicateur local à la transaction).
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
    raise exception 'Abonnement expiré : abonnez-vous pour continuer à modifier vos données.'
      using errcode = 'P0001', hint = 'abonnement_expire';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.supprimer_mon_compte()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_equipes uuid[];
begin
  if v_uid is null then
    raise exception 'Connectez-vous pour supprimer votre compte.' using errcode = '42501';
  end if;

  select coalesce(array_agg(equipe_id), '{}') into v_equipes
  from public.membres_equipe where user_id = v_uid and role = 'proprietaire';

  perform set_config('prive.suppression_compte', 'on', true);

  -- Ordre imposé par les clés « on delete restrict » (journal de stock, lignes → produits)
  delete from public.mouvements_stock where equipe_id = any (v_equipes);
  delete from public.reglements where equipe_id = any (v_equipes);
  delete from public.document_lignes where equipe_id = any (v_equipes);
  delete from public.documents where equipe_id = any (v_equipes);
  delete from public.achat_lignes where equipe_id = any (v_equipes);
  delete from public.achats where equipe_id = any (v_equipes);
  delete from public.inventaire_lignes where equipe_id = any (v_equipes);
  delete from public.inventaires where equipe_id = any (v_equipes);
  delete from public.equipes where id = any (v_equipes); -- le reste suit par cascade

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.supprimer_mon_compte() from public, anon;
grant execute on function public.supprimer_mon_compte() to authenticated;
