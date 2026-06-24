# 🐾 PawWatch — App de garde d'animaux

## Structure du projet

```
pawwatch/
├── App.js                              ← Point d'entrée + navigation
├── package.json                        ← Dépendances
├── lib/
│   ├── theme.js                        ← Couleurs, fonts, styles globaux
│   └── supabase.js                     ← Base de données + auth + photos
├── hooks/
│   └── useNotifications.js             ← Notifications push (Expo)
├── components/
│   └── UI.js                           ← Badge, Avatar, PhotoUpload, Button...
└── screens/
    ├── auth/
    │   └── LoginScreen.js              ← Connexion / inscription
    ├── proprietaire/
    │   ├── JournalScreen.js            ← Voir les journaux du gardien
    │   └── PaiementScreen.js           ← Débloquer et payer avec Stripe
    └── gardien/
        └── JournalFormScreen.js        ← Envoyer le journal + photos + géoloc
```

---

## 🚀 Démarrage rapide

### 1. Installer Node.js
https://nodejs.org (version LTS)

### 2. Installer Expo CLI
```bash
npm install -g expo-cli
```

### 3. Installer les dépendances
```bash
cd pawwatch
npm install
```

### 4. Lancer l'app
```bash
npx expo start
```

📱 Télécharge **Expo Go** sur ton téléphone → scanne le QR code → l'app tourne en live.

---

## ⚙️ Configuration requise

### Supabase (base de données + stockage photos)
1. Créer un compte sur https://supabase.com
2. Créer un nouveau projet
3. Copier l'URL et la clé anonyme dans `lib/supabase.js`
4. Créer les tables SQL :

```sql
-- Utilisateurs
create table users (
  id uuid primary key references auth.users,
  email text, nom text, role text,
  push_token text, created_at timestamptz default now()
);

-- Animaux
create table animaux (
  id uuid primary key default gen_random_uuid(),
  nom text, espece text, emoji text,
  proprio_id uuid references users(id)
);

-- Gardes
create table gardes (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid references animaux(id),
  gardien_id uuid references users(id),
  proprio_id uuid references users(id),
  date_debut date, date_fin date,
  montant numeric, statut text default 'en_cours'
);

-- Journaux
create table journaux (
  id uuid primary key default gen_random_uuid(),
  garde_id uuid references gardes(id),
  gardien_id uuid references users(id),
  date timestamptz default now(),
  repas_done bool default false,
  repas_heure text,
  promenade_done bool default false,
  promenade_heure text, promenade_duree text,
  promenade_coords text,
  note text, humeur text,
  vu_par_proprio bool default false, vu_at timestamptz
);

-- Photos
create table photos (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid references journaux(id),
  type text, -- 'repas' | 'promenade'
  url text, heure timestamptz default now()
);

-- Paiements
create table paiements (
  id uuid primary key default gen_random_uuid(),
  garde_id uuid references gardes(id),
  montant_total numeric, montant_acompte numeric, montant_solde numeric,
  statut text default 'bloque', -- bloque | debloque | paye
  debloque_at timestamptz, paye_at timestamptz
);
```

5. Créer un bucket Supabase Storage nommé `pawwatch-photos` (public)

### Stripe (paiements)
1. Créer un compte sur https://stripe.com
2. Récupérer la clé publique (`pk_test_...`) → `App.js`
3. Créer une Supabase Edge Function `create-payment-intent` :

```typescript
// supabase/functions/create-payment-intent/index.ts
import Stripe from 'https://esm.sh/stripe@14'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'))

Deno.serve(async (req) => {
  const { garde_id, montant } = await req.json()
  const paymentIntent = await stripe.paymentIntents.create({
    amount: montant * 100, // en centimes
    currency: 'eur',
    metadata: { garde_id },
  })
  return new Response(JSON.stringify({
    clientSecret: paymentIntent.client_secret
  }))
})
```

### Expo Notifications
1. Créer un compte sur https://expo.dev
2. Récupérer ton `projectId` → `hooks/useNotifications.js`

---

## 📱 Publication

```bash
# Installer EAS CLI
npm install -g eas-cli
eas login

# Configurer le projet
eas build:configure

# Build Android (.apk ou .aab pour Google Play)
eas build --platform android

# Build iOS (.ipa pour App Store)
eas build --platform ios

# Ou les deux en même temps
eas build --platform all
```

**Google Play** : compte développeur à 25$ (une fois)  
**App Store** : compte développeur Apple à 99$/an

---

## 🔔 Notifications push côté serveur

Pour envoyer une notif au propriétaire quand le gardien soumet un journal,
créer une Supabase Edge Function ou un trigger PostgreSQL :

```typescript
// Envoyer via Expo Push API
const message = {
  to: proprietaire.push_token,
  sound: 'default',
  title: '🐾 Nouveau journal de bord',
  body: `${gardien.nom} a envoyé le journal de ${animal.nom}`,
  data: { screen: 'Journal', garde_id },
}

await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(message),
})
```

---

## ✅ Checklist avant lancement

- [ ] Supabase configuré + tables créées
- [ ] Bucket photos créé (`pawwatch-photos`, public)
- [ ] Clé Stripe renseignée dans `App.js`
- [ ] Edge Function `create-payment-intent` déployée
- [ ] `projectId` Expo dans `hooks/useNotifications.js`
- [ ] Testé sur vrai téléphone iOS + Android
- [ ] Icône app + splash screen créés
- [ ] CGU et politique de confidentialité rédigées
- [ ] Comptes Google Play + App Store créés
