import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { makeFormatters, type Formatters } from '../lib/format'
import { LANGUAGES, type Dict, type Lang } from './translations'

export const LANG_STORAGE_KEY = 'investcrm.lang'

interface I18nState {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Dict
  dir: 'rtl' | 'ltr'
  fmt: Formatters
}

const I18nContext = createContext<I18nState | null>(null)

const initialLang = (): Lang => {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY)
    if (stored === 'he' || stored === 'en') return stored
  } catch {
    // storage unavailable (private mode etc.) — fall back to the default
  }
  return 'he'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const { dict, dir, locale } = LANGUAGES[lang]

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
    document.title = dict.appTitle
  }, [lang, dir, dict])

  const setLang = (next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next)
    } catch {
      // ignore — the choice just won't persist
    }
  }

  const fmt = useMemo(() => makeFormatters(locale), [locale])

  return <I18nContext.Provider value={{ lang, setLang, t: dict, dir, fmt }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <LanguageProvider>')
  return ctx
}
