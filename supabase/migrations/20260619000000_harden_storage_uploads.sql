-- Restrict uploads bucket access to each user's own folder.
-- Run after deploying the frontend changes that upload files under {user_id}/...

drop policy if exists "Anyone can view files" on storage.objects;
drop policy if exists "Anyone can upload files" on storage.objects;
drop policy if exists "Users can delete own files" on storage.objects;
drop policy if exists "users_upload_own_folder" on storage.objects;
drop policy if exists "users_view_own_folder" on storage.objects;
drop policy if exists "users_delete_own_folder" on storage.objects;

create policy "users_upload_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users_view_own_folder"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "users_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'uploads'
  and (storage.foldername(name))[1] = auth.uid()::text
);
