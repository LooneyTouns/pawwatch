// screens/proprietaire/JournalScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl,
  TouchableOpacity, StyleSheet, Image, ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../lib/theme';
import { Badge, Avatar, Card, SectionLabel } from '../../components/UI';
import { getJournaux, validerJournal } from '../../lib/supabase';
import { sendLocalNotification } from '../../hooks/useNotifications';

export default function JournalScreen({ garde, user }) {
  const [journaux, setJournaux]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getJournaux(garde.id);
      setJournaux(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [garde.id]);

  useEffect(() => { load(); }, [load]);

  const handleValider = async (journalId) => {
    await validerJournal(journalId);
    setJournaux(j => j.map(x => x.id === journalId ? { ...x, vu_par_proprio: true } : x));
    await sendLocalNotification({
      title: '👍 Journal validé',
      body: 'Le gardien a été notifié de votre validation.',
    });
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.bark} />
    </View>
  );

  const jours_complets = journaux.filter(j => j.repas_done && j.promenade_done).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.bark} />}
    >
      {/* Résumé animal */}
      <Card style={styles.animalCard}>
        <View style={styles.animalRow}>
          <Text style={styles.animalEmoji}>{garde.animaux?.emoji ?? '🐕'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.animalNom}>{garde.animaux?.nom}</Text>
            <Text style={styles.animalGardien}>
              Chez {garde.users?.nom} jusqu'au {new Date(garde.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </Text>
            <Badge label="Garde en cours" color="ok" />
          </View>
        </View>
      </Card>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Repas',      val: `${journaux.filter(j=>j.repas_done).length}/${journaux.length}`,     ok: true,  icon: '🍗' },
          { label: 'Promenades', val: `${journaux.filter(j=>j.promenade_done).length}/${journaux.length}`, ok: journaux.every(j=>j.promenade_done), icon: '🌳' },
          { label: 'Complets',   val: `${jours_complets}/${journaux.length}`,                               ok: jours_complets === journaux.length,  icon: '📋' },
        ].map(s => (
          <View key={s.label} style={[styles.statCard, { borderColor: s.ok ? COLORS.okBorder : COLORS.warnBorder }]}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={[styles.statVal, { color: s.ok ? COLORS.moss : COLORS.clay }]}>{s.val}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <SectionLabel label="Journal de bord" />

      {journaux.length === 0 && (
        <Card>
          <Text style={styles.empty}>Aucun journal envoyé pour l'instant.</Text>
          <Text style={styles.emptySub}>Le gardien enverra le premier journal aujourd'hui.</Text>
        </Card>
      )}

      {journaux.map(j => (
        <JournalCard key={j.id} journal={j} onValider={handleValider} />
      ))}

      {/* Signalement */}
      <TouchableOpacity style={styles.alertBox} activeOpacity={0.7}
        onPress={() => sendLocalNotification({ title: '⚠️ Signalement envoyé', body: 'Le support PawWatch a été alerté.' })}>
        <Text style={styles.alertIcon}>⚠️</Text>
        <View>
          <Text style={styles.alertTitle}>Signaler un problème</Text>
          <Text style={styles.alertSub}>Contacter le gardien ou le support</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const JournalCard = ({ journal, onValider }) => {
  const photos = journal.photos ?? [];
  const photoRepas     = photos.find(p => p.type === 'repas');
  const photoPromenade = photos.find(p => p.type === 'promenade');

  return (
    <Card>
      {/* Header */}
      <View style={styles.cardHeader}>
        <Avatar initials="SM" size={34} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.cardAnimal}>{journal.animal_nom ?? 'Luna 🐕'}</Text>
          <Text style={styles.cardDate}>
            {new Date(journal.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <Text style={{ fontSize: 24 }}>{journal.humeur ?? '😊'}</Text>
      </View>

      {/* Activités */}
      <View style={styles.activiteRow}>
        {[
          { key: 'repas',     label: 'Repas',     done: journal.repas_done,     heure: journal.repas_heure,     photo: photoRepas },
          { key: 'promenade', label: 'Promenade', done: journal.promenade_done, heure: journal.promenade_heure, photo: photoPromenade, duree: journal.promenade_duree },
        ].map(a => (
          <View key={a.key} style={[styles.activiteCard, { backgroundColor: a.done ? COLORS.okBg : COLORS.warnBg, borderColor: a.done ? COLORS.okBorder : COLORS.warnBorder }]}>
            {a.photo?.url
              ? <Image source={{ uri: a.photo.url }} style={styles.activitePhoto} />
              : <Text style={styles.activiteEmoji}>{a.done ? (a.key === 'repas' ? '🍗' : '🌳') : '❓'}</Text>
            }
            <Text style={styles.activiteLabel}>{a.label}</Text>
            <Text style={[styles.activiteStatus, { color: a.done ? COLORS.moss : COLORS.clay }]}>
              {a.done ? `✓ ${a.heure ?? ''}${a.duree ? ` · ${a.duree}` : ''}` : '⏳ En attente'}
            </Text>
          </View>
        ))}
      </View>

      {/* Note */}
      {journal.note ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>{journal.note}</Text>
        </View>
      ) : null}

      {/* Validation */}
      <View style={styles.cardFooter}>
        <Text style={styles.vuText}>{journal.vu_par_proprio ? '✓ Lu' : 'Non lu'}</Text>
        {!journal.vu_par_proprio
          ? <TouchableOpacity style={styles.validerBtn} onPress={() => onValider(journal.id)}>
              <Text style={styles.validerText}>👍 Valider</Text>
            </TouchableOpacity>
          : <Badge label={journal.repas_done && journal.promenade_done ? '✓ Tout bon' : '⚠ Incomplet'}
                   color={journal.repas_done && journal.promenade_done ? 'ok' : 'warn'} />
        }
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.sand },
  content:   { padding: 16, paddingBottom: 100 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.sand },

  animalCard: { marginBottom: 14 },
  animalRow:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  animalEmoji:{ fontSize: 44 },
  animalNom:  { fontSize: 18, ...FONTS.heavy, color: COLORS.ink, marginBottom: 2 },
  animalGardien: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: COLORS.cream, borderRadius: RADIUS.md,
    padding: 12, alignItems: 'center', borderWidth: 1,
    ...SHADOW.card,
  },
  statIcon:  { fontSize: 20 },
  statVal:   { fontSize: 16, ...FONTS.heavy, marginTop: 2 },
  statLabel: { fontSize: 11, color: COLORS.muted, marginTop: 2 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardAnimal: { fontSize: 14, ...FONTS.bold, color: COLORS.ink },
  cardDate:   { fontSize: 12, color: COLORS.muted },

  activiteRow:  { flexDirection: 'row', gap: 10, marginBottom: 12 },
  activiteCard: {
    flex: 1, borderRadius: RADIUS.md, padding: 10,
    borderWidth: 1, alignItems: 'center',
  },
  activitePhoto: { width: '100%', height: 60, borderRadius: RADIUS.sm, marginBottom: 6 },
  activiteEmoji: { fontSize: 22, marginBottom: 4 },
  activiteLabel: { fontSize: 13, ...FONTS.bold, color: COLORS.ink },
  activiteStatus:{ fontSize: 11, marginTop: 2 },

  noteBox:  { backgroundColor: COLORS.sand, borderRadius: RADIUS.sm, padding: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: COLORS.clay },
  noteText: { fontSize: 13, color: COLORS.ink, lineHeight: 20 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vuText:     { fontSize: 12, color: COLORS.muted },
  validerBtn: { backgroundColor: COLORS.moss, borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 6 },
  validerText:{ fontSize: 13, ...FONTS.medium, color: COLORS.white },

  alertBox: {
    backgroundColor: COLORS.warnBg, borderWidth: 1.5, borderColor: COLORS.warnBorder,
    borderRadius: RADIUS.md, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8,
  },
  alertIcon:  { fontSize: 24 },
  alertTitle: { fontSize: 14, ...FONTS.bold, color: COLORS.bark },
  alertSub:   { fontSize: 12, color: COLORS.muted },

  empty:    { fontSize: 14, ...FONTS.medium, color: COLORS.ink, textAlign: 'center', marginBottom: 4 },
  emptySub: { fontSize: 13, color: COLORS.muted, textAlign: 'center' },
});
