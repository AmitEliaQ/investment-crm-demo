-- Row Level Security for clients / documents.
-- Roles come from auth.users.raw_app_meta_data ->> 'role' ('admin' | 'client').
-- app_metadata can only be changed server-side; user_metadata is user-editable
-- and must never be used for authorization.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

-- Data API access: authenticated users only, rows filtered by RLS.
revoke all on public.clients, public.documents from anon;
grant select, insert, update, delete on public.clients, public.documents to authenticated;

alter table public.clients   enable row level security;
alter table public.documents enable row level security;

-- clients -------------------------------------------------------------------
create policy "clients: read own record or admin"
  on public.clients for select
  to authenticated
  using ( user_id = (select auth.uid()) or (select private.is_admin()) );

create policy "clients: admin insert"
  on public.clients for insert
  to authenticated
  with check ( (select private.is_admin()) );

create policy "clients: admin update"
  on public.clients for update
  to authenticated
  using ( (select private.is_admin()) )
  with check ( (select private.is_admin()) );

create policy "clients: admin delete"
  on public.clients for delete
  to authenticated
  using ( (select private.is_admin()) );

-- documents -----------------------------------------------------------------
create policy "documents: read own or admin"
  on public.documents for select
  to authenticated
  using (
    (select private.is_admin())
    or client_id in (select c.id from public.clients c where c.user_id = (select auth.uid()))
  );

create policy "documents: admin insert"
  on public.documents for insert
  to authenticated
  with check ( (select private.is_admin()) );

create policy "documents: admin update"
  on public.documents for update
  to authenticated
  using ( (select private.is_admin()) )
  with check ( (select private.is_admin()) );

create policy "documents: admin delete"
  on public.documents for delete
  to authenticated
  using ( (select private.is_admin()) );

-- Auto-link pending clients to auth users by email ---------------------------
-- Needs security definer: it reads/writes across auth.users and public.clients
-- regardless of the caller. Lives in the non-exposed `private` schema and is
-- only reachable through the triggers below.

create or replace function private.link_client_on_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.clients
     set user_id = new.id
   where user_id is null
     and lower(email) = lower(new.email);
  return new;
end;
$$;

create or replace function private.link_user_on_client_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is null then
    select u.id into new.user_id
      from auth.users u
     where lower(u.email) = lower(new.email)
     limit 1;
  end if;
  return new;
end;
$$;

revoke all on function private.link_client_on_signup() from public, anon, authenticated;
revoke all on function private.link_user_on_client_insert() from public, anon, authenticated;

create trigger on_auth_user_created_link_client
  after insert on auth.users
  for each row execute function private.link_client_on_signup();

create trigger clients_link_existing_user
  before insert on public.clients
  for each row execute function private.link_user_on_client_insert();
