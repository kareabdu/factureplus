-- Liens courts vers le PDF d'un document (envoi WhatsApp) :
--   https://factureplus.kareapps.com/d/<code>  →  fonction Edge « lien-pdf »  →  lien signé de quelques minutes.
-- Un code par document, conservé d'un envoi à l'autre ; chaque envoi prolonge sa validité de 30 jours.
-- Table technique de partage (lecture d'un document existant) : pas de contrôle d'abonnement, un compte
-- en lecture seule peut toujours envoyer ses documents.

create table public.liens_documents (
  code        text primary key,
  equipe_id   uuid not null references public.equipes (id) on delete cascade,
  document_id uuid not null unique,
  chemin      text not null check (length(chemin) between 3 and 500),
  expire_le   timestamptz not null,
  created_at  timestamptz not null default now(),
  foreign key (document_id, equipe_id) references public.documents (id, equipe_id) on delete cascade
);

alter table public.liens_documents enable row level security;
create policy liens_documents_lecture on public.liens_documents for select to authenticated
  using (prive.est_membre(equipe_id));
-- Écriture uniquement par la RPC ci-dessous ; lecture du code par la fonction Edge (rôle service)
revoke insert, update, delete on public.liens_documents from anon, authenticated;

/** Code court aléatoire (11 caractères base64url, 66 bits). */
create or replace function prive.code_court()
returns text language sql volatile set search_path = '' as $$
  select left(translate(encode(uuid_send(gen_random_uuid()), 'base64'), '+/=', '-_'), 11);
$$;

-- Crée (ou prolonge) le lien court du PDF d'un document déposé dans le stockage « documents ».
create or replace function public.lien_court_document(p_document uuid, p_chemin text, p_jours int default 30)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_equipe uuid;
  v_code text;
begin
  select equipe_id into v_equipe from public.documents where id = p_document;
  if v_equipe is null then raise exception 'Document introuvable'; end if;
  perform prive.verifier_membre(v_equipe);
  -- Le fichier doit être celui du document, dans le dossier de l'équipe
  if p_chemin is null or p_chemin not like v_equipe::text || '/' || p_document::text || '/%.pdf' then
    raise exception 'Chemin de fichier invalide';
  end if;

  insert into public.liens_documents (code, equipe_id, document_id, chemin, expire_le)
  values (prive.code_court(), v_equipe, p_document, p_chemin,
          now() + make_interval(days => greatest(1, least(coalesce(p_jours, 30), 90))))
  on conflict (document_id) do update
    set chemin = excluded.chemin, expire_le = excluded.expire_le
  returning code into v_code;
  return v_code;
end;
$$;

revoke all on function public.lien_court_document(uuid, text, int) from public, anon;
grant execute on function public.lien_court_document(uuid, text, int) to authenticated;
