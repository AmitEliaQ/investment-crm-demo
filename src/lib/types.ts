export type Role = 'admin' | 'client'

export interface Client {
  id: string
  user_id: string | null
  full_name: string
  email: string
  initial_investment: number
  monthly_deposit: number
  expected_annual_return: number
  investment_years: number
  created_at: string
}

export type ClientInput = Pick<
  Client,
  'full_name' | 'email' | 'initial_investment' | 'monthly_deposit' | 'expected_annual_return' | 'investment_years'
>

export interface DocumentRow {
  id: string
  client_id: string
  file_path: string
  file_name: string
  created_at: string
}
