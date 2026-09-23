import { useState, type FormEvent, type ReactNode } from 'react'
import type { Client, ClientInput } from '../lib/types'
import { Modal } from './Modal'

interface Props {
  client: Client | null
  onClose: () => void
  onSave: (input: ClientInput) => Promise<string | null>
}

const EMPTY: ClientInput = {
  full_name: '',
  email: '',
  initial_investment: 0,
  monthly_deposit: 0,
  expected_annual_return: 8.5,
  investment_years: 10,
}

export function ClientFormModal({ client, onClose, onSave }: Props) {
  const [form, setForm] = useState<ClientInput>(() =>
    client
      ? {
          full_name: client.full_name,
          email: client.email,
          initial_investment: Number(client.initial_investment),
          monthly_deposit: Number(client.monthly_deposit),
          expected_annual_return: Number(client.expected_annual_return),
          investment_years: client.investment_years,
        }
      : EMPTY,
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = <K extends keyof ClientInput>(key: K, value: ClientInput[K]) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const err = await onSave({ ...form, full_name: form.full_name.trim(), email: form.email.trim().toLowerCase() })
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <Modal title={client ? 'עריכת לקוח' : 'הוספת לקוח חדש'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <Field label="שם מלא" className="col-span-2">
          <input required value={form.full_name} onChange={(e) => set('full_name', e.target.value)} className={input} />
        </Field>
        <Field label="אימייל" className="col-span-2" hint="אם קיים משתמש עם אימייל זה, הוא ישויך ללקוח אוטומטית">
          <input
            required
            type="email"
            dir="ltr"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className={`${input} text-start`}
          />
        </Field>
        <Field label="השקעה ראשונית (₪)">
          <NumberInput value={form.initial_investment} min={0} step={1000} onChange={(v) => set('initial_investment', v)} />
        </Field>
        <Field label="הפקדה חודשית (₪)">
          <NumberInput value={form.monthly_deposit} min={0} step={100} onChange={(v) => set('monthly_deposit', v)} />
        </Field>
        <Field label="תשואה שנתית צפויה (%)">
          <NumberInput
            value={form.expected_annual_return}
            min={-100}
            max={100}
            step={0.1}
            onChange={(v) => set('expected_annual_return', v)}
          />
        </Field>
        <Field label="תקופת השקעה (שנים)">
          <NumberInput value={form.investment_years} min={1} max={60} step={1} onChange={(v) => set('investment_years', v)} />
        </Field>

        {error && <p className="col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="col-span-2 flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50">
            ביטול
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {busy ? 'שומר…' : 'שמירה'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

const input =
  'w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100'

function Field({
  label,
  hint,
  className = '',
  children,
}: {
  label: string
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

function NumberInput(props: { value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      required
      dir="ltr"
      min={props.min}
      max={props.max}
      step={props.step}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      className={`${input} text-start tabular-nums`}
    />
  )
}
