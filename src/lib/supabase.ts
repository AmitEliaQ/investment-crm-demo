import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !key) {
  throw new Error('חסרים משתני סביבה: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (ראו .env.example)')
}

export const supabase = createClient(url, key)

export const DOCUMENTS_BUCKET = 'client-documents'
