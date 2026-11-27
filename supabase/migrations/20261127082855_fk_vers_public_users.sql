-- Les FK vers les utilisateurs avaient été recréées vers auth.users (2026-11-25) au lieu de
-- public.users : PostgREST ne trouvait plus les relations users!proprio_id / users!gardien_id…
-- (PGRST200 sur gardes, conversations, avis). On les remet vers public.users, en cascade :
-- supprimer auth.users supprime public.users (users_id_fkey), qui supprime le reste.
-- NOT VALID puis VALIDATE séparé : une éventuelle ligne orpheline ne bloque pas la migration.

ALTER TABLE public.animaux       DROP CONSTRAINT IF EXISTS animaux_proprio_id_fkey;
ALTER TABLE public.gardes        DROP CONSTRAINT IF EXISTS gardes_proprio_id_fkey;
ALTER TABLE public.gardes        DROP CONSTRAINT IF EXISTS gardes_gardien_id_fkey;
ALTER TABLE public.journaux      DROP CONSTRAINT IF EXISTS journaux_gardien_id_fkey;
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_proprio_id_fkey;
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_gardien_id_fkey;
ALTER TABLE public.messages      DROP CONSTRAINT IF EXISTS messages_from_id_fkey;
ALTER TABLE public.avis          DROP CONSTRAINT IF EXISTS avis_auteur_id_fkey;
ALTER TABLE public.avis          DROP CONSTRAINT IF EXISTS avis_cible_id_fkey;

ALTER TABLE public.animaux       ADD CONSTRAINT animaux_proprio_id_fkey       FOREIGN KEY (proprio_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.gardes        ADD CONSTRAINT gardes_proprio_id_fkey        FOREIGN KEY (proprio_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.gardes        ADD CONSTRAINT gardes_gardien_id_fkey        FOREIGN KEY (gardien_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.journaux      ADD CONSTRAINT journaux_gardien_id_fkey      FOREIGN KEY (gardien_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_proprio_id_fkey FOREIGN KEY (proprio_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_gardien_id_fkey FOREIGN KEY (gardien_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.messages      ADD CONSTRAINT messages_from_id_fkey         FOREIGN KEY (from_id)    REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.avis          ADD CONSTRAINT avis_auteur_id_fkey           FOREIGN KEY (auteur_id)  REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;
ALTER TABLE public.avis          ADD CONSTRAINT avis_cible_id_fkey            FOREIGN KEY (cible_id)   REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN SELECT * FROM (VALUES
    ('animaux', 'animaux_proprio_id_fkey'),
    ('gardes', 'gardes_proprio_id_fkey'),
    ('gardes', 'gardes_gardien_id_fkey'),
    ('journaux', 'journaux_gardien_id_fkey'),
    ('conversations', 'conversations_proprio_id_fkey'),
    ('conversations', 'conversations_gardien_id_fkey'),
    ('messages', 'messages_from_id_fkey'),
    ('avis', 'avis_auteur_id_fkey'),
    ('avis', 'avis_cible_id_fkey')
  ) AS t(tbl, con)
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I', c.tbl, c.con);
    EXCEPTION WHEN foreign_key_violation THEN
      RAISE WARNING 'Lignes orphelines dans %, contrainte % laissée NOT VALID', c.tbl, c.con;
    END;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
