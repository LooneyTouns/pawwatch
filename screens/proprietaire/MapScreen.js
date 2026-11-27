// screens/proprietaire/MapScreen.js — version web (pas de react-native-maps)
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image, TextInput,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../lib/theme';
import { getPawsitters } from '../../lib/supabase';

const DOG_ICON = require('../../assets/dog-icon.png');
const CAT_ICON = require('../../assets/cat-icon.png');

const DISPO_COLOR = { now: '#22C55E', week: '#F59E0B', month: '#94A3B8' };
const DISPO_BG    = { now: '#F0FDF4', week: '#FFFBEB', month: '#F8FAFC' };
const DISPO_MAP   = { 'Disponible maintenant': 'now', 'Ce week-end': 'week', 'Semaine prochaine': 'month', 'Flexible': 'week' };

const FilterChip = ({ label, active, onPress }) => (
  <TouchableOpacity onPress={onPress} style={[s.chip, active && s.chipActive]} activeOpacity={0.75}>
    <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

export default function MapScreen() {
  const [pawsitters,  setPawsitters]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [search,      setSearch]      = useState('');
  const [filtreDispo, setFiltreDispo] = useState('all');
  const [filtreType,  setFiltreType]  = useState('all');
  const [filtreMode,  setFiltreMode]  = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    getPawsitters()
      .then(data => setPawsitters(data.map(p => ({ ...p, dispo: DISPO_MAP[p.dispo] ?? 'week' }))))
      .catch(() => setError('Impossible de charger les pawsitters. Vérifie ta connexion.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = pawsitters.filter(p => {
    if (search && !p.nom?.toLowerCase().includes(search.toLowerCase()) && !p.ville?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filtreDispo === 'now'  && p.dispo !== 'now') return false;
    if (filtreDispo === 'week' && p.dispo !== 'now' && p.dispo !== 'week') return false;
    if (filtreType === 'chien' && !p.specialites?.includes('chien')) return false;
    if (filtreType === 'chat'  && !p.specialites?.includes('chat'))  return false;
    if (filtreMode && !p.modes?.includes(filtreMode)) return false;
    return true;
  });

  return (
    <View style={s.root}>

      {/* Barre de recherche */}
      <View style={s.searchBar}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="Rechercher par nom ou ville…"
          placeholderTextColor={COLORS.border}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={s.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtres */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
        <Text style={s.filterLabel}>⏰</Text>
        {[
          { id: 'all',  label: 'Tous'            },
          { id: 'now',  label: '⚡ Maintenant'   },
          { id: 'week', label: '📅 Cette semaine' },
        ].map(d => (
          <FilterChip key={d.id} label={d.label} active={filtreDispo === d.id} onPress={() => setFiltreDispo(d.id)} />
        ))}
        <View style={s.sep} />
        <Text style={s.filterLabel}>🐾</Text>
        {[
          { id: 'all',   label: 'Tous'   },
          { id: 'chien', label: '🐶 Chien' },
          { id: 'chat',  label: '🐱 Chat'  },
        ].map(t => (
          <FilterChip key={t.id} label={t.label} active={filtreType === t.id} onPress={() => setFiltreType(t.id)} />
        ))}
        <View style={s.sep} />
        {[
          { id: null,        label: 'Tous modes'     },
          { id: 'promenade', label: '🚶 Promenade'  },
          { id: 'pension',   label: '🏨 Pension'    },
          { id: 'garde_domicile', label: '☀️ Garde jour' },
        ].map(m => (
          <FilterChip key={String(m.id)} label={m.label} active={filtreMode === m.id} onPress={() => setFiltreMode(m.id)} />
        ))}
      </ScrollView>

      {/* Contenu */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={COLORS.bark} />
          <Text style={s.loadingText}>Chargement des pawsitters…</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <Text style={{ fontSize: 40, marginBottom: 14 }}>📡</Text>
          <Text style={s.errorTitle}>Erreur de chargement</Text>
          <Text style={s.errorSub}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={load}>
            <Text style={s.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          <Text style={s.count}>
            {filtered.length} pawsitter{filtered.length !== 1 ? 's' : ''}
            {(filtreDispo !== 'all' || filtreType !== 'all' || filtreMode || search) ? ' (filtrés)' : ''}
          </Text>

          {filtered.length === 0 && (
            <View style={s.emptyWrap}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
              <Text style={s.emptyTitle}>Aucun pawsitter trouvé</Text>
              <Text style={s.emptySub}>Essaie de modifier tes filtres</Text>
              <TouchableOpacity style={s.resetBtn} onPress={() => {
                setSearch(''); setFiltreDispo('all'); setFiltreType('all'); setFiltreMode(null);
              }}>
                <Text style={s.resetText}>Réinitialiser les filtres</Text>
              </TouchableOpacity>
            </View>
          )}

          {filtered.map(p => (
            <View key={p.id} style={s.card}>
              {/* Header */}
              <View style={s.cardTop}>
                <View style={[s.avatar, { borderColor: DISPO_COLOR[p.dispo] ?? COLORS.border }]}>
                  {p.photo_url
                    ? <Image source={{ uri: p.photo_url }} style={s.avatarImg} />
                    : <Text style={s.avatarText}>{(p.nom ?? '?')[0].toUpperCase()}</Text>
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardNom}>{p.nom}</Text>
                  <Text style={s.cardMeta}>
                    {p.note ? `⭐ ${p.note} · ${p.nb_avis ?? 0} avis` : 'Nouveau pawsitter'}
                    {p.ville ? `  ·  📍 ${p.ville}` : ''}
                  </Text>
                </View>
                <View style={[s.dispoTag, { backgroundColor: DISPO_BG[p.dispo] ?? COLORS.sand, borderColor: DISPO_COLOR[p.dispo] ?? COLORS.border }]}>
                  <Text style={[s.dispoText, { color: DISPO_COLOR[p.dispo] ?? COLORS.muted }]}>
                    {p.dispo === 'now' ? '⚡ Dispo' : p.dispo === 'week' ? '📅 Semaine' : '🗓 Flexible'}
                  </Text>
                </View>
              </View>

              {/* Spécialités */}
              <View style={s.specRow}>
                {p.specialites?.includes('chien') && <Image source={DOG_ICON} style={s.specIcon} />}
                {p.specialites?.includes('chat')  && <Image source={CAT_ICON} style={s.specIcon} />}
                {p.modes?.map(m => (
                  <View key={m} style={s.modeTag}>
                    <Text style={s.modeTxt}>
                      {m === 'promenade' ? '🚶 Promenade' : m === 'pension' ? '🏨 Pension' : m === 'garde_domicile' ? '☀️ Garde jour' : m}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Bio */}
              {p.bio ? <Text style={s.bio} numberOfLines={2}>{p.bio}</Text> : null}

              {/* Footer */}
              <View style={s.cardFooter}>
                <Text style={s.prix}>
                  {p.tarif ? `€${p.tarif}/j` : 'Tarif sur demande'}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.sand },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  searchIcon:  { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.ink, padding: 0 },
  searchClear: { fontSize: 14, color: COLORS.muted, padding: 4 },

  filterScroll:  { flexGrow: 0, backgroundColor: COLORS.cream, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterRow:     { paddingHorizontal: 14, paddingVertical: 10, gap: 8, alignItems: 'center' },
  filterLabel:   { fontSize: 16 },
  sep:           { width: 1, height: 22, backgroundColor: COLORS.border, marginHorizontal: 2 },
  chip:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white },
  chipActive:    { backgroundColor: COLORS.bark, borderColor: COLORS.bark },
  chipText:      { fontSize: 12, ...FONTS.bold, color: COLORS.muted },
  chipTextActive:{ color: COLORS.white },

  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { fontSize: 14, color: COLORS.muted, marginTop: 12, ...FONTS.medium },
  errorTitle:  { fontSize: 16, ...FONTS.heavy, color: COLORS.ink, marginBottom: 6, textAlign: 'center' },
  errorSub:    { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginBottom: 20, lineHeight: 19 },
  retryBtn:    { backgroundColor: COLORS.bark, borderRadius: RADIUS.md, paddingHorizontal: 24, paddingVertical: 12 },
  retryText:   { fontSize: 14, ...FONTS.bold, color: COLORS.white },

  list:      { padding: 16, paddingBottom: 40 },
  count:     { fontSize: 13, color: COLORS.muted, ...FONTS.medium, marginBottom: 12 },

  emptyWrap:  { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 16, ...FONTS.heavy, color: COLORS.ink, marginBottom: 6 },
  emptySub:   { fontSize: 13, color: COLORS.muted, marginBottom: 20 },
  resetBtn:   { backgroundColor: COLORS.bark, borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 10 },
  resetText:  { fontSize: 13, ...FONTS.bold, color: COLORS.white },

  card: {
    backgroundColor: COLORS.cream, borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.border,
    padding: 16, marginBottom: 12,
    ...SHADOW.card,
  },

  cardTop:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar:     { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, overflow: 'hidden' },
  avatarImg:  { width: 48, height: 48, borderRadius: 24 },
  avatarText: { fontSize: 18, ...FONTS.heavy, color: COLORS.white },
  cardNom:    { fontSize: 15, ...FONTS.heavy, color: COLORS.ink, marginBottom: 2 },
  cardMeta:   { fontSize: 12, color: COLORS.muted },

  dispoTag:   { borderWidth: 1.5, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 4 },
  dispoText:  { fontSize: 11, ...FONTS.heavy },

  specRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  specIcon: { width: 22, height: 22 },
  modeTag:  { backgroundColor: COLORS.sand, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4 },
  modeTxt:  { fontSize: 11, color: COLORS.muted, ...FONTS.medium },

  bio: { fontSize: 13, color: COLORS.ink, lineHeight: 18, marginBottom: 10 },

  cardFooter: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  prix:       { fontSize: 16, ...FONTS.heavy, color: COLORS.bark },
});
