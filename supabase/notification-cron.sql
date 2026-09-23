-- Reliable notification scheduler for hosted Supabase.
-- Run this file once in the Supabase SQL Editor, then call the configuration
-- function shown at the bottom with the same CRON_SECRET used by Vercel.

create schema if not exists extensions;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create schema if not exists private;

create or replace function private.configure_gavium_notification_cron(
  dispatch_url text,
  dispatch_secret text,
  cron_expression text default '* * * * *'
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
declare
  existing_job record;
  secret_id uuid;
  scheduled_job_id bigint;
begin
  if dispatch_url !~ '^https://[^[:space:]]+/api/notifications/dispatch$' then
    raise exception 'Use the HTTPS URL ending in /api/notifications/dispatch.';
  end if;

  if length(dispatch_secret) < 32 then
    raise exception 'CRON_SECRET must contain at least 32 characters.';
  end if;

  select id
    into secret_id
    from vault.secrets
   where name = 'gavium_notification_dispatch_url'
   order by created_at desc
   limit 1;

  if secret_id is null then
    perform vault.create_secret(
      dispatch_url,
      'gavium_notification_dispatch_url',
      'Gavium notification dispatch endpoint'
    );
  else
    perform vault.update_secret(
      secret_id,
      dispatch_url,
      'gavium_notification_dispatch_url',
      'Gavium notification dispatch endpoint'
    );
  end if;

  secret_id := null;
  select id
    into secret_id
    from vault.secrets
   where name = 'gavium_notification_cron_secret'
   order by created_at desc
   limit 1;

  if secret_id is null then
    perform vault.create_secret(
      dispatch_secret,
      'gavium_notification_cron_secret',
      'Bearer token for Gavium notification dispatch'
    );
  else
    perform vault.update_secret(
      secret_id,
      dispatch_secret,
      'gavium_notification_cron_secret',
      'Bearer token for Gavium notification dispatch'
    );
  end if;

  for existing_job in
    select jobid from cron.job where jobname = 'gavium-notification-dispatch'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  select cron.schedule(
    'gavium-notification-dispatch',
    cron_expression,
    $command$
      select net.http_post(
        url := (
          select decrypted_secret
            from vault.decrypted_secrets
           where name = 'gavium_notification_dispatch_url'
           order by created_at desc
           limit 1
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret
              from vault.decrypted_secrets
             where name = 'gavium_notification_cron_secret'
             order by created_at desc
             limit 1
          )
        ),
        body := jsonb_build_object('source', 'supabase-cron', 'requestedAt', now()),
        timeout_milliseconds := 15000
      ) as request_id;
    $command$
  ) into scheduled_job_id;

  return scheduled_job_id;
end;
$function$;

revoke all on function private.configure_gavium_notification_cron(text, text, text) from public, anon, authenticated;

-- Run this separately after replacing the second argument. Do not commit the secret.
-- select private.configure_gavium_notification_cron(
--   'https://gab-routine.vercel.app/api/notifications/dispatch',
--   'COLE_AQUI_O_MESMO_CRON_SECRET_DA_VERCEL'
-- );

-- Verify the scheduler and its recent executions:
-- select jobid, jobname, schedule, active from cron.job where jobname = 'gavium-notification-dispatch';
-- select status, start_time, end_time, return_message
--   from cron.job_run_details
--  where jobid = (select jobid from cron.job where jobname = 'gavium-notification-dispatch')
--  order by start_time desc
--  limit 10;
