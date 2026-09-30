-- Newer Supabase projects no longer grant table access to the API roles by default.
-- Signed-in users may read their profile and change only these columns; row-level security
-- still limits them to their own row. Anonymous visitors get nothing.
revoke all on public.profiles from anon;
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, home_tz, day_start_hour) on public.profiles to authenticated;
