import { CalendarClock, PiggyBank, RotateCcw, Target, TrendingUp, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DocumentsList } from '../components/DocumentsList'
import { GrowthChart } from '../components/GrowthChart'
import { Layout } from '../components/Layout'
import { Spinner } from '../components/Spinner'
import { StatCard } from '../components/StatCard'
import { clientSnapshot, futureValue, planFromClient, projectionSeries, totalDeposited, type Plan } from '../lib/finance'
import { useI18n } from '../i18n/LanguageContext'
import { supabase } from '../lib/supabase'
import type { Client, DocumentRow } from '../lib/types'

export function DashboardPage() {
  const { t, fmt } = useI18n()
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
      <Layout title={t.layout.dashboardTitle}>
        <Spinner />
      </Layout>
    )
  }

  if (!client || !plan) {
    return (
      <Layout title={t.layout.dashboardTitle}>
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold">{t.dashboard.noPortfolioTitle}</h2>
          <p className="mt-2 text-slate-500">
            {error ?? t.dashboard.noPortfolioBody}
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
    <Layout title={t.layout.dashboardTitle}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t.dashboard.greeting(client.full_name)}</h1>
        <p className="text-slate-500">{t.dashboard.subtitle(fmt.date(client.created_at), snap.monthsElapsed)}</p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label={t.dashboard.initial} value={fmt.ils(saved.initial)} icon={Wallet} />
        <StatCard label={t.dashboard.monthly} value={fmt.ils(saved.monthly)} icon={PiggyBank} />
        <StatCard
          label={t.dashboard.depositedToDate}
          value={fmt.ils(snap.depositedToDate)}
          hint={t.dashboard.depositsCount(snap.monthsElapsed)}
          icon={CalendarClock}
        />
        <StatCard
          label={t.dashboard.currentValue}
          value={fmt.ils(snap.currentValue)}
          hint={t.dashboard.profit(fmt.ils(snap.currentValue - snap.depositedToDate))}
          icon={TrendingUp}
        />
        <StatCard
          label={t.dashboard.projectedIn(saved.years)}
          value={fmt.ils(snap.projectedValue)}
          hint={t.dashboard.atReturn(fmt.percent(saved.annualReturn))}
          icon={Target}
        />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="font-semibold">{t.dashboard.chartTitle}</h2>
          <p className="mb-3 text-sm text-slate-500">{t.dashboard.chartSubtitle}</p>
          <GrowthChart data={series} />
          <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-center text-sm">
            <Summary label={t.dashboard.totalDeposits} value={fmt.ils(simDeposited)} />
            <Summary label={t.dashboard.interestEarned} value={fmt.ils(simValue - simDeposited)} />
            <Summary label={t.dashboard.finalValue} value={fmt.ils(simValue)} strong />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">{t.dashboard.simulatorTitle}</h2>
            {modified && (
              <button
                onClick={() => setPlan(saved)}
                className="flex items-center gap-1 text-sm text-brand-600 hover:underline"
              >
                <RotateCcw className="size-3.5" />
                {t.dashboard.resetPlan}
              </button>
            )}
          </div>
          <Slider
            label={t.dashboard.monthly}
            value={plan.monthly}
            display={fmt.ils(plan.monthly)}
            min={0}
            max={20000}
            step={250}
            onChange={(monthly) => setPlan({ ...plan, monthly })}
          />
          <Slider
            label={t.dashboard.initial}
            value={plan.initial}
            display={fmt.ils(plan.initial)}
            min={0}
            max={1000000}
            step={5000}
            onChange={(initial) => setPlan({ ...plan, initial })}
          />
          <Slider
            label={t.dashboard.annualReturn}
            value={plan.annualReturn}
            display={fmt.percent(plan.annualReturn)}
            min={0}
            max={15}
            step={0.5}
            onChange={(annualReturn) => setPlan({ ...plan, annualReturn })}
          />
          <Slider
            label={t.dashboard.period}
            value={plan.years}
            display={t.dashboard.years(plan.years)}
            min={1}
            max={40}
            step={1}
            onChange={(years) => setPlan({ ...plan, years })}
          />
          <p className="mt-2 text-xs leading-relaxed text-slate-500">{t.dashboard.disclaimer}</p>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 font-semibold">{t.dashboard.documentsTitle}</h2>
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
