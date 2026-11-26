// screens/proprietaire/SearchPetsitterScreen.js
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, PanResponder,
  TouchableOpacity, Modal, ScrollView, Alert, Dimensions, Image, ActivityIndicator, TextInput,
} from 'react-native';

const EARTH_ICON = require('../../assets/earth-icon.png');
import { COLORS, FONTS, RADIUS, SHADOW } from '../../lib/theme';
import { Avatar, Badge } from '../../components/UI';
import {
  creerGarde, getPawsitters, getAnimaux, getUserProfile,
  creerDemandeOuverte, getMesDemandesOuvertes, annulerDemandeOuverte,
} from '../../lib/supabase';
import { calculerCompatibilite, matchColor } from '../../lib/matching';
import MapScreen from './MapScreen';
import * as Location from 'expo-location';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function DatePicker({ label, date, onSelect }) {
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={dp.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {days.map((d, i) => {
          const sel = date && d.toDateString() === date.toDateString();
          return (
            <TouchableOpacity key={i} onPress={() => onSelect(d)}
              style={[dp.dayBtn, sel && dp.dayBtnSel]}>
              <Text style={[dp.dayName, sel && dp.dayNameSel]}>
                {['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()]}
              </Text>
              <Text style={[dp.dayNum, sel && dp.dayNumSel]}>{d.getDate()}</Text>
              <Text style={[dp.dayMon, sel && dp.dayMonSel]}>{MONTHS[d.getMonth()]}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const dp = StyleSheet.create({
  label:      { fontSize: 13, ...FONTS.bold, color: COLORS.muted, marginBottom: 10 },
  dayBtn:     { alignItems: 'center', padding: 10, marginRight: 8, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.cream, minWidth: 58 },
  dayBtnSel:  { backgroundColor: COLORS.bark, borderColor: COLORS.bark },
  dayName:    { fontSize: 11, color: COLORS.muted, ...FONTS.medium },
  dayNum:     { fontSize: 20, ...FONTS.heavy, color: COLORS.ink, marginVertical: 2 },
  dayMon:     { fontSize: 11, color: COLORS.muted },
  dayNameSel: { color: 'rgba(255,255,255,0.8)' },
  dayNumSel:  { color: COLORS.white },
  dayMonSel:  { color: 'rgba(255,255,255,0.8)' },
});

function formatDispoDate(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

const TARIF_OPTIONS  = [25, 35, 50, 75, 999];
const TARIF_LABELS   = ['≤ 25 €', '≤ 35 €', '≤ 50 €', '≤ 75 €', 'Tous'];
const ANIMAL_OPTIONS = ['🐕 Chiens', '🐈 Chats', '🐇 Lapins', '🦎 Reptiles', '🐦 Oiseaux', '🐹 Rongeurs'];
const DISPO_OPTIONS  = ['Immédiatement', 'Cette semaine', 'Ce mois'];
const NOTE_OPTIONS   = [{ label: '3+ ⭐', val: 3 }, { label: '4+ ⭐', val: 4 }, { label: '4.5+ ⭐', val: 4.5 }];
const DIST_OPTIONS   = [5, 10, 20, 50];
const DIST_LABELS    = ['5 km', '10 km', '20 km', '50 km'];

const DEFAULT_FILTERS = { tarifMax: 999, animaux: [], dispo: null, noteMin: null, distMax: null };

function haversine(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function applyFilters(list, f, userCoords) {
  const today   = new Date().toISOString().split('T')[0];
  const semaine = new Date(Date.now() + 7  * 86400000).toISOString().split('T')[0];
  const mois    = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  return list.filter(p => {
    if (p.tarif > f.tarifMax) return false;
    if (f.noteMin && p.note < f.noteMin) return false;
    if (f.animaux.length > 0 && !f.animaux.some(a => p.animaux?.includes(a))) return false;
    if (f.dispo) {
      const next = p.dispoProchaine;
      if (!next) return false;
      if (f.dispo === 'Immédiatement' && next > today)   return false;
      if (f.dispo === 'Cette semaine' && next > semaine) return false;
      if (f.dispo === 'Ce mois'       && next > mois)    return false;
    }
    if (f.distMax && userCoords) {
      const d = haversine(userCoords.latitude, userCoords.longitude, p.latitude, p.longitude);
      if (d == null || d > f.distMax) return false;
    }
    return true;
  });
}

function countActiveFilters(f) {
  let n = 0;
  if (f.tarifMax !== 999) n++;
  if (f.noteMin)          n++;
  if (f.dispo)            n++;
  if (f.animaux.length)   n++;
  if (f.distMax)          n++;
  return n;
}

function FilterModal({ visible, filters, onApply, onClose, hasLocation }) {
  const [local, setLocal] = useState(filters);
  useEffect(() => { if (visible) setLocal(filters); }, [visible]);

  const toggle = (key, val) => setLocal(prev => {
    const arr = prev[key] ?? [];
    return { ...prev, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
  });
  const set = (key, val) => setLocal(prev => ({ ...prev, [key]: prev[key] === val ? null : val }));

  const Chip = ({ label, active, onPress }) => (
    <TouchableOpacity
      style={[fi.chip, active && fi.chipActive]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[fi.chipText, active && fi.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={fi.overlay}>
        <View style={fi.sheet}>
          <View style={fi.header}>
            <Text style={fi.titre}>Filtres</Text>
            <TouchableOpacity onPress={() => { setLocal(DEFAULT_FILTERS); }} activeOpacity={0.7}>
              <Text style={fi.reset}>Réinitialiser</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={fi.sectionLabel}>TARIF MAX</Text>
            <View style={fi.row}>
              {TARIF_OPTIONS.map((t, i) => (
                <Chip key={t} label={TARIF_LABELS[i]}
                  active={local.tarifMax === t}
                  onPress={() => setLocal(p => ({ ...p, tarifMax: t }))}
                />
              ))}
            </View>

            <Text style={fi.sectionLabel}>ANIMAUX ACCEPTÉS</Text>
            <View style={fi.row}>
              {ANIMAL_OPTIONS.map(a => (
                <Chip key={a} label={a}
                  active={local.animaux.includes(a)}
                  onPress={() => toggle('animaux', a)}
                />
              ))}
            </View>

            <Text style={fi.sectionLabel}>DISPONIBILITÉ</Text>
            <View style={fi.row}>
              {DISPO_OPTIONS.map(d => (
                <Chip key={d} label={d}
                  active={local.dispo === d}
                  onPress={() => set('dispo', d)}
                />
              ))}
            </View>

            <Text style={fi.sectionLabel}>NOTE MINIMUM</Text>
            <View style={fi.row}>
              {NOTE_OPTIONS.map(n => (
                <Chip key={n.val} label={n.label}
                  active={local.noteMin === n.val}
                  onPress={() => set('noteMin', n.val)}
                />
              ))}
            </View>

            <Text style={fi.sectionLabel}>DISTANCE MAX</Text>
            {hasLocation ? (
              <View style={fi.row}>
                {DIST_OPTIONS.map((d, i) => (
                  <Chip key={d} label={DIST_LABELS[i]}
                    active={local.distMax === d}
                    onPress={() => set('distMax', d)}
                  />
                ))}
              </View>
            ) : (
              <Text style={fi.locDisabled}>
                📍 Active la géolocalisation pour filtrer par distance
              </Text>
            )}
          </ScrollView>

          <TouchableOpacity style={fi.applyBtn} onPress={() => onApply(local)} activeOpacity={0.85}>
            <Text style={fi.applyText}>Appliquer les filtres</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={fi.cancelBtn}>
            <Text style={fi.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const fi = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: COLORS.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '85%' },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  titre:     { fontSize: 20, ...FONTS.heavy, color: COLORS.ink },
  reset:     { fontSize: 14, color: COLORS.bark, ...FONTS.bold },
  sectionLabel: { fontSize: 11, ...FONTS.bold, color: COLORS.muted, letterSpacing: 0.8, marginTop: 16, marginBottom: 10 },
  row:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:      { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: COLORS.white },
  chipActive:{ backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  chipText:  { fontSize: 13, ...FONTS.medium, color: COLORS.ink },
  chipTextActive: { color: COLORS.white },
  applyBtn:  { backgroundColor: COLORS.bark, borderRadius: RADIUS.md, padding: 16, alignItems: 'center', marginTop: 24 },
  applyText: { fontSize: 16, ...FONTS.heavy, color: COLORS.white },
  cancelBtn:   { padding: 12, alignItems: 'center' },
  cancelText:  { fontSize: 14, color: COLORS.muted },
  locDisabled: { fontSize: 13, color: COLORS.muted, fontStyle: 'italic', paddingVertical: 4 },
});

const ANIMAL_TYPE_EMOJI = { chien: '🐕', chat: '🐈', lapin: '🐇', reptile: '🦎', oiseau: '🐦', rongeur: '🐹' };

const SERVICE_MAP = {
  garde_domicile: { label: 'Garde au domicile du propriétaire', icon: '🏡', unit: '/jour',       tarifKey: 'tarif_garde_domicile' },
  garde_jour:     { label: 'Garde de jour (chez le pawsitter)',  icon: '☀️', unit: '/jour',       tarifKey: 'tarif_garde_jour'     },
  promenade:      { label: 'Promenade',                         icon: '🐕', unit: '/promenade',  tarifKey: 'tarif_promenade'      },
  visite:         { label: 'Visite à domicile',                 icon: '🐱', unit: '/visite',     tarifKey: 'tarif_visite'         },
  nuitee:         { label: 'Nuitée / Pension',                  icon: '🌙', unit: '/nuit',       tarifKey: 'tarif_nuitee'         },
  pension:        { label: 'Nuitée / Pension',                  icon: '🌙', unit: '/nuit',       tarifKey: 'tarif_nuitee'         },
};

function getTarifService(petsitter, serviceId) {
  if (!petsitter) return null;
  const key = SERVICE_MAP[serviceId]?.tarifKey ?? `tarif_${serviceId}`;
  const v = parseFloat(petsitter.onboarding?.[key]);
  if (!isNaN(v) && v > 0) return v;
  return petsitter.tarif ?? null;
}

function ModalDemandeOuverte({ visible, mesAnimaux, animalChoisi, setAnimalChoisi, dateDebut, dateFin, setDateDebut, setDateFin, message, setMessage, sending, onPublier, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitre}>📢 Publier une demande</Text>
          <Text style={styles.modalSub}>
            Tous les pawsitters compatibles pourront voir ta demande et l'accepter.
          </Text>

          {mesAnimaux.length > 0 && (
            <View style={styles.animalPickerBox}>
              <Text style={styles.animalPickerLabel}>QUEL ANIMAL À CONFIER ?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {mesAnimaux.map(a => {
                    const sel = animalChoisi?.id === a.id;
                    const emoji = ANIMAL_TYPE_EMOJI[a.type?.toLowerCase()] ?? '🐾';
                    return (
                      <TouchableOpacity
                        key={a.id}
                        style={[styles.animalChip, sel && styles.animalChipSel]}
                        onPress={() => setAnimalChoisi(sel ? null : a)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.animalChipText, sel && styles.animalChipTextSel]}>
                          {emoji} {a.nom}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false}>
            <DatePicker label="DATE DE DÉBUT" date={dateDebut} onSelect={setDateDebut} />
            <DatePicker label="DATE DE FIN" date={dateFin} onSelect={d => {
              if (dateDebut && d < dateDebut) {
                Alert.alert('Date invalide', 'La fin doit être après le début.');
                return;
              }
              setDateFin(d);
            }} />

            <Text style={styles.msgLabel}>Message aux pawsitters (optionnel)</Text>
            <TextInput
              style={styles.msgInput}
              placeholder="Infos utiles sur votre animal, vos attentes…"
              placeholderTextColor={COLORS.border}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={300}
            />

            {dateDebut && dateFin && (
              <View style={styles.resumeBox}>
                <Text style={styles.resumeText}>
                  {Math.ceil((dateFin - dateDebut) / (1000 * 60 * 60 * 24) + 1)} jour{Math.ceil((dateFin - dateDebut) / (1000 * 60 * 60 * 24) + 1) > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.envoyerBtn, { backgroundColor: '#1A2756' }, (!dateDebut || !dateFin || sending) && { opacity: 0.5 }]}
            onPress={onPublier}
            disabled={!dateDebut || !dateFin || sending}
            activeOpacity={0.8}
          >
            <Text style={styles.envoyerText}>
              {sending ? 'Publication…' : '📢 Publier la demande'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.annulerBtn}>
            <Text style={styles.annulerText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function SearchPetsitterScreen({ user, animal, onPropose, onMatch }) {
  const [allPawsitters, setAllPawsitters] = useState([]);
  const [pawsitters,    setPawsitters]    = useState([]);
  const [loadingList,   setLoadingList]   = useState(true);
  const [errorList,     setErrorList]     = useState(null);
  const [index,         setIndex]         = useState(0);
  const [modalOpen,     setModalOpen]     = useState(false);
  const [showMap,       setShowMap]       = useState(false);
  const [showFilters,   setShowFilters]   = useState(false);
  const [filters,       setFilters]       = useState(DEFAULT_FILTERS);
  const [userCoords,    setUserCoords]    = useState(null);
  const [dateDebut,     setDateDebut]     = useState(null);
  const [dateFin,       setDateFin]       = useState(null);
  const [message,       setMessage]       = useState('');
  const [sending,       setSending]       = useState(false);
  const [swipedRight,   setSwipedRight]   = useState([]);
  const [swipedLeft,    setSwipedLeft]    = useState([]);
  const [mesAnimaux,       setMesAnimaux]       = useState([]);
  const [animalChoisi,     setAnimalChoisi]     = useState(null);
  const [propioOnboarding, setPropioOnboarding] = useState(null);
  const [expandedMatch,    setExpandedMatch]    = useState(false);

  // ── Demandes ouvertes ──────────────────────────────────────────
  const [mesDemandesOuvertes, setMesDemandesOuvertes] = useState([]);
  const [modalOuverteOpen,    setModalOuverteOpen]    = useState(false);
  const [dateDebutO,          setDateDebutO]          = useState(null);
  const [dateFinO,            setDateFinO]            = useState(null);
  const [messageO,            setMessageO]            = useState('');
  const [animalChoisiO,       setAnimalChoisiO]       = useState(null);
  const [sendingO,            setSendingO]            = useState(false);

  // ── Demande privée (depuis la carte) ──────────────────────────────
  const [selectedPetsitterMap, setSelectedPetsitterMap] = useState(null);
  const [showDemandePrivee,    setShowDemandePrivee]    = useState(false);
  const [debutPrivee,          setDebutPrivee]          = useState(null);
  const [finPrivee,            setFinPrivee]            = useState(null);
  const [animauxPrivee,        setAnimauxPrivee]        = useState([]);
  const [servicePrivee,        setServicePrivee]        = useState(null);
  const [messagePrivee,        setMessagePrivee]        = useState('');
  const [sendingPrivee,        setSendingPrivee]        = useState(false);

  const position = useRef(new Animated.ValueXY()).current;
  const swipeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      // Géolocalisation silencieuse (pas de blocage si refusée)
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserCoords(loc.coords);
        }
      } catch { /* permission refusée ou indispo */ }

      // Charger le profil proprio (onboarding blob) pour le calcul de compatibilité
      let propioOnb = null;
      if (user?.id) {
        try {
          const profile = await getUserProfile(user.id);
          propioOnb = profile?.onboarding ?? null;
          if (propioOnb) setPropioOnboarding(propioOnb);
        } catch { /* silencieux */ }
      }

      // Charger mes demandes ouvertes en cours
      if (user?.id) {
        getMesDemandesOuvertes(user.id).then(setMesDemandesOuvertes).catch(() => {});
      }

      try {
        const data = await getPawsitters();
        // Trier par score de compatibilité décroissant si les données proprio sont disponibles
        const sorted = propioOnb
          ? [...data].sort((a, b) => {
              const sa = calculerCompatibilite(propioOnb, a).pct ?? 0;
              const sb = calculerCompatibilite(propioOnb, b).pct ?? 0;
              return sb - sa;
            })
          : data;
        setAllPawsitters(sorted);
        setPawsitters(applyFilters(sorted, DEFAULT_FILTERS, null));
      } catch {
        setErrorList('Impossible de charger les pawsitters. Vérifie ta connexion.');
      } finally {
        setLoadingList(false);
      }

      if (user?.id) {
        try {
          const anim = await getAnimaux(user.id);
          setMesAnimaux(anim ?? []);
          if (anim?.length === 1) setAnimalChoisi(anim[0]);
        } catch { /* silencieux */ }
      }
    })();
  }, []);

  // Re-appliquer les filtres quand les coords arrivent après la liste
  useEffect(() => {
    if (userCoords && allPawsitters.length > 0) {
      let filtered = applyFilters(allPawsitters, filters, userCoords);
      if (propioOnboarding) {
        filtered = [...filtered].sort((a, b) => {
          const sa = calculerCompatibilite(propioOnboarding, a).pct ?? 0;
          const sb = calculerCompatibilite(propioOnboarding, b).pct ?? 0;
          return sb - sa;
        });
      }
      setPawsitters(filtered);
    }
  }, [userCoords]);

  const handleApplyFilters = useCallback((f) => {
    setFilters(f);
    let filtered = applyFilters(allPawsitters, f, userCoords);
    if (propioOnboarding) {
      filtered = [...filtered].sort((a, b) => {
        const sa = calculerCompatibilite(propioOnboarding, a).pct ?? 0;
        const sb = calculerCompatibilite(propioOnboarding, b).pct ?? 0;
        return sb - sa;
      });
    }
    setPawsitters(filtered);
    setIndex(0);
    setSwipedLeft([]);
    setSwipedRight([]);
    setShowFilters(false);
  }, [allPawsitters, userCoords, propioOnboarding]);

  const current = pawsitters[index];

  const resetPosition = useCallback(() => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 }, useNativeDriver: false,
    }).start();
  }, [position]);

  const animateOut = useCallback((direction, cb) => {
    Animated.parallel([
      Animated.timing(position, {
        toValue: { x: direction * SCREEN_WIDTH * 1.5, y: 0 },
        duration: 280, useNativeDriver: false,
      }),
      Animated.timing(swipeAnim, {
        toValue: 0, duration: 280, useNativeDriver: false,
      }),
    ]).start(() => {
      position.setValue({ x: 0, y: 0 });
      swipeAnim.setValue(1);
      cb();
    });
  }, [position, swipeAnim]);

  const handleSwipeLeft = useCallback(() => {
    if (!current) return;
    animateOut(-1, () => {
      setSwipedLeft(s => [...s, current.id]);
      setIndex(i => i + 1);
    });
  }, [current, animateOut]);

  const handleSwipeRight = useCallback(() => {
    if (!current) return;
    animateOut(1, () => {
      setSwipedRight(s => [...s, current.id]);
      setIndex(i => i + 1);
      setModalOpen(true);
    });
  }, [current, animateOut]);

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      position.setValue({ x: g.dx, y: g.dy * 0.3 });
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx > SWIPE_THRESHOLD)       handleSwipeRight();
      else if (g.dx < -SWIPE_THRESHOLD) handleSwipeLeft();
      else                               resetPosition();
    },
  })).current;

  const handleEnvoyer = async () => {
    if (!dateDebut || !dateFin) {
      Alert.alert('Dates manquantes', 'Choisis une date de début et de fin.');
      return;
    }
    if (dateFin < dateDebut) {
      Alert.alert('Dates invalides', 'La date de fin doit être après la date de début.');
      return;
    }
    if (mesAnimaux.length > 0 && !animalChoisi) {
      Alert.alert('Animal manquant', 'Sélectionne l\'animal à confier au pawsitter.');
      return;
    }
    setSending(true);
    const petsitter = pawsitters[index - 1];
    const nb_jours  = Math.ceil((dateFin - dateDebut) / (1000 * 60 * 60 * 24)) + 1;
    try {
      await creerGarde({
        proprio_id:  user?.id,
        gardien_id:  petsitter?.id,
        date_debut:  dateDebut.toISOString().split('T')[0],
        date_fin:    dateFin.toISOString().split('T')[0],
        message:     message.trim() || null,
        statut:      'en_attente',
        tarif_jour:  petsitter?.tarif ?? null,
        nb_jours,
        animal_id:   animalChoisi?.id ?? null,
      });
    } catch {
      // mode démo : on continue même sans Supabase configuré
    } finally {
      setSending(false);
      setModalOpen(false);
      setDateDebut(null);
      setDateFin(null);
      setMessage('');
    }
    if (onPropose) onPropose(petsitter);
    if (onMatch)   await onMatch(petsitter);
    Alert.alert(
      '✨ Demande envoyée !',
      `${petsitter?.nom} a reçu ta proposition. Un message a été ouvert dans l'onglet Messages.`
    );
  };

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });

  const handlePublierDemande = async () => {
    if (!dateDebutO || !dateFinO) {
      Alert.alert('Dates manquantes', 'Sélectionne une date de début et de fin.');
      return;
    }
    setSendingO(true);
    try {
      await creerDemandeOuverte({
        proprio_id:  user.id,
        animal_id:   animalChoisiO?.id ?? null,
        date_debut:  dateDebutO.toISOString().slice(0, 10),
        date_fin:    dateFinO.toISOString().slice(0, 10),
        message:     messageO.trim() || null,
      });
      const updated = await getMesDemandesOuvertes(user.id);
      setMesDemandesOuvertes(updated);
      setModalOuverteOpen(false);
      setDateDebutO(null); setDateFinO(null); setMessageO(''); setAnimalChoisiO(null);
      Alert.alert('📢 Demande publiée !', 'Les pawsitters compatibles peuvent maintenant la voir et l\'accepter.');
    } catch (e) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de publier la demande.');
    } finally {
      setSendingO(false);
    }
  };

  const handleAnnulerDemande = (id) => {
    Alert.alert('Annuler la demande', 'Retirer cette demande ouverte ?', [
      { text: 'Non', style: 'cancel' },
      { text: 'Annuler la demande', style: 'destructive', onPress: async () => {
        try {
          await annulerDemandeOuverte(id);
          setMesDemandesOuvertes(prev => prev.filter(d => d.id !== id));
        } catch {
          Alert.alert('Erreur', 'Impossible d\'annuler la demande.');
        }
      }},
    ]);
  };

  const handleEnvoyerDemandePrivee = async () => {
    if (!debutPrivee || !finPrivee) {
      Alert.alert('Dates manquantes', 'Sélectionnez une date de début et de fin.');
      return;
    }
    if (mesAnimaux.length > 0 && animauxPrivee.length === 0) {
      Alert.alert('Animal manquant', 'Sélectionnez au moins un animal à confier.');
      return;
    }
    setSendingPrivee(true);
    const petsitter = selectedPetsitterMap;
    const nb_jours  = Math.ceil((finPrivee - debutPrivee) / (1000 * 60 * 60 * 24)) + 1;

    const tarifService = servicePrivee ? getTarifService(petsitter, servicePrivee) : petsitter?.tarif ?? null;

    try {
      await creerGarde({
        proprio_id: user?.id,
        gardien_id: petsitter?.id,
        date_debut: debutPrivee.toISOString().split('T')[0],
        date_fin:   finPrivee.toISOString().split('T')[0],
        message:    messagePrivee.trim() || null,
        statut:     'en_attente',
        tarif_jour: tarifService,
        nb_jours,
        animal_id:  animauxPrivee[0]?.id ?? null,
      });
    } catch { /* mode démo */ }

    const dateStr    = `${debutPrivee.toLocaleDateString('fr-FR')} → ${finPrivee.toLocaleDateString('fr-FR')}`;
    const animauxStr = animauxPrivee.map(a => a.nom).join(', ') || 'Non précisé';
    const svcLabel   = servicePrivee ? (SERVICE_MAP[servicePrivee]?.label ?? servicePrivee) : 'Non précisé';
    const tarifStr   = tarifService != null ? ` (${tarifService} €${SERVICE_MAP[servicePrivee]?.unit ?? '/jour'})` : '';
    const serviceStr = svcLabel + tarifStr;
    const msgParts   = [
      `🐾 Demande de garde privée`,
      `📅 Dates : ${dateStr}`,
      `🏠 Service : ${serviceStr}`,
      `🐶 Animal(aux) : ${animauxStr}`,
    ];
    if (messagePrivee.trim()) msgParts.push(`💬 ${messagePrivee.trim()}`);
    const msgText = msgParts.join('\n');

    setSendingPrivee(false);
    setShowDemandePrivee(false);
    setDebutPrivee(null);
    setFinPrivee(null);
    setAnimauxPrivee([]);
    setServicePrivee(null);
    setMessagePrivee('');

    if (onMatch) await onMatch(petsitter, msgText);
    Alert.alert(
      '✨ Demande envoyée !',
      `${petsitter?.nom} a reçu ta demande. Un message a été ouvert dans l'onglet Messages.`
    );
  };

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH * 0.2],
    outputRange: [0, 1], extrapolate: 'clamp',
  });
  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH * 0.2, 0],
    outputRange: [1, 0], extrapolate: 'clamp',
  });

  if (loadingList) {
    return (
      <View style={styles.fin}>
        <ActivityIndicator size="large" color={COLORS.bark} />
        <Text style={[styles.finSub, { marginTop: 16 }]}>Chargement des pawsitters…</Text>
      </View>
    );
  }

  if (errorList) {
    return (
      <View style={styles.fin}>
        <Text style={{ fontSize: 40, marginBottom: 14 }}>📡</Text>
        <Text style={styles.finTitre}>Erreur de chargement</Text>
        <Text style={styles.finSub}>{errorList}</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={() => {
          setErrorList(null);
          setLoadingList(true);
          getPawsitters()
            .then(data => { setAllPawsitters(data); setPawsitters(applyFilters(data, filters, userCoords)); })
            .catch(() => setErrorList('Impossible de charger les pawsitters. Vérifie ta connexion.'))
            .finally(() => setLoadingList(false));
        }}>
          <Text style={styles.resetText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (index >= pawsitters.length) {
    return (
      <View style={styles.fin}>
        <Text style={{ fontSize: 56 }}>🐾</Text>
        <Text style={styles.finTitre}>Plus de pawsitters</Text>
        <Text style={styles.finSub}>Tu as vu tous les pawsitters disponibles.</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={() => { setIndex(0); setSwipedLeft([]); setSwipedRight([]); }}>
          <Text style={styles.resetText}>🔄 Recommencer</Text>
        </TouchableOpacity>
        <View style={styles.finSep} />
        <Text style={styles.finSepLabel}>ou laisse les pawsitters venir à toi</Text>
        <TouchableOpacity style={styles.ouverteCta} onPress={() => setModalOuverteOpen(true)} activeOpacity={0.85}>
          <Text style={styles.ouverteCtaText}>📢 Publier une demande ouverte</Text>
        </TouchableOpacity>
        {mesDemandesOuvertes.length > 0 && (
          <Text style={styles.finSub}>
            {mesDemandesOuvertes.length} demande{mesDemandesOuvertes.length > 1 ? 's' : ''} ouverte{mesDemandesOuvertes.length > 1 ? 's' : ''} en attente
          </Text>
        )}
        <ModalDemandeOuverte
          visible={modalOuverteOpen}
          mesAnimaux={mesAnimaux}
          animalChoisi={animalChoisiO}
          setAnimalChoisi={setAnimalChoisiO}
          dateDebut={dateDebutO}
          dateFin={dateFinO}
          setDateDebut={setDateDebutO}
          setDateFin={setDateFinO}
          message={messageO}
          setMessage={setMessageO}
          sending={sendingO}
          onPublier={handlePublierDemande}
          onClose={() => setModalOuverteOpen(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Compteur + bulle carte */}
      <View style={styles.topBar}>
        <Text style={styles.topCount}>{pawsitters.length - index} pawsitter{pawsitters.length - index > 1 ? 's' : ''} près de toi</Text>
        <View style={styles.topStats}>
          <Text style={styles.topStat}>✗ {swipedLeft.length}</Text>
          <Text style={[styles.topStat, { color: COLORS.moss }]}>♥ {swipedRight.length}</Text>
          {/* Bouton demande ouverte */}
          <TouchableOpacity style={styles.ouverteBubble} onPress={() => setModalOuverteOpen(true)} activeOpacity={0.8}>
            <Text style={styles.ouverteBubbleText}>📢</Text>
            {mesDemandesOuvertes.length > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{mesDemandesOuvertes.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          {/* Bouton filtres */}
          <TouchableOpacity style={styles.filterBubble} onPress={() => setShowFilters(true)} activeOpacity={0.8}>
            <Text style={styles.filterIcon}>⚙</Text>
            {countActiveFilters(filters) > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{countActiveFilters(filters)}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapBubble} onPress={() => setShowMap(true)} activeOpacity={0.8}>
            <Image source={EARTH_ICON} style={styles.mapBubbleIcon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bandeau demandes ouvertes actives */}
      {mesDemandesOuvertes.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ouverteBandeauScroll} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 6, gap: 8 }}>
          {mesDemandesOuvertes.map(d => (
            <View key={d.id} style={styles.ouvertePill}>
              <Text style={styles.ouvertePillText}>
                📢 {d.animal?.nom ?? 'Garde'} · {new Date(d.date_debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}→{new Date(d.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </Text>
              <TouchableOpacity onPress={() => handleAnnulerDemande(d.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.ouvertePillClose}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <FilterModal
        visible={showFilters}
        filters={filters}
        onApply={handleApplyFilters}
        onClose={() => setShowFilters(false)}
        hasLocation={!!userCoords}
      />

      {/* Bandeau filtres actifs */}
      {countActiveFilters(filters) > 0 && (
        <TouchableOpacity style={styles.filterBar} onPress={() => setShowFilters(true)} activeOpacity={0.8}>
          <Text style={styles.filterBarText}>
            ⚙ {countActiveFilters(filters)} filtre{countActiveFilters(filters) > 1 ? 's' : ''} actif{countActiveFilters(filters) > 1 ? 's' : ''} · {pawsitters.length} résultat{pawsitters.length > 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={() => handleApplyFilters(DEFAULT_FILTERS)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.filterBarReset}>✕ Effacer</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Modal carte */}
      <Modal visible={showMap} animationType="slide" onRequestClose={() => setShowMap(false)}>
        <View style={{ flex: 1 }}>
          <View style={styles.mapModalHeader}>
            <Text style={styles.mapModalTitle}>Pawsitters à proximité</Text>
            <TouchableOpacity onPress={() => setShowMap(false)} style={styles.mapModalClose}>
              <Text style={styles.mapModalCloseText}>✕ Fermer</Text>
            </TouchableOpacity>
          </View>
          <MapScreen onContact={p => { setShowMap(false); setSelectedPetsitterMap(p); setShowDemandePrivee(true); }} />
        </View>
      </Modal>

      {/* Carte suivante (fond) */}
      {pawsitters[index + 1] && (
        <View style={[styles.card, styles.cardBehind, { backgroundColor: pawsitters[index + 1].couleur }]}>
          <Text style={styles.behindNom}>{pawsitters[index + 1].nom}</Text>
        </View>
      )}

      {/* Carte principale */}
      <Animated.View
        style={[styles.card, {
          backgroundColor: current.couleur,
          transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }],
          opacity: swipeAnim,
        }]}
        {...panResponder.panHandlers}
      >
        {/* Badge de compatibilité — tappable pour voir le détail */}
        {(() => {
          if (!propioOnboarding) return null;
          const { pct, criteres } = calculerCompatibilite(propioOnboarding, current);
          if (pct == null) return null;
          const colors = matchColor(pct);
          return (
            <View style={styles.matchZone}>
              <TouchableOpacity
                onPress={() => setExpandedMatch(v => !v)}
                activeOpacity={0.8}
                style={[styles.matchBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}
              >
                <Text style={[styles.matchPct, { color: colors.text }]}>{pct}%</Text>
                <Text style={[styles.matchLabel, { color: colors.text }]}>
                  Match {expandedMatch ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {expandedMatch && (
                <View style={[styles.matchDetail, { borderColor: colors.border }]}>
                  {criteres.map(c => {
                    const ratio = c.max > 0 ? c.score / c.max : 0;
                    const barColor = ratio >= 0.7 ? '#16A34A' : ratio >= 0.4 ? '#D97706' : '#DC2626';
                    return (
                      <View key={c.label} style={styles.matchRow}>
                        <Text style={styles.matchRowIcon}>{c.icon}</Text>
                        <View style={styles.matchRowMid}>
                          <Text style={styles.matchRowLabel}>{c.label}</Text>
                          <View style={styles.matchBar}>
                            <View style={[styles.matchFill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: barColor }]} />
                          </View>
                        </View>
                        <Text style={[styles.matchRowPts, { color: barColor }]}>{c.score}/{c.max}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })()}

        {/* NOPE overlay */}
        <Animated.View style={[styles.overlay, styles.overlayNope, { opacity: nopeOpacity }]}>
          <Text style={styles.overlayTextNope}>NOPE</Text>
        </Animated.View>

        {/* MATCH overlay */}
        <Animated.View style={[styles.overlay, styles.overlayLike, { opacity: likeOpacity }]}>
          <Text style={styles.overlayTextLike}>MATCH !</Text>
        </Animated.View>

        {/* Avatar */}
        <View style={styles.avatarZone}>
          <Avatar initials={current.initiales} size={100} photoUri={current.photo_url} />
          <View style={styles.noteRow}>
            <Text style={styles.noteText}>⭐ {current.note} · {current.nb_avis} avis</Text>
          </View>
        </View>

        {/* Infos */}
        <View style={styles.infos}>
          <View style={styles.nameRow}>
            <Text style={styles.nom}>{current.nom}</Text>
            <Text style={styles.age}>{current.age} ans</Text>
          </View>
          <Text style={styles.ville}>
            📍 {current.ville}
            {userCoords && current.latitude ? (() => {
              const d = haversine(userCoords.latitude, userCoords.longitude, current.latitude, current.longitude);
              return d != null ? `  ·  ${d < 1 ? '< 1' : Math.round(d)} km` : '';
            })() : ''}
          </Text>
          {/* Services proposés avec tarifs */}
          {current.modes?.length > 0 && (
            <View style={styles.servicesRow}>
              {(() => {
                const seen = new Set();
                return current.modes.filter(m => {
                  if (!SERVICE_MAP[m]) return false;
                  const l = SERVICE_MAP[m].label;
                  return seen.has(l) ? false : (seen.add(l), true);
                });
              })().map(m => {
                const svc   = SERVICE_MAP[m];
                const tarif = getTarifService(current, m);
                return (
                  <View key={m} style={styles.servicePill}>
                    <Text style={styles.servicePillText}>
                      {svc.icon} {svc.label}{tarif ? `  ·  ${tarif} €` : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {current.dispoProches?.length > 0 ? (
            <View style={styles.dispoRow}>
              <Text style={styles.dispoLabel}>📅 </Text>
              {current.dispoProches.slice(0, 3).map(d => (
                <View key={d} style={styles.dispoPill}>
                  <Text style={styles.dispoText}>{formatDispoDate(d)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.dispoVide}>📅 Disponibilités non renseignées</Text>
          )}

          <Text style={styles.bio}>{current.bio}</Text>

          <View style={styles.animauxRow}>
            {current.animaux.map(a => (
              <View key={a} style={styles.animauxPill}>
                <Text style={styles.animauxText}>{a}</Text>
              </View>
            ))}
          </View>

          <View style={styles.badgesRow}>
            {current.badges.map(b => (
              <View key={b} style={styles.badge}>
                <Text style={styles.badgeText}>{b}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      {/* Boutons */}
      <View style={styles.btns}>
        <TouchableOpacity style={[styles.btn, styles.btnNope]} onPress={handleSwipeLeft} activeOpacity={0.8}>
          <Text style={styles.btnNopeText}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnLike]} onPress={handleSwipeRight} activeOpacity={0.8}>
          <Text style={styles.btnLikeText}>🐾</Text>
        </TouchableOpacity>
      </View>

      {/* Modal demande ouverte */}
      <ModalDemandeOuverte
        visible={modalOuverteOpen}
        mesAnimaux={mesAnimaux}
        animalChoisi={animalChoisiO}
        setAnimalChoisi={setAnimalChoisiO}
        dateDebut={dateDebutO}
        dateFin={dateFinO}
        setDateDebut={setDateDebutO}
        setDateFin={setDateFinO}
        message={messageO}
        setMessage={setMessageO}
        sending={sendingO}
        onPublier={handlePublierDemande}
        onClose={() => setModalOuverteOpen(false)}
      />

      {/* Modal proposition de date */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitre}>Proposer une garde</Text>
            <Text style={styles.modalSub}>
              à {pawsitters[index - 1]?.nom} {pawsitters[index - 1]?.initiales && `(${pawsitters[index - 1].initiales})`}
            </Text>

            {/* Score de compatibilité dans le modal */}
            {(() => {
              const ps = pawsitters[index - 1];
              if (!ps || !propioOnboarding) return null;
              const { pct, blocages, criteres } = calculerCompatibilite(propioOnboarding, ps);
              if (pct == null) return null;
              const colors = matchColor(pct);
              return (
                <View style={styles.modalMatchBox}>
                  <View style={[styles.modalMatchBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <Text style={[styles.modalMatchPct, { color: colors.text }]}>{pct}% compatible</Text>
                  </View>
                  {criteres.map(c => {
                    const ratio = c.max > 0 ? c.score / c.max : 0;
                    const barColor = ratio >= 0.7 ? '#16A34A' : ratio >= 0.4 ? '#D97706' : '#DC2626';
                    return (
                      <View key={c.label} style={styles.matchRow}>
                        <Text style={styles.matchRowIcon}>{c.icon}</Text>
                        <View style={styles.matchRowMid}>
                          <Text style={styles.matchRowLabel}>{c.label}</Text>
                          <View style={styles.matchBar}>
                            <View style={[styles.matchFill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: barColor }]} />
                          </View>
                        </View>
                        <Text style={[styles.matchRowPts, { color: barColor }]}>{c.score}/{c.max}</Text>
                      </View>
                    );
                  })}
                  {blocages.length > 0 && blocages.map((b, i) => (
                    <Text key={i} style={styles.modalMatchBlocage}>{b}</Text>
                  ))}
                </View>
              );
            })()}

            {mesAnimaux.length > 0 && (
              <View style={styles.animalPickerBox}>
                <Text style={styles.animalPickerLabel}>QUEL ANIMAL À CONFIER ?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {mesAnimaux.map(a => {
                      const sel = animalChoisi?.id === a.id;
                      const emoji = ANIMAL_TYPE_EMOJI[a.type?.toLowerCase()] ?? '🐾';
                      return (
                        <TouchableOpacity
                          key={a.id}
                          style={[styles.animalChip, sel && styles.animalChipSel]}
                          onPress={() => setAnimalChoisi(sel ? null : a)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.animalChipText, sel && styles.animalChipTextSel]}>
                            {emoji} {a.nom}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            {pawsitters[index - 1]?.dispoProches?.length > 0 && (
              <View style={styles.dispoInfoBox}>
                <Text style={styles.dispoInfoLabel}>📅 Créneaux renseignés par le pawsitter</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 6, paddingBottom: 2 }}>
                    {pawsitters[index - 1].dispoProches.map(d => (
                      <View key={d} style={styles.dispoChip}>
                        <Text style={styles.dispoChipText}>{formatDispoDate(d)}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              <DatePicker label="DATE DE DÉBUT" date={dateDebut} onSelect={setDateDebut} />
              <DatePicker label="DATE DE FIN"   date={dateFin}   onSelect={d => {
                if (dateDebut && d < dateDebut) {
                  Alert.alert('Date invalide', 'La fin doit être après le début.');
                  return;
                }
                setDateFin(d);
              }} />

              {/* Message optionnel au pawsitter */}
              <Text style={styles.msgLabel}>Message au pawsitter (optionnel)</Text>
              <TextInput
                style={styles.msgInput}
                placeholder="Présentez votre animal, ses habitudes…"
                placeholderTextColor={COLORS.border}
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={300}
              />

              {dateDebut && dateFin && (
                <View style={styles.resumeBox}>
                  <Text style={styles.resumeText}>
                    {Math.ceil((dateFin - dateDebut) / (1000 * 60 * 60 * 24) + 1)} jour{Math.ceil((dateFin - dateDebut) / (1000 * 60 * 60 * 24) + 1) > 1 ? 's' : ''} · {Math.ceil((dateFin - dateDebut) / (1000 * 60 * 60 * 24) + 1) * (pawsitters[index - 1]?.tarif ?? 0)} € estimés
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.envoyerBtn, (!dateDebut || !dateFin || sending) && { opacity: 0.5 }]}
              onPress={handleEnvoyer}
              disabled={!dateDebut || !dateFin || sending}
              activeOpacity={0.8}
            >
              <Text style={styles.envoyerText}>
                {sending ? 'Envoi...' : '📤 Envoyer la demande'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setModalOpen(false); setDateDebut(null); setDateFin(null); setMessage(''); }} style={styles.annulerBtn}>
              <Text style={styles.annulerText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal demande privée (depuis la carte) */}
      <Modal visible={showDemandePrivee} animationType="slide" transparent onRequestClose={() => setShowDemandePrivee(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: SCREEN_HEIGHT * 0.85 }]}>
            <Text style={styles.modalTitre}>Demande de garde privée</Text>
            <Text style={styles.modalSub}>
              à {selectedPetsitterMap?.nom ?? ''}
              {selectedPetsitterMap?.tarif ? ` · ${selectedPetsitterMap.tarif} €/jour` : ''}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Sélection du service */}
              <Text style={styles.msgLabel}>TYPE DE SERVICE</Text>
              {(() => {
                const modesDispos = (selectedPetsitterMap?.modes ?? []).filter(m => SERVICE_MAP[m]);
                // Déduplique nuitee/pension (même service, deux IDs possibles selon ancienneté du profil)
                const seenLabels = new Set();
                const liste = (modesDispos.length > 0 ? modesDispos : Object.keys(SERVICE_MAP))
                  .filter(m => { const l = SERVICE_MAP[m].label; return seenLabels.has(l) ? false : (seenLabels.add(l), true); });
                return (
                  <View style={styles.serviceRow}>
                    {liste.map(svcId => {
                      const svc    = SERVICE_MAP[svcId];
                      const tarif  = getTarifService(selectedPetsitterMap, svcId);
                      const sel    = servicePrivee === svcId;
                      return (
                        <TouchableOpacity
                          key={svcId}
                          style={[styles.serviceChip, sel && styles.serviceChipSel]}
                          onPress={() => setServicePrivee(prev => prev === svcId ? null : svcId)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.serviceChipText, sel && styles.serviceChipTextSel]}>
                            {svc.icon} {svc.label}
                          </Text>
                          {tarif != null && (
                            <Text style={[styles.serviceChipTarif, sel && styles.serviceChipTarifSel]}>
                              {tarif} €{svc.unit}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })()}

              {/* Sélection des animaux */}
              {mesAnimaux.length > 0 && (
                <View style={[styles.animalPickerBox, { marginTop: 12 }]}>
                  <Text style={styles.animalPickerLabel}>ANIMAL(AUX) À CONFIER</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {mesAnimaux.map(a => {
                      const sel = animauxPrivee.some(x => x.id === a.id);
                      const emoji = ANIMAL_TYPE_EMOJI[a.type?.toLowerCase()] ?? '🐾';
                      return (
                        <TouchableOpacity
                          key={a.id}
                          style={[styles.animalChip, sel && styles.animalChipSel]}
                          onPress={() => setAnimauxPrivee(prev =>
                            sel ? prev.filter(x => x.id !== a.id) : [...prev, a]
                          )}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.animalChipText, sel && styles.animalChipTextSel]}>
                            {emoji} {a.nom}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <DatePicker label="DATE DE DÉBUT" date={debutPrivee} onSelect={setDebutPrivee} />
              <DatePicker label="DATE DE FIN" date={finPrivee} onSelect={d => {
                if (debutPrivee && d < debutPrivee) {
                  Alert.alert('Date invalide', 'La fin doit être après le début.');
                  return;
                }
                setFinPrivee(d);
              }} />

              {debutPrivee && finPrivee && (
                <View style={styles.resumeBox}>
                  {(() => {
                    const nb     = Math.ceil((finPrivee - debutPrivee) / (1000 * 60 * 60 * 24)) + 1;
                    const tarif  = servicePrivee ? getTarifService(selectedPetsitterMap, servicePrivee) : selectedPetsitterMap?.tarif;
                    const unit   = servicePrivee ? (SERVICE_MAP[servicePrivee]?.unit ?? '/jour') : '/jour';
                    const total  = tarif != null ? nb * tarif : null;
                    return (
                      <Text style={styles.resumeText}>
                        {nb} jour{nb > 1 ? 's' : ''}
                        {tarif != null ? ` · ${tarif} €${unit} · ~${total} € estimés` : ''}
                      </Text>
                    );
                  })()}
                </View>
              )}

              <Text style={styles.msgLabel}>MESSAGE (optionnel)</Text>
              <TextInput
                style={styles.msgInput}
                placeholder="Présentez votre animal, ses habitudes, vos attentes…"
                placeholderTextColor={COLORS.border}
                value={messagePrivee}
                onChangeText={setMessagePrivee}
                multiline
                maxLength={300}
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.envoyerBtn, (!debutPrivee || !finPrivee || sendingPrivee) && { opacity: 0.5 }]}
              onPress={handleEnvoyerDemandePrivee}
              disabled={!debutPrivee || !finPrivee || sendingPrivee}
              activeOpacity={0.8}
            >
              <Text style={styles.envoyerText}>
                {sendingPrivee ? 'Envoi…' : '📤 Envoyer la demande'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setShowDemandePrivee(false); setDebutPrivee(null); setFinPrivee(null); setAnimauxPrivee([]); setServicePrivee(null); setMessagePrivee(''); }}
              style={styles.annulerBtn}
            >
              <Text style={styles.annulerText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.sand, alignItems: 'center' },

  topBar:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  topCount:  { fontSize: 14, ...FONTS.bold, color: COLORS.ink },
  topStats:  { flexDirection: 'row', gap: 12 },
  topStat:   { fontSize: 14, ...FONTS.bold, color: COLORS.clay },

  card: {
    width: SCREEN_WIDTH - 32, borderRadius: RADIUS.xl,
    position: 'absolute', top: 60,
    ...SHADOW.card, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
    overflow: 'hidden',
  },
  cardBehind: {
    top: 68, transform: [{ scale: 0.96 }],
    alignItems: 'center', justifyContent: 'center',
    height: SCREEN_HEIGHT * 0.56, opacity: 0.7,
  },
  behindNom: { fontSize: 18, ...FONTS.bold, color: COLORS.ink, opacity: 0.4 },

  // ── Demande ouverte ──────────────────────────────────────────────
  ouverteBubble:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A2756', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  ouverteBubbleText: { fontSize: 16 },
  ouverteBandeauScroll: { width: '100%', maxHeight: 44, flexShrink: 0 },
  ouvertePill:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6, gap: 8, borderWidth: 1, borderColor: '#C7D2FE' },
  ouvertePillText:   { fontSize: 12, ...FONTS.bold, color: '#1E3A8A' },
  ouvertePillClose:  { fontSize: 13, color: '#6B7280', ...FONTS.bold },
  ouverteCta:        { backgroundColor: '#1A2756', borderRadius: RADIUS.md, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  ouverteCtaText:    { fontSize: 15, ...FONTS.heavy, color: COLORS.white },
  finSep:            { width: '70%', height: 1, backgroundColor: COLORS.border, marginVertical: 20 },
  finSepLabel:       { fontSize: 13, color: COLORS.muted, marginBottom: 12 },

  matchZone:   { position: 'absolute', top: 190, right: 14, zIndex: 20, alignItems: 'flex-end' },
  matchBadge:  { flexDirection: 'column', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.md, borderWidth: 1.5 },
  matchPct:    { fontSize: 15, ...FONTS.heavy, lineHeight: 18 },
  matchLabel:  { fontSize: 9, ...FONTS.bold, letterSpacing: 0.5, textTransform: 'uppercase' },

  matchDetail: {
    marginTop: 6, backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: RADIUS.md, borderWidth: 1.5, padding: 10, width: 200,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  matchRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  matchRowIcon:  { fontSize: 13, width: 18 },
  matchRowMid:   { flex: 1, marginHorizontal: 6 },
  matchRowLabel: { fontSize: 10, ...FONTS.bold, color: COLORS.ink, marginBottom: 3 },
  matchBar:      { height: 5, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  matchFill:     { height: 5, borderRadius: 3 },
  matchRowPts:   { fontSize: 10, ...FONTS.heavy, width: 28, textAlign: 'right' },

  overlay:         { position: 'absolute', top: 20, zIndex: 10, paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.sm, borderWidth: 3 },
  overlayNope:     { left: 20, borderColor: COLORS.clay, backgroundColor: 'rgba(255,255,255,0.85)' },
  overlayLike:     { right: 14, borderColor: COLORS.moss, backgroundColor: 'rgba(255,255,255,0.85)' },
  overlayTextNope: { fontSize: 22, ...FONTS.heavy, color: COLORS.clay, letterSpacing: 2 },
  overlayTextLike: { fontSize: 22, ...FONTS.heavy, color: COLORS.moss, letterSpacing: 2 },

  avatarZone: { alignItems: 'center', paddingTop: 32, paddingBottom: 16, backgroundColor: 'rgba(255,255,255,0.3)' },
  noteRow:    { marginTop: 10 },
  noteText:   { fontSize: 13, ...FONTS.bold, color: COLORS.ink },

  infos:    { padding: 20 },
  nameRow:  { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 4 },
  nom:      { fontSize: 22, ...FONTS.heavy, color: COLORS.ink },
  age:      { fontSize: 16, color: COLORS.muted },
  ville:    { fontSize: 13, color: COLORS.muted, marginBottom: 2 },
  tarif:    { fontSize: 13, ...FONTS.bold, color: COLORS.bark, marginBottom: 12 },
  bio:      { fontSize: 14, color: COLORS.ink, lineHeight: 20, marginBottom: 14 },

  animauxRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  animauxPill: { backgroundColor: COLORS.warm, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  animauxText: { fontSize: 12, ...FONTS.medium, color: COLORS.bark },

  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge:     { backgroundColor: COLORS.okBg, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.okBorder },
  badgeText: { fontSize: 11, ...FONTS.medium, color: COLORS.moss },

  btns:    { position: 'absolute', bottom: 24, flexDirection: 'row', gap: 40 },
  btn:     { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', ...SHADOW.card },
  btnNope: { backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.clay },
  btnLike: { backgroundColor: COLORS.moss },
  btnNopeText: { fontSize: 26, color: COLORS.clay },
  btnLikeText: { fontSize: 28 },

  fin:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  finTitre:  { fontSize: 22, ...FONTS.heavy, color: COLORS.ink, marginTop: 16 },
  finSub:    { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  resetBtn:  { marginTop: 28, backgroundColor: COLORS.bark, borderRadius: RADIUS.md, padding: 14, paddingHorizontal: 28 },
  resetText: { fontSize: 15, ...FONTS.bold, color: COLORS.white },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:     { backgroundColor: COLORS.cream, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 24, maxHeight: SCREEN_HEIGHT * 0.75 },
  modalTitre:   { fontSize: 20, ...FONTS.heavy, color: COLORS.ink, marginBottom: 4 },
  modalSub:     { fontSize: 14, color: COLORS.muted, marginBottom: 24 },

  msgLabel: { fontSize: 12, ...FONTS.bold, color: COLORS.muted, marginBottom: 6, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  msgInput: {
    backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 12, fontSize: 14, color: COLORS.ink,
    minHeight: 70, textAlignVertical: 'top', marginBottom: 14,
  },

  resumeBox:  { backgroundColor: COLORS.okBg, borderRadius: RADIUS.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.okBorder },
  resumeText: { fontSize: 14, ...FONTS.bold, color: COLORS.moss, textAlign: 'center' },

  envoyerBtn:  { backgroundColor: COLORS.moss, borderRadius: RADIUS.md, padding: 16, alignItems: 'center', marginTop: 16 },
  envoyerText: { fontSize: 16, ...FONTS.heavy, color: COLORS.white },
  annulerBtn:  { padding: 14, alignItems: 'center', marginTop: 4 },
  annulerText: { fontSize: 14, color: COLORS.muted, ...FONTS.medium },

  filterBubble:     { backgroundColor: COLORS.white, borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.border, ...SHADOW.card, shadowOpacity: 0.1, elevation: 2 },
  filterIcon:       { fontSize: 18, color: COLORS.ink },
  filterBadge:      { position: 'absolute', top: -4, right: -4, backgroundColor: COLORS.bark, borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText:  { fontSize: 10, ...FONTS.heavy, color: COLORS.white },
  filterBar:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.warm, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8, marginHorizontal: 16, marginBottom: 4, borderWidth: 1, borderColor: COLORS.bark },
  filterBarText:    { fontSize: 13, ...FONTS.bold, color: COLORS.bark },
  filterBarReset:   { fontSize: 12, color: COLORS.clay, ...FONTS.medium },
  mapBubble:        { backgroundColor: COLORS.bark, borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', ...SHADOW.card, shadowOpacity: 0.2, elevation: 4 },
  mapBubbleIcon:  { width: 22, height: 22, resizeMode: 'contain' },

  dispoRow:       { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 10 },
  dispoLabel:     { fontSize: 13, color: COLORS.muted },
  dispoPill:      { backgroundColor: COLORS.okBg, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: COLORS.okBorder },
  dispoText:      { fontSize: 11, ...FONTS.medium, color: COLORS.moss, textTransform: 'capitalize' },
  dispoVide:      { fontSize: 12, color: COLORS.muted, marginBottom: 10, fontStyle: 'italic' },
  dispoInfoBox:   { backgroundColor: COLORS.okBg, borderRadius: RADIUS.md, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: COLORS.okBorder },
  dispoInfoLabel: { fontSize: 12, ...FONTS.bold, color: COLORS.moss, marginBottom: 6 },
  dispoChip:      { backgroundColor: COLORS.white, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.okBorder },
  dispoChipText:  { fontSize: 12, ...FONTS.medium, color: COLORS.moss, textTransform: 'capitalize' },

  modalMatchBox:    { marginBottom: 16 },
  modalMatchBadge:  { borderWidth: 1.5, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 6 },
  modalMatchPct:    { fontSize: 14, ...FONTS.heavy },
  modalMatchBlocage:{ fontSize: 13, color: COLORS.clay, marginTop: 2 },

  animalPickerBox:      { marginBottom: 16 },
  animalPickerLabel:    { fontSize: 11, ...FONTS.bold, color: COLORS.muted, letterSpacing: 0.8, marginBottom: 8 },
  animalChip:           { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.white },
  animalChipSel:        { backgroundColor: COLORS.bark, borderColor: COLORS.bark },
  animalChipText:       { fontSize: 13, ...FONTS.medium, color: COLORS.ink },
  animalChipTextSel:    { color: COLORS.white },

  mapModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.ink, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14 },
  mapModalTitle:  { fontSize: 16, ...FONTS.heavy, color: COLORS.white },
  mapModalClose:  { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 6 },
  mapModalCloseText: { fontSize: 14, ...FONTS.bold, color: COLORS.white },

  servicesRow:         { flexDirection: 'column', gap: 6, marginTop: 8, marginBottom: 10 },
  servicePill:         { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.warm, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: COLORS.bark + '40' },
  servicePillText:     { fontSize: 12, ...FONTS.medium, color: COLORS.ink },

  serviceRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  serviceChip:         { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.white, alignItems: 'center' },
  serviceChipSel:      { backgroundColor: '#1A2756', borderColor: '#1A2756' },
  serviceChipText:     { fontSize: 13, ...FONTS.medium, color: COLORS.ink },
  serviceChipTextSel:  { color: COLORS.white },
  serviceChipTarif:    { fontSize: 12, ...FONTS.bold, color: COLORS.bark, marginTop: 2 },
  serviceChipTarifSel: { color: 'rgba(255,255,255,0.85)' },
});
