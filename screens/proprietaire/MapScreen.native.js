// screens/proprietaire/MapScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Dimensions, FlatList,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../lib/theme';

const { width: W, height: H } = Dimensions.get('window');
const MAP_HEIGHT = H * 0.44;

const DOG_ICON = require('../../assets/dog-icon.png');
const CAT_ICON = require('../../assets/cat-icon.png');

// ── Haversine distance (km) ───────────────────────────────────────
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── Mock petsitters (positions autour de Paris) ───────────────────
// En production : requête Supabase avec ST_DWithin
const BASE = { lat: 48.8566, lon: 2.3522 };
const MOCK_PETSITTERS = [
  {
    id: 'p1', nom: 'Marie L.',   initiales: 'ML',
    specialites: ['chien', 'chat'], tarif: 12, note: 4.9, avis: 47,
    dispo: 'now', modes: ['promenade', 'gardeJour'],
    lat: BASE.lat + 0.005, lon: BASE.lon + 0.008,
  },
  {
    id: 'p2', nom: 'Thomas R.',  initiales: 'TR',
    specialites: ['chien'], tarif: 10, note: 4.7, avis: 23,
    dispo: 'week', modes: ['promenade'],
    lat: BASE.lat - 0.010, lon: BASE.lon - 0.012,
  },
  {
    id: 'p3', nom: 'Camille B.', initiales: 'CB',
    specialites: ['chien', 'chat'], tarif: 15, note: 5.0, avis: 68,
    dispo: 'now', modes: ['pension', 'gardeJour'],
    lat: BASE.lat + 0.018, lon: BASE.lon + 0.021,
  },
  {
    id: 'p4', nom: 'Lucas M.',   initiales: 'LM',
    specialites: ['chat'], tarif: 9, note: 4.5, avis: 12,
    dispo: 'month', modes: ['gardeJour'],
    lat: BASE.lat - 0.022, lon: BASE.lon + 0.015,
  },
  {
    id: 'p5', nom: 'Anaïs V.',   initiales: 'AV',
    specialites: ['chien', 'chat'], tarif: 14, note: 4.8, avis: 91,
    dispo: 'now', modes: ['pension', 'promenade', 'gardeJour'],
    lat: BASE.lat + 0.030, lon: BASE.lon - 0.020,
  },
  {
    id: 'p6', nom: 'Kevin D.',   initiales: 'KD',
    specialites: ['chien'], tarif: 11, note: 4.6, avis: 34,
    dispo: 'week', modes: ['promenade'],
    lat: BASE.lat - 0.038, lon: BASE.lon + 0.028,
  },
  {
    id: 'p7', nom: 'Sophie N.',  initiales: 'SN',
    specialites: ['chat'], tarif: 13, note: 4.9, avis: 55,
    dispo: 'now', modes: ['gardeJour', 'pension'],
    lat: BASE.lat + 0.058, lon: BASE.lon - 0.044,
  },
  {
    id: 'p8', nom: 'Julien P.',  initiales: 'JP',
    specialites: ['chien', 'chat'], tarif: 16, note: 4.7, avis: 29,
    dispo: 'week', modes: ['pension'],
    lat: BASE.lat - 0.085, lon: BASE.lon + 0.063,
  },
];

const DISPO_COLOR = { now: '#22C55E', week: '#F59E0B', month: '#94A3B8' };
const DISPO_BG    = { now: '#F0FDF4', week: '#FFFBEB', month: '#F8FAFC' };

// ── Composant marker personnalisé ─────────────────────────────────
const PetsitterMarker = ({ petsitter, selected }) => (
  <View style={styles.markerRoot}>
    <View style={[
      styles.markerBubble,
      { borderColor: DISPO_COLOR[petsitter.dispo] },
      selected && styles.markerBubbleSelected,
    ]}>
      <Text style={styles.markerPrice}>€{petsitter.tarif}</Text>
      <Text style={styles.markerNote}>⭐ {petsitter.note}</Text>
    </View>
    <View style={[styles.markerTail, { borderTopColor: DISPO_COLOR[petsitter.dispo] }]} />
  </View>
);

// ── Chip de filtre ────────────────────────────────────────────────
const FilterChip = ({ label, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.chip, active && styles.chipActive]}
    activeOpacity={0.75}
  >
    <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

export default function MapScreen() {
  const [location,    setLocation]    = useState(null);
  const [loadingGps,  setLoadingGps]  = useState(true);
  const [selected,    setSelected]    = useState(null);
  const mapRef  = useRef(null);
  const flatRef = useRef(null);

  // ── Filtres ──
  const [filtreKm,    setFiltreKm]    = useState(10);
  const [filtreDispo, setFiltreDispo] = useState('all');
  const [filtreType,  setFiltreType]  = useState('all');
  const [filtreMode,  setFiltreMode]  = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
        } else {
          setLocation(BASE);
        }
      } catch {
        setLocation(BASE);
      } finally {
        setLoadingGps(false);
      }
    })();
  }, []);

  const center = location ?? BASE;

  // ── Calcul distance + filtrage ──
  const withDist = MOCK_PETSITTERS.map(p => ({
    ...p,
    distance: haversine(center.lat, center.lon, p.lat, p.lon),
  }));

  const filtered = withDist.filter(p => {
    if (p.distance > filtreKm) return false;
    if (filtreDispo === 'now'  && p.dispo !== 'now')                         return false;
    if (filtreDispo === 'week' && p.dispo !== 'now' && p.dispo !== 'week')   return false;
    if (filtreType === 'chien' && !p.specialites.includes('chien'))          return false;
    if (filtreType === 'chat'  && !p.specialites.includes('chat'))           return false;
    if (filtreMode && !p.modes.includes(filtreMode))                          return false;
    return true;
  });

  const handleMarkerPress = (p) => {
    setSelected(p.id);
    const idx = filtered.findIndex(x => x.id === p.id);
    if (idx >= 0) {
      flatRef.current?.scrollToIndex({ index: idx, animated: true, viewOffset: 16 });
    }
    mapRef.current?.animateToRegion({
      latitude:      p.lat,
      longitude:     p.lon,
      latitudeDelta:  0.04,
      longitudeDelta: 0.04,
    }, 400);
  };

  const handleCardPress = (p) => {
    setSelected(p.id);
    mapRef.current?.animateToRegion({
      latitude:      p.lat,
      longitude:     p.lon,
      latitudeDelta:  0.03,
      longitudeDelta: 0.03,
    }, 400);
  };

  if (loadingGps) return (
    <View style={styles.loadingWrap}>
      <ActivityIndicator size="large" color={COLORS.bark} />
      <Text style={styles.loadingText}>Localisation en cours…</Text>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* ══════════════════════════════
          FILTRES
      ══════════════════════════════ */}
      <View style={styles.filtersWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {/* Distance */}
          <Text style={styles.filterLabel}>📍</Text>
          {[2, 5, 10, 20].map(km => (
            <FilterChip
              key={km}
              label={`${km} km`}
              active={filtreKm === km}
              onPress={() => setFiltreKm(km)}
            />
          ))}

          <View style={styles.sep} />

          {/* Disponibilité */}
          <Text style={styles.filterLabel}>⏰</Text>
          {[
            { id: 'all',  label: 'Tous'           },
            { id: 'now',  label: '⚡ Maintenant'  },
            { id: 'week', label: '📅 Cette semaine' },
          ].map(d => (
            <FilterChip
              key={d.id}
              label={d.label}
              active={filtreDispo === d.id}
              onPress={() => setFiltreDispo(d.id)}
            />
          ))}

          <View style={styles.sep} />

          {/* Animal */}
          {[
            { id: 'all',   label: '🐾 Tous'  },
            { id: 'chien', label: '🐶 Chien' },
            { id: 'chat',  label: '🐱 Chat'  },
          ].map(t => (
            <FilterChip
              key={t.id}
              label={t.label}
              active={filtreType === t.id}
              onPress={() => setFiltreType(t.id)}
            />
          ))}

          <View style={styles.sep} />

          {/* Mode */}
          {[
            { id: null,        label: 'Tous modes'    },
            { id: 'promenade', label: '🚶 Promenade' },
            { id: 'pension',   label: '🏨 Pension'   },
            { id: 'gardeJour', label: '☀️ Garde jour' },
          ].map(m => (
            <FilterChip
              key={String(m.id)}
              label={m.label}
              active={filtreMode === m.id}
              onPress={() => setFiltreMode(m.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* ══════════════════════════════
          MAP
      ══════════════════════════════ */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude:      center.lat,
          longitude:     center.lon,
          latitudeDelta:  0.10,
          longitudeDelta: 0.10,
        }}
        showsUserLocation
        showsCompass={false}
        showsMyLocationButton={false}
      >
        {/* Cercle rayon */}
        <Circle
          center={{ latitude: center.lat, longitude: center.lon }}
          radius={filtreKm * 1000}
          fillColor="rgba(14,165,233,0.05)"
          strokeColor="rgba(14,165,233,0.35)"
          strokeWidth={1.5}
        />

        {/* Markers */}
        {filtered.map(p => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lon }}
            onPress={() => handleMarkerPress(p)}
            tracksViewChanges={false}
          >
            <PetsitterMarker petsitter={p} selected={selected === p.id} />
          </Marker>
        ))}
      </MapView>

      {/* ══════════════════════════════
          RÉSULTATS + LÉGENDE
      ══════════════════════════════ */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsCount}>
          {filtered.length} petsitter{filtered.length !== 1 ? 's' : ''} dans {filtreKm} km
        </Text>
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
          <Text style={styles.legendTxt}>Dispo</Text>
          <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
          <Text style={styles.legendTxt}>Cette sem.</Text>
          <View style={[styles.legendDot, { backgroundColor: '#94A3B8' }]} />
          <Text style={styles.legendTxt}>+tard</Text>
        </View>
      </View>

      {/* ══════════════════════════════
          LISTE HORIZONTALE
      ══════════════════════════════ */}
      {filtered.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Aucun petsitter dans cette zone</Text>
          <Text style={styles.emptySub}>Essaie d'agrandir le rayon ou de modifier les filtres</Text>
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => {
              setFiltreKm(10); setFiltreDispo('all');
              setFiltreType('all'); setFiltreMode(null);
            }}
          >
            <Text style={styles.resetText}>Réinitialiser les filtres</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={filtered}
          keyExtractor={p => p.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardList}
          onScrollToIndexFailed={() => {}}
          renderItem={({ item: p }) => (
            <TouchableOpacity
              style={[styles.card, selected === p.id && styles.cardSelected]}
              onPress={() => handleCardPress(p)}
              activeOpacity={0.88}
            >
              {/* ── Top: avatar + nom + dispo ── */}
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { borderColor: DISPO_COLOR[p.dispo] }]}>
                  <Text style={styles.avatarText}>{p.initiales}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardNom}>{p.nom}</Text>
                  <Text style={styles.cardNote}>⭐ {p.note} · {p.avis} avis</Text>
                </View>
                <View style={[styles.dispoTag, {
                  backgroundColor: DISPO_BG[p.dispo],
                  borderColor: DISPO_COLOR[p.dispo],
                }]}>
                  <Text style={[styles.dispoText, { color: DISPO_COLOR[p.dispo] }]}>
                    {p.dispo === 'now' ? '⚡ Dispo' : p.dispo === 'week' ? '📅 Sem.' : '🗓 Mois'}
                  </Text>
                </View>
              </View>

              {/* ── Spécialités + distance ── */}
              <View style={styles.midRow}>
                <View style={styles.specRow}>
                  {p.specialites.includes('chien') && (
                    <Image source={DOG_ICON} style={styles.specIcon} />
                  )}
                  {p.specialites.includes('chat') && (
                    <Image source={CAT_ICON} style={styles.specIcon} />
                  )}
                </View>
                <Text style={styles.distText}>
                  📍 {p.distance < 1
                    ? `${Math.round(p.distance * 1000)} m`
                    : `${p.distance.toFixed(1)} km`}
                </Text>
              </View>

              {/* ── Modes de garde ── */}
              <View style={styles.modesRow}>
                {p.modes.map(m => (
                  <View key={m} style={styles.modeTag}>
                    <Text style={styles.modeIcon}>
                      {m === 'promenade' ? '🚶' : m === 'pension' ? '🏨' : '☀️'}
                    </Text>
                    <Text style={styles.modeTxt}>
                      {m === 'promenade' ? 'Promenade' : m === 'pension' ? 'Pension' : 'Garde jour'}
                    </Text>
                  </View>
                ))}
              </View>

              {/* ── Prix + CTA ── */}
              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.prixLabel}>À partir de</Text>
                  <Text style={styles.prix}>
                    €{p.tarif}
                    <Text style={styles.prixUnit}>/h</Text>
                  </Text>
                </View>
                <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.8}>
                  <Text style={styles.ctaText}>Contacter →</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.sand },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { fontSize: 14, color: COLORS.muted, ...FONTS.medium },

  // ── Filtres ──
  filtersWrap: {
    backgroundColor: COLORS.cream,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingVertical: 10,
  },
  filtersRow:      { paddingHorizontal: 14, gap: 8, alignItems: 'center' },
  filterLabel:     { fontSize: 16 },
  sep:             { width: 1, height: 22, backgroundColor: COLORS.border, marginHorizontal: 2 },
  chip:            { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white },
  chipActive:      { backgroundColor: COLORS.bark, borderColor: COLORS.bark },
  chipText:        { fontSize: 12, ...FONTS.bold, color: COLORS.muted },
  chipTextActive:  { color: COLORS.white },

  // ── Map ──
  map: { width: W, height: MAP_HEIGHT },

  markerRoot:   { alignItems: 'center' },
  markerBubble: {
    backgroundColor: COLORS.white, borderWidth: 2.5,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
    alignItems: 'center', minWidth: 54,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  markerBubbleSelected: { transform: [{ scale: 1.18 }], borderWidth: 3 },
  markerPrice: { fontSize: 13, ...FONTS.heavy, color: COLORS.ink },
  markerNote:  { fontSize: 10, color: COLORS.muted },
  markerTail:  {
    width: 0, height: 0, alignSelf: 'center',
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
  },

  // ── Résultats bar ──
  resultsBar:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.cream, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  resultsCount: { fontSize: 13, ...FONTS.heavy, color: COLORS.ink },
  legend:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:    { width: 8, height: 8, borderRadius: 4 },
  legendTxt:    { fontSize: 10, color: COLORS.muted, marginRight: 4 },

  // ── Empty ──
  emptyWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon:  { fontSize: 42, marginBottom: 14 },
  emptyTitle: { fontSize: 16, ...FONTS.heavy, color: COLORS.ink, marginBottom: 6, textAlign: 'center' },
  emptySub:   { fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  resetBtn:   { backgroundColor: COLORS.bark, borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 10 },
  resetText:  { fontSize: 13, ...FONTS.bold, color: COLORS.white },

  // ── Cards ──
  cardList: { paddingHorizontal: 16, paddingVertical: 12, gap: 12, alignItems: 'flex-start' },
  card: {
    backgroundColor: COLORS.cream, borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.border,
    padding: 14, width: 230,
    ...SHADOW.card,
  },
  cardSelected: { borderColor: COLORS.bark, backgroundColor: '#EFF9FF' },

  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar:     { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.clay, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5 },
  avatarText: { fontSize: 14, ...FONTS.heavy, color: COLORS.white },
  cardNom:    { fontSize: 14, ...FONTS.heavy, color: COLORS.ink },
  cardNote:   { fontSize: 11, color: COLORS.muted, marginTop: 1 },

  dispoTag:  { borderWidth: 1.5, borderRadius: RADIUS.full, paddingHorizontal: 7, paddingVertical: 3 },
  dispoText: { fontSize: 10, ...FONTS.heavy },

  midRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  specRow:  { flexDirection: 'row', gap: 6 },
  specIcon: { width: 22, height: 22 },
  distText: { fontSize: 11, color: COLORS.muted, ...FONTS.medium },

  modesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  modeTag:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.sand, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4 },
  modeIcon: { fontSize: 12 },
  modeTxt:  { fontSize: 11, color: COLORS.muted, ...FONTS.medium },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  prixLabel:  { fontSize: 10, color: COLORS.muted },
  prix:       { fontSize: 20, ...FONTS.heavy, color: COLORS.bark },
  prixUnit:   { fontSize: 12, color: COLORS.muted },
  ctaBtn:     { backgroundColor: COLORS.bark, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 9 },
  ctaText:    { fontSize: 12, ...FONTS.heavy, color: COLORS.white },
});
