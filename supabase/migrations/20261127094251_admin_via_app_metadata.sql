-- Le drapeau admin était lu dans user_metadata, que chaque utilisateur peut modifier
-- lui-même (supabase.auth.updateUser) : n'importe qui pouvait se déclarer admin.
-- Il passe dans app_metadata, modifiable uniquement côté serveur.

UPDATE auth.users
SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"isAdmin": true}'::jsonb
WHERE email = 'admin@pawwatch.app';

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'isAdmin'
WHERE raw_user_meta_data ? 'isAdmin';

CREATE OR REPLACE FUNCTION public.est_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'isAdmin')::boolean, false);
$$;

DROP POLICY IF EXISTS "gardes_select" ON public.gardes;
CREATE POLICY "gardes_select" ON public.gardes
  FOR SELECT TO PUBLIC
  USING (auth.uid() = proprio_id OR auth.uid() = gardien_id OR public.est_admin());

DROP POLICY IF EXISTS "paiements_select" ON public.paiements;
CREATE POLICY "paiements_select" ON public.paiements
  FOR SELECT TO PUBLIC
  USING (
    EXISTS (
      SELECT 1 FROM public.gardes g
      WHERE g.id = paiements.garde_id AND (g.proprio_id = auth.uid() OR g.gardien_id = auth.uid())
    )
    OR public.est_admin()
  );

DROP POLICY IF EXISTS "users_select_visibles" ON public.users;
CREATE POLICY "users_select_visibles" ON public.users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR role = 'petsitter'
    OR public.est_admin()
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
