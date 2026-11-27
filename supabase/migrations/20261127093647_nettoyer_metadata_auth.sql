-- L'inscription copiait aussi les réponses (mot de passe compris) dans les métadonnées
-- du compte, incluses dans chaque jeton de session. On les retire.
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{onboarding}',
  (raw_user_meta_data -> 'onboarding') - 'password' - 'password_confirm' - 'email' - 'telephone'
                                       - 'adresse' - '_latitude' - '_longitude' - '_codePostal'
)
WHERE jsonb_typeof(raw_user_meta_data -> 'onboarding') = 'object';
