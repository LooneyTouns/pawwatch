-- Type de service demandé (garde_jour, garde_domicile, promenade, visite, nuitee…), cf. lib/services.js
ALTER TABLE public.gardes ADD COLUMN IF NOT EXISTS service text;
