create table watchlists (
  id uuid default gen_random_uuid() primary key,
  anonymous_id text not null,
  pool_id text not null,
  added_at timestamptz default now(),
  unique(anonymous_id, pool_id)
);

create index on watchlists (anonymous_id);
