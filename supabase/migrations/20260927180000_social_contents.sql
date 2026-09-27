create table public.social_contents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in ('text', 'image')),
  prompt text not null,
  body text,
  storage_path text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index social_contents_project_created_idx
  on public.social_contents (project_id, created_at desc);

alter table public.social_contents enable row level security;

create policy social_contents_select on public.social_contents
for select to authenticated
using (public.can_access_project(project_id));

create policy social_contents_insert on public.social_contents
for insert to authenticated
with check (
  created_by = public.current_profile_id()
  and public.can_write_ops()
  and public.can_access_project(project_id)
);

revoke all on public.social_contents from anon;
grant select, insert on public.social_contents to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'social',
  'social',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy social_storage_select on storage.objects
for select to public
using (bucket_id = 'social');

create policy social_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'social'
  and public.can_write_ops()
  and public.can_access_project(((storage.foldername(name))[1])::uuid)
);
