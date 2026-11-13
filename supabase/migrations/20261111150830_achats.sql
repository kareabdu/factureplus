-- =============================================================================
-- FacturePlus — Achats fournisseurs
--
-- brouillon (modifiable) → réception (numéro ACH-…, entrées de stock, coût d'achat
-- du produit mis à jour) → éventuellement annulation (sorties de stock correspondantes).
-- =============================================================================

create type public.statut_achat as enum ('brouillon', 'recu', 'annule');

create table public.achats (
  id              uuid primary key default gen_random_uuid(),
  equipe_id       uuid not null references public.equipes (id) on delete cascade,
  numero          text check (numero is null or length(numero) <= 60),
  date            date not null default current_date,
  statut          public.statut_achat not null default 'brouillon',
  fournisseur_id  uuid,
  fournisseur_nom text not null default '' check (length(fournisseur_nom) <= 200),
  reference_fournisseur text check (reference_fournisseur is null or length(reference_fournisseur) <= 60),
  mode_paiement   public.mode_paiement not null default 'especes',
  montant_paye    bigint not null default 0 check (montant_paye >= 0),
  total           bigint not null default 0,
  notes           text check (notes is null or length(notes) <= 2000),
  user_id         uuid references auth.users (id) on delete set null,
  recu_le         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, equipe_id),
  foreign key (fournisseur_id, equipe_id) references public.fournisseurs (id, equipe_id) on delete set null (fournisseur_id),
  constraint achats_numero_si_recu check ((statut = 'brouillon') = (numero is null))
);

create unique index achats_numero_unique on public.achats (equipe_id, numero) where numero is not null;
create index achats_equipe_idx on public.achats (equipe_id, date desc);

create trigger achats_updated_at before update on public.achats
  for each row execute function prive.maj_updated_at();

create table public.achat_lignes (
  id           uuid primary key default gen_random_uuid(),
  achat_id     uuid not null,
  equipe_id    uuid not null,
  position     int not null default 0,
  produit_id   uuid not null,
  quantite     numeric(14, 3) not null check (quantite > 0),
  cout_unitaire bigint not null check (cout_unitaire >= 0),
  total        bigint not null,
  foreign key (achat_id, equipe_id) references public.achats (id, equipe_id) on delete cascade,
  foreign key (produit_id, equipe_id) references public.produits (id, equipe_id) on delete restrict
);

create index achat_lignes_achat_idx on public.achat_lignes (achat_id, position);

alter table public.mouvements_stock
  add foreign key (achat_id) references public.achats (id) on delete restrict;

-- p_entete : { fournisseur_id, fournisseur_nom, date, reference_fournisseur, mode_paiement, montant_paye, notes }
-- p_lignes : [{ produit_id, quantite, cout_unitaire }]
create or replace function public.enregistrer_achat(p_equipe uuid, p_id uuid, p_entete jsonb, p_lignes jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := p_id;
  a public.achats;
  l jsonb;
  v_pos int := 0;
  v_fournisseur uuid := nullif(p_entete ->> 'fournisseur_id', '')::uuid;
  v_nom text := trim(coalesce(p_entete ->> 'fournisseur_nom', ''));
begin
  perform prive.verifier_membre(p_equipe);
  if v_fournisseur is not null and v_nom = '' then
    select nom into v_nom from public.fournisseurs where id = v_fournisseur and equipe_id = p_equipe;
  end if;
  if v_id is null then
    insert into public.achats (equipe_id, user_id) values (p_equipe, (select auth.uid())) returning id into v_id;
  else
    select * into a from public.achats where id = v_id and equipe_id = p_equipe for update;
    if a.id is null then raise exception 'Achat introuvable'; end if;
    if a.statut <> 'brouillon' then raise exception 'Achat réceptionné : il ne peut plus être modifié'; end if;
  end if;

  update public.achats set
    fournisseur_id = v_fournisseur,
    fournisseur_nom = v_nom,
    date = coalesce(nullif(p_entete ->> 'date', '')::date, current_date),
    reference_fournisseur = nullif(trim(p_entete ->> 'reference_fournisseur'), ''),
    mode_paiement = coalesce(nullif(p_entete ->> 'mode_paiement', '')::public.mode_paiement, 'especes'),
    montant_paye = coalesce((p_entete ->> 'montant_paye')::bigint, 0),
    notes = nullif(p_entete ->> 'notes', '')
  where id = v_id;

  delete from public.achat_lignes where achat_id = v_id;
  for l in select * from jsonb_array_elements(coalesce(p_lignes, '[]'::jsonb)) loop
    insert into public.achat_lignes (achat_id, equipe_id, position, produit_id, quantite, cout_unitaire, total)
    values (v_id, p_equipe, v_pos, (l ->> 'produit_id')::uuid, (l ->> 'quantite')::numeric,
      (l ->> 'cout_unitaire')::bigint, round((l ->> 'cout_unitaire')::bigint * (l ->> 'quantite')::numeric));
    v_pos := v_pos + 1;
  end loop;

  update public.achats set total = (select coalesce(sum(total), 0) from public.achat_lignes where achat_id = v_id)
  where id = v_id;
  return v_id;
end;
$$;

create or replace function public.receptionner_achat(p_achat uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  a public.achats;
  l record;
  v_numero text;
begin
  select * into a from public.achats where id = p_achat for update;
  perform prive.verifier_membre(a.equipe_id);
  if a.statut <> 'brouillon' then raise exception 'Achat déjà réceptionné'; end if;
  if not exists (select 1 from public.achat_lignes where achat_id = p_achat) then
    raise exception 'Ajoutez au moins une ligne';
  end if;
  if a.montant_paye > a.total then raise exception 'Le montant payé dépasse le total'; end if;
  v_numero := 'ACH-' || extract(year from a.date)::int || '-'
    || lpad(prive.prochain_numero(a.equipe_id, 'achat', a.date)::text, 4, '0');
  update public.achats set statut = 'recu', numero = v_numero, recu_le = now() where id = p_achat;
  for l in select * from public.achat_lignes where achat_id = p_achat order by produit_id, position loop
    perform prive.mouvementer(l.produit_id, 'entree', l.quantite, 'Achat', v_numero, p_achat => p_achat);
    -- Dernier coût d'achat connu
    update public.produits set prix_achat = l.cout_unitaire where id = l.produit_id;
  end loop;
  return v_numero;
end;
$$;

create or replace function public.annuler_achat(p_achat uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  a public.achats;
  l record;
begin
  select * into a from public.achats where id = p_achat for update;
  perform prive.verifier_membre(a.equipe_id);
  if a.statut <> 'recu' then raise exception 'Seul un achat réceptionné peut être annulé'; end if;
  update public.achats set statut = 'annule' where id = p_achat;
  for l in
    select produit_id, sum(variation) as q from public.mouvements_stock
    where achat_id = p_achat group by produit_id having sum(variation) > 0 order by produit_id
  loop
    perform prive.mouvementer(l.produit_id, 'sortie', l.q, 'Annulation d''achat', a.numero, p_achat => p_achat);
  end loop;
end;
$$;

alter table public.achats enable row level security;
alter table public.achat_lignes enable row level security;
revoke all on public.achats, public.achat_lignes from anon, authenticated;

grant select, delete on public.achats to authenticated;
create policy achats_lecture on public.achats for select to authenticated using (prive.est_membre(equipe_id));
create policy achats_suppression on public.achats for delete to authenticated
  using (prive.est_membre(equipe_id) and statut = 'brouillon');
grant select on public.achat_lignes to authenticated;
create policy achat_lignes_lecture on public.achat_lignes for select to authenticated using (prive.est_membre(equipe_id));

revoke all on function public.enregistrer_achat(uuid, uuid, jsonb, jsonb), public.receptionner_achat(uuid),
  public.annuler_achat(uuid) from public, anon;
grant execute on function public.enregistrer_achat(uuid, uuid, jsonb, jsonb), public.receptionner_achat(uuid),
  public.annuler_achat(uuid) to authenticated;
