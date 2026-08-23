// screens/proprietaire/SearchPetsitterScreen.js
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, PanResponder,
  TouchableOpacity, Modal, ScrollView, Alert, Dimensions, Image,
} from 'react-native';

const EARTH_ICON = require('../../assets/earth-icon.png');
import { COLORS, FONTS, RADIUS, SHADOW } from '../../lib/theme';
import { Avatar, Badge } from '../../components/UI';
import { creerGarde } from '../../lib/supabase';
import MapScreen from './MapScreen';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;

const MOCK_PETSITTERS = [
  {
    id: 'p1', nom: 'Emma Rousseau', initiales: 'ER', age: 24,
    ville: 'Paris 11e', note: 4.9, nb_avis: 38,
    bio: 'Passionnée d\'animaux depuis toujours 🐾 Je promène et garde avec amour. Grands espaces verts à proximité !',
    animaux: ['🐕 Chiens', '🐈 Chats'],
    tarif: 35, dispo: 'Ce week-end',
    badges: ['Vérifié ✓', 'Répond vite ⚡'],
    couleur: '#E8D5C4',
  },
  {
    id: 'p2', nom: 'Lucas Martin', initiales: 'LM', age: 31,
    ville: 'Paris 18e', note: 4.7, nb_avis: 21,
    bio: 'Vétérinaire en formation 🩺 Tes animaux sont entre de bonnes mains. Jardin privatif disponible.',
    animaux: ['🐕 Chiens', '🐇 Lapins', '🐹 Rongeurs'],
    tarif: 42, dispo: 'Flexible',
    badges: ['Formation vétérinaire 🩺'],
    couleur: '#D4E8D4',
  },
  {
    id: 'p3', nom: 'Sofia Benali', initiales: 'SB', age: 27,
    ville: 'Paris 9e', note: 5.0, nb_avis: 12,
    bio: 'Éducatrice canine certifiée 🎓 J\'adore les grands gabarits et les seniors. Câlins garantis !',
    animaux: ['🐕 Chiens'],
    tarif: 38, dispo: 'Semaine prochaine',
    badges: ['Éducatrice certifiée 🎓', 'Vérifié ✓'],
    couleur: '#D4DCE8',
  },
  {
    id: 'p4', nom: 'Antoine Dupont', initiales: 'AD', age: 35,
    ville: 'Paris 15e', note: 4.8, nb_avis: 55,
    bio: 'Télétravailleurs avec chien depuis 3 ans 🏠 Je peux garder à domicile chez toi ou chez moi. Super réactif !',
    animaux: ['🐕 Chiens', '🐈 Chats'],
    tarif: 30, dispo: 'Disponible maintenant',
    badges: ['Garde à domicile 🏠', 'Vérifié ✓'],
    couleur: '#E8E4D4',
  },
];

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

export default function SearchPetsitterScreen({ user, animal, onPropose, onMatch }) {
  const [index,       setIndex]       = useState(0);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [showMap,     setShowMap]     = useState(false);
  const [dateDebut,   setDateDebut]   = useState(null);
  const [dateFin,     setDateFin]     = useState(null);
  const [sending,     setSending]     = useState(false);
  const [swipedRight, setSwipedRight] = useState([]);
  const [swipedLeft,  setSwipedLeft]  = useState([]);

  const position = useRef(new Animated.ValueXY()).current;
  const swipeAnim = useRef(new Animated.Value(1)).current;

  const current = MOCK_PETSITTERS[index];

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
    setSending(true);
    const petsitter = MOCK_PETSITTERS[index - 1];
    try {
      await creerGarde({
        proprio_id:  user?.id,
        gardien_id:  petsitter?.id,
        date_debut:  dateDebut.toISOString().split('T')[0],
        date_fin:    dateFin.toISOString().split('T')[0],
        statut:      'en_attente',
      });
    } catch (e) {
      // mode démo : on continue même sans Supabase configuré
    } finally {
      setSending(false);
      setModalOpen(false);
      setDateDebut(null);
      setDateFin(null);
      if (onPropose) onPropose(petsitter);
      if (onMatch)   onMatch(MOCK_PETSITTERS[index - 1]);
      Alert.alert(
        '✨ Demande envoyée !',
        `${MOCK_PETSITTERS[index - 1]?.nom} a reçu ta proposition. Un message a été ouvert dans l'onglet Messages.`
      );
    }
  };

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH * 0.2],
    outputRange: [0, 1], extrapolate: 'clamp',
  });
  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH * 0.2, 0],
    outputRange: [1, 0], extrapolate: 'clamp',
  });

  if (index >= MOCK_PETSITTERS.length) {
    return (
      <View style={styles.fin}>
        <Text style={{ fontSize: 56 }}>🐾</Text>
        <Text style={styles.finTitre}>Plus de petsitters</Text>
        <Text style={styles.finSub}>Tu as vu tous les petsitters disponibles.</Text>
        <TouchableOpacity style={styles.resetBtn} onPress={() => { setIndex(0); setSwipedLeft([]); setSwipedRight([]); }}>
          <Text style={styles.resetText}>🔄 Recommencer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Compteur + bulle carte */}
      <View style={styles.topBar}>
        <Text style={styles.topCount}>{MOCK_PETSITTERS.length - index} petsitter{MOCK_PETSITTERS.length - index > 1 ? 's' : ''} près de toi</Text>
        <View style={styles.topStats}>
          <Text style={styles.topStat}>✗ {swipedLeft.length}</Text>
          <Text style={[styles.topStat, { color: COLORS.moss }]}>♥ {swipedRight.length}</Text>
          <TouchableOpacity style={styles.mapBubble} onPress={() => setShowMap(true)} activeOpacity={0.8}>
            <Image source={EARTH_ICON} style={styles.mapBubbleIcon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal carte */}
      <Modal visible={showMap} animationType="slide" onRequestClose={() => setShowMap(false)}>
        <View style={{ flex: 1 }}>
          <View style={styles.mapModalHeader}>
            <Text style={styles.mapModalTitle}>Petsitters à proximité</Text>
            <TouchableOpacity onPress={() => setShowMap(false)} style={styles.mapModalClose}>
              <Text style={styles.mapModalCloseText}>✕ Fermer</Text>
            </TouchableOpacity>
          </View>
          <MapScreen />
        </View>
      </Modal>

      {/* Carte suivante (fond) */}
      {MOCK_PETSITTERS[index + 1] && (
        <View style={[styles.card, styles.cardBehind, { backgroundColor: MOCK_PETSITTERS[index + 1].couleur }]}>
          <Text style={styles.behindNom}>{MOCK_PETSITTERS[index + 1].nom}</Text>
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
        {/* NOPE overlay */}
        <Animated.View style={[styles.overlay, styles.overlayNope, { opacity: nopeOpacity }]}>
          <Text style={styles.overlayTextNope}>NOPE</Text>
        </Animated.View>

        {/* LIKE overlay */}
        <Animated.View style={[styles.overlay, styles.overlayLike, { opacity: likeOpacity }]}>
          <Text style={styles.overlayTextLike}>GARDE !</Text>
        </Animated.View>

        {/* Avatar */}
        <View style={styles.avatarZone}>
          <Avatar initials={current.initiales} size={100} />
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
          <Text style={styles.ville}>📍 {current.ville}</Text>
          <Text style={styles.tarif}>💶 {current.tarif} €/jour · {current.dispo}</Text>

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

      {/* Modal proposition de date */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitre}>Proposer une garde</Text>
            <Text style={styles.modalSub}>
              à {MOCK_PETSITTERS[index - 1]?.nom} {MOCK_PETSITTERS[index - 1]?.initiales && `(${MOCK_PETSITTERS[index - 1].initiales})`}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <DatePicker label="DATE DE DÉBUT" date={dateDebut} onSelect={setDateDebut} />
              <DatePicker label="DATE DE FIN"   date={dateFin}   onSelect={d => {
                if (dateDebut && d < dateDebut) {
                  Alert.alert('Date invalide', 'La fin doit être après le début.');
                  return;
                }
                setDateFin(d);
              }} />

              {dateDebut && dateFin && (
                <View style={styles.resumeBox}>
                  <Text style={styles.resumeText}>
                    {Math.ceil((dateFin - dateDebut) / (1000 * 60 * 60 * 24) + 1)} jour{Math.ceil((dateFin - dateDebut) / (1000 * 60 * 60 * 24) + 1) > 1 ? 's' : ''} · {Math.ceil((dateFin - dateDebut) / (1000 * 60 * 60 * 24) + 1) * (MOCK_PETSITTERS[index - 1]?.tarif ?? 0)} € estimés
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

            <TouchableOpacity onPress={() => { setModalOpen(false); setDateDebut(null); setDateFin(null); }} style={styles.annulerBtn}>
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

  overlay:         { position: 'absolute', top: 30, zIndex: 10, paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.sm, borderWidth: 3 },
  overlayNope:     { left: 20, borderColor: COLORS.clay, backgroundColor: 'rgba(255,255,255,0.85)' },
  overlayLike:     { right: 20, borderColor: COLORS.moss, backgroundColor: 'rgba(255,255,255,0.85)' },
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

  resumeBox:  { backgroundColor: COLORS.okBg, borderRadius: RADIUS.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.okBorder },
  resumeText: { fontSize: 14, ...FONTS.bold, color: COLORS.moss, textAlign: 'center' },

  envoyerBtn:  { backgroundColor: COLORS.moss, borderRadius: RADIUS.md, padding: 16, alignItems: 'center', marginTop: 16 },
  envoyerText: { fontSize: 16, ...FONTS.heavy, color: COLORS.white },
  annulerBtn:  { padding: 14, alignItems: 'center', marginTop: 4 },
  annulerText: { fontSize: 14, color: COLORS.muted, ...FONTS.medium },

  mapBubble:      { backgroundColor: COLORS.bark, borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', ...SHADOW.card, shadowOpacity: 0.2, elevation: 4 },
  mapBubbleIcon:  { width: 22, height: 22, resizeMode: 'contain' },

  mapModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.ink, paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14 },
  mapModalTitle:  { fontSize: 16, ...FONTS.heavy, color: COLORS.white },
  mapModalClose:  { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 6 },
  mapModalCloseText: { fontSize: 14, ...FONTS.bold, color: COLORS.white },
});
