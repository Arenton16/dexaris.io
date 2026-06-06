create table portfolio_positions (
  id uuid default gen_random_uuid() primary key,
  anonymous_id text not null,
  pool_id text not null,
  protocol text,
  chain text,
  entry_apy numeric,
  amount_usd numeric,
  entry_date timestamptz,
  notes text,
  added_at timestamptz default now(),
  unique(anonymous_id, pool_id)
);

create index on portfolio_positions (anonymous_id);
