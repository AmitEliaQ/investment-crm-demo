-- Demo seed data: two auth users (admin + client) and sample CRM clients.
-- Idempotent — safe to run more than once.
--
--   admin@investcrm.com  / Admin123456!   (app_metadata.role = 'admin')
--   client@investcrm.com / Client123456!  (app_metadata.role = 'client')

-- Auth users -----------------------------------------------------------------
-- Token columns must be '' rather than NULL, otherwise GoTrue fails on login.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
values
  (
    '00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'admin@investcrm.com',
    extensions.crypt('Admin123456!', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"],"role":"admin"}',
    '{"full_name":"מנהל מערכת"}', now(), now(),
    '', '', '', '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'client@investcrm.com',
    extensions.crypt('Client123456!', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"],"role":"client"}',
    '{"full_name":"דנה כהן"}', now(), now(),
    '', '', '', '', '', '', '', ''
  )
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text, 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
  from auth.users u
 where u.id in ('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001')
on conflict (provider_id, provider) do nothing;

-- CRM clients ----------------------------------------------------------------
-- client@investcrm.com is linked to its auth user automatically by the
-- clients_link_existing_user trigger (email match). The rest are "pending".
insert into public.clients (full_name, email, initial_investment, monthly_deposit, expected_annual_return, investment_years, created_at)
values
  ('דנה כהן',       'client@investcrm.com',  50000, 2000, 8.5, 15, now() - interval '26 months'),
  ('יוסי לוי',      'yossi.levi@example.com', 120000, 3500, 9.0, 20, now() - interval '40 months'),
  ('מיכל אברהם',    'michal.a@example.com',   25000, 1000, 8.5, 10, now() - interval '8 months'),
  ('אבי מזרחי',     'avi.m@example.com',      300000, 5000, 7.5, 12, now() - interval '60 months'),
  ('נועה פרידמן',   'noa.f@example.com',      10000,  750, 10.0, 25, now() - interval '3 months'),
  ('רון שפירא',     'ron.s@example.com',      80000, 2500, 8.0, 15, now() - interval '18 months'),
  ('שירה גולן',     'shira.g@example.com',    45000, 1500, 8.5, 30, now() - interval '12 months')
on conflict (email) do nothing;
