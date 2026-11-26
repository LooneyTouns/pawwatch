// screens/admin/AdminScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../lib/theme';
import { Card, SectionLabel, Badge } from '../../components/UI';
import { getAdminStats, getAdminGardes, getAdminUsers } from '../../lib/supabase';

const STATUT_COLOR = {
  en_attente: 'warn',
  en_cours:   'info',
  terminee:   'ok',
  refusee:    'error',
  acceptee:   'ok',
};
const STATUT_LABEL = {
  en_attente: '⏳ En attente',
  en_cours:   '▶ En cours',
  terminee:   '✓ Terminée',
  refusee:    '✗ Refusée',
  acceptee:   '✓ Acceptée',
};

function StatCard({ icon, value, label, sub }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={s.statVal}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
      {sub && <Text style={s.statSub}>{sub}</Text>}
    </View>
  );
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' });
}

export default function AdminScreen({ onLogout }) {
  const [tab,         setTab]         = useState('stats');
  const [stats,       setStats]       = useState(null);
  const [gardes,      setGardes]      = useState([]);
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [userFilter,  setUserFilter]  = useState('tous');

  const load = useCallback(async () => {
    try {
      const [st, ga, us] = await Promise.all([
        getAdminStats().catch(() => null),
        getAdminGardes().catch(() => []),
        getAdminUsers().catch(() => []),
      ]);
      if (st) setStats(st);
      setGardes(ga);
      setUsers(us);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const filteredUsers = userFilter === 'tous'
    ? users
    : users.filter(u => u.role === userFilter);

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={COLORS.bark} />
      <Text style={{ color: COLORS.muted, marginTop: 12 }}>Chargement admin…</Text>
    </View>
  );

  return (
    <View style={s.wrapper}>

      {/* Header admin */}
      <View style={s.header}>
        <Text style={s.headerTitle}>🛠 Administration</Text>
        <TouchableOpacity style={s.logoutBtn} onPress={onLogout}>
          <Text style={s.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        {[
          { id: 'stats',  label: '📊 Stats'  },
          { id: 'gardes', label: '🐾 Gardes' },
          { id: 'users',  label: '👥 Users'  },
        ].map(t => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setTab(t.id)}
            style={[s.tabBtn, tab === t.id && s.tabBtnActive]}
          >
            <Text style={[s.tabText, tab === t.id && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.bark} />}
      >

        {/* ── STATS ── */}
        {tab === 'stats' && stats && (
          <>
            <SectionLabel label="Gardes" />
            <View style={s.statsGrid}>
              <StatCard icon="📋" value={stats.totalGardes}     label="Total"       />
              <StatCard icon="▶"  value={stats.gardesEnCours}   label="En cours"    />
              <StatCard icon="⏳" value={stats.gardesEnAttente} label="En attente"  />
              <StatCard icon="✓"  value={stats.gardesTerminees} label="Terminées"   />
            </View>

            <SectionLabel label="Utilisateurs" />
            <View style={s.statsGrid}>
              <StatCard icon="👥" value={stats.totalUsers}      label="Total"       />
              <StatCard icon="🏠" value={stats.totalProprios}   label="Propriétaires" />
              <StatCard icon="🤝" value={stats.totalPetsitters} label="Pawsitters"  />
            </View>

            <SectionLabel label="Revenus" />
            <View style={s.revenueRow}>
              <View style={[s.revenueCard, { backgroundColor: COLORS.okBg, borderColor: COLORS.okBorder }]}>
                <Text style={s.revenueIcon}>💶</Text>
                <Text style={[s.revenueVal, { color: COLORS.moss }]}>{stats.revenuTotal} €</Text>
                <Text style={s.revenueLabel}>Encaissés</Text>
              </View>
              <View style={[s.revenueCard, { backgroundColor: COLORS.warnBg, borderColor: COLORS.warnBorder }]}>
                <Text style={s.revenueIcon}>⏳</Text>
                <Text style={[s.revenueVal, { color: COLORS.clay }]}>{stats.revenuEnAttente} €</Text>
                <Text style={s.revenueLabel}>En attente</Text>
              </View>
            </View>
          </>
        )}

        {/* ── GARDES ── */}
        {tab === 'gardes' && (
          <>
            <Text style={s.total}>{gardes.length} garde{gardes.length > 1 ? 's' : ''}</Text>
            {gardes.length === 0 && (
              <Card><Text style={s.empty}>Aucune garde trouvée.</Text></Card>
            )}
            {gardes.map(g => (
              <Card key={g.id} style={s.gardeCard}>
                <View style={s.gardeHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.gardeNoms}>🏠 {g.proprio}  →  🤝 {g.gardien}</Text>
                    <Text style={s.gardeDates}>{formatDate(g.date_debut)} → {formatDate(g.date_fin)}</Text>
                  </View>
                  <Badge label={STATUT_LABEL[g.statut] ?? g.statut} color={STATUT_COLOR[g.statut] ?? 'warn'} />
                </View>
                <View style={s.gardeFooter}>
                  <Text style={s.gardeMontant}>
                    {g.montant != null ? `💶 ${g.montant} €` : '—'}
                  </Text>
                  <Text style={s.gardePaiement}>
                    {g.paiement === 'paye' ? '💳 Payé' : g.paiement === 'en_attente' ? '⏳ Non payé' : g.paiement}
                  </Text>
                  <Text style={s.gardeDate}>{formatDate(g.created_at)}</Text>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <>
            <View style={s.filterRow}>
              {['tous', 'proprietaire', 'petsitter'].map(f => (
                <TouchableOpacity
                  key={f}
                  style={[s.filterChip, userFilter === f && s.filterChipActive]}
                  onPress={() => setUserFilter(f)}
                >
                  <Text style={[s.filterChipText, userFilter === f && s.filterChipTextActive]}>
                    {f === 'tous' ? 'Tous' : f === 'proprietaire' ? '🏠 Proprios' : '🤝 Pawsitters'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.total}>{filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}</Text>
            {filteredUsers.map(u => (
              <Card key={u.id} style={s.userCard}>
                <View style={s.userRow}>
                  <View style={s.userAvatar}>
                    <Text style={s.userInitial}>
                      {(u.nom ?? '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.userName}>{u.nom ?? '—'}</Text>
                    <Text style={s.userMeta}>
                      {u.role === 'petsitter' ? '🤝 Pawsitter' : '🏠 Propriétaire'}
                      {u.ville ? `  ·  📍 ${u.ville}` : ''}
                    </Text>
                    {u.role === 'petsitter' && (
                      <Text style={s.userStats}>
                        {u.tarif ? `💶 ${u.tarif} €/j` : ''}
                        {u.note  ? `  ·  ⭐ ${u.note} (${u.nb_avis ?? 0} avis)` : ''}
                      </Text>
                    )}
                  </View>
                  <Text style={s.userDate}>{formatDate(u.created_at)}</Text>
                </View>
              </Card>
            ))}
          </>
        )}

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper:  { flex: 1, backgroundColor: COLORS.sand },
  scroll:   { flex: 1 },
  content:  { padding: 16, paddingBottom: 40 },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  headerTitle: { fontSize: 16, ...FONTS.heavy, color: '#F1F5F9' },
  logoutBtn: {
    backgroundColor: '#EF4444',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  logoutText: { fontSize: 13, ...FONTS.bold, color: COLORS.white },

  tabBar: {
    flexDirection: 'row', gap: 6,
    backgroundColor: COLORS.sand,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tabBtn:      { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.full },
  tabBtnActive:{ backgroundColor: COLORS.bark },
  tabText:     { fontSize: 13, ...FONTS.medium, color: COLORS.muted },
  tabTextActive:{ fontSize: 13, ...FONTS.bold, color: COLORS.white },

  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  statCard: {
    flex: 1, minWidth: '40%', backgroundColor: COLORS.white,
    borderRadius: RADIUS.md, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card,
  },
  statIcon:  { fontSize: 22, marginBottom: 4 },
  statVal:   { fontSize: 22, ...FONTS.heavy, color: COLORS.ink },
  statLabel: { fontSize: 11, color: COLORS.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  statSub:   { fontSize: 11, color: COLORS.moss, marginTop: 2 },

  revenueRow:   { flexDirection: 'row', gap: 12, marginBottom: 4 },
  revenueCard:  { flex: 1, borderRadius: RADIUS.md, padding: 16, alignItems: 'center', borderWidth: 1.5 },
  revenueIcon:  { fontSize: 24, marginBottom: 6 },
  revenueVal:   { fontSize: 26, ...FONTS.heavy },
  revenueLabel: { fontSize: 12, color: COLORS.muted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 },

  total: { fontSize: 13, color: COLORS.muted, ...FONTS.medium, marginBottom: 8 },
  empty: { fontSize: 14, color: COLORS.muted, textAlign: 'center', paddingVertical: 16 },

  gardeCard:   { marginBottom: 10 },
  gardeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  gardeNoms:   { fontSize: 13, ...FONTS.bold, color: COLORS.ink, marginBottom: 3 },
  gardeDates:  { fontSize: 12, color: COLORS.muted },
  gardeFooter: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },
  gardeMontant: { fontSize: 13, ...FONTS.bold, color: COLORS.ink, flex: 1 },
  gardePaiement:{ fontSize: 12, color: COLORS.muted },
  gardeDate:    { fontSize: 11, color: COLORS.border },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  filterChip:      { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: COLORS.white },
  filterChipActive:{ backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  filterChipText:  { fontSize: 13, ...FONTS.medium, color: COLORS.ink },
  filterChipTextActive: { color: COLORS.white },

  userCard: { marginBottom: 8 },
  userRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.ink, alignItems: 'center', justifyContent: 'center',
  },
  userInitial: { fontSize: 18, ...FONTS.heavy, color: COLORS.white },
  userName:    { fontSize: 14, ...FONTS.bold, color: COLORS.ink, marginBottom: 2 },
  userMeta:    { fontSize: 12, color: COLORS.muted },
  userStats:   { fontSize: 12, color: COLORS.bark, marginTop: 2 },
  userDate:    { fontSize: 11, color: COLORS.border },
});
