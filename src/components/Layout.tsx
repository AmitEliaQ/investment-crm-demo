import { LogOut, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n/LanguageContext'
import { LanguageSwitcher } from './LanguageSwitcher'

export function Layout({ title, children }: { title: string; children: ReactNode }) {
  const { session, role, signOut } = useAuth()
  const navigate = useNavigate()
  const { t } = useI18n()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-500 text-white">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <div className="text-lg font-bold leading-tight">InvestCRM</div>
              <div className="text-xs text-slate-500">{title}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <div className="hidden text-end sm:block">
              <div className="text-sm font-medium">{session?.user.email}</div>
              <div className="text-xs text-slate-500">{role === 'admin' ? t.layout.roleAdmin : t.layout.roleClient}</div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <LogOut className="size-4 rtl:-scale-x-100" />
              {t.layout.signOut}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  )
}
