-- Allow the anon/public role to read and write their own watchlist and
-- portfolio rows. This app has no Supabase Auth session — access control is
-- entirely at the application layer via anonymous_id (a self-generated UUID
-- stored in the requesting browser), matching the existing pattern in
-- 004_pool_snapshots_rls.sql. Without these policies, RLS (enabled on this
-- project) silently rejects every insert/select/delete for the anon role —
-- confirmed live via a 42501 "row-level security policy" violation on
-- INSERT into both watchlists and portfolio_positions.
--
-- Written as drop-then-create so it's safe to run whether or not
-- 004_pool_snapshots_rls.sql was ever actually applied to this database.

drop policy if exists "anon_select_pool_snapshots" on pool_snapshots;
create policy "anon_select_pool_snapshots"
  on pool_snapshots for select
  to anon
  using (true);

drop policy if exists "anon_select_watchlists" on watchlists;
create policy "anon_select_watchlists"
  on watchlists for select
  to anon
  using (true);

drop policy if exists "anon_insert_watchlists" on watchlists;
create policy "anon_insert_watchlists"
  on watchlists for insert
  to anon
  with check (true);

drop policy if exists "anon_delete_watchlists" on watchlists;
create policy "anon_delete_watchlists"
  on watchlists for delete
  to anon
  using (true);

drop policy if exists "anon_select_portfolio_positions" on portfolio_positions;
create policy "anon_select_portfolio_positions"
  on portfolio_positions for select
  to anon
  using (true);

drop policy if exists "anon_insert_portfolio_positions" on portfolio_positions;
create policy "anon_insert_portfolio_positions"
  on portfolio_positions for insert
  to anon
  with check (true);

drop policy if exists "anon_delete_portfolio_positions" on portfolio_positions;
create policy "anon_delete_portfolio_positions"
  on portfolio_positions for delete
  to anon
  using (true);
