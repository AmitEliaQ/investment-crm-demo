# InvestCRM — Investment & CRM Demo (Hebrew / RTL)

Full-stack demo: clients see how their money in an **S&P 500** index grows with **compound interest**, and admins manage everything from a **CRM portal**. Built with **React + Vite + TypeScript**, **Tailwind**, **Recharts** and **Supabase** (Auth, Postgres RLS, Storage).

| | |
|---|---|
| `/login` | Email/password sign-in with one-click demo credentials |
| `/dashboard` | Client: investment summary, interactive compound-interest chart & simulator, documents |
| `/admin` | Admin CRM: AUM metrics, searchable/filterable client table, add/edit/delete, file uploads |

## Quick start

```bash
npm install
cp .env.example .env              # fill VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
supabase link --project-ref <ref>
supabase db push --include-seed   # schema, RLS, storage bucket, demo data
npm run dev
```

Demo users: `admin@investcrm.com` / `Admin123456!` and `client@investcrm.com` / `Client123456!`

## Documentation

`docs/` is an **Obsidian vault**. Open it with *Open folder as vault*:

- [Architecture](docs/Architecture.md): system overview, auth and role flow, data flow, finance model
- [Database Schema](docs/Database-Schema.md): ERD, tables, RLS and Storage policies
- [Setup Guide](docs/Setup-Guide.md): local setup, env vars, migrations, troubleshooting

## Scripts

| Command | |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type-check and production build |
| `npm run lint` | oxlint |
| `npm run verify:rls` | Test RLS and storage policies with the demo users |

> Projections are illustrative and are not investment advice.
