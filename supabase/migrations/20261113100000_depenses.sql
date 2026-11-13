-- =============================================================================
-- FacturePlus — Dépenses de l'entreprise (loyer, salaires, transport…)
--
-- Table simple écrite directement par les membres de l'équipe (droits par colonne).
-- Photo du reçu facultative dans le compartiment privé « recus »
-- (chemin « <equipe_id>/<fichier> », lien signé temporaire à l'affichage).
-- =============================================================================

create table public.depenses (
  id              uuid primary key default gen_random_uuid(),
  equipe_id       uuid not null references public.equipes (id) on delete cascade,
  commercant      text not null check (length(trim(commercant)) between 1 and 200),
  montant         bigint not null check (montant > 0),
  date_depense    date not null default current_date,
  categorie       text not null default 'autre'
                  check (categorie in ('loyer', 'salaire', 'fournitures', 'transport', 'facture', 'impot', 'autre')),
  moyen_paiement  text check (moyen_paiement is null
                  or moyen_paiement in ('especes', 'wave', 'orange_money', 'virement', 'cheque', 'carte', 'autre')),
  description     text check (description is null or length(description) <= 1000),
  recu_chemin     text check (recu_chemin is null or length(recu_chemin) <= 300),
  created_by      uuid default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index depenses_equipe_date_idx on public.depenses (equipe_id, date_depense desc);

create trigger depenses_updated_at before update on public.depenses
  for each row execute function prive.maj_updated_at();

alter table public.depenses enable row level security;
revoke all on public.depenses from anon, authenticated;
grant select, delete on public.depenses to authenticated;
grant insert (equipe_id, commercant, montant, date_depense, categorie, moyen_paiement, description, recu_chemin),
  update (commercant, montant, date_depense, categorie, moyen_paiement, description, recu_chemin)
  on public.depenses to authenticated;
create policy depenses_membres on public.depenses for all to authenticated
  using (prive.est_membre(equipe_id)) with check (prive.est_membre(equipe_id));

-- Reçus : compartiment privé, dossier = id de l'équipe (Supabase uniquement)
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public) values ('recus', 'recus', false)
    on conflict (id) do update set public = false;

    execute $p$
      create policy recus_lecture on storage.objects for select to authenticated
      using (bucket_id = 'recus' and prive.est_membre(((storage.foldername(name))[1])::uuid))
    $p$;
    execute $p$
      create policy recus_depot on storage.objects for insert to authenticated
      with check (bucket_id = 'recus' and prive.est_membre(((storage.foldername(name))[1])::uuid))
    $p$;
    execute $p$
      create policy recus_suppression on storage.objects for delete to authenticated
      using (bucket_id = 'recus' and prive.est_membre(((storage.foldername(name))[1])::uuid))
    $p$;
  end if;
end;
$$;
