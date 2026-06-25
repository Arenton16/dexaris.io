-- Allow the anon/public role to read pool_snapshots.
-- RLS is already enabled on this table; this adds the missing SELECT policy
-- so the front-end sparkline query (using the anon Supabase client) can read rows.
-- Writes still go through the service role key in the cron, which bypasses RLS.

create policy "anon_select_pool_snapshots"
  on pool_snapshots
  for select
  to anon
  using (true);
