-- HostelOS production-hardening migration.
-- Apply via Supabase SQL editor, `supabase db push`, or
-- `mcp__supabase__apply_migration`. Safe to re-run.
--
-- This migration closes the remaining security/perf advisor findings:
--   1. Drops 19 permissive dev_*_anon_* RLS policies (WARN rls_policy_always_true).
--   2. Rewrites profiles policies to use (SELECT auth.uid()) so the expression
--      is evaluated once per query, not once per row (WARN auth_rls_initplan).
--   3. Drops redundant *_select policies that duplicate a FOR ALL *_mutate with
--      the same qual (WARN multiple_permissive_policies).
--   4. Adds covering indexes on foreign keys that lacked them (INFO
--      unindexed_foreign_keys).
--
-- It does NOT touch:
--   - beds_select / rooms_select — these intentionally broaden SELECT beyond
--     the mutate policy (residents see their own bed/room).
--   - Unused indexes (idx_members_status, idx_assignments_member_active,
--     idx_invoices_member) — keep; queries will use them once traffic ramps.

-- ---------------------------------------------------------------------------
-- 1. Drop permissive dev_*_anon_* policies
-- ---------------------------------------------------------------------------
drop policy if exists dev_assignments_anon_delete on public.assignments;
drop policy if exists dev_assignments_anon_insert on public.assignments;
drop policy if exists dev_assignments_anon_select on public.assignments;
drop policy if exists dev_assignments_anon_update on public.assignments;

drop policy if exists dev_audit_logs_anon_all on public.audit_logs;

drop policy if exists dev_beds_anon_delete on public.beds;
drop policy if exists dev_beds_anon_insert on public.beds;
drop policy if exists dev_beds_anon_select on public.beds;
drop policy if exists dev_beds_anon_update on public.beds;

drop policy if exists dev_electricity_readings_anon_all on public.electricity_readings;

drop policy if exists dev_extra_charges_anon_all on public.extra_charges;

drop policy if exists dev_invoices_anon_all on public.invoices;

drop policy if exists dev_maintenance_tickets_anon_all on public.maintenance_tickets;

drop policy if exists dev_members_anon_delete on public.members;
drop policy if exists dev_members_anon_insert on public.members;
drop policy if exists dev_members_anon_select on public.members;
drop policy if exists dev_members_anon_update on public.members;

drop policy if exists dev_payments_anon_all on public.payments;

drop policy if exists dev_profiles_anon_select on public.profiles;

drop policy if exists dev_rooms_anon_delete on public.rooms;
drop policy if exists dev_rooms_anon_insert on public.rooms;
drop policy if exists dev_rooms_anon_select on public.rooms;
drop policy if exists dev_rooms_anon_update on public.rooms;

-- ---------------------------------------------------------------------------
-- 2. profiles policies: wrap auth.uid() in subselect to avoid per-row eval
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;

create policy profiles_select on public.profiles
  for select to authenticated
  using ((id = (select auth.uid())) or is_admin());

create policy profiles_update on public.profiles
  for update to authenticated
  using ((id = (select auth.uid())) or is_admin());

-- ---------------------------------------------------------------------------
-- 3. Drop redundant *_select policies that duplicate a FOR ALL *_mutate
--    with the same qual (electricity_readings, extra_charges).
-- ---------------------------------------------------------------------------
drop policy if exists electricity_select on public.electricity_readings;
drop policy if exists extra_charges_select on public.extra_charges;

-- ---------------------------------------------------------------------------
-- 4. Add covering indexes for foreign keys
-- ---------------------------------------------------------------------------
create index if not exists idx_audit_logs_performed_by
  on public.audit_logs (performed_by);

create index if not exists idx_electricity_readings_room_id
  on public.electricity_readings (room_id);

create index if not exists idx_extra_charges_member_id
  on public.extra_charges (member_id);

create index if not exists idx_invoices_assignment_id
  on public.invoices (assignment_id);

create index if not exists idx_maintenance_tickets_assigned_to
  on public.maintenance_tickets (assigned_to);

create index if not exists idx_maintenance_tickets_raised_by
  on public.maintenance_tickets (raised_by);

create index if not exists idx_maintenance_tickets_room_id
  on public.maintenance_tickets (room_id);

create index if not exists idx_payments_invoice_id
  on public.payments (invoice_id);

create index if not exists idx_payments_member_id
  on public.payments (member_id);

create index if not exists idx_payments_recorded_by
  on public.payments (recorded_by);
