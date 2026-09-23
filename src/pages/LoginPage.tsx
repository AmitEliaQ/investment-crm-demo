import { Lock, Mail, ShieldCheck, TrendingUp, User } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const DEMO_USERS = [
  { label: 'מנהל מערכת', email: 'admin@investcrm.com', password: 'Admin123456!', icon: ShieldCheck },
  { label: 'לקוח', email: 'client@investcrm.com', password: 'Client123456!', icon: User },
] as const

export function LoginPage() {
  const { session, role, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (session) return <Navigate to={role === 'admin' ? '/admin' : '/dashboard'} replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const err = await signIn(email.trim(), password)
    setBusy(false)
    if (err) {
      setError(err === 'Invalid login credentials' ? 'אימייל או סיסמה שגויים' : err)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-brand-500 text-white shadow">
            <TrendingUp className="size-6" />
          </div>
          <h1 className="text-2xl font-bold">InvestCRM</h1>
          <p className="text-sm text-slate-500">ניהול לקוחות והשקעות במדד S&amp;P 500</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">התחברות</h2>

          <label className="mb-1 block text-sm font-medium" htmlFor="email">
            אימייל
          </label>
          <div className="relative mb-4">
            <Mail className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              type="email"
              dir="ltr"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pr-9 pl-3 text-start outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <label className="mb-1 block text-sm font-medium" htmlFor="password">
            סיסמה
          </label>
          <div className="relative mb-4">
            <Lock className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type="password"
              dir="ltr"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 py-2 pr-9 pl-3 text-start outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-brand-500 py-2.5 font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {busy ? 'מתחבר…' : 'כניסה'}
          </button>
        </form>

        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4">
          <p className="mb-3 text-sm font-medium text-slate-600">משתמשי הדגמה — לחיצה ממלאת את הפרטים:</p>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_USERS.map((u) => (
              <button
                key={u.email}
                type="button"
                onClick={() => {
                  setEmail(u.email)
                  setPassword(u.password)
                  setError(null)
                }}
                className="flex flex-col items-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-start hover:border-brand-500 hover:bg-brand-50"
              >
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <u.icon className="size-4 text-brand-500" />
                  {u.label}
                </span>
                <span className="text-xs text-slate-500" dir="ltr">
                  {u.email}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
