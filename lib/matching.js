// lib/matching.js — Algorithme de compatibilité proprio ↔ pawsitter

function getNbAnimaux(answers) {
  const v = answers?.nb_animaux;
  if (!v || v === '1') return 1;
  if (v === '4+') return 4;
  return parseInt(v, 10) || 1;
}

// Normalise 'chiens' → 'chien', 'chats' → 'chat', etc. (DB stocke le pluriel)
const normalize = a => (typeof a === 'string' && a.endsWith('s') ? a.slice(0, -1) : a);

/**
 * Calcule la compatibilité entre un propriétaire et un pawsitter.
 * @param {Object} propioData  - onboarding answers du proprio (user.onboarding)
 * @param {Object} petsitter   - objet formaté par formatPawsitter()
 * @returns {{ pct: number|null, blocages: string[] }}
 */
export function calculerCompatibilite(propioData, petsitter) {
  if (!propioData || !petsitter) return { pct: null, blocages: [], criteres: [] };

  const ps = petsitter.onboarding ?? {};
  const nb = getNbAnimaux(propioData);
  const blocages = [];

  // ── 1. Type d'animal (20 pts) ──────────────────────────────────
  const rawPsAnimaux = petsitter.specialites?.length ? petsitter.specialites : (ps.animaux_gardes ?? []);
  const psAnimaux = rawPsAnimaux.map(normalize);

  const ownerTypes = [];
  for (let i = 0; i < nb; i++) {
    const t = propioData[`type_per_animal_${i}`] ?? propioData.type_animal;
    if (t) ownerTypes.push(t);
  }

  let typeScore;
  if (ownerTypes.length === 0) {
    typeScore = 10;
  } else {
    const matched = ownerTypes.filter(t => psAnimaux.includes(t)).length;
    typeScore = Math.round((matched / ownerTypes.length) * 20);
  }

  // ── 2. Services proposés (25 pts) ──────────────────────────────
  const ownerServices = propioData.type_garde ?? [];
  const psModes = petsitter.modes?.length ? petsitter.modes : (ps.services ?? []);
  const serviceMap = {
    garde_domicile: ['garde_domicile'],
    chez_petsitter: ['garde_jour'],
    chez_moi:       ['garde_domicile'],
    promenade:      ['promenade'],
    visite:         ['visite'],
    nuit:           ['nuitee'],
    nuitee:         ['nuitee'],
  };

  let serviceScore;
  if (ownerServices.length === 0) {
    serviceScore = 12;
  } else {
    let matched = 0;
    ownerServices.forEach(s => {
      const mapped = serviceMap[s] ?? [s];
      if (mapped.some(m => psModes.includes(m))) matched++;
    });
    serviceScore = Math.round((matched / ownerServices.length) * 25);
  }

  // ── 3. Caractère animal (15 pts) ───────────────────────────────
  const rawLimites = ps.limites ?? [];
  const psLimites = rawLimites.includes('avec_tous') ? [] : rawLimites;
  let carScore = 15;

  for (let i = 0; i < nb; i++) {
    const car = propioData[`caractere_${i}`];
    const besoins = propioData[`besoins_specifiques_${i}`] ?? [];

    if (car === 'peut_mordre') {
      if (psLimites.includes('chiens_agressifs')) {
        blocages.push('🚫 Le petsitter ne travaille pas avec les animaux agressifs');
        carScore = 0;
        break;
      }
      carScore = Math.max(0, carScore - 7);
    }
    if ((car === 'craintif' || besoins.includes('anxiete')) && psLimites.includes('anxieux')) {
      blocages.push('⚠️ Le petsitter évite les animaux anxieux');
      carScore = Math.max(0, carScore - 5);
    }
  }

  // ── 4. Besoins médicaux (15 pts) ───────────────────────────────
  let besoinScore = 15;
  let needsMeds = false;
  for (let i = 0; i < nb; i++) {
    if ((propioData[`besoins_specifiques_${i}`] ?? []).includes('medicaments')) {
      needsMeds = true;
      break;
    }
  }
  if (needsMeds) {
    const offersMeds = psModes.includes('medicaments') || (ps.services ?? []).includes('medicaments');
    if (!offersMeds) {
      blocages.push('🚫 Le petsitter ne donne pas de médicaments');
      besoinScore = 0;
    } else if (psLimites.includes('medicaments_complexes')) {
      besoinScore = Math.max(0, besoinScore - 4);
    }
  }

  // ── 5. Compatibilité animaux du petsitter (10 pts) ─────────────
  const psAnimauxMaison = ps.animaux_maison;
  let compatScore = 10;

  for (let i = 0; i < nb; i++) {
    const compat = propioData[`compatibilite_animaux_${i}`];
    if (compat === 'seul' && psAnimauxMaison && psAnimauxMaison !== 'aucun') {
      blocages.push('⚠️ Ton animal préfère être seul mais le petsitter a des animaux');
      compatScore = Math.max(0, compatScore - 7);
    }
  }

  // ── 6. Disponibilité (10 pts) ──────────────────────────────────
  const ownerQuand = propioData.quand_garde ?? [];
  const psDispo = ps.disponibilite ?? [];
  const dispoMap = {
    ce_weekend:    ['weekend', 'temps_plein', 'sur_demande'],
    cette_semaine: ['semaine', 'temps_plein'],
    vacances:      ['vacances', 'temps_plein'],
    regulier:      ['semaine', 'weekend', 'temps_plein'],
    date_precise:  ['sur_demande', 'temps_plein', 'semaine', 'weekend'],
  };

  let dispoScore;
  if (ownerQuand.length > 0 && psDispo.length > 0) {
    let matched = 0;
    ownerQuand.forEach(d => {
      const mapped = dispoMap[d] ?? [];
      if (mapped.some(m => psDispo.includes(m))) matched++;
    });
    dispoScore = Math.round((matched / ownerQuand.length) * 10);
  } else {
    dispoScore = 5;
  }

  // ── 7. Expérience (5 pts) ──────────────────────────────────────
  const expMap = { regulierement: 5, occasionnellement: 3, jamais: 1 };
  const expScore = expMap[ps.experience_niveau] ?? 3;

  // ── Résultat ───────────────────────────────────────────────────
  const total = typeScore + serviceScore + carScore + besoinScore + compatScore + dispoScore + expScore;
  let pct = Math.min(100, Math.max(0, total));
  if (blocages.length > 0) pct = Math.min(pct, 50);

  return {
    pct,
    blocages,
    criteres: [
      { label: 'Type d\'animal', icon: '🐾', score: typeScore,    max: 20 },
      { label: 'Services',       icon: '🏠', score: serviceScore,  max: 25 },
      { label: 'Caractère',      icon: '😊', score: carScore,      max: 15 },
      { label: 'Santé',          icon: '💊', score: besoinScore,   max: 15 },
      { label: 'Cohabitation',   icon: '🐕', score: compatScore,   max: 10 },
      { label: 'Disponibilité',  icon: '📅', score: dispoScore,    max: 10 },
      { label: 'Expérience',     icon: '⭐', score: expScore,      max: 5  },
    ],
  };
}

/** Couleur du badge selon le score */
export function matchColor(pct) {
  if (pct == null) return null;
  if (pct >= 80) return { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' }; // vert
  if (pct >= 60) return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' }; // jaune
  if (pct >= 40) return { bg: '#FFEDD5', text: '#9A3412', border: '#FDBA74' }; // orange
  return          { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' };       // rouge
}
