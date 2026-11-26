// lib/supabase.js — Client Supabase PawWatch

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://bewtumzhhuskrevlqdqb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJld3R1bXpoaHVza3JldmxxZHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NDc0NzIsImV4cCI6MjA5ODQyMzQ3Mn0.ii8inJwS0N8dhB2sVg37couV2r_ZvQqfLtVm0uSc2po';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Helpers ─────────────────────────────────────────────────────
const getInitiales = (nom = '') =>
  nom.split(' ').map(p => p[0] ?? '').join('').toUpperCase().slice(0, 2);

const ANIMAL_LABELS = {
  chiens:  '🐕 Chiens',
  chats:   '🐈 Chats',
  lapins:  '🐇 Lapins',
  rongeurs:'🐹 Rongeurs',
  oiseaux: '🐦 Oiseaux',
  reptiles:'🦎 Reptiles',
};

// Transforms a users row into the shape SearchPetsitterScreen/MapScreen expect
export function formatPawsitter(row) {
  const todayISO   = new Date().toISOString().split('T')[0];
  const rawDates   = (row.disponibilites ?? []).map(d => d.date).filter(d => d >= todayISO).sort();
  return {
    id:       row.id,
    nom:      row.nom ?? 'Pawsitter',
    initiales:getInitiales(row.nom),
    age:      null,
    ville:    row.ville ?? '',
    note:     row.note ?? 0,
    nb_avis:  row.nb_avis ?? 0,
    bio:      row.bio ?? '',
    animaux:  (row.animaux_acceptes ?? []).map(a => ANIMAL_LABELS[a] ?? a),
    tarif:    row.tarif ?? 0,
    dispo:    row.dispo ?? 'Flexible',
    dispoProchaine: rawDates[0] ?? null,      // ISO date de la prochaine dispo
    dispoProches:   rawDates.slice(0, 5),     // 5 prochaines dates affichées
    dispoDates:     rawDates,
    badges:    row.badges ?? [],
    couleur:   row.couleur ?? '#E8D5C4',
    photo_url: row.photo_url ?? null,
    latitude:  row.latitude ?? null,
    longitude: row.longitude ?? null,
    // Map extras
    specialites: (row.animaux_acceptes ?? []),
    modes:       (row.services ?? []),
    avis:        row.nb_avis ?? 0,
    onboarding:  row.onboarding ?? null,
  };
}

// ─── AUTH ────────────────────────────────────────────────────────
export async function signUp(email, password, nom, role, extraData = {}) {
  // Tout l'app attend "petsitter" ; l'onboarding envoie "pawsitter"
  const normalizedRole = role === 'pawsitter' ? 'petsitter' : role;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nom, role: normalizedRole } },
  });
  if (error) throw error;

  const profileRow = {
    id:               data.user.id,
    email,
    nom,
    role:             normalizedRole,
    telephone:        extraData.telephone ?? null,
    adresse:          extraData.adresse ?? null,
    ville:            extraData.ville ?? null,
    latitude:         extraData.latitude ?? null,
    longitude:        extraData.longitude ?? null,
    bio:              extraData.bio ?? null,
    tarif:            extraData.tarif ? Number(extraData.tarif) : null,
    animaux_acceptes: extraData.animaux_acceptes ?? [],
    services:         extraData.services ?? [],
    badges:           extraData.badges ?? [],
    // Réponses complètes de l'onboarding (fallback : l'objet extraData lui-même)
    onboarding:       extraData.onboarding ?? extraData,
  };

  // upsert: ignore conflict if row was already inserted by a trigger
  await supabase.from('users').upsert(profileRow, { onConflict: 'id' });

  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

// ─── PROFIL UTILISATEUR ──────────────────────────────────────────
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateUserProfile(userId, payload) {
  const { error } = await supabase
    .from('users')
    .update(payload)
    .eq('id', userId);
  if (error) throw error;
}

// ─── PAWSITTERS ──────────────────────────────────────────────────
export async function getPawsitters() {
  const { data, error } = await supabase
    .from('users')
    .select('id, nom, bio, tarif, note, nb_avis, ville, dispo, animaux_acceptes, services, badges, couleur, photo_url, latitude, longitude, onboarding, disponibilites(date)')
    .eq('role', 'petsitter')
    .not('photo_url', 'is', null)   // photo obligatoire pour apparaître
    .order('note', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(formatPawsitter);
}

// ─── GARDES ──────────────────────────────────────────────────────
export async function getGardesEnCours(userId, role) {
  const col = role === 'proprietaire' ? 'proprio_id' : 'gardien_id';
  const { data, error } = await supabase
    .from('gardes')
    .select(`*, gardes_animaux(animaux(*)), users!gardien_id(nom), journaux(*)`)
    .eq(col, userId)
    .eq('statut', 'en_cours');
  if (error) throw error;
  // Ré-expose `garde.animaux` (aplati depuis la table de jonction) pour les écrans en aval
  return (data ?? []).map(g => ({
    ...g,
    animaux: (g.gardes_animaux ?? [])
      .map(ga => ga.animaux)
      .filter(Boolean)
      .map(a => ({ ...a, type: a.type ?? a.espece ?? null })),
  }));
}

export async function creerGarde(payload) {
  // tarif_jour / nb_jours vont dans paiements, animal_ids dans gardes_animaux
  const { tarif_jour, nb_jours, animal_ids = [], ...gardeData } = payload;

  const { data: garde, error } = await supabase
    .from('gardes')
    .insert({ statut: 'en_attente', ...gardeData })
    .select()
    .single();
  if (error) throw error;

  if (animal_ids.length > 0) {
    const { error: animErr } = await supabase
      .from('gardes_animaux')
      .insert(animal_ids.map(id => ({ garde_id: garde.id, animal_id: id })));
    if (animErr) throw animErr;
  }

  if (tarif_jour != null && nb_jours != null) {
    const { error: payErr } = await supabase.from('paiements').insert({
      garde_id:  garde.id,
      montant:   tarif_jour * nb_jours,
      tarif_jour: Math.round(tarif_jour), // colonne integer en base, le montant garde la valeur exacte
      nb_jours,
      statut:    'en_attente',
    });
    if (payErr) throw payErr;
  }

  return garde;
}

// ─── DEMANDES OUVERTES (proprio → tous les pawsitters correspondants) ──
export async function creerDemandeOuverte({ proprio_id, animal_ids = [], date_debut, date_fin, message }) {
  const { data: garde, error } = await supabase
    .from('gardes')
    .insert({ proprio_id, gardien_id: null, statut: 'ouverte', date_debut, date_fin, message: message ?? null })
    .select()
    .single();
  if (error) throw error;
  if (animal_ids.length > 0) {
    const { error: animErr } = await supabase
      .from('gardes_animaux')
      .insert(animal_ids.map(id => ({ garde_id: garde.id, animal_id: id })));
    if (animErr) {
      // Une demande sans ses animaux serait trompeuse pour les pawsitters : on la retire.
      await supabase.from('gardes').delete().eq('id', garde.id);
      throw animErr;
    }
  }
  return garde;
}

export async function modifierDemandeOuverte(gardeId, { date_debut, date_fin, message, animal_ids = [] }) {
  const { error } = await supabase
    .from('gardes')
    .update({ date_debut, date_fin, message: message ?? null })
    .eq('id', gardeId)
    .eq('statut', 'ouverte');
  if (error) throw error;
  const { error: delErr } = await supabase.from('gardes_animaux').delete().eq('garde_id', gardeId);
  if (delErr) throw delErr;
  if (animal_ids.length > 0) {
    const { error: animErr } = await supabase
      .from('gardes_animaux')
      .insert(animal_ids.map(id => ({ garde_id: gardeId, animal_id: id })));
    if (animErr) throw animErr;
  }
}

export async function getMesDemandesOuvertes(proprioId) {
  const { data, error } = await supabase
    .from('gardes')
    .select(`
      id, date_debut, date_fin, statut, message, created_at,
      gardes_animaux(animaux(id, nom, espece, race))
    `)
    .eq('proprio_id', proprioId)
    .eq('statut', 'ouverte')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(g => ({
    ...g,
    animaux: (g.gardes_animaux ?? []).map(ga => ga.animaux).filter(Boolean),
    animal:  (g.gardes_animaux ?? []).map(ga => ga.animaux).filter(Boolean)[0] ?? null,
  }));
}

export async function annulerDemandeOuverte(gardeId) {
  const { error } = await supabase.from('gardes').delete().eq('id', gardeId).eq('statut', 'ouverte');
  if (error) throw error;
}

// Demandes ouvertes, tous proprios confondus — filtrées côté client par compatibilité
export async function getDemandesOuvertes() {
  const { data, error } = await supabase
    .from('gardes')
    .select(`
      id, date_debut, date_fin, statut, message, created_at,
      proprio:users!proprio_id(id, nom, ville, onboarding),
      gardes_animaux(animaux(id, nom, espece, race, age))
    `)
    .eq('statut', 'ouverte')
    .is('gardien_id', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(g => ({
    id: g.id,
    date_debut: g.date_debut,
    date_fin: g.date_fin,
    message: g.message,
    created_at: g.created_at,
    proprio: {
      id:    g.proprio?.id ?? null,
      nom:   g.proprio?.nom ?? 'Propriétaire',
      ville: g.proprio?.ville ?? '',
      onboarding: g.proprio?.onboarding ?? null,
    },
    animaux: (g.gardes_animaux ?? [])
      .map(ga => ga.animaux)
      .filter(Boolean)
      .map(a => ({
        nom: a.nom, race: a.race, age: a.age,
        espece: a.espece, emoji: ANIMAL_EMOJI[a.espece?.toLowerCase()] ?? '🐾',
      })),
  }));
}

// Un pawsitter s'attribue une demande ouverte
export async function accepterDemandeOuverte(gardeId, gardienId) {
  const { data, error } = await supabase
    .from('gardes')
    .update({ gardien_id: gardienId, statut: 'en_cours' })
    .eq('id', gardeId)
    .eq('statut', 'ouverte')
    .is('gardien_id', null)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDemandesGardien(gardienId) {
  const { data, error } = await supabase
    .from('gardes')
    .select(`
      id, date_debut, date_fin, statut, message, created_at,
      proprio:users!proprio_id(id, nom),
      gardes_animaux(animaux(id, nom, espece, race)),
      paiements(montant)
    `)
    .eq('gardien_id', gardienId)
    .eq('statut', 'en_attente')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(formatGarde);
}

export async function getHistoriqueGardien(gardienId) {
  const { data, error } = await supabase
    .from('gardes')
    .select(`
      id, date_debut, date_fin, statut, created_at,
      proprio:users!proprio_id(id, nom),
      gardes_animaux(animaux(id, nom, espece, race)),
      paiements(montant, statut)
    `)
    .eq('gardien_id', gardienId)
    .in('statut', ['en_cours', 'acceptee', 'refusee', 'terminee'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(formatGarde);
}

export async function accepterGarde(gardeId) {
  const { error } = await supabase
    .from('gardes')
    .update({ statut: 'en_cours' })
    .eq('id', gardeId);
  if (error) throw error;
}

export async function refuserGarde(gardeId) {
  const { error } = await supabase
    .from('gardes')
    .update({ statut: 'refusee' })
    .eq('id', gardeId);
  if (error) throw error;
}

export async function getHistoriqueProprio(propioId) {
  const { data, error } = await supabase
    .from('gardes')
    .select(`
      id, date_debut, date_fin, statut, created_at,
      gardien:users!gardien_id(nom),
      gardes_animaux(animaux(id, nom, espece, race)),
      paiements(montant, statut)
    `)
    .eq('proprio_id', propioId)
    .in('statut', ['terminee', 'refusee', 'acceptee'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(g => {
    const animaux = (g.gardes_animaux ?? []).map(ga => ga.animaux).filter(Boolean);
    const animal  = animaux[0] ?? null;
    const montant = g.paiements?.[0]?.montant ?? null;
    const paiement_statut = g.paiements?.[0]?.statut ?? 'en_attente';
    const nb_jours = g.date_debut && g.date_fin
      ? Math.ceil((new Date(g.date_fin) - new Date(g.date_debut)) / 86_400_000) + 1
      : null;
    return {
      id:               g.id,
      statut:           g.statut,
      date_debut:       g.date_debut,
      date_fin:         g.date_fin,
      nb_jours,
      montant,
      paiement_statut,
      gardien:  { nom: g.gardien?.nom ?? 'Pawsitter' },
      animal:   animal ? {
        nom:   animal.nom,
        espece: animal.espece ?? animal.type ?? 'Animal',
        race:  animal.race ?? null,
        emoji: ANIMAL_EMOJI[(animal.espece ?? animal.type)?.toLowerCase()] ?? '🐾',
      } : null,
    };
  });
}

export async function marquerGardeTerminee(gardeId) {
  const { error } = await supabase
    .from('gardes')
    .update({ statut: 'terminee' })
    .eq('id', gardeId);
  if (error) throw error;
}

// ─── AVIS ────────────────────────────────────────────────────────
export async function soumettreAvis(gardeId, auteurId, cibleId, note, commentaire) {
  const { data, error } = await supabase
    .from('avis')
    .insert({ garde_id: gardeId, auteur_id: auteurId, cible_id: cibleId, note, commentaire })
    .select()
    .single();
  if (error) throw error;
  // La note est recalculée automatiquement par le trigger trg_recalc_note (SECURITY DEFINER)
  return data;
}

export async function getAvisPawsitter(pawsitterId) {
  const { data, error } = await supabase
    .from('avis')
    .select('*, auteur:users!auteur_id(nom)')
    .eq('cible_id', pawsitterId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── DISPONIBILITÉS ──────────────────────────────────────────────
export async function getDisponibilites(gardienId) {
  const { data, error } = await supabase
    .from('disponibilites')
    .select('date')
    .eq('gardien_id', gardienId)
    .order('date');
  if (error) throw error;
  return (data ?? []).map(r => r.date);
}

export async function saveDisponibilites(gardienId, dates) {
  await supabase.from('disponibilites').delete().eq('gardien_id', gardienId);
  if (!dates || dates.length === 0) return;
  const { error } = await supabase.from('disponibilites')
    .insert(dates.map(date => ({ gardien_id: gardienId, date })));
  if (error) throw error;
}

export async function hasAvis(gardeId, auteurId) {
  const { data } = await supabase
    .from('avis').select('id')
    .eq('garde_id', gardeId).eq('auteur_id', auteurId)
    .maybeSingle();
  return !!data;
}

// ─── PHOTO UPLOAD HELPERS ────────────────────────────────────────
// Sur web, expo-image-picker retourne un data: URI.
// Sur Expo Go (natif), il retourne un file:// URI.
// fetch() + blob() est cassé pour file:// sur iOS → on utilise XHR.
function uriMeta(uri) {
  if (uri.startsWith('data:')) {
    const mime = uri.slice(5).split(';')[0];
    const ext  = mime.split('/')[1] === 'jpeg' ? 'jpg' : (mime.split('/')[1] || 'jpg');
    return { ext, mime };
  }
  const ext = (uri.split('.').pop().split('?')[0] || 'jpg').toLowerCase().replace(/[^a-z]/g, '') || 'jpg';
  return { ext, mime: `image/${ext === 'jpg' ? 'jpeg' : ext}` };
}

// Retourne un ArrayBuffer depuis n'importe quel URI (data:, file://, content://)
async function uriToArrayBuffer(uri) {
  // data: URI → on extrait le base64 directement, sans réseau
  if (uri.startsWith('data:')) {
    const base64 = uri.split(',')[1];
    const binary  = atob(base64);
    const buffer  = new ArrayBuffer(binary.length);
    const view    = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
    return buffer;
  }
  // file:// / content:// → XHR arraybuffer (plus fiable que fetch sur natif)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload  = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('uriToArrayBuffer: XHR failed for ' + uri));
    xhr.responseType = 'arraybuffer';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

export async function uploadProfilePhoto(userId, uri) {
  const { ext, mime } = uriMeta(uri);
  const arrayBuffer = await uriToArrayBuffer(uri);
  const path = `${userId}/avatar.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('avatars')
    .upload(path, arrayBuffer, { contentType: mime, upsert: true });
  if (upErr) throw upErr;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Cache-buster : même URL, nouvelle version → le navigateur refetch
  const url = `${data.publicUrl}?t=${Date.now()}`;
  await supabase.from('users').update({ photo_url: url }).eq('id', userId);
  return url;
}

const ANIMAL_EMOJI = { chien: '🐕', chat: '🐈', lapin: '🐇', rongeur: '🐹', oiseau: '🐦', reptile: '🦎' };

function formatGarde(g) {
  const animaux = (g.gardes_animaux ?? [])
    .map(ga => ga.animaux)
    .filter(Boolean);
  const animal = animaux[0] ?? null;
  const montant        = g.paiements?.[0]?.montant ?? null;
  const paiement_statut = g.paiements?.[0]?.statut ?? 'en_attente';
  const nb_jours = g.date_debut && g.date_fin
    ? Math.ceil((new Date(g.date_fin) - new Date(g.date_debut)) / 86_400_000) + 1
    : null;
  return {
    id:         g.id,
    statut:     g.statut,
    message:    g.message ?? null,
    date_debut: g.date_debut,
    date_fin:   g.date_fin,
    nb_jours,
    montant,
    paiement_statut,
    proprio_id: g.proprio?.id ?? null,
    proprio: {
      nom:    g.proprio?.nom ?? 'Propriétaire',
      avatar: (g.proprio?.nom ?? 'XX').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2),
    },
    animal: animal ? {
      nom:    animal.nom,
      espece: animal.espece ?? animal.type ?? 'Animal',
      race:   animal.race ?? null,
      emoji:  ANIMAL_EMOJI[(animal.espece ?? animal.type)?.toLowerCase()] ?? '🐾',
    } : null,
    animaux,
  };
}

// ─── ANIMAUX ─────────────────────────────────────────────────────
// slug attendu : `${userId}_${nomAnimal}_${idx}` — l'UUID userId (sans underscore)
// forme le 1er segment, utilisé pour retomber dans le préfixe `profil-photos/{userId}/`
// qui a une policy RLS storage valide (le SDK supabase-js ne joint pas le JWT en RN,
// cf. uploadJardinPhoto/uploadProfilPhoto — on utilise donc fetch + Bearer ici aussi).
export async function uploadAnimalPhoto(slug, uri) {
  const userId = slug.split('_')[0];
  const { ext, mime } = uriMeta(uri);
  const arrayBuffer = await uriToArrayBuffer(uri);
  const path = `profil-photos/${userId}/animaux/${slug}_${Date.now()}.${ext}`;

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/pawwatch-photos/${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mime,
        apikey: SUPABASE_ANON_KEY,
      },
      body: arrayBuffer,
    },
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Storage ${res.status}: ${txt}`);
  }

  const { data } = supabase.storage.from('pawwatch-photos').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadJardinPhoto(userId, uri) {
  const { ext, mime } = uriMeta(uri);
  const arrayBuffer = await uriToArrayBuffer(uri);
  const path = `profil-photos/${userId}/jardin_${Date.now()}.${ext}`;

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/pawwatch-photos/${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mime,
        apikey: SUPABASE_ANON_KEY,
      },
      body: arrayBuffer,
    },
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Storage ${res.status}: ${txt}`);
  }

  const { data } = supabase.storage.from('pawwatch-photos').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function saveAnimaux(propioId, animaux) {
  // Delete animals no longer in the list (only DB rows not referenced in active gardes)
  const { data: dbRows } = await supabase.from('animaux').select('id').eq('proprio_id', propioId);
  const currentIds = new Set(animaux.filter(a => typeof a.id === 'string').map(a => a.id));
  for (const row of dbRows ?? []) {
    if (!currentIds.has(row.id)) {
      const { count } = await supabase.from('gardes_animaux').select('id', { count: 'exact', head: true }).eq('animal_id', row.id);
      if (!count) await supabase.from('animaux').delete().eq('id', row.id);
    }
  }
  // Upsert each animal
  for (const animal of animaux) {
    const row = {
      proprio_id:  propioId,
      nom:         animal.nom || null,
      espece:      animal.espece || animal.type || null,
      race:        animal.race || null,
      age:         animal.age || null,
      sexe:        animal.sexe || null,
      photo_url:   animal.photo_url || (animal.photo?.startsWith('http') ? animal.photo : null),
      poids:       animal.poids || null,
      sterilise:   animal.sterilise ?? null,
      description: animal.description || null,
    };
    if (typeof animal.id === 'string') {
      await supabase.from('animaux').update(row).eq('id', animal.id);
    } else {
      await supabase.from('animaux').insert(row);
    }
  }
}

export async function getAnimaux(propioId) {
  const { data, error } = await supabase
    .from('animaux')
    .select('*')
    .eq('proprio_id', propioId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  // Normalise les noms de colonnes pour l'app : espece→type, photo_url→photo
  return (data ?? []).map(a => ({
    ...a,
    type:  a.type  ?? a.espece    ?? null,
    photo: a.photo ?? a.photo_url ?? null,
  }));
}

export async function addAnimal(payload) {
  const { data, error } = await supabase
    .from('animaux')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── JOURNAUX ────────────────────────────────────────────────────
export async function getJournaux(gardeId) {
  const { data, error } = await supabase
    .from('journaux')
    .select(`*, photos(*)`)
    .eq('garde_id', gardeId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function soumettreJournal(gardeId, payload) {
  const { data, error } = await supabase
    .from('journaux')
    .insert({ garde_id: gardeId, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function validerJournal(journalId) {
  const { error } = await supabase
    .from('journaux')
    .update({ vu_par_proprio: true, vu_at: new Date().toISOString() })
    .eq('id', journalId);
  if (error) throw error;
}

// ─── PHOTOS ──────────────────────────────────────────────────────
export async function uploadPhoto(journalId, type, uri, userId) {
  const { ext, mime } = uriMeta(uri);
  const arrayBuffer = await uriToArrayBuffer(uri);
  const path = `profil-photos/${userId}/journaux/${journalId}/${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/pawwatch-photos/${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mime,
        apikey: SUPABASE_ANON_KEY,
      },
      body: arrayBuffer,
    },
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Storage ${res.status}: ${txt}`);
  }

  const { data } = supabase.storage.from('pawwatch-photos').getPublicUrl(path);

  const { error: insertError } = await supabase.from('photos').insert({
    journal_id: journalId,
    type,
    url: data.publicUrl,
    heure: new Date().toISOString(),
  });
  if (insertError) throw insertError;

  return data.publicUrl;
}

// ─── PAIEMENTS ───────────────────────────────────────────────────
export async function getPaiement(gardeId) {
  const { data, error } = await supabase
    .from('paiements')
    .select('*')
    .eq('garde_id', gardeId)
    .single();
  if (error) throw error;
  return data;
}

export async function debloquerPaiement(gardeId) {
  const { error } = await supabase
    .from('paiements')
    .update({ statut: 'debloque', debloque_at: new Date().toISOString() })
    .eq('garde_id', gardeId);
  if (error) throw error;
}

export async function creerPaiementIntent(montant, gardeId) {
  const { data, error } = await supabase.functions.invoke('create-payment-intent', {
    body: {
      montant,
      garde_id:    gardeId ?? '',
      description: `Garde PawWatch #${(gardeId ?? '').slice(0, 8)}`,
    },
  });
  if (error) throw new Error(error.message ?? 'Erreur serveur Stripe');
  if (data?.error) throw new Error(data.error);
  return data.client_secret;
}

export async function marquerPaiementPaye(gardeId) {
  const { error } = await supabase
    .from('paiements')
    .update({ statut: 'paye', paye_at: new Date().toISOString() })
    .eq('garde_id', gardeId);
  if (error) throw error;
}

export async function getGardeCount(userId, role) {
  const col = role === 'petsitter' ? 'gardien_id' : 'proprio_id';
  const { count } = await supabase
    .from('gardes')
    .select('id', { count: 'exact', head: true })
    .eq(col, userId)
    .in('statut', ['terminee', 'acceptee', 'en_cours']);
  return count ?? 0;
}

// ─── PHOTOS PROFIL PETSITTER ─────────────────────────────────────

export async function getProfilPhotos(userId) {
  const { data, error } = await supabase
    .from('profil_photos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function uploadProfilPhoto(userId, uri) {
  const { ext, mime } = uriMeta(uri);
  const arrayBuffer   = await uriToArrayBuffer(uri);
  const path = `profil-photos/${userId}/${Date.now()}.${ext}`;

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? SUPABASE_ANON_KEY;

  const uploadRes = await fetch(
    `${SUPABASE_URL}/storage/v1/object/pawwatch-photos/${path}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': mime,
        apikey: SUPABASE_ANON_KEY,
      },
      body: arrayBuffer,
    },
  );
  if (!uploadRes.ok) {
    const txt = await uploadRes.text();
    throw new Error(`Storage ${uploadRes.status}: ${txt}`);
  }

  const { data } = supabase.storage.from('pawwatch-photos').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function addProfilPhoto(userId, url, caption = null) {
  const { error } = await supabase
    .from('profil_photos')
    .insert({ user_id: userId, url, caption });
  if (error) throw error;
}

export async function deleteProfilPhoto(userId, photoId, url) {
  // Supprimer le fichier du storage
  if (url) {
    const marker = '/pawwatch-photos/';
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const storagePath = url.slice(idx + marker.length).split('?')[0];
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? SUPABASE_ANON_KEY;
      await fetch(
        `${SUPABASE_URL}/storage/v1/object/pawwatch-photos/${storagePath}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
        },
      );
    }
  }
  // Supprimer la ligne en base
  const { error } = await supabase
    .from('profil_photos')
    .delete()
    .eq('id', photoId)
    .eq('user_id', userId);
  if (error) throw error;
}

// ─── CONVERSATIONS & MESSAGES ────────────────────────────────────
export async function getConversations(userId) {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id, created_at,
      proprio:users!proprio_id(id, nom),
      gardien:users!gardien_id(id, nom),
      messages(id, text, from_id, read, read_at, created_at)
    `)
    .or(`proprio_id.eq.${userId},gardien_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map(conv => {
    const msgs = (conv.messages ?? []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const isPropio = conv.proprio?.id === userId;
    const partner = isPropio ? conv.gardien : conv.proprio;
    const unread = msgs.filter(m => !m.read && m.from_id !== userId).length;
    return {
      id: conv.id,
      partnerName: partner?.nom ?? 'Utilisateur',
      partnerSpecialite: '',
      animalNom: null,
      unread,
      messages: msgs.map(m => ({
        id:        m.id,
        text:      m.text,
        from:      m.from_id === userId ? 'me' : 'them',
        timestamp: new Date(m.created_at),
        read:      m.read ?? false,
        read_at:   m.read_at ?? null,
      })),
    };
  });
}

export async function createOrGetConversation(propioId, gardienId, gardeId = null) {
  // Check if a conversation already exists between these two users
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('proprio_id', propioId)
    .eq('gardien_id', gardienId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('conversations')
    .insert({ proprio_id: propioId, gardien_id: gardienId, garde_id: gardeId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function sendMessage(convId, fromId, text) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conv_id: convId, from_id: fromId, text })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markMessagesRead(convId, userId) {
  await supabase
    .from('messages')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('conv_id', convId)
    .neq('from_id', userId)
    .eq('read', false);
}

export function subscribeToMessages(convId, onNewMessage) {
  return supabase
    .channel(`msg_insert:${convId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conv_id=eq.${convId}`,
    }, payload => onNewMessage(payload.new))
    .subscribe();
}

// ─── ADMIN ───────────────────────────────────────────────────────
export async function getAdminStats() {
  const [gardesRes, usersRes, paiementsRes] = await Promise.all([
    supabase.from('gardes').select('id, statut', { count: 'exact' }),
    supabase.from('users').select('id, role', { count: 'exact' }),
    supabase.from('paiements').select('montant, statut'),
  ]);
  const gardes    = gardesRes.data  ?? [];
  const users     = usersRes.data   ?? [];
  const paiements = paiementsRes.data ?? [];
  return {
    totalGardes:     gardes.length,
    gardesEnCours:   gardes.filter(g => g.statut === 'en_cours').length,
    gardesTerminees: gardes.filter(g => g.statut === 'terminee').length,
    gardesEnAttente: gardes.filter(g => g.statut === 'en_attente').length,
    totalUsers:      users.length,
    totalProprios:   users.filter(u => u.role === 'proprietaire').length,
    totalPetsitters: users.filter(u => u.role === 'petsitter').length,
    revenuTotal:     paiements.filter(p => p.statut === 'paye').reduce((s, p) => s + (p.montant ?? 0), 0),
    revenuEnAttente: paiements.filter(p => p.statut !== 'paye').reduce((s, p) => s + (p.montant ?? 0), 0),
  };
}

export async function getAdminGardes() {
  const { data, error } = await supabase
    .from('gardes')
    .select(`
      id, statut, date_debut, date_fin, created_at,
      proprio:users!proprio_id(nom),
      gardien:users!gardien_id(nom),
      paiements(montant, statut)
    `)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map(g => ({
    id:         g.id,
    statut:     g.statut,
    date_debut: g.date_debut,
    date_fin:   g.date_fin,
    created_at: g.created_at,
    proprio:    g.proprio?.nom ?? '—',
    gardien:    g.gardien?.nom ?? '—',
    montant:    g.paiements?.[0]?.montant ?? null,
    paiement:   g.paiements?.[0]?.statut  ?? 'en_attente',
  }));
}

export async function getAdminUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, nom, role, ville, tarif, note, nb_avis, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export function subscribeToReadReceipts(convId, onRead) {
  return supabase
    .channel(`msg_read:${convId}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'messages',
      filter: `conv_id=eq.${convId}`,
    }, payload => {
      if (payload.new.read) onRead(payload.new);
    })
    .subscribe();
}
