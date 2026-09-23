const ils = new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('he-IL', { notation: 'compact', maximumFractionDigits: 1 })
const date = new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium' })

export const formatILS = (n: number) => ils.format(n)
export const formatCompact = (n: number) => `₪${compact.format(n)}`
export const formatPercent = (n: number) => `${n.toLocaleString('he-IL', { maximumFractionDigits: 2 })}%`
export const formatDate = (iso: string) => date.format(new Date(iso))
