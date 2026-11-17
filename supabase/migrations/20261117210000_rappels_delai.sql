-- Rappels d'abonnement : délai d'attente de l'appel quotidien porté à 60 s (5 s par défaut avec pg_net,
-- trop court au premier démarrage de la fonction Edge). Même tâche, reprogrammée.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('rappels-abonnement', '0 9 * * *', $cron$
      select net.http_post(
        url := (select valeur from prive.configuration where cle = 'url_fonctions') || '/rappels-abonnement',
        body := '{}'::jsonb, headers := '{"Content-Type": "application/json"}'::jsonb,
        timeout_milliseconds := 60000)
    $cron$);
  end if;
end;
$$;
