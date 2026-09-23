// Smoke-tests RLS and storage policies against the configured Supabase project
// using the two seeded demo users. Run: npm run verify:rls
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')

let failures = 0
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`)
  if (!ok) failures++
}

async function signIn(email, password) {
  const sb = createClient(url, key, { auth: { persistSession: false } })
  const { error } = await sb.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`${email}: ${error.message}`)
  return sb
}

const anon = createClient(url, key, { auth: { persistSession: false } })
const admin = await signIn('admin@investcrm.com', 'Admin123456!')
const client = await signIn('client@investcrm.com', 'Client123456!')

// Anonymous
{
  const { data, error } = await anon.from('clients').select('id')
  check('anon cannot read clients', !!error || data.length === 0)
}

// Client reads
const { data: own } = await client.from('clients').select('*')
check('client sees exactly one client row', own?.length === 1, `got ${own?.length}`)
check('client row is their own', own?.[0]?.email === 'client@investcrm.com')

{
  const { error } = await client.from('clients').insert({ full_name: 'x', email: 'rls-probe@example.com' })
  check('client cannot insert clients', !!error)
  const { data } = await client.from('clients').update({ monthly_deposit: 1 }).eq('id', own[0].id).select()
  check('client cannot update own row', (data ?? []).length === 0)
}

// Admin CRUD
const { data: all } = await admin.from('clients').select('id')
check('admin sees all clients', (all?.length ?? 0) > 1, `got ${all?.length}`)
const { data: probe, error: insErr } = await admin
  .from('clients')
  .insert({ full_name: 'בדיקת RLS', email: 'rls-probe@example.com', initial_investment: 1 })
  .select()
  .single()
check('admin can insert client', !insErr, insErr?.message)

// Storage
const other = all.find((c) => c.id !== own[0].id)
const ownPath = `${own[0].id}/rls-probe.txt`
const otherPath = `${other.id}/rls-probe.txt`
const file = new Blob(['rls probe'], { type: 'text/plain' })
const up1 = await admin.storage.from('client-documents').upload(ownPath, file, { upsert: true })
const up2 = await admin.storage.from('client-documents').upload(otherPath, file, { upsert: true })
check('admin can upload to any client folder', !up1.error && !up2.error, up1.error?.message ?? up2.error?.message)

const s1 = await client.storage.from('client-documents').createSignedUrl(ownPath, 60)
check('client can sign URL for own file', !!s1.data?.signedUrl, s1.error?.message)
const s2 = await client.storage.from('client-documents').createSignedUrl(otherPath, 60)
check("client cannot sign URL for another client's file", !s2.data?.signedUrl)
const up3 = await client.storage.from('client-documents').upload(`${own[0].id}/hack.txt`, file)
check('client cannot upload', !!up3.error)

// Cleanup
await admin.storage.from('client-documents').remove([ownPath, otherPath])
if (probe) {
  const { error } = await admin.from('clients').delete().eq('id', probe.id)
  check('admin can delete client', !error, error?.message)
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
