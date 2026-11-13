-- =============================================================================
-- FacturePlus — Stockage privé des PDF de documents (factures, proformas, BL)
--
-- Compartiment « documents » NON public : chemin « <equipe_id>/<document_id>.pdf ».
-- Seuls les membres de l'équipe peuvent déposer, remplacer, lire ou supprimer ses
-- fichiers. Le client reçoit un lien signé temporaire (créé par l'application),
-- jamais une adresse publique permanente.
-- =============================================================================

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
    on conflict (id) do update set public = false;

    execute $p$
      create policy documents_pdf_lecture on storage.objects for select to authenticated
      using (bucket_id = 'documents' and prive.est_membre(((storage.foldername(name))[1])::uuid))
    $p$;
    execute $p$
      create policy documents_pdf_depot on storage.objects for insert to authenticated
      with check (bucket_id = 'documents' and prive.est_membre(((storage.foldername(name))[1])::uuid))
    $p$;
    execute $p$
      create policy documents_pdf_remplacement on storage.objects for update to authenticated
      using (bucket_id = 'documents' and prive.est_membre(((storage.foldername(name))[1])::uuid))
      with check (bucket_id = 'documents' and prive.est_membre(((storage.foldername(name))[1])::uuid))
    $p$;
    execute $p$
      create policy documents_pdf_suppression on storage.objects for delete to authenticated
      using (bucket_id = 'documents' and prive.est_membre(((storage.foldername(name))[1])::uuid))
    $p$;
  end if;
end;
$$;
