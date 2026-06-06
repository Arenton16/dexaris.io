create table pool_snapshots (
  id uuid default gen_random_uuid() primary key,
  pool_id text not null,
  protocol text,
  chain text,
  apy numeric,
  apy_mean_30d numeric,
  apy_base numeric,
  tvl_usd numeric,
  dexaris_score numeric,
  timestamp timestamptz default now()
);

create index on pool_snapshots (pool_id, timestamp desc);
create index on pool_snapshots (timestamp desc);
