-- Core CRM tables: clients and their attached documents.

create table public.clients (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references auth.users (id) on delete set null,
  full_name              text not null,
  email                  text not null unique,
  initial_investment     numeric(14, 2) not null default 0 check (initial_investment >= 0),
  monthly_deposit        numeric(14, 2) not null default 0 check (monthly_deposit >= 0),
  expected_annual_return numeric(5, 2)  not null default 8.5 check (expected_annual_return between -100 and 100),
  investment_years       integer        not null default 10 check (investment_years between 1 and 60),
  created_at             timestamptz    not null default now()
);

comment on column public.clients.user_id is 'Linked auth user; NULL while the client is pending (has not signed up yet).';
comment on column public.clients.expected_annual_return is 'Expected annual return in percent (8.5 = 8.5%).';

create index clients_user_id_idx on public.clients (user_id);

create table public.documents (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients (id) on delete cascade,
  file_path  text not null unique,
  file_name  text not null,
  created_at timestamptz not null default now()
);

comment on column public.documents.file_path is 'Object path inside the client-documents bucket: {client_id}/{timestamp}-{file_name}.';

create index documents_client_id_idx on public.documents (client_id);
