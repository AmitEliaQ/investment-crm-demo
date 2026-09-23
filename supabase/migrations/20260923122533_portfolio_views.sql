-- Read-only views exposing the same portfolio figures the app computes in
-- src/lib/finance.ts, so they can be inspected in the Supabase dashboard or
-- queried directly. Nothing here is stored; values are calculated on read.

-- Future value with monthly compounding and end-of-month deposits:
-- FV = P(1+i)^n + PMT·((1+i)^n − 1)/i, where i = annual_return_pct / 100 / 12.
create or replace function public.future_value(
  initial numeric,
  monthly numeric,
  annual_return_pct numeric,
  months integer
)
returns numeric
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select case
    when annual_return_pct = 0 then initial + monthly * months
    else initial * power(1 + annual_return_pct / 1200, months)
       + monthly * (power(1 + annual_return_pct / 1200, months) - 1) / (annual_return_pct / 1200)
  end;
$$;

comment on function public.future_value is 'Compound-interest future value (monthly compounding, end-of-month deposits). Mirrors futureValue() in src/lib/finance.ts.';

-- Per-client figures. security_invoker makes the view run with the caller's
-- rights, so the RLS policies on public.clients still apply: admins see every
-- client, a client sees only their own row.
create or replace view public.client_portfolio
with (security_invoker = true)
as
select
  c.id,
  c.full_name,
  c.email,
  c.user_id is not null                                     as linked,
  c.initial_investment,
  c.monthly_deposit,
  c.expected_annual_return,
  c.investment_years,
  c.created_at,
  m.months_elapsed,
  c.initial_investment + c.monthly_deposit * m.months_elapsed as deposited_to_date,
  round(public.future_value(c.initial_investment, c.monthly_deposit, c.expected_annual_return, m.months_elapsed), 2)
                                                              as current_value,
  c.initial_investment + c.monthly_deposit * m.total_months  as projected_deposited,
  round(public.future_value(c.initial_investment, c.monthly_deposit, c.expected_annual_return, m.total_months), 2)
                                                              as projected_value
from public.clients c
cross join lateral (
  select
    c.investment_years * 12 as total_months,
    -- Whole calendar months since the client joined, capped at the plan
    -- length (same rule as monthsElapsed() in the app; evaluated in UTC).
    least(
      greatest(
        ((extract(year from now()) - extract(year from c.created_at)) * 12
          + (extract(month from now()) - extract(month from c.created_at)))::integer,
        0
      ),
      c.investment_years * 12
    ) as months_elapsed
) m;

comment on view public.client_portfolio is 'Per-client deposited-to-date, current and projected portfolio value (computed on read; respects clients RLS).';

-- Totals across the clients the caller can see (the admin metrics header).
create or replace view public.portfolio_summary
with (security_invoker = true)
as
select
  count(*)                                         as clients,
  count(*) filter (where linked)                   as linked_clients,
  coalesce(sum(current_value), 0)                  as total_aum,
  coalesce(sum(deposited_to_date), 0)              as total_deposited_to_date,
  round(coalesce(avg(monthly_deposit), 0), 2)      as avg_monthly_deposit,
  coalesce(sum(projected_value), 0)                as total_projected_value,
  coalesce(sum(projected_deposited), 0)            as total_projected_deposited,
  round(
    100 * (sum(projected_value) - sum(projected_deposited)) / nullif(sum(projected_deposited), 0),
    1
  )                                                as projected_growth_pct
from public.client_portfolio;

comment on view public.portfolio_summary is 'Aggregate AUM / deposits / projections across the clients visible to the caller.';

revoke all on public.client_portfolio, public.portfolio_summary from anon;
grant select on public.client_portfolio, public.portfolio_summary to authenticated;
