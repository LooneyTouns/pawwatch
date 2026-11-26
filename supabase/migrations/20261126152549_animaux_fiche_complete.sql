-- Fiche animal complète : champs jusque-là perdus à l'enregistrement (cf. AnimalEditor).
ALTER TABLE public.animaux
  ADD COLUMN IF NOT EXISTS carnet          boolean,
  ADD COLUMN IF NOT EXISTS type_alim       text,
  ADD COLUMN IF NOT EXISTS freq_repas      text,
  ADD COLUMN IF NOT EXISTS quantite_repas  text,
  ADD COLUMN IF NOT EXISTS avec_chiens     text,
  ADD COLUMN IF NOT EXISTS avec_chats      text,
  ADD COLUMN IF NOT EXISTS avec_enfants    text,
  ADD COLUMN IF NOT EXISTS avec_etrangers  text,
  ADD COLUMN IF NOT EXISTS fiche_complete  boolean NOT NULL DEFAULT false;

-- Contacts vétérinaire / urgence : hors de la table animaux (lisible par tous),
-- réservés au propriétaire et au pawsitter d'une garde acceptée.
CREATE TABLE IF NOT EXISTS public.animaux_contacts (
  animal_id   uuid PRIMARY KEY REFERENCES public.animaux(id) ON DELETE CASCADE,
  veto_nom    text,
  veto_tel    text,
  urgence_nom text,
  urgence_tel text,
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.animaux_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.animaux_contacts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.animaux_contacts TO authenticated;

CREATE POLICY "animaux_contacts_proprio" ON public.animaux_contacts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.animaux a WHERE a.id = animal_id AND a.proprio_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.animaux a WHERE a.id = animal_id AND a.proprio_id = auth.uid()));

CREATE POLICY "animaux_contacts_gardien" ON public.animaux_contacts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.gardes_animaux ga
    JOIN public.gardes g ON g.id = ga.garde_id
    WHERE ga.animal_id = animaux_contacts.animal_id
      AND g.gardien_id = auth.uid()
      AND g.statut IN ('acceptee', 'en_cours')
  ));
