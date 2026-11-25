-- =====================================================================
-- The CON: Phase 2b, let logged-in members reach the profile tables.
-- Newer Supabase projects don't expose new tables to the app until you
-- grant access. Row Level Security still decides WHICH rows each person
-- can see or change. Nothing here is open to logged-out visitors.
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to re-run.
-- =====================================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.profile_private to authenticated;
grant select, insert, update, delete on public.profile_fandoms to authenticated;
grant select, insert, update, delete on public.photos to authenticated;
grant select on public.fandoms to authenticated;

grant execute on function public.profile_age(uuid) to authenticated;
