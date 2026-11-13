-- =============================================================================
-- FacturePlus — Connexion avec Google : le nom du profil vient aussi des
-- métadonnées fournies par Google (full_name, name), pas seulement de
-- l'inscription par e-mail (nom_complet).
-- =============================================================================

create or replace function prive.creer_profil()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profils (id, email, nom_complet)
  values (
    new.id,
    lower(new.email),
    left(nullif(trim(coalesce(
      new.raw_user_meta_data ->> 'nom_complet',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    )), ''), 120)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
