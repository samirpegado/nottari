alter table public.organizations
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists website text,
  add column if not exists zip_code text,
  add column if not exists street text,
  add column if not exists street_number text,
  add column if not exists address_complement text,
  add column if not exists neighborhood text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists logo_path text,
  add column if not exists signature_path text;

alter table public.organizations drop constraint if exists organizations_phone_digits;
alter table public.organizations drop constraint if exists organizations_zip_digits;
alter table public.organizations drop constraint if exists organizations_state_uf;
alter table public.organizations drop constraint if exists organizations_email_len;
alter table public.organizations drop constraint if exists organizations_website_len;

alter table public.organizations
  add constraint organizations_phone_digits check (phone is null or phone ~ '^\d{10,11}$'),
  add constraint organizations_zip_digits check (zip_code is null or zip_code ~ '^\d{8}$'),
  add constraint organizations_state_uf check (state is null or state ~ '^[A-Z]{2}$'),
  add constraint organizations_email_len check (email is null or char_length(btrim(email)) between 3 and 254),
  add constraint organizations_website_len check (website is null or char_length(btrim(website)) between 4 and 200);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'org-branding',
  'org-branding',
  false,
  409600,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists org_branding_select on storage.objects;
drop policy if exists org_branding_insert on storage.objects;
drop policy if exists org_branding_update on storage.objects;
drop policy if exists org_branding_delete on storage.objects;

create policy org_branding_select on storage.objects
for select to authenticated
using (
  bucket_id = 'org-branding'
  and private.is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy org_branding_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'org-branding'
  and private.is_org_owner(((storage.foldername(name))[1])::uuid)
);

create policy org_branding_update on storage.objects
for update to authenticated
using (
  bucket_id = 'org-branding'
  and private.is_org_owner(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'org-branding'
  and private.is_org_owner(((storage.foldername(name))[1])::uuid)
);

create policy org_branding_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'org-branding'
  and private.is_org_owner(((storage.foldername(name))[1])::uuid)
);
