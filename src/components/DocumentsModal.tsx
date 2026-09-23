import { Upload } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'
import { DOCUMENTS_BUCKET, supabase } from '../lib/supabase'
import type { Client, DocumentRow } from '../lib/types'
import { DocumentsList } from './DocumentsList'
import { Modal } from './Modal'
import { Spinner } from './Spinner'

// Storage keys must be ASCII-safe, so Hebrew/space characters are replaced;
// the original name is preserved in documents.file_name.
const safeKey = (name: string) => {
  const dot = name.lastIndexOf('.')
  const clean = (part: string) => part.normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  const base = clean(dot > 0 ? name.slice(0, dot) : name) || 'file'
  const ext = dot > 0 ? clean(name.slice(dot + 1)) : ''
  return ext ? `${base}.${ext}` : base
}

interface Props {
  client: Client
  onClose: () => void
  onChange: () => void
}

export function DocumentsModal({ client, onClose, onChange }: Props) {
  const { t } = useI18n()
  const [documents, setDocuments] = useState<DocumentRow[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    setDocuments(data ?? [])
  }, [client.id])

  useEffect(() => {
    load()
  }, [load])

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    setError(null)
    for (const file of Array.from(files)) {
      const path = `${client.id}/${Date.now()}-${safeKey(file.name)}`
      const { error: upErr } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(path, file, {
          contentType: file.type.startsWith('text/') ? `${file.type};charset=utf-8` : file.type || undefined,
        })
      if (upErr) {
        setError(t.documents.uploadFailed(file.name, upErr.message))
        continue
      }
      const { error: dbErr } = await supabase.from('documents').insert({ client_id: client.id, file_path: path, file_name: file.name })
      if (dbErr) {
        await supabase.storage.from(DOCUMENTS_BUCKET).remove([path])
        setError(t.documents.saveFailed(file.name, dbErr.message))
      }
    }
    if (fileInput.current) fileInput.current.value = ''
    setBusy(false)
    await load()
    onChange()
  }

  const remove = async (doc: DocumentRow) => {
    setError(null)
    const { error: stErr } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.file_path])
    if (stErr) return setError(stErr.message)
    const { error: dbErr } = await supabase.from('documents').delete().eq('id', doc.id)
    if (dbErr) return setError(dbErr.message)
    await load()
    onChange()
  }

  return (
    <Modal title={t.documents.modalTitle(client.full_name)} onClose={onClose} wide>
      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-brand-500 hover:bg-brand-50 ${busy ? 'pointer-events-none opacity-60' : ''}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          upload(e.dataTransfer.files)
        }}
      >
        <Upload className="size-6 text-brand-500" />
        <span className="text-sm font-medium">{busy ? t.documents.uploading : t.documents.dropHint}</span>
        <span className="text-xs text-slate-500">{t.documents.fileTypes}</span>
        <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
      </label>

      {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="mt-4">{documents === null ? <Spinner /> : <DocumentsList documents={documents} onDelete={remove} />}</div>
    </Modal>
  )
}
