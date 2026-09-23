-- Private bucket for client attachments.
-- Object layout: {client_id}/{timestamp}-{file_name}

insert into storage.buckets (id, name, public, file_size_limit)
values ('client-documents', 'client-documents', false, 20971520) -- 20 MB
on conflict (id) do nothing;

-- Admins: full control over every object in the bucket
-- (select + insert + update are all needed for upsert).
create policy "client-documents: admin select"
  on storage.objects for select
  to authenticated
  using ( bucket_id = 'client-documents' and (select private.is_admin()) );

create policy "client-documents: admin insert"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'client-documents' and (select private.is_admin()) );

create policy "client-documents: admin update"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'client-documents' and (select private.is_admin()) )
  with check ( bucket_id = 'client-documents' and (select private.is_admin()) );

create policy "client-documents: admin delete"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'client-documents' and (select private.is_admin()) );

-- Clients: read-only access to objects in their own {client_id}/ folder.
create policy "client-documents: client reads own folder"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'client-documents'
    and (storage.foldername(name))[1] in (
      select c.id::text from public.clients c where c.user_id = (select auth.uid())
    )
  );
