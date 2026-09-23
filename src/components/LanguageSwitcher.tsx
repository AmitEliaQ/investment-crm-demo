import { Languages } from 'lucide-react'
import { useI18n } from '../i18n/LanguageContext'
import { LANGUAGES, type Lang } from '../i18n/translations'

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n()

  return (
    <div
      role="radiogroup"
      aria-label={t.language}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-sm"
    >
      <Languages className="mx-1 size-4 text-slate-400" aria-hidden />
      {(Object.keys(LANGUAGES) as Lang[]).map((code) => (
        <button
          key={code}
          type="button"
          role="radio"
          aria-checked={lang === code}
          lang={code}
          onClick={() => setLang(code)}
          className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
            lang === code ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {LANGUAGES[code].label}
        </button>
      ))}
    </div>
  )
}
