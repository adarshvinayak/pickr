-- Run after the pilot migration. Supabase Dashboard > Integrations > Cron can also schedule this.
create extension if not exists pg_cron;
select cron.schedule('pickr-dispatch', '10 seconds', 'select public.pilot_dispatch();');
-- Cron runs server-side, independent of customer screens. Native online driver services poll
-- offers every 10 seconds; optional FCM worker runs separately (see README).
