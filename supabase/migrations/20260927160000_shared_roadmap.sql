create table if not exists public.shared_roadmaps (
  id text primary key,
  canvas_data jsonb not null,
  revision integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

insert into public.shared_roadmaps (id, canvas_data, revision, updated_at)
select 'main', canvas_data, 1, updated_at
from public.user_roadmaps
order by (
  coalesce(jsonb_array_length(canvas_data -> 'nodes'), 0)
  + coalesce(jsonb_array_length(canvas_data -> 'edges'), 0)
  + coalesce(jsonb_array_length(canvas_data -> 'annotations'), 0)
) desc,
updated_at desc
limit 1
on conflict (id) do nothing;

insert into public.shared_roadmaps (id, canvas_data, revision)
select 'main', '{"viewport":{"scrollX":0,"scrollY":0},"nodes":[],"edges":[],"annotations":[]}'::jsonb, 0
where not exists (select 1 from public.shared_roadmaps where id = 'main');

alter table public.shared_roadmaps enable row level security;

drop policy if exists "shared_roadmaps_select" on public.shared_roadmaps;
create policy "shared_roadmaps_select" on public.shared_roadmaps
  for select to authenticated using (true);

drop policy if exists "shared_roadmaps_insert" on public.shared_roadmaps;
create policy "shared_roadmaps_insert" on public.shared_roadmaps
  for insert to authenticated with check (id = 'main');

drop policy if exists "shared_roadmaps_update" on public.shared_roadmaps;
create policy "shared_roadmaps_update" on public.shared_roadmaps
  for update to authenticated using (id = 'main') with check (id = 'main');

grant select, insert, update on public.shared_roadmaps to authenticated;

alter table public.roadmap_revisions add column if not exists workspace_id text;
alter table public.roadmap_daily_backups add column if not exists workspace_id text;

drop policy if exists "roadmap_revisions_shared_select" on public.roadmap_revisions;
create policy "roadmap_revisions_shared_select" on public.roadmap_revisions
  for select to authenticated using (workspace_id = 'main');

drop policy if exists "roadmap_daily_backups_shared_select" on public.roadmap_daily_backups;
create policy "roadmap_daily_backups_shared_select" on public.roadmap_daily_backups
  for select to authenticated using (workspace_id = 'main');

create unique index if not exists idx_roadmap_daily_backups_workspace_date
  on public.roadmap_daily_backups (workspace_id, backup_date)
  where workspace_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shared_roadmaps'
  ) then
    alter publication supabase_realtime add table public.shared_roadmaps;
  end if;
end $$;
