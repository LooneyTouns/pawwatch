// lib/services.js — types de service proposés par les pawsitters et leurs tarifs

export const SERVICE_MAP = {
  garde_domicile: { label: 'Garde au domicile du propriétaire', icon: '🏡', unit: '/jour',      tarifKey: 'tarif_garde_domicile' },
  garde_jour:     { label: 'Garde de jour (chez le pawsitter)', icon: '☀️', unit: '/jour',      tarifKey: 'tarif_garde_jour'     },
  promenade:      { label: 'Promenade',                         icon: '🐕', unit: '/promenade', tarifKey: 'tarif_promenade'      },
  visite:         { label: 'Visite à domicile',                 icon: '🐱', unit: '/visite',    tarifKey: 'tarif_visite'         },
  nuitee:         { label: 'Nuitée / Pension',                  icon: '🌙', unit: '/nuit',      tarifKey: 'tarif_nuitee'         },
  pension:        { label: 'Nuitée / Pension',                  icon: '🌙', unit: '/nuit',      tarifKey: 'tarif_nuitee'         },
};

export function getTarifService(petsitter, serviceId) {
  if (!petsitter) return null;
  const key = SERVICE_MAP[serviceId]?.tarifKey ?? `tarif_${serviceId}`;
  const v = parseFloat(petsitter.onboarding?.[key]);
  if (!isNaN(v) && v > 0) return v;
  return petsitter.tarif ?? null;
}

// Services proposés par un pawsitter, sans doublon nuitee/pension (deux IDs selon l'ancienneté du profil)
export function getServicesPetsitter(petsitter) {
  const seen = new Set();
  return (petsitter?.modes ?? [])
    .filter(m => SERVICE_MAP[m])
    .filter(m => {
      const l = SERVICE_MAP[m].label;
      if (seen.has(l)) return false;
      seen.add(l);
      return true;
    });
}

// Nombre d'unités facturées pour une période : une nuit de moins que de jours pour la pension,
// une prestation par jour pour le reste.
export function nbUnitesFacturees(serviceId, nbJours) {
  return SERVICE_MAP[serviceId]?.unit === '/nuit' ? Math.max(1, nbJours - 1) : nbJours;
}
