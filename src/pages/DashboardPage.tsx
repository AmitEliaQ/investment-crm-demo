import { CalendarClock, PiggyBank, RotateCcw, Target, TrendingUp, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DocumentsList } from '../components/DocumentsList'
import { GrowthChart } from '../components/GrowthChart'
import { Layout } from '../components/Layout'
import { Spinner } from '../components/Spinner'
import { StatCard } from '../components/StatCard'
import { clientSnapshot, futureValue, planFromClient, projectionSeries, totalDeposited, type Plan } from '../lib/finance'
import { formatDate, formatILS, formatPercent } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Client, DocumentRow } from '../lib/types'

export function DashboardPage() {
  const [client, setClient] = useState<Client | null>(null)
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      // RLS only returns the signed-in user's own row.
      const { data, error } = await supabase.from('clients').select('*').maybeSingle<Client>()
      if (error) setError(error.message)
      else if (data) {
        setClient(data)
        setPlan(planFromClient(data))
        const docs = await supabase
          .from('documents')
          .select('*')
          .eq('client_id', data.id)
          .order('created_at', { ascending: false })
        setDocuments(docs.data ?? [])
      }
      setLoading(false)
    })()
  }, [])

  const series = useMemo(() => (plan ? projectionSeries(plan) : []), [plan])

  if (loading) {
    return (
      <Layout title="לוח בקרה אישי">
        <Spinner />
      </Layout>
    )
  }

  if (!client || !plan) {
    return (
      <Layout title="לוח בקרה אישי">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold">לא נמצא תיק השקעות</h2>
          <p className="mt-2 text-slate-500">
            {error ?? 'החשבון שלך עדיין לא שויך לתיק השקעות. פנה/י למנהל התיק.'}
          </p>
        </div>
      </Layout>
    )
  }

  const snap = clientSnapshot(client)
  const months = plan.years * 12
  const simValue = futureValue(plan, months)
  const simDeposited = totalDeposited(plan, months)
  const saved = planFromClient(client)
  const modified = JSON.stringify(saved) !== JSON.stringify(plan)

  return (
    <Layout title="לוח בקרה אישי">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">שלום, {client.full_name}</h1>
        <p className="text-slate-500">
          תיק השקעות במדד S&amp;P 500 · פעיל מאז {formatDate(client.created_at)} ({snap.monthsElapsed} חודשים)
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="השקעה ראשונית" value={formatILS(saved.initial)} icon={Wallet} />
        <StatCard label="הפקדה חודשית" value={formatILS(saved.monthly)} icon={PiggyBank} />
        <StatCard
          label="סך הופקד עד היום"
          value={formatILS(snap.depositedToDate)}
          hint={`${snap.monthsElapsed} הפקדות חודשיות`}
          icon={CalendarClock}
        />
        <StatCard
          label="שווי תיק נוכחי (משוער)"
          value={formatILS(snap.currentValue)}
          hint={`רווח ${formatILS(snap.currentValue - snap.depositedToDate)}`}
          icon={TrendingUp}
        />
        <StatCard
          label={`שווי צפוי בעוד ${saved.years} שנים`}
          value={formatILS(snap.projectedValue)}
          hint={`בתשואה של ${formatPercent(saved.annualReturn)} לשנה`}
          icon={Target}
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="font-semibold">צמיחת התיק בריבית דריבית</h2>
          <p className="mb-3 text-sm text-slate-500">שווי התיק הצפוי לעומת סך הכסף שהופקד, לאורך תקופת ההשקעה</p>
          <GrowthChart data={series} />
          <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-center text-sm">
            <Summary label="סך הפקדות" value={formatILS(simDeposited)} />
            <Summary label="רווח מריבית" value={formatILS(simValue - simDeposited)} />
            <Summary label="שווי סופי" value={formatILS(simValue)} strong />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">סימולטור השקעה</h2>
            {modified && (
              <button
                onClick={() => setPlan(saved)}
                className="flex items-center gap-1 text-sm text-brand-600 hover:underline"
              >
                <RotateCcw className="size-3.5" />
                איפוס לתוכנית שלי
              </button>
            )}
          </div>
          <Slider
            label="הפקדה חודשית"
            value={plan.monthly}
            display={formatILS(plan.monthly)}
            min={0}
            max={20000}
            step={250}
            onChange={(monthly) => setPlan({ ...plan, monthly })}
          />
          <Slider
            label="השקעה ראשונית"
            value={plan.initial}
            display={formatILS(plan.initial)}
            min={0}
            max={1000000}
            step={5000}
            onChange={(initial) => setPlan({ ...plan, initial })}
          />
          <Slider
            label="תשואה שנתית צפויה"
            value={plan.annualReturn}
            display={formatPercent(plan.annualReturn)}
            min={0}
            max={15}
            step={0.5}
            onChange={(annualReturn) => setPlan({ ...plan, annualReturn })}
          />
          <Slider
            label="תקופת השקעה"
            value={plan.years}
            display={`${plan.years} שנים`}
            min={1}
            max={40}
            step={1}
            onChange={(years) => setPlan({ ...plan, years })}
          />
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            התשואה ההיסטורית הממוצעת של מדד S&amp;P 500 היא כ‑8%–10% בשנה. הסימולציה מניחה ריבית דריבית חודשית
            והפקדה בסוף כל חודש, ואינה מהווה ייעוץ השקעות.
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 font-semibold">מסמכים ודוחות</h2>
        <DocumentsList documents={documents} />
      </section>
    </Layout>
  )
}

function Summary({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-slate-500">{label}</div>
      <div className={`tabular-nums ${strong ? 'font-bold text-brand-700' : 'font-semibold'}`}>{value}</div>
    </div>
  )
}

function Slider(props: {
  label: string
  value: number
  display: string
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="mb-4 block">
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium">{props.label}</span>
        <span className="tabular-nums text-slate-700">{props.display}</span>
      </div>
      <input
        type="range"
        className="w-full"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  )
}
