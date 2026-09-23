---
tags: [investcrm, setup]
---
# Setup Guide

Related: [[Architecture]] · [[Database-Schema]] · [[Home]]

## Prerequisites
- Node.js 20+ (developed on Node 24)
- [Supabase CLI](https://supabase.com/docs/guides/cli) 2.x, logged in (`supabase login`)
- A Supabase project, either hosted or local via `supabase start` (requires Docker)

## 1. Install

```bash
git clone https://github.com/AmitEliaQ/investment-crm-demo.git
cd investment-crm-demo
npm install
```

## 2. Environment variables

Copy the template and fill it in from **Dashboard → Project Settings → API Keys**:

```bash
cp .env.example .env
```

| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the **publishable** key (`sb_publishable_…`) or the legacy anon key |

> [!danger] Never put the `service_role` / secret key in `.env` for this app. Every `VITE_*` variable is bundled into the browser.

With the CLI you can also fetch keys with `supabase projects api-keys --project-ref <ref>`.

## 3. Database: migrations + seed

### Hosted project
```bash
supabase link --project-ref <project-ref>
supabase db push --include-seed
```
This creates the tables, RLS policies, triggers, the `client-documents` bucket and its policies. It also seeds the demo users and clients. The seed is idempotent, so running it again is safe.

### Local stack
```bash
supabase start          # prints a local API URL + publishable key → put them in .env
supabase db reset       # applies migrations + supabase/seed.sql
```

## 4. Run

```bash
npm run dev             # http://localhost:5173
npm run build           # type-check + production build into dist/
npm run verify:rls      # smoke-test RLS & storage policies against .env project
```

## Demo credentials

| Role | Email | Password | Lands on |
|---|---|---|---|
| Admin | `admin@investcrm.com` | `Admin123456!` | `/admin` (CRM) |
| Client | `client@investcrm.com` | `Client123456!` | `/dashboard` |

The login page has one-click buttons that fill in either account.

> [!warning] These are public demo passwords. Change or delete the users before using a project for anything real.

## Managing roles

Roles are stored in `auth.users.raw_app_meta_data` and appear in the JWT as `app_metadata.role`. To promote a user, run this in the SQL editor:

```sql
update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
 where email = 'someone@example.com';
```

The change applies once the user's token refreshes (sign out and back in).

## Onboarding a real client
1. Admin → **לקוח חדש**: enter name, email and plan parameters. The row shows as **ממתין** (pending).
2. The client signs up with that same email (enable sign-ups or invite them from the Auth dashboard).
3. A trigger links the account automatically, and the row switches to **מחובר** (linked).

## Deploying
`npm run build` writes a static site to `dist/`. Any static host works (Vercel, Netlify, Cloudflare Pages). Configure SPA fallback to `index.html` and set the two `VITE_*` env vars in the host. Add the production URL to **Auth → URL Configuration**.

## Troubleshooting
| Symptom | Fix |
|---|---|
| `Missing VITE_SUPABASE_URL…` on load | `.env` missing or dev server not restarted |
| Login says invalid credentials for demo users | Seed not applied, so run `supabase db push --include-seed` |
| Admin sees no clients | JWT has no `role: admin`. Check `raw_app_meta_data`, then sign out and back in |
| Upload fails with RLS error | Signed-in user isn't an admin, or the storage migration wasn't applied |
