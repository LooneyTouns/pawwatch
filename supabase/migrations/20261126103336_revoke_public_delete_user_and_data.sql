-- delete_user_and_data est SECURITY DEFINER : exécutable par anon/authenticated,
-- elle permettait à n'importe qui de supprimer n'importe quel compte.
-- Réservée désormais au service_role (Dashboard / scripts serveur).
REVOKE EXECUTE ON FUNCTION public.delete_user_and_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_and_data(uuid) TO service_role;
