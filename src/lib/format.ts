export interface Formatters {
  ils: (n: number) => string
  compact: (n: number) => string
  percent: (n: number) => string
  date: (iso: string) => string
}

export function makeFormatters(locale: string): Formatters {
  const ils = new Intl.NumberFormat(locale, { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 })
  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 })
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
  return {
    ils: (n) => ils.format(n),
    compact: (n) => `₪${compact.format(n)}`,
    percent: (n) => `${n.toLocaleString(locale, { maximumFractionDigits: 2 })}%`,
    date: (iso) => date.format(new Date(iso)),
  }
}
