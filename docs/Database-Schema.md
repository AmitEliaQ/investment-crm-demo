---
tags: [investcrm, database, security]
---
# Database Schema

Related: [[Architecture]] · [[Setup-Guide]] · [[Home]]

Migrations live in `supabase/migrations/`:

| File | Contents |
|---|---|
| `20260923114800_schema.sql` | `clients`, `documents` tables and indexes |
| `20260923114801_security.sql` | `private` schema, `is_admin()`, grants, RLS policies, auto-link triggers |
| `20260923114802_storage.sql` | `client-documents` bucket and Storage policies |
| `supabase/seed.sql` | Demo auth users and sample clients |

## ERD

```mermaid
erDiagram
  AUTH_USERS ||--o| CLIENTS : "user_id (nullable)"
  CLIENTS ||--o{ DOCUMENTS : "client_id"
  CLIENTS ||--o{ STORAGE_OBJECTS : "folder {client_id}/"

  AUTH_USERS {
    uuid id PK
    text email
    jsonb raw_app_meta_data "role: admin | client"
  }
  CLIENTS {
    uuid id PK
    uuid user_id FK "→ auth.users, ON DELETE SET NULL"
    text full_name
    text email UK
    numeric initial_investment
    numeric monthly_deposit
    numeric expected_annual_return "default 8.5 (%)"
    int investment_years "default 10"
    timestamptz created_at
  }
  DOCUMENTS {
    uuid id PK
    uuid client_id FK "→ clients, ON DELETE CASCADE"
    text file_path UK "bucket object key"
    text file_name "original name"
    timestamptz created_at
  }
  STORAGE_OBJECTS {
    text bucket_id "client-documents"
    text name "{client_id}/{ts}-{file}"
  }
```

## Tables

### `public.clients`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `user_id` | `uuid` → `auth.users.id` | `NULL` = pending client; `ON DELETE SET NULL`; indexed |
| `full_name` | `text` | required |
| `email` | `text` **unique** | used to link to an auth user |
| `initial_investment` | `numeric(14,2)` | ≥ 0 |
| `monthly_deposit` | `numeric(14,2)` | ≥ 0 |
| `expected_annual_return` | `numeric(5,2)` | percent, default **8.5**, between −100 and 100 |
| `investment_years` | `integer` | default **10**, 1–60 |
| `created_at` | `timestamptz` | `now()`; start date for "current value" |

### `public.documents`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `client_id` | `uuid` → `clients.id` | `ON DELETE CASCADE`; indexed |
| `file_path` | `text` unique | key inside `client-documents` |
| `file_name` | `text` | display name (may be Hebrew) |
| `created_at` | `timestamptz` | |

## Role helper

```sql
create function private.is_admin() returns boolean
language sql stable security invoker set search_path = ''
as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false) $$;
```

- It lives in the **`private`** schema, which the Data API doesn't expose, so it can't be called as an RPC.
- It is `security invoker`: it only reads the caller's JWT and needs no extra privileges.
- Policies call it as `(select private.is_admin())` so Postgres evaluates it **once per query** rather than once per row.

## Row Level Security

RLS is **enabled** on both tables. `anon` has no privileges at all. `authenticated` has table grants, and the policies below narrow them.

### `clients`
| Policy | Command | Rule |
|---|---|---|
| read own record or admin | `SELECT` | `user_id = auth.uid() OR is_admin()` |
| admin insert | `INSERT` | `WITH CHECK is_admin()` |
| admin update | `UPDATE` | `USING is_admin() WITH CHECK is_admin()` |
| admin delete | `DELETE` | `USING is_admin()` |

### `documents`
| Policy | Command | Rule |
|---|---|---|
| read own or admin | `SELECT` | `is_admin() OR client_id IN (SELECT id FROM clients WHERE user_id = auth.uid())` |
| admin insert / update / delete | `INSERT` `UPDATE` `DELETE` | `is_admin()` |

Result: a **client** can read exactly one `clients` row (their own) and that row's documents. Every write they try is rejected or affects 0 rows. An **admin** has full CRUD.

## Storage: bucket `client-documents`

Private bucket (`public = false`), 20 MB per-file limit. Object key convention: `{client_id}/{timestamp}-{safe_name}`.

| Policy (on `storage.objects`) | Command | Rule |
|---|---|---|
| admin select / insert / update / delete | all | `bucket_id = 'client-documents' AND is_admin()` |
| client reads own folder | `SELECT` | `bucket_id = 'client-documents' AND (storage.foldername(name))[1] IN (SELECT id::text FROM clients WHERE user_id = auth.uid())` |

Admins have SELECT + INSERT + UPDATE, which upsert needs. Clients can only `SELECT` objects in their own folder, and that same permission is what lets them create signed URLs.

## Triggers (auto-linking)

| Trigger | Table | Function | Purpose |
|---|---|---|---|
| `on_auth_user_created_link_client` | `auth.users` AFTER INSERT | `private.link_client_on_signup()` | Set `clients.user_id` for pending rows with matching email |
| `clients_link_existing_user` | `public.clients` BEFORE INSERT | `private.link_user_on_client_insert()` | Fill `user_id` if an account with that email already exists |

Both are `security definer` with `search_path = ''`. They live in `private`, and `EXECUTE` is revoked from `public`/`anon`/`authenticated`, so they only run as triggers.

## Verifying policies

`npm run verify:rls` (`scripts/verify-rls.mjs`) signs in as both demo users and checks:
- anon can't read, client sees 1 row, client can't insert or update
- admin reads all rows and can insert and delete
- admin can upload to any folder; client can sign their own file but not another client's, and can't upload
