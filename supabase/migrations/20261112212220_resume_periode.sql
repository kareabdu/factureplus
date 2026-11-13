-- =============================================================================
-- FacturePlus — Tableau de bord sur une période choisie (début et fin)
--
-- resume_tableau_de_bord(p_equipe, p_debut, p_fin) : les indicateurs de période
-- (ventes, nombre de factures, encaissé, marge, meilleures ventes, ventes par jour
-- de la période) portent sur [p_debut ; p_fin], fin incluse. Sans fin : toutes les
-- dates à partir du début, comme avant. Stock, alertes, impayés et total de l'année
-- restent des valeurs du moment. ventes_par_jour (30 derniers jours) est conservé
-- pour la compatibilité ; ventes_jours_periode suit la période.
-- =============================================================================

drop function if exists public.resume_tableau_de_bord(uuid, date);

create or replace function public.resume_tableau_de_bord(
  p_equipe uuid,
  p_debut date default date_trunc('month', current_date)::date,
  p_fin date default null
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
  v_fin date := coalesce(p_fin, 'infinity'::date);
begin
  perform prive.verifier_membre(p_equipe);
  if p_fin is not null and p_fin < p_debut then
    raise exception 'La date de fin doit être postérieure à la date de début';
  end if;
  select jsonb_build_object(
    'nb_produits', (select count(*) from public.produits where equipe_id = p_equipe and actif),
    'valeur_stock_achat', (select coalesce(round(sum(quantite * prix_achat)), 0) from public.produits
                           where equipe_id = p_equipe and actif),
    'valeur_stock_vente', (select coalesce(round(sum(quantite * prix_vente)), 0) from public.produits
                           where equipe_id = p_equipe and actif),
    'nb_alertes', (select count(*) from public.alertes_stock where equipe_id = p_equipe and statut = 'active'),
    'nb_ruptures', (select count(*) from public.produits where equipe_id = p_equipe and actif and quantite = 0),
    'ventes_periode', (select coalesce(sum(total), 0) from public.documents
                       where equipe_id = p_equipe and type = 'facture' and statut in ('emis', 'paye')
                         and date between p_debut and v_fin),
    'nb_factures_periode', (select count(*) from public.documents
                            where equipe_id = p_equipe and type = 'facture' and statut in ('emis', 'paye')
                              and date between p_debut and v_fin),
    'ventes_annee', (select coalesce(sum(total), 0) from public.documents
                     where equipe_id = p_equipe and type = 'facture' and statut in ('emis', 'paye')
                       and date >= date_trunc('year', current_date)::date
                       and date < (date_trunc('year', current_date) + interval '1 year')::date),
    'nb_factures_annee', (select count(*) from public.documents
                          where equipe_id = p_equipe and type = 'facture' and statut in ('emis', 'paye')
                            and date >= date_trunc('year', current_date)::date
                            and date < (date_trunc('year', current_date) + interval '1 year')::date),
    'encaisse_periode', (select coalesce(sum(r.montant), 0) from public.reglements r
                         where r.equipe_id = p_equipe and r.date between p_debut and v_fin),
    'impayes', (select coalesce(sum(total - montant_paye), 0) from public.documents
                where equipe_id = p_equipe and type = 'facture' and statut = 'emis'),
    'marge_periode', (select coalesce(round(sum(l.total - l.quantite * coalesce(p.prix_achat, 0))), 0)
                      from public.document_lignes l
                      join public.documents d on d.id = l.document_id
                      left join public.produits p on p.id = l.produit_id
                      where d.equipe_id = p_equipe and d.type = 'facture' and d.statut in ('emis', 'paye')
                        and d.date between p_debut and v_fin),
    'ventes_par_jour', (select coalesce(jsonb_agg(jsonb_build_object('jour', jour, 'total', total) order by jour), '[]'::jsonb)
                        from (select date as jour, sum(total) as total from public.documents
                              where equipe_id = p_equipe and type = 'facture' and statut in ('emis', 'paye')
                                and date >= current_date - 29
                              group by date) j),
    'ventes_jours_periode', (select coalesce(jsonb_agg(jsonb_build_object('jour', jour, 'total', total) order by jour), '[]'::jsonb)
                             from (select date as jour, sum(total) as total from public.documents
                                   where equipe_id = p_equipe and type = 'facture' and statut in ('emis', 'paye')
                                     and date between p_debut and v_fin
                                   group by date) j),
    'meilleurs_produits', (select coalesce(jsonb_agg(t order by t.chiffre desc), '[]'::jsonb) from (
                             select l.produit_id, max(l.designation) as nom, sum(l.quantite) as quantite, sum(l.total) as chiffre
                             from public.document_lignes l join public.documents d on d.id = l.document_id
                             where d.equipe_id = p_equipe and d.type = 'facture' and d.statut in ('emis', 'paye')
                               and d.date between p_debut and v_fin and l.produit_id is not null
                             group by l.produit_id order by sum(l.total) desc limit 5) t)
  ) into v;
  return v;
end;
$$;

revoke all on function public.resume_tableau_de_bord(uuid, date, date) from public, anon;
grant execute on function public.resume_tableau_de_bord(uuid, date, date) to authenticated;
