-- Import du catalogue produits depuis un fichier CSV / Excel (analysé et validé côté client,
-- packages/core/src/produits-tableur.ts). Tout ou rien : la première ligne en erreur annule l'import
-- et son numéro est rappelé dans le message.
--
-- Chaque ligne : { numero, produit_id (null = création), nom, reference, code_barres, categorie,
--   description, unite, prix_vente, prix_achat, quantite, seuil_alerte, actif }.
-- Seules les clés présentes sont appliquées (cellule vide = valeur inchangée).
-- La quantité n'est jamais écrite directement : création → entrée « Stock initial »,
-- mise à jour → ajustement « Import » par prive.mouvementer (journal, alertes, stock jamais négatif).

create or replace function public.importer_produits(p_equipe uuid, p_lignes jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  l jsonb;
  v_numero text;
  v_id uuid;
  v_cat uuid;
  v_quantite numeric;
  v_actuel numeric;
  v_crees int := 0;
  v_modifies int := 0;
  v_ajustes int := 0;
  v_categories int := 0;
  v_etat text;
  v_message text;
  v_indice text;
begin
  perform prive.verifier_membre(p_equipe);
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' then raise exception 'Lignes d''import invalides'; end if;
  if jsonb_array_length(p_lignes) > 5000 then
    raise exception 'Trop de lignes : 5000 produits au plus par import.';
  end if;

  for l in select value from jsonb_array_elements(p_lignes) loop
    v_numero := coalesce(l ->> 'numero', '?');
    begin
      -- Catégorie par nom (sans tenir compte de la casse), créée si besoin
      v_cat := null;
      if nullif(trim(l ->> 'categorie'), '') is not null then
        select id into v_cat from public.categories
        where equipe_id = p_equipe and lower(nom) = lower(trim(l ->> 'categorie')) limit 1;
        if v_cat is null then
          insert into public.categories (equipe_id, nom) values (p_equipe, trim(l ->> 'categorie')) returning id into v_cat;
          v_categories := v_categories + 1;
        end if;
      end if;

      v_quantite := (l ->> 'quantite')::numeric;
      if v_quantite < 0 then raise exception 'Quantité négative'; end if;
      v_id := nullif(l ->> 'produit_id', '')::uuid;

      if v_id is null then
        if nullif(trim(l ->> 'nom'), '') is null then raise exception 'Nom obligatoire'; end if;
        v_id := public.creer_produit(p_equipe,
          (l - 'numero' - 'produit_id' - 'categorie' - 'quantite' - 'actif' - 'image_url')
            || jsonb_build_object('categorie_id', v_cat),
          coalesce(v_quantite, 0));
        if (l ->> 'actif')::boolean is false then
          update public.produits set actif = false where id = v_id;
        end if;
        v_crees := v_crees + 1;
        if coalesce(v_quantite, 0) > 0 then v_ajustes := v_ajustes + 1; end if;
      else
        select quantite into v_actuel from public.produits where id = v_id and equipe_id = p_equipe for update;
        if not found then raise exception 'Produit introuvable (supprimé entre-temps ?)'; end if;
        update public.produits set
          nom          = coalesce(nullif(trim(l ->> 'nom'), ''), nom),
          reference    = coalesce(nullif(trim(l ->> 'reference'), ''), reference),
          code_barres  = coalesce(nullif(trim(l ->> 'code_barres'), ''), code_barres),
          categorie_id = case when v_cat is not null then v_cat else categorie_id end,
          description  = coalesce(nullif(l ->> 'description', ''), description),
          unite        = coalesce(nullif(trim(l ->> 'unite'), ''), unite),
          prix_vente   = coalesce((l ->> 'prix_vente')::bigint, prix_vente),
          prix_achat   = coalesce((l ->> 'prix_achat')::bigint, prix_achat),
          seuil_alerte = coalesce((l ->> 'seuil_alerte')::numeric, seuil_alerte),
          actif        = coalesce((l ->> 'actif')::boolean, actif)
        where id = v_id;
        v_modifies := v_modifies + 1;
        if v_quantite is not null and v_quantite <> v_actuel then
          perform prive.mouvementer(v_id, 'ajustement', v_quantite, 'Import');
          v_ajustes := v_ajustes + 1;
        end if;
      end if;
    exception when others then
      get stacked diagnostics v_etat = returned_sqlstate, v_message = message_text, v_indice = pg_exception_hint;
      v_message := case
        when v_etat = '23505' and v_message like '%code_barres%' then 'code-barres déjà utilisé par un autre produit'
        when v_etat = '23505' and v_message like '%reference%' then 'référence déjà utilisée par un autre produit'
        when v_etat = '23505' then 'élément en double'
        when v_etat = '23514' then 'valeur invalide (texte trop long ou nombre négatif)'
        when v_etat in ('22P02', '22003') then 'nombre invalide'
        else v_message
      end;
      raise exception 'Ligne % : %', v_numero, v_message
        using errcode = case when v_etat = '42501' then '42501' else 'P0001' end, hint = coalesce(v_indice, '');
    end;
  end loop;

  return jsonb_build_object('crees', v_crees, 'modifies', v_modifies,
    'stocks_ajustes', v_ajustes, 'categories_creees', v_categories);
end;
$$;

revoke all on function public.importer_produits(uuid, jsonb) from public, anon;
grant execute on function public.importer_produits(uuid, jsonb) to authenticated;
