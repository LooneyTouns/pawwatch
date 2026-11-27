-- ════ 1. users.onboarding : retirer identifiants et coordonnées ════
-- Le formulaire d'inscription y recopiait toutes ses réponses, mot de passe compris,
-- et la table était lisible par tous (même sans connexion).
UPDATE public.users
SET onboarding = onboarding - 'password' - 'password_confirm' - 'email' - 'telephone'
                            - 'adresse' - '_latitude' - '_longitude' - '_codePostal'
WHERE onboarding IS NOT NULL AND jsonb_typeof(onboarding) = 'object';

-- ════ 2. users : lignes visibles ════
-- Plus d'accès anonyme. Connecté : soi-même, les pawsitters, ses interlocuteurs
-- (garde ou conversation), les auteurs d'avis, et les propriétaires d'une demande ouverte.
DROP POLICY IF EXISTS "users_select_all" ON public.users;
DROP POLICY IF EXISTS "users_select"     ON public.users;

CREATE POLICY "users_select_visibles" ON public.users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR role = 'petsitter'
    OR COALESCE(((auth.jwt() -> 'user_metadata') ->> 'isAdmin')::boolean, false)
    OR EXISTS (
      SELECT 1 FROM public.gardes g
      WHERE g.proprio_id = users.id
        AND (g.gardien_id = auth.uid() OR (g.statut = 'ouverte' AND g.gardien_id IS NULL))
    )
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE (c.proprio_id = users.id AND c.gardien_id = auth.uid())
         OR (c.gardien_id = users.id AND c.proprio_id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM public.avis a WHERE a.auteur_id = users.id)
  );

-- ════ 3. users : colonnes ════
-- email, push_token, telephone et adresse ne sont plus lisibles via l'API ;
-- chacun obtient son propre profil complet par get_mon_profil().
REVOKE ALL ON public.users FROM anon;
REVOKE SELECT ON public.users FROM authenticated;
GRANT SELECT (
  id, nom, role, created_at, ville, bio, photo_url, tarif, note, nb_avis, dispo, couleur,
  animaux_acceptes, services, badges, onboarding, latitude, longitude
) ON public.users TO authenticated;

CREATE OR REPLACE FUNCTION public.get_mon_profil()
  RETURNS SETOF public.users
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT * FROM public.users WHERE id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_mon_profil() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mon_profil() TO authenticated;

-- ════ 4. photos (journaux) : réservées aux deux parties de la garde ════
DROP POLICY IF EXISTS "photos_all" ON public.photos;
REVOKE ALL ON public.photos FROM anon;

CREATE POLICY "photos_select_garde" ON public.photos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.journaux j JOIN public.gardes g ON g.id = j.garde_id
    WHERE j.id = photos.journal_id AND (g.proprio_id = auth.uid() OR g.gardien_id = auth.uid())
  ));

CREATE POLICY "photos_insert_gardien" ON public.photos
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.journaux j JOIN public.gardes g ON g.id = j.garde_id
    WHERE j.id = photos.journal_id AND g.gardien_id = auth.uid()
  ));

CREATE POLICY "photos_delete_gardien" ON public.photos
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.journaux j JOIN public.gardes g ON g.id = j.garde_id
    WHERE j.id = photos.journal_id AND g.gardien_id = auth.uid()
  ));

-- ════ 5. gardes_animaux : retirer la règle sans condition ════
-- Elle annulait ga_select / ga_insert / ga_delete / ga_select_open, qui restent en place.
DROP POLICY IF EXISTS "gardes_animaux_all" ON public.gardes_animaux;
REVOKE ALL ON public.gardes_animaux FROM anon;

NOTIFY pgrst, 'reload schema';
