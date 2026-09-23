import { Coins, FileText, Landmark, Pencil, PiggyBank, Plus, Search, Trash2, TrendingUp, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ClientFormModal } from '../components/ClientFormModal'
import { DocumentsModal } from '../components/DocumentsModal'
import { IconButton } from '../components/DocumentsList'
import { Layout } from '../components/Layout'
import { ConfirmDialog } from '../components/Modal'
import { Spinner } from '../components/Spinner'
import { StatCard } from '../components/StatCard'
import { clientSnapshot, type ClientSnapshot } from '../lib/finance'
import { useI18n } from '../i18n/LanguageContext'
import type { Dict } from '../i18n/translations'
import { DOCUMENTS_BUCKET, supabase } from '../lib/supabase'
import type { Client, ClientInput } from '../lib/types'

type ClientRow = Client & { documents: { count: number }[] }
type Enriched = ClientRow & { snap: ClientSnapshot; docCount: number }

type StatusFilter = 'all' | 'linked' | 'pending'
type HorizonFilter = 'all' | 'short' | 'mid' | 'long'
type SortKey = 'name' | 'current' | 'projected' | 'monthly' | 'newest'

const HORIZONS: Record<HorizonFilter, { label: (t: Dict) => string; test: (y: number) => boolean }> = {
  all: { label: (t) => t.admin.horizonAll, test: () => true },
  short: { label: (t) => t.admin.horizonShort, test: (y) => y <= 10 },
  mid: { label: (t) => t.admin.horizonMid, test: (y) => y > 10 && y <= 20 },
  long: { label: (t) => t.admin.horizonLong, test: (y) => y > 20 },
}

const DUPLICATE_EMAIL = '23505'

export function AdminPage() {
  const { t, lang, fmt } = useI18n()
  const [clients, setClients] = useState<ClientRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [horizon, setHorizon] = useState<HorizonFilter>('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [editing, setEditing] = useState<Client | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Client | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [docsFor, setDocsFor] = useState<Client | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('clients').select('*, documents(count)').order('created_at', { ascending: false })
    if (error) setError(error.message)
    setClients((data as ClientRow[]) ?? [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const enriched = useMemo<Enriched[]>(
    () => (clients ?? []).map((c) => ({ ...c, snap: clientSnapshot(c), docCount: c.documents?.[0]?.count ?? 0 })),
    [clients],
  )

  const metrics = useMemo(() => {
    const n = enriched.length
    const sum = (f: (c: Enriched) => number) => enriched.reduce((acc, c) => acc + f(c), 0)
    const aum = sum((c) => c.snap.currentValue)
    const projected = sum((c) => c.snap.projectedValue)
    const projectedDeposits = sum((c) => c.snap.projectedDeposited)
    return {
      n,
      linked: enriched.filter((c) => c.user_id).length,
      aum,
      depositedToDate: sum((c) => c.snap.depositedToDate),
      avgMonthly: n ? sum((c) => Number(c.monthly_deposit)) / n : 0,
      projected,
      growthPct: projectedDeposits ? ((projected - projectedDeposits) / projectedDeposits) * 100 : 0,
    }
  }, [enriched])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = enriched.filter(
      (c) =>
        (!q || c.full_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)) &&
        (status === 'all' || (status === 'linked' ? !!c.user_id : !c.user_id)) &&
        HORIZONS[horizon].test(c.investment_years),
    )
    const by: Record<SortKey, (a: Enriched, b: Enriched) => number> = {
      name: (a, b) => a.full_name.localeCompare(b.full_name, lang),
      current: (a, b) => b.snap.currentValue - a.snap.currentValue,
      projected: (a, b) => b.snap.projectedValue - a.snap.projectedValue,
      monthly: (a, b) => Number(b.monthly_deposit) - Number(a.monthly_deposit),
      newest: (a, b) => b.created_at.localeCompare(a.created_at),
    }
    return rows.sort(by[sort])
  }, [enriched, query, status, horizon, sort, lang])

  const save = async (input: ClientInput): Promise<string | null> => {
    const { error } =
      editing === 'new'
        ? await supabase.from('clients').insert(input)
        : await supabase.from('clients').update(input).eq('id', (editing as Client).id)
    if (error) return error.code === DUPLICATE_EMAIL ? t.admin.duplicateEmail : error.message
    setEditing(null)
    await load()
    return null
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    // Remove the client's storage folder first; document rows cascade with the client.
    const { data: objects } = await supabase.storage.from(DOCUMENTS_BUCKET).list(deleting.id, { limit: 1000 })
    if (objects?.length) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove(objects.map((o) => `${deleting.id}/${o.name}`))
    }
    const { error } = await supabase.from('clients').delete().eq('id', deleting.id)
    setDeleteBusy(false)
    if (error) setError(error.message)
    setDeleting(null)
    await load()
  }

  // Show a placeholder instead of zeros until the first load completes.
  const show = (text: string) => (clients === null ? '—' : text)

  return (
    <Layout title={t.layout.adminTitle}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t.admin.heading}</h1>
          <p className="text-slate-500">{t.admin.summary(metrics.n, metrics.linked, metrics.n - metrics.linked)}</p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          <Plus className="size-4" />
          {t.admin.newClient}
        </button>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t.admin.aum}
          value={show(fmt.ils(metrics.aum))}
          hint={t.admin.aumHint(fmt.ils(metrics.depositedToDate))}
          icon={Landmark}
        />
        <StatCard
          label={t.admin.avgMonthly}
          value={show(fmt.ils(metrics.avgMonthly))}
          hint={t.admin.avgMonthlyHint}
          icon={PiggyBank}
        />
        <StatCard
          label={t.admin.projected}
          value={show(fmt.ils(metrics.projected))}
          hint={t.admin.projectedHint}
          icon={TrendingUp}
        />
        <StatCard
          label={t.admin.growth}
          value={show(fmt.percent(Math.round(metrics.growthPct)))}
          hint={t.admin.growthHint}
          icon={Coins}
        />
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.admin.searchPlaceholder}
              className="w-full rounded-lg border border-slate-300 py-2 ps-9 pe-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <Select value={status} onChange={(v) => setStatus(v as StatusFilter)} label={t.admin.statusLabel}>
            <option value="all">{t.admin.statusAll}</option>
            <option value="linked">{t.admin.statusLinked}</option>
            <option value="pending">{t.admin.statusPending}</option>
          </Select>
          <Select value={horizon} onChange={(v) => setHorizon(v as HorizonFilter)} label={t.admin.horizonLabel}>
            {Object.entries(HORIZONS).map(([k, h]) => (
              <option key={k} value={k}>
                {h.label(t)}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(v) => setSort(v as SortKey)} label={t.admin.sortLabel}>
            <option value="newest">{t.admin.sortNewest}</option>
            <option value="name">{t.admin.sortName}</option>
            <option value="current">{t.admin.sortCurrent}</option>
            <option value="projected">{t.admin.sortProjected}</option>
            <option value="monthly">{t.admin.sortMonthly}</option>
          </Select>
        </div>

        {error && <p className="m-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {clients === null ? (
          <Spinner />
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-slate-500">
            <Users className="size-8" />
            {t.admin.noResults}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-slate-50 text-start text-xs text-slate-500">
                <tr>
                  <Th>{t.admin.colClient}</Th>
                  <Th>{t.admin.colStatus}</Th>
                  <Th num>{t.admin.colInitial}</Th>
                  <Th num>{t.admin.colMonthly}</Th>
                  <Th num>{t.admin.colReturn}</Th>
                  <Th num>{t.admin.colYears}</Th>
                  <Th num>{t.admin.colCurrent}</Th>
                  <Th num>{t.admin.colProjected}</Th>
                  <Th>{t.admin.colActions}</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.full_name}</div>
                      <div className="text-xs text-slate-500">{c.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {c.user_id ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">{t.admin.badgeLinked}</span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{t.admin.badgePending}</span>
                      )}
                    </td>
                    <Td num>{fmt.ils(Number(c.initial_investment))}</Td>
                    <Td num>{fmt.ils(Number(c.monthly_deposit))}</Td>
                    <Td num>{fmt.percent(Number(c.expected_annual_return))}</Td>
                    <Td num>{c.investment_years}</Td>
                    <Td num>{fmt.ils(c.snap.currentValue)}</Td>
                    <Td num strong>
                      {fmt.ils(c.snap.projectedValue)}
                    </Td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => setDocsFor(c)}
                          title={t.admin.documents}
                          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-slate-600 hover:bg-slate-100"
                        >
                          <FileText className="size-4" />
                          <span className="tabular-nums">{c.docCount}</span>
                        </button>
                        <IconButton label={t.common.edit} onClick={() => setEditing(c)} icon={<Pencil className="size-4" />} />
                        <IconButton label={t.common.delete} danger onClick={() => setDeleting(c)} icon={<Trash2 className="size-4" />} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && <ClientFormModal client={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={save} />}
      {docsFor && <DocumentsModal client={docsFor} onClose={() => setDocsFor(null)} onChange={load} />}
      {deleting && (
        <ConfirmDialog
          title={t.admin.deleteTitle}
          message={
            <>
              {t.admin.deleteBefore}
              <b>
                <bdi>{deleting.full_name}</bdi>
              </b>
              {t.admin.deleteAfter}
            </>
          }
          busy={deleteBusy}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </Layout>
  )
}

function Th({ children, num = false }: { children: ReactNode; num?: boolean }) {
  return <th className={`px-4 py-3 font-medium ${num ? 'text-end' : 'text-start'}`}>{children}</th>
}

function Td({ children, num = false, strong = false }: { children: ReactNode; num?: boolean; strong?: boolean }) {
  return <td className={`px-4 py-3 tabular-nums ${num ? 'text-end' : ''} ${strong ? 'font-semibold' : ''}`}>{children}</td>
}

function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  children: ReactNode
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
    >
      {children}
    </select>
  )
}
