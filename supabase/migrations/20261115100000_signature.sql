-- =============================================================================
-- FacturePlus — Signature des factures, comme dans l'ancienne application
--
-- Une seule image : parametres.signature_url, dessinée (SVG) ou importée (image / cachet), depuis
-- l'écran Paramètres › Signature. Le cachet séparé (cachet_url, migration 20261115090000) est retiré.
-- =============================================================================

alter table public.parametres drop column if exists cachet_url;
