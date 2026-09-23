import { Download, Eye, FileText, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { formatDate } from '../lib/format'
import { DOCUMENTS_BUCKET, supabase } from '../lib/supabase'
import type { DocumentRow } from '../lib/types'

interface Props {
  documents: DocumentRow[]
  onDelete?: (doc: DocumentRow) => void
}

export function DocumentsList({ documents, onDelete }: Props) {
  const [error, setError] = useState<string | null>(null)

  // Private bucket: every view/download goes through a short-lived signed URL.
  const open = async (doc: DocumentRow, download: boolean) => {
    setError(null)
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(doc.file_path, 60, download ? { download: doc.file_name } : undefined)
    if (error || !data) {
      setError(`לא ניתן לפתוח את הקובץ: ${error?.message ?? ''}`)
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  if (documents.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">אין מסמכים מצורפים עדיין.</p>
  }

  return (
    <div>
      {error && <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <ul className="divide-y divide-slate-100">
        {documents.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="size-5 shrink-0 text-brand-500" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{doc.file_name}</div>
                <div className="text-xs text-slate-500">{formatDate(doc.created_at)}</div>
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <IconButton label="צפייה" onClick={() => open(doc, false)} icon={<Eye className="size-4" />} />
              <IconButton label="הורדה" onClick={() => open(doc, true)} icon={<Download className="size-4" />} />
              {onDelete && (
                <IconButton
                  label="מחיקה"
                  danger
                  onClick={() => onDelete(doc)}
                  icon={<Trash2 className="size-4" />}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function IconButton({
  label,
  icon,
  onClick,
  danger = false,
}: {
  label: string
  icon: ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded-md p-2 ${danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-100'}`}
    >
      {icon}
    </button>
  )
}
