create table if not exists public.material_folders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  parent_id uuid references public.material_folders(id) on delete cascade,
  name text not null,
  color text not null default '#8B5CF6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint material_folders_name_len check (char_length(btrim(name)) between 1 and 80),
  constraint material_folders_color_hex check (color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint material_folders_parent_not_self check (parent_id is distinct from id)
);

create unique index if not exists material_folders_root_name_key
  on public.material_folders (organization_id, lower(name))
  where parent_id is null;

create unique index if not exists material_folders_child_name_key
  on public.material_folders (organization_id, parent_id, lower(name))
  where parent_id is not null;

create index if not exists material_folders_org_parent_idx
  on public.material_folders (organization_id, parent_id);

alter table public.material_folders enable row level security;

drop policy if exists material_folders_all on public.material_folders;
create policy material_folders_all on public.material_folders
  for all to authenticated
  using (private.is_org_member(organization_id))
  with check (private.is_org_member(organization_id));

drop trigger if exists trg_material_folders_updated on public.material_folders;
create trigger trg_material_folders_updated
  before update on public.material_folders
  for each row execute function private.set_updated_at();

grant select, insert, update, delete on public.material_folders to authenticated;

alter table public.materials
  add column if not exists folder_id uuid references public.material_folders(id) on delete cascade;

create index if not exists materials_folder_idx
  on public.materials (organization_id, folder_id);

alter table public.materials drop constraint if exists materials_check;
alter table public.materials add constraint materials_check check (
  ((type = 'video_link'::public.material_type) and (external_url is not null) and (storage_path is null))
  or ((type = any (array['pdf'::public.material_type, 'audio'::public.material_type, 'document'::public.material_type])) and (storage_path is not null))
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'materials',
  'materials',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/mpeg'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists materials_select on storage.objects;
drop policy if exists materials_insert on storage.objects;
drop policy if exists materials_update on storage.objects;
drop policy if exists materials_delete on storage.objects;

create policy materials_select on storage.objects
for select to authenticated
using (
  bucket_id = 'materials'
  and private.is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy materials_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'materials'
  and private.is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy materials_update on storage.objects
for update to authenticated
using (
  bucket_id = 'materials'
  and private.is_org_member(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'materials'
  and private.is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy materials_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'materials'
  and private.is_org_member(((storage.foldername(name))[1])::uuid)
);
