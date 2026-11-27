-- Détails saisis par le pawsitter dans JournalFormScreen, absents de la table en prod.
ALTER TABLE public.journaux
  ADD COLUMN IF NOT EXISTS humeur_arrivee  text,
  ADD COLUMN IF NOT EXISTS repas_quantite  text,
  ADD COLUMN IF NOT EXISTS repas_eau       boolean,
  ADD COLUMN IF NOT EXISTS nb_sorties      integer,
  ADD COLUMN IF NOT EXISTS accident        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS jeux            boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS type_jeux       text[]  DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS calins          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS a_dormi         boolean,
  ADD COLUMN IF NOT EXISTS duree_dodo      text,
  ADD COLUMN IF NOT EXISTS comportement    text,
  ADD COLUMN IF NOT EXISTS vomissement     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS medicament      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS desc_medicament text,
  ADD COLUMN IF NOT EXISTS note_sante      text;

-- Les photos du jour (type 'jour') étaient rejetées par la contrainte.
ALTER TABLE public.photos DROP CONSTRAINT IF EXISTS photos_type_check;
ALTER TABLE public.photos
  ADD CONSTRAINT photos_type_check CHECK (type = ANY (ARRAY['repas'::text, 'promenade'::text, 'jour'::text]));
