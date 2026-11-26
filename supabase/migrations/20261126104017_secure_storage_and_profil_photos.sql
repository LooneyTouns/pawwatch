-- ── Storage pawwatch-photos ─────────────────────────────────────
-- Avant : envoi et suppression autorisés à tous (même anon) sur tout le bucket.
-- Après : chaque utilisateur connecté n'agit que dans profil-photos/{son uid}/.
-- La lecture publique des fichiers (URL publiques) n'est pas concernée.
DROP POLICY IF EXISTS "upload profil photos"  ON storage.objects;
DROP POLICY IF EXISTS "delete profil photos"  ON storage.objects;
DROP POLICY IF EXISTS "profil_photos_upload"  ON storage.objects;

CREATE POLICY "pawwatch_photos_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pawwatch-photos'
    AND (storage.foldername(name))[1] = 'profil-photos'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- La suppression via l'API storage exige aussi SELECT sur l'objet.
CREATE POLICY "pawwatch_photos_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'pawwatch-photos'
    AND (storage.foldername(name))[1] = 'profil-photos'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "pawwatch_photos_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'pawwatch-photos'
    AND (storage.foldername(name))[1] = 'profil-photos'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- ── Table profil_photos ─────────────────────────────────────────
-- RLS n'était pas activé : la table était lisible/modifiable par tous.
ALTER TABLE public.profil_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own" ON public.profil_photos;
DROP POLICY IF EXISTS "insert_own" ON public.profil_photos;
DROP POLICY IF EXISTS "delete_own" ON public.profil_photos;

-- Les galeries des pawsitters restent visibles par les propriétaires.
CREATE POLICY "profil_photos_select_all" ON public.profil_photos
  FOR SELECT USING (true);

CREATE POLICY "profil_photos_insert_own" ON public.profil_photos
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profil_photos_delete_own" ON public.profil_photos
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
