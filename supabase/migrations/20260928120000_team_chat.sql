create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text,
  image_path text,
  created_at timestamptz not null default now(),
  constraint chat_messages_content_check check (
    (
      body is not null
      and char_length(btrim(body)) > 0
      and char_length(body) <= 2000
    )
    or image_path is not null
  )
);

create index chat_messages_created_idx on public.chat_messages (created_at desc);

create table public.chat_reads (
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, profile_id)
);

create index chat_reads_profile_idx on public.chat_reads (profile_id);

alter table public.chat_messages enable row level security;
alter table public.chat_reads enable row level security;

create policy chat_messages_select on public.chat_messages
for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = public.current_profile_id() and is_active = true
  )
);

create policy chat_messages_insert on public.chat_messages
for insert to authenticated
with check (
  sender_id = public.current_profile_id()
  and exists (
    select 1 from public.profiles
    where id = public.current_profile_id() and is_active = true
  )
  and (image_path is null or image_path like public.current_profile_id()::text || '/%')
  and char_length(coalesce(image_path, '')) < 300
);

create policy chat_reads_select on public.chat_reads
for select to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = public.current_profile_id() and is_active = true
  )
);

create policy chat_reads_insert on public.chat_reads
for insert to authenticated
with check (
  profile_id = public.current_profile_id()
  and exists (
    select 1 from public.profiles
    where id = public.current_profile_id() and is_active = true
  )
  and exists (
    select 1 from public.chat_messages m
    where m.id = message_id and m.sender_id <> public.current_profile_id()
  )
);

revoke all on public.chat_messages from anon;
revoke all on public.chat_reads from anon;
grant select, insert on public.chat_messages to authenticated;
grant select, insert on public.chat_reads to authenticated;

create or replace function public.unread_chat_count()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::integer
  from public.chat_messages m
  where m.sender_id is distinct from public.current_profile_id()
    and not exists (
      select 1 from public.chat_reads r
      where r.message_id = m.id and r.profile_id = public.current_profile_id()
    );
$$;

create or replace function public.mark_chat_read()
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.chat_reads (message_id, profile_id)
  select m.id, public.current_profile_id()
  from public.chat_messages m
  where public.current_profile_id() is not null
    and m.sender_id is distinct from public.current_profile_id()
    and not exists (
      select 1 from public.chat_reads r
      where r.message_id = m.id and r.profile_id = public.current_profile_id()
    );
$$;

revoke all on function public.unread_chat_count() from public, anon;
revoke all on function public.mark_chat_read() from public, anon;
grant execute on function public.unread_chat_count() to authenticated;
grant execute on function public.mark_chat_read() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat',
  'chat',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy chat_storage_select on storage.objects
for select to public
using (bucket_id = 'chat');

create policy chat_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'chat'
  and (storage.foldername(name))[1] = public.current_profile_id()::text
  and exists (
    select 1 from public.profiles
    where id = public.current_profile_id() and is_active = true
  )
);

alter table public.chat_messages replica identity full;
alter table public.chat_reads replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_reads'
  ) then
    alter publication supabase_realtime add table public.chat_reads;
  end if;
end $$;
