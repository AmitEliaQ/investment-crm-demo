import { Loader2 } from 'lucide-react'
import { useI18n } from '../i18n/LanguageContext'

export function Spinner({ fullScreen = false }: { fullScreen?: boolean }) {
  const { t } = useI18n()
  return (
    <div className={`flex items-center justify-center ${fullScreen ? 'min-h-screen' : 'py-12'}`}>
      <Loader2 className="size-7 animate-spin text-brand-500" aria-label={t.loading} />
    </div>
  )
}
