create policy avatars_project_logo_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'projects'
  and public.can_write_ops()
  and public.can_access_project(((storage.foldername(name))[2])::uuid)
);

create policy avatars_project_logo_update on storage.objects
for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'projects'
  and public.can_write_ops()
  and public.can_access_project(((storage.foldername(name))[2])::uuid)
);

create policy avatars_project_logo_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'projects'
  and public.can_write_ops()
  and public.can_access_project(((storage.foldername(name))[2])::uuid)
);
