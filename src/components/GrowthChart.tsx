import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ProjectionPoint } from '../lib/finance'
import { formatCompact, formatILS } from '../lib/format'

const VALUE_COLOR = 'var(--color-series-value)'
const DEPOSIT_COLOR = 'var(--color-series-deposit)'

interface TooltipProps {
  active?: boolean
  label?: number
  payload?: { payload: ProjectionPoint }[]
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  const interest = p.value - p.deposited
  return (
    <div dir="rtl" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <div className="mb-1 font-semibold">שנה {label}</div>
      <Row color={VALUE_COLOR} label="שווי תיק צפוי" value={formatILS(p.value)} />
      <Row color={DEPOSIT_COLOR} label="סך הפקדות" value={formatILS(p.deposited)} />
      <div className="mt-1 border-t border-slate-100 pt-1 text-slate-600">
        רווח מריבית דריבית: <span className="font-medium tabular-nums text-slate-900">{formatILS(interest)}</span>
      </div>
    </div>
  )
}

function Row({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-slate-600">
        <span className="inline-block size-2.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

export function GrowthChart({ data }: { data: ProjectionPoint[] }) {
  return (
    // Time runs left→right like standard financial charts, so the plot itself is LTR.
    <div dir="ltr" className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="valueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={VALUE_COLOR} stopOpacity={0.25} />
              <stop offset="100%" stopColor={VALUE_COLOR} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="depositFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={DEPOSIT_COLOR} stopOpacity={0.2} />
              <stop offset="100%" stopColor={DEPOSIT_COLOR} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickFormatter={(y: number) => (y === 0 ? 'היום' : `שנה ${y}`)}
            minTickGap={16}
          />
          <YAxis
            width={64}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#64748b', fontSize: 12 }}
            tickFormatter={formatCompact}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4' }} />
          <Legend
            verticalAlign="top"
            align="right"
            height={32}
            iconType="circle"
            formatter={(v: string) => <span className="text-sm text-slate-700">{v}</span>}
          />
          <Area
            type="monotone"
            dataKey="deposited"
            name="סך הפקדות"
            stroke={DEPOSIT_COLOR}
            strokeWidth={2}
            fill="url(#depositFill)"
            activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            name="שווי תיק צפוי"
            stroke={VALUE_COLOR}
            strokeWidth={2}
            fill="url(#valueFill)"
            activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
