// lib/animaux.js — fiche animal : champs obligatoires et conversion base <-> app

export const CHAMPS_FICHE = [
  ['nom',           'Nom'],
  ['type',          'Type'],
  ['race',          'Race'],
  ['sexe',          'Sexe'],
  ['age',           'Âge'],
  ['poids',         'Poids'],
  ['sterilise',     'Stérilisé / Castré'],
  ['vaccins',       'Vaccins à jour'],
  ['carnet',        'Carnet de santé'],
  ['maladies',      'Maladies chroniques'],
  ['allergies',     'Allergies / Intolérances'],
  ['medicaments',   'Médicaments en cours'],
  ['typeAlim',      "Type d'alimentation"],
  ['freqRepas',     'Fréquence des repas'],
  ['quantiteRepas', 'Quantité & marque'],
  ['description',   'Description du caractère'],
  ['avecChiens',    "Avec d'autres chiens"],
  ['avecChats',     'Avec des chats'],
  ['avecEnfants',   'Avec des enfants'],
  ['avecEtrangers', 'Avec des étrangers'],
  ['vetoNom',       'Vétérinaire — Nom'],
  ['vetoTel',       'Vétérinaire — Téléphone'],
  ['urgenceNom',    "Contact d'urgence — Nom"],
  ['urgenceTel',    "Contact d'urgence — Téléphone"],
];

const estVide = v => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

export function champsManquants(animal) {
  return CHAMPS_FICHE.filter(([champ]) => estVide(animal?.[champ])).map(([, label]) => label);
}

export const ficheComplete = animal => champsManquants(animal).length === 0;

// Un propriétaire est « visible » s'il a au moins un animal et que toutes ses fiches sont complètes.
export const fichesCompletes = animaux => animaux.length > 0 && animaux.every(ficheComplete);

const txt = v => (typeof v === 'string' ? v.trim() : v) || null;

export function animalFromDb(row) {
  const c = Array.isArray(row.animaux_contacts) ? row.animaux_contacts[0] : row.animaux_contacts;
  return {
    ...row,
    type:          row.type ?? row.espece ?? null,
    photo:         row.photo ?? row.photo_url ?? null,
    typeAlim:      row.type_alim ?? null,
    freqRepas:     row.freq_repas ?? null,
    quantiteRepas: row.quantite_repas ?? null,
    avecChiens:    row.avec_chiens ?? null,
    avecChats:     row.avec_chats ?? null,
    avecEnfants:   row.avec_enfants ?? null,
    avecEtrangers: row.avec_etrangers ?? null,
    vetoNom:       c?.veto_nom ?? null,
    vetoTel:       c?.veto_tel ?? null,
    urgenceNom:    c?.urgence_nom ?? null,
    urgenceTel:    c?.urgence_tel ?? null,
    contactsVisibles: !!c,
  };
}

export function animalToDb(animal, proprioId) {
  return {
    proprio_id:     proprioId,
    nom:            txt(animal.nom),
    espece:         animal.espece || animal.type || null,
    race:           txt(animal.race),
    age:            txt(animal.age),
    sexe:           animal.sexe || null,
    poids:          txt(animal.poids),
    // Une nouvelle photo uploadée (http) prime sur l'ancienne URL enregistrée
    photo_url:      animal.photo?.startsWith('http') ? animal.photo : (animal.photo_url ?? null),
    sterilise:      animal.sterilise ?? null,
    vaccins:        animal.vaccins ?? null,
    carnet:         animal.carnet ?? null,
    maladies:       txt(animal.maladies),
    allergies:      txt(animal.allergies),
    medicaments:    txt(animal.medicaments),
    type_alim:      animal.typeAlim || null,
    freq_repas:     animal.freqRepas || null,
    quantite_repas: txt(animal.quantiteRepas),
    description:    txt(animal.description),
    avec_chiens:    animal.avecChiens || null,
    avec_chats:     animal.avecChats || null,
    avec_enfants:   animal.avecEnfants || null,
    avec_etrangers: animal.avecEtrangers || null,
    fiche_complete: ficheComplete(animal),
  };
}

export function contactsToDb(animal) {
  return {
    veto_nom:    txt(animal.vetoNom),
    veto_tel:    txt(animal.vetoTel),
    urgence_nom: txt(animal.urgenceNom),
    urgence_tel: txt(animal.urgenceTel),
  };
}

// Libellés lisibles pour l'affichage côté pawsitter
export const LIBELLES = {
  sexe:      { male: '♂ Mâle', femelle: '♀ Femelle' },
  typeAlim:  { croquettes: '🥣 Croquettes', pate: '🥩 Pâtée', barf: '🥦 BARF', mixte: '🔀 Mixte' },
  freqRepas: { '1x': '1×/jour', '2x': '2×/jour', '3x': '3×/jour', libre: 'À volonté' },
  social:    { oui: '✅ Oui', non: '❌ Non', variable: '⚠️ Variable' },
};
