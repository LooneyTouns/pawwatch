// lib/onboardingMap.js
// Traduit les réponses de l'onboarding en champs de profil (propriétaire & pawsitter).
// Utilisé à la création du compte (OnboardingScreen) ET au chargement du profil (ProfilScreen),
// pour que toutes les réponses soient reportées automatiquement.

const CARACTERE_LABEL = {
  tres_sociable: 'Très sociable',
  sociable:      'Sociable',
  reserve:       'Plutôt réservé',
  craintif:      'Craintif',
  peut_mordre:   'Peut être agressif',
};

const COMPAT_LABEL = {
  adore:     'Adore les autres animaux',
  ca_depend: 'Prudence avec les autres animaux',
  seul:      'Préfère être seul',
};

const EXPERIENCE_LABEL = {
  regulierement:     "J'ai gardé des animaux régulièrement.",
  occasionnellement: "J'ai gardé des animaux occasionnellement.",
  jamais:            "Je n'ai jamais gardé d'animaux mais j'adore ça.",
};

const ANIMAUX_GARDES_LABEL = {
  chien: 'chiens', chat: 'chats', lapin: 'lapins',
  rongeur: 'rongeurs', oiseau: 'oiseaux', poisson: 'poissons',
};

// Réponses de l'inscription à ne jamais stocker dans users.onboarding (lu par les autres
// utilisateurs) : identifiants et coordonnées, qui ont leurs propres colonnes protégées.
const CLES_PRIVEES = ['password', 'password_confirm', 'email', 'telephone', 'adresse', '_latitude', '_longitude', '_codePostal'];

export function nettoyerOnboarding(od) {
  if (!od || typeof od !== 'object') return od ?? null;
  const propre = { ...od };
  CLES_PRIVEES.forEach(k => { delete propre[k]; });
  return propre;
}

export function getNbAnimauxOnboarding(od) {
  const v = od && od.nb_animaux;
  if (!v || v === '1') return 1;
  if (v === '4+') return 4;
  return parseInt(v, 10) || 1;
}

// ─── Propriétaire : réponses onboarding → fiches animaux ──────────
// Format compatible table `animaux` (saveAnimaux) et composant AnimalEditor.
export function onboardingToAnimaux(od) {
  od = od || {};
  const nb = getNbAnimauxOnboarding(od);
  const out = [];
  for (let i = 0; i < nb; i++) {
    const nom = od[`nom_animal_${i}`];
    if (!nom) continue;
    const steri = od[`sexe_animal_${i}__sterilise`];
    const age   = od[`age_animal_${i}`];
    const description = [
      CARACTERE_LABEL[od[`caractere_${i}`]],
      COMPAT_LABEL[od[`compatibilite_animaux_${i}`]],
      od.details_besoins,
      od.infos_importantes,
    ].filter(Boolean).join(' · ') || null;
    out.push({
      // id numérique temporaire : l'éditeur en a besoin, saveAnimaux le remplace par un uuid
      id:          Date.now() + i,
      nom,
      type:        od[`type_per_animal_${i}`] || null,
      race:        od[`race_animal_${i}`] || od[`type_per_animal_${i}_detail`] || null,
      sexe:        od[`sexe_animal_${i}`] || null, // 'male' | 'femelle'
      age:         age ? `${age} ${age === '1' ? 'an' : 'ans'}` : null,
      sterilise:   steri === 'oui' ? true : steri === 'non' ? false : null,
      photo:       od[`photo_nom_animal_${i}`] || null,
      description,
    });
  }
  return out;
}

// ─── Pawsitter : profil enregistré complet ? ──────────────────────
// Même règle que isProfilComplet() de ProfilScreen, mais depuis la ligne `users` en base :
// les colonnes dédiées priment, sinon les réponses d'onboarding.
export function estProfilPetsitterComplet(profile) {
  if (!profile) return false;
  const m   = onboardingToPetsitter(profile.onboarding || {});
  const acc = Array.isArray(profile.animaux_acceptes) ? profile.animaux_acceptes : [];
  const sv  = Array.isArray(profile.services) ? profile.services : [];
  const accepteAnimaux = acc.length > 0 || m.isDogsitter || m.isCatsitter || m.isAllsitter;
  const proposeService = sv.length > 0 || m.modePromenade || m.modeChezProprio
    || m.modeGardeJour || m.modeGardeJourPetsi || m.modePension;
  const experience = String(profile.bio || m.experience || '').trim();
  return !!profile.photo_url
    && accepteAnimaux
    && proposeService
    && !!experience
    && !!m.logement
    && (!m.aJardin || !!m.photoJardin);
}

// ─── Pawsitter : réponses onboarding → état du profil pawsitter ───
export function onboardingToPetsitter(od) {
  od = od || {};
  const profils = Array.isArray(od.profils_aise)   ? od.profils_aise   : [];
  const gardes  = Array.isArray(od.animaux_gardes) ? od.animaux_gardes : [];
  const svcs    = Array.isArray(od.services)       ? od.services       : [];
  const cloture = od.logement__cloture;

  const aimeChiens = profils.some(p =>
    ['chiens', 'grands_chiens', 'chiens_energiques', 'chiens_ages'].includes(p));

  const experience = [
    EXPERIENCE_LABEL[od.experience_niveau],
    gardes.length
      ? `Déjà gardé : ${gardes.map(g => ANIMAUX_GARDES_LABEL[g] ?? g).join(', ')}.`
      : null,
    od.motivation === 'autre' ? od.motivation_detail : null,
  ].filter(Boolean).join(' ');

  const am = od.animaux_maison;
  const aDesAnimaux = Array.isArray(am)
    ? am.some(v => v && v !== 'aucun')
    : (!!am && am !== 'aucun');

  return {
    isDogsitter: aimeChiens,
    isCatsitter: profils.includes('chats'),
    isAllsitter: gardes.some(g => ['lapin', 'rongeur', 'oiseau', 'poisson'].includes(g)),
    experience,
    aDesAnimaux,
    animauxPerso: (Array.isArray(od.animaux_perso) ? od.animaux_perso : [])
      .map(item => {
        if (item && typeof item === 'object') {
          return { nom: (item.nom || '').trim(), race: (item.race || '').trim() || null };
        }
        const [n, ...rest] = String(item || '').split(',');
        return { nom: n.trim(), race: rest.join(',').trim() || null };
      })
      .filter(a => a.nom),
    logement:   od.logement === 'maison_jardin' ? 'maison' : (od.logement || 'appartement'),
    aJardin:    od.logement === 'maison_jardin' || (!!cloture && cloture !== 'sans_jardin'),
    jardinClos: cloture === 'oui',
    photoJardin: od.photo_jardin ?? null,
    modePromenade:        svcs.includes('promenade'),
    modeChezProprio:      svcs.includes('visite'),
    modeGardeJour:        svcs.includes('garde_domicile'),
    modeGardeJourProprio: svcs.includes('garde_domicile'),
    modeGardeJourPetsi:   svcs.includes('garde_jour'),
    modePension:          svcs.includes('nuitee') || svcs.includes('pension'),
    prixPromenade:    od.tarif_promenade      ? String(od.tarif_promenade)      : '',
    prixPension:      od.tarif_nuitee         ? String(od.tarif_nuitee)         : '',
    prixGardeJour:    od.tarif_garde_domicile ? String(od.tarif_garde_domicile) : '',
    prixVisite:       od.tarif_visite         ? String(od.tarif_visite)         : '',
    prixGardeJourPetsi: od.tarif_garde_jour   ? String(od.tarif_garde_jour)     : '',
    animaux_acceptes: [
      ...(aimeChiens ? ['chiens'] : []),
      ...(profils.includes('chats') ? ['chats'] : []),
      ...(gardes.some(g => ['lapin', 'rongeur'].includes(g)) ? ['rongeurs'] : []),
      ...(gardes.includes('oiseau') ? ['oiseaux'] : []),
    ],
  };
}
