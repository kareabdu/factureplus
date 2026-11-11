-- =============================================================================
-- StockTracker — Tableau de bord et stockage des images
-- =============================================================================

-- Indicateurs de l'accueil, calculés côté serveur (une seule requête)
create or replace function public.resume_tableau_de_bord(p_equipe uuid, p_debut date default date_trunc('month', current_date)::date)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
begin
  perform prive.verifier_membre(p_equipe);
  select jsonb_build_object(
    'nb_produits', (select count(*) from public.produits where equipe_id = p_equipe and actif),
    'valeur_stock_achat', (select coalesce(round(sum(quantite * prix_achat)), 0) from public.produits
                           where equipe_id = p_equipe and actif),
    'valeur_stock_vente', (select coalesce(round(sum(quantite * prix_vente)), 0) from public.produits
                           where equipe_id = p_equipe and actif),
    'nb_alertes', (select count(*) from public.alertes_stock where equipe_id = p_equipe and statut = 'active'),
    'nb_ruptures', (select count(*) from public.produits where equipe_id = p_equipe and actif and quantite = 0),
    'ventes_periode', (select coalesce(sum(total), 0) from public.documents
                       where equipe_id = p_equipe and type = 'facture' and statut in ('emis', 'paye') and date >= p_debut),
    'nb_factures_periode', (select count(*) from public.documents
                            where equipe_id = p_equipe and type = 'facture' and statut in ('emis', 'paye') and date >= p_debut),
    'encaisse_periode', (select coalesce(sum(r.montant), 0) from public.reglements r
                         where r.equipe_id = p_equipe and r.date >= p_debut),
    'impayes', (select coalesce(sum(total - montant_paye), 0) from public.documents
                where equipe_id = p_equipe and type = 'facture' and statut = 'emis'),
    'marge_periode', (select coalesce(round(sum(l.total - l.quantite * coalesce(p.prix_achat, 0))), 0)
                      from public.document_lignes l
                      join public.documents d on d.id = l.document_id
                      left join public.produits p on p.id = l.produit_id
                      where d.equipe_id = p_equipe and d.type = 'facture' and d.statut in ('emis', 'paye')
                        and d.date >= p_debut),
    'ventes_par_jour', (select coalesce(jsonb_agg(jsonb_build_object('jour', jour, 'total', total) order by jour), '[]'::jsonb)
                        from (select date as jour, sum(total) as total from public.documents
                              where equipe_id = p_equipe and type = 'facture' and statut in ('emis', 'paye')
                                and date >= current_date - 29
                              group by date) j),
    'meilleurs_produits', (select coalesce(jsonb_agg(t order by t.chiffre desc), '[]'::jsonb) from (
                             select l.produit_id, max(l.designation) as nom, sum(l.quantite) as quantite, sum(l.total) as chiffre
                             from public.document_lignes l join public.documents d on d.id = l.document_id
                             where d.equipe_id = p_equipe and d.type = 'facture' and d.statut in ('emis', 'paye')
                               and d.date >= p_debut and l.produit_id is not null
                             group by l.produit_id order by sum(l.total) desc limit 5) t)
  ) into v;
  return v;
end;
$$;

revoke all on function public.resume_tableau_de_bord(uuid, date) from public, anon;
grant execute on function public.resume_tableau_de_bord(uuid, date) to authenticated;

-- Stockage des photos produits et logos : dossier = id de l'équipe (Supabase uniquement)
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public) values ('produits', 'produits', true) on conflict (id) do nothing;
    execute $p$
      create policy produits_images_ecriture on storage.objects for insert to authenticated
      with check (bucket_id = 'produits' and prive.est_membre(((storage.foldername(name))[1])::uuid))
    $p$;
    execute $p$
      create policy produits_images_suppression on storage.objects for delete to authenticated
      using (bucket_id = 'produits' and prive.est_membre(((storage.foldername(name))[1])::uuid))
    $p$;
  end if;
end;
$$;
