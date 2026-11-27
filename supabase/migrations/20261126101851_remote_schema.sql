SET local check_function_bodies = off;

CREATE TABLE "public"."animaux" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "proprio_id"  uuid,
  "nom"         text                     NOT NULL,
  "espece"      text,
  "race"        text,
  "age"         text,
  "emoji"       text                     DEFAULT '🐾'::text,
  "created_at"  timestamp with time zone DEFAULT now(),
  "sexe"        text,
  "poids"       text,
  "photo"       text,
  "sterilise"   boolean,
  "vaccins"     boolean,
  "maladies"    text,
  "allergies"   text,
  "medicaments" text,
  "description" text,
  "photo_url"   text,
  CONSTRAINT "animaux_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."animaux"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."avis" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "garde_id"    uuid,
  "auteur_id"   uuid,
  "cible_id"    uuid,
  "note"        integer,
  "commentaire" text,
  "created_at"  timestamp with time zone DEFAULT now(),
  CONSTRAINT "avis_garde_id_auteur_id_key" UNIQUE (garde_id, auteur_id),
  CONSTRAINT "avis_note_check" CHECK (((note >= 1) AND (note <= 5))),
  CONSTRAINT "avis_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."avis"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."conversations" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "proprio_id" uuid                     NOT NULL,
  "gardien_id" uuid                     NOT NULL,
  "garde_id"   uuid,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "conversations_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."conversations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."disponibilites" (
  "id"         uuid NOT NULL DEFAULT gen_random_uuid(),
  "gardien_id" uuid,
  "date"       date NOT NULL,
  CONSTRAINT "disponibilites_gardien_id_date_key" UNIQUE (gardien_id, date),
  CONSTRAINT "disponibilites_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."disponibilites"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."gardes_animaux" (
  "garde_id"  uuid NOT NULL,
  "animal_id" uuid NOT NULL,
  CONSTRAINT "gardes_animaux_pkey" PRIMARY KEY (garde_id, animal_id)
);

ALTER TABLE "public"."gardes_animaux"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."gardes" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "proprio_id" uuid,
  "gardien_id" uuid,
  "animal_id"  uuid,
  "date_debut" date,
  "date_fin"   date,
  "statut"     text                     DEFAULT 'en_cours'::text,
  "created_at" timestamp with time zone DEFAULT now(),
  "message"    text,
  CONSTRAINT "gardes_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."gardes"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."journaux" (
  "id"               uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "garde_id"         uuid,
  "gardien_id"       uuid,
  "date"             timestamp with time zone DEFAULT now(),
  "repas_done"       boolean                  DEFAULT false,
  "repas_heure"      text,
  "promenade_done"   boolean                  DEFAULT false,
  "promenade_heure"  text,
  "promenade_duree"  text,
  "promenade_coords" text,
  "humeur"           text                     DEFAULT '😊'::text,
  "note"             text,
  "vu_par_proprio"   boolean                  DEFAULT false,
  "vu_at"            timestamp with time zone,
  "created_at"       timestamp with time zone DEFAULT now(),
  CONSTRAINT "journaux_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."journaux"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."messages" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "conv_id"    uuid                     NOT NULL,
  "from_id"    uuid                     NOT NULL,
  "text"       text                     NOT NULL,
  "read"       boolean                  DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  "read_at"    timestamp with time zone,
  CONSTRAINT "messages_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."messages"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."paiements" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "garde_id"    uuid,
  "montant"     numeric,
  "statut"      text                     DEFAULT 'en_attente'::text,
  "debloque_at" timestamp with time zone,
  "verse_at"    timestamp with time zone,
  "paye_at"     timestamp with time zone,
  "tarif_jour"  integer,
  "nb_jours"    integer,
  CONSTRAINT "paiements_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."paiements"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."photos" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "journal_id" uuid,
  "type"       text,
  "url"        text,
  "heure"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "photos_pkey" PRIMARY KEY (id),
  CONSTRAINT "photos_type_check" CHECK ((type = ANY (ARRAY['repas'::text, 'promenade'::text])))
);

ALTER TABLE "public"."photos"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profil_photos" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    uuid,
  "url"        text                     NOT NULL,
  "caption"    text,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "profil_photos_pkey" PRIMARY KEY (id)
);

CREATE TABLE "public"."users" (
  "id"               uuid                     NOT NULL,
  "email"            text                     NOT NULL,
  "nom"              text,
  "role"             text,
  "push_token"       text,
  "created_at"       timestamp with time zone DEFAULT now(),
  "telephone"        text,
  "adresse"          text,
  "ville"            text,
  "bio"              text,
  "photo_url"        text,
  "tarif"            integer                  DEFAULT 0,
  "note"             numeric(3,1)             DEFAULT 0,
  "nb_avis"          integer                  DEFAULT 0,
  "dispo"            text                     DEFAULT 'Flexible'::text,
  "couleur"          text                     DEFAULT '#E8D5C4'::text,
  "animaux_acceptes" text[]                   DEFAULT '{}'::text[],
  "services"         text[]                   DEFAULT '{}'::text[],
  "badges"           text[]                   DEFAULT '{}'::text[],
  "onboarding"       jsonb,
  "latitude"         double precision,
  "longitude"        double precision,
  CONSTRAINT "users_pkey" PRIMARY KEY (id),
  CONSTRAINT "users_role_check" CHECK ((role = ANY (ARRAY['proprietaire'::text, 'petsitter'::text])))
);

ALTER TABLE "public"."users"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.delete_my_account()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM avis           WHERE auteur_id  = uid OR cible_id   = uid;
  DELETE FROM messages       WHERE from_id    = uid;
  DELETE FROM conversations  WHERE proprio_id = uid OR gardien_id = uid;
  DELETE FROM gardes         WHERE proprio_id = uid OR gardien_id = uid;
  DELETE FROM animaux        WHERE proprio_id = uid;
  DELETE FROM disponibilites WHERE gardien_id = uid;
  DELETE FROM public.users   WHERE id         = uid;
  DELETE FROM auth.users     WHERE id         = uid;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_user_and_data (
  target_user_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  DELETE FROM avis          WHERE auteur_id  = target_user_id OR cible_id   = target_user_id;
  DELETE FROM messages      WHERE from_id    = target_user_id;
  DELETE FROM conversations WHERE proprio_id = target_user_id OR gardien_id = target_user_id;
  DELETE FROM gardes        WHERE proprio_id = target_user_id OR gardien_id = target_user_id;
  DELETE FROM animaux       WHERE proprio_id = target_user_id;
  DELETE FROM disponibilites WHERE gardien_id = target_user_id;
  DELETE FROM public.users  WHERE id         = target_user_id;
  DELETE FROM auth.users    WHERE id         = target_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.recalc_note_petsitter()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  UPDATE users
  SET
    note    = (SELECT ROUND(AVG(note)::numeric, 1) FROM avis WHERE cible_id = NEW.cible_id),
    nb_avis = (SELECT COUNT(*) FROM avis WHERE cible_id = NEW.cible_id)
  WHERE id = NEW.cible_id;
  RETURN NEW;
END;
$function$;

ALTER TABLE "public"."animaux"
  ADD CONSTRAINT "animaux_proprio_id_fkey" FOREIGN KEY (proprio_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."avis"
  ADD CONSTRAINT "avis_auteur_id_fkey" FOREIGN KEY (auteur_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."avis"
  ADD CONSTRAINT "avis_cible_id_fkey" FOREIGN KEY (cible_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."conversations"
  ADD CONSTRAINT "conversations_gardien_id_fkey" FOREIGN KEY (gardien_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."conversations"
  ADD CONSTRAINT "conversations_proprio_id_fkey" FOREIGN KEY (proprio_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."gardes"
  ADD CONSTRAINT "gardes_animal_id_fkey" FOREIGN KEY (animal_id) REFERENCES public.animaux(id);

ALTER TABLE "public"."gardes"
  ADD CONSTRAINT "gardes_gardien_id_fkey" FOREIGN KEY (gardien_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."avis"
  ADD CONSTRAINT "avis_garde_id_fkey" FOREIGN KEY (garde_id) REFERENCES public.gardes(id) ON DELETE CASCADE;

ALTER TABLE "public"."conversations"
  ADD CONSTRAINT "conversations_garde_id_fkey" FOREIGN KEY (garde_id) REFERENCES public.gardes(id);

ALTER TABLE "public"."gardes"
  ADD CONSTRAINT "gardes_proprio_id_fkey" FOREIGN KEY (proprio_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."gardes_animaux"
  ADD CONSTRAINT "gardes_animaux_animal_id_fkey" FOREIGN KEY (animal_id) REFERENCES public.animaux(id) ON DELETE CASCADE;

ALTER TABLE "public"."gardes_animaux"
  ADD CONSTRAINT "gardes_animaux_garde_id_fkey" FOREIGN KEY (garde_id) REFERENCES public.gardes(id) ON DELETE CASCADE;

ALTER TABLE "public"."journaux"
  ADD CONSTRAINT "journaux_garde_id_fkey" FOREIGN KEY (garde_id) REFERENCES public.gardes(id);

ALTER TABLE "public"."journaux"
  ADD CONSTRAINT "journaux_gardien_id_fkey" FOREIGN KEY (gardien_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."messages"
  ADD CONSTRAINT "messages_conv_id_fkey" FOREIGN KEY (conv_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

ALTER TABLE "public"."messages"
  ADD CONSTRAINT "messages_from_id_fkey" FOREIGN KEY (from_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."paiements"
  ADD CONSTRAINT "paiements_garde_id_fkey" FOREIGN KEY (garde_id) REFERENCES public.gardes(id);

ALTER TABLE "public"."photos"
  ADD CONSTRAINT "photos_journal_id_fkey" FOREIGN KEY (journal_id) REFERENCES public.journaux(id);

ALTER TABLE "public"."users"
  ADD CONSTRAINT "users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."disponibilites"
  ADD CONSTRAINT "disponibilites_gardien_id_fkey" FOREIGN KEY (gardien_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."profil_photos"
  ADD CONSTRAINT "profil_photos_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

CREATE TRIGGER trg_recalc_note
  AFTER INSERT ON public.avis
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_note_petsitter();

CREATE POLICY "animaux_manage_own" ON "public"."animaux"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = proprio_id));

CREATE POLICY "animaux_select_all" ON "public"."animaux"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "avis_insert" ON "public"."avis"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (((auth.uid() = auteur_id) AND (EXISTS ( SELECT 1
   FROM public.gardes g
  WHERE ((g.id = avis.garde_id) AND ((g.proprio_id = auth.uid()) OR (g.gardien_id = auth.uid())))))));

CREATE POLICY "avis_select" ON "public"."avis"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "conv_insert" ON "public"."conversations"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (((auth.uid() = proprio_id) OR (auth.uid() = gardien_id)));

CREATE POLICY "conv_select" ON "public"."conversations"
  FOR SELECT
  TO PUBLIC
  USING (((auth.uid() = proprio_id) OR (auth.uid() = gardien_id)));

CREATE POLICY "dispo_manage" ON "public"."disponibilites"
  FOR ALL
  TO PUBLIC
  USING ((auth.uid() = gardien_id));

CREATE POLICY "dispo_select" ON "public"."disponibilites"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "gardes_claim_open" ON "public"."gardes"
  FOR UPDATE
  TO PUBLIC
  USING (((statut = 'ouverte'::text) AND (gardien_id IS NULL)))
  WITH CHECK ((gardien_id = auth.uid()));

CREATE POLICY "gardes_delete_own_open" ON "public"."gardes"
  FOR DELETE
  TO PUBLIC
  USING (((auth.uid() = proprio_id) AND (statut = 'ouverte'::text)));

CREATE POLICY "gardes_insert" ON "public"."gardes"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = proprio_id));

CREATE POLICY "gardes_select_open" ON "public"."gardes"
  FOR SELECT
  TO PUBLIC
  USING (((statut = 'ouverte'::text) AND (gardien_id IS NULL)));

CREATE POLICY "gardes_select" ON "public"."gardes"
  FOR SELECT
  TO PUBLIC
  USING (((auth.uid() = proprio_id) OR (auth.uid() = gardien_id) OR COALESCE((((auth.jwt() -> 'user_metadata'::text) ->> 'isAdmin'::text))::boolean, false)));

CREATE POLICY "gardes_update" ON "public"."gardes"
  FOR UPDATE
  TO PUBLIC
  USING (((auth.uid() = proprio_id) OR (auth.uid() = gardien_id)));

CREATE POLICY "ga_delete" ON "public"."gardes_animaux"
  FOR DELETE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.gardes g
  WHERE ((g.id = gardes_animaux.garde_id) AND (g.proprio_id = auth.uid())))));

CREATE POLICY "ga_insert" ON "public"."gardes_animaux"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.gardes g
  WHERE ((g.id = gardes_animaux.garde_id) AND (g.proprio_id = auth.uid())))));

CREATE POLICY "ga_select_open" ON "public"."gardes_animaux"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.gardes g
  WHERE ((g.id = gardes_animaux.garde_id) AND (g.statut = 'ouverte'::text) AND (g.gardien_id IS NULL)))));

CREATE POLICY "ga_select" ON "public"."gardes_animaux"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.gardes g
  WHERE ((g.id = gardes_animaux.garde_id) AND ((g.proprio_id = auth.uid()) OR (g.gardien_id = auth.uid()))))));

CREATE POLICY "gardes_animaux_all" ON "public"."gardes_animaux"
  FOR ALL
  TO PUBLIC
  USING (true);

CREATE POLICY "journaux_insert" ON "public"."journaux"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.gardes g
  WHERE ((g.id = journaux.garde_id) AND (g.gardien_id = auth.uid())))));

CREATE POLICY "journaux_select" ON "public"."journaux"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.gardes g
  WHERE ((g.id = journaux.garde_id) AND ((g.proprio_id = auth.uid()) OR (g.gardien_id = auth.uid()))))));

CREATE POLICY "journaux_update" ON "public"."journaux"
  FOR UPDATE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.gardes g
  WHERE ((g.id = journaux.garde_id) AND ((g.proprio_id = auth.uid()) OR (g.gardien_id = auth.uid()))))));

CREATE POLICY "msg_insert" ON "public"."messages"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = from_id));

CREATE POLICY "msg_select" ON "public"."messages"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = messages.conv_id) AND ((c.proprio_id = auth.uid()) OR (c.gardien_id = auth.uid()))))));

CREATE POLICY "msg_update" ON "public"."messages"
  FOR UPDATE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = messages.conv_id) AND ((c.proprio_id = auth.uid()) OR (c.gardien_id = auth.uid()))))));

CREATE POLICY "paiements_insert" ON "public"."paiements"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.gardes g
  WHERE ((g.id = paiements.garde_id) AND (g.proprio_id = auth.uid())))));

CREATE POLICY "paiements_select" ON "public"."paiements"
  FOR SELECT
  TO PUBLIC
  USING (((EXISTS ( SELECT 1
   FROM public.gardes g
  WHERE ((g.id = paiements.garde_id) AND ((g.proprio_id = auth.uid()) OR (g.gardien_id = auth.uid()))))) OR
    COALESCE((((auth.jwt() -> 'user_metadata'::text) ->> 'isAdmin'::text))::boolean, false)));

CREATE POLICY "paiements_update" ON "public"."paiements"
  FOR UPDATE
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.gardes g
  WHERE ((g.id = paiements.garde_id) AND (g.proprio_id = auth.uid())))));

CREATE POLICY "photos_all" ON "public"."photos"
  FOR ALL
  TO PUBLIC
  USING (true);

CREATE POLICY "delete_own" ON "public"."profil_photos"
  FOR DELETE
  TO PUBLIC
  USING (true);

CREATE POLICY "insert_own" ON "public"."profil_photos"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

CREATE POLICY "select_own" ON "public"."profil_photos"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "users_insert_own" ON "public"."users"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = id));

CREATE POLICY "users_select_all" ON "public"."users"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "users_select" ON "public"."users"
  FOR SELECT
  TO PUBLIC
  USING (((auth.uid() = id) OR (ROLE = 'petsitter'::text) OR COALESCE((((auth.jwt() -> 'user_metadata'::text) ->> 'isAdmin'::text))::boolean, false)));

CREATE POLICY "users_update_own" ON "public"."users"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = id));

CREATE POLICY "delete profil photos" ON "storage"."objects"
  FOR DELETE
  TO PUBLIC
  USING ((bucket_id = 'pawwatch-photos'::text));

CREATE POLICY "upload profil photos" ON "storage"."objects"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((bucket_id = 'pawwatch-photos'::text));

CREATE POLICY "avatar_insert" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY "avatar_select" ON "storage"."objects"
  FOR SELECT
  TO PUBLIC
  USING ((bucket_id = 'avatars'::text));

CREATE POLICY "avatar_update" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

CREATE POLICY "profil_photos_upload" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((bucket_id = 'pawwatch-photos'::text));

GRANT EXECUTE ON FUNCTION "public"."delete_my_account"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."delete_my_account"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_my_account"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_my_account"() TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."delete_user_and_data"(uuid) TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."delete_user_and_data"(uuid) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_user_and_data"(uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."delete_user_and_data"(uuid) TO "service_role";

GRANT EXECUTE ON FUNCTION "public"."recalc_note_petsitter"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."recalc_note_petsitter"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."recalc_note_petsitter"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."recalc_note_petsitter"() TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."animaux" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."animaux" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."animaux" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."animaux" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."avis" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."avis" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."avis" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."avis" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."conversations" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."conversations" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."conversations" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."conversations" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."disponibilites" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."disponibilites" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."disponibilites" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."disponibilites" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."gardes" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."gardes" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."gardes" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."gardes" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."gardes_animaux" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."gardes_animaux" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."gardes_animaux" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."gardes_animaux" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."journaux" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."journaux" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."journaux" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."journaux" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."messages" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."messages" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."messages" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."messages" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."paiements" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."paiements" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."paiements" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."paiements" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."photos" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."photos" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."photos" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."photos" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profil_photos" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."profil_photos" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profil_photos" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profil_photos" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."users" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."users" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."users" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."users" TO "service_role";

