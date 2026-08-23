// screens/gardien/DemandesScreen.js
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../lib/theme';
import { Avatar, Badge, Card, SectionLabel } from '../../components/UI';

const MOCK_DEMANDES = [
  {
    id: 'd1',
    statut: 'en_attente',
    proprio: { nom: 'Sophie M.', avatar: 'SM' },
    animal: { nom: 'Luna', emoji: '🐕', espece: 'Chien', race: 'Golden Retriever', age: '3 ans' },
    date_debut: '2026-07-10',
    date_fin: '2026-07-14',
    nb_jours: 4,
    montant: 160,
    message: 'Bonjour ! Luna est très sociable et adore les balades. Elle mange deux fois par jour. Merci d\'avance 🐾',
  },
  {
    id: 'd2',
    statut: 'en_attente',
    proprio: { nom: 'Marc D.', avatar: 'MD' },
    animal: { nom: 'Milo', emoji: '🐈', espece: 'Chat', race: 'Siamois', age: '5 ans' },
    date_debut: '2026-07-18',
    date_fin: '2026-07-20',
    nb_jours: 2,
    montant: 70,
    message: 'Milo est calme et indépendant. Il a besoin de sa pâtée le matin et d\'un peu d\'attention le soir.',
  },
];

const HISTORIQUE = [
  {
    id: 'h1',
    statut: 'acceptee',
    proprio: { nom: 'Julie P.', avatar: 'JP' },
    animal: { nom: 'Rocky', emoji: '🐕', espece: 'Chien' },
    date_debut: '2026-06-15',
    date_fin: '2026-06-18',
    montant: 120,
  },
  {
    id: 'h2',
    statut: 'refusee',
    proprio: { nom: 'Paul R.', avatar: 'PR' },
    animal: { nom: 'Nala', emoji: '🐕', espece: 'Chien' },
    date_debut: '2026-06-05',
    date_fin: '2026-06-07',
    montant: 80,
  },
];

export default function DemandesScreen() {
  const [demandes, setDemandes] = useState(MOCK_DEMANDES);

  const handleAccepter = (id) => {
    Alert.alert(
      'Accepter la demande',
      'Confirmer que vous acceptez cette garde ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          onPress: () => setDemandes(ds => ds.filter(d => d.id !== id)),
        },
      ]
    );
  };

  const handleRefuser = (id) => {
    Alert.alert(
      'Refuser la demande',
      'Êtes-vous sûr de vouloir refuser cette demande ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: () => setDemandes(ds => ds.filter(d => d.id !== id)),
        },
      ]
    );
  };

  const formatDate = (str) =>
    new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Demandes en attente */}
      <SectionLabel label={`Demandes en attente (${demandes.length})`} />

      {demandes.length === 0 && (
        <Card>
          <View style={styles.vide}>
            <Text style={{ fontSize: 40 }}>📭</Text>
            <Text style={styles.videTitle}>Aucune demande</Text>
            <Text style={styles.videSub}>Les nouvelles demandes de garde apparaîtront ici.</Text>
          </View>
        </Card>
      )}

      {demandes.map(d => (
        <Card key={d.id} style={styles.demandeCard}>
          {/* Header proprio + animal */}
          <View style={styles.demandeHeader}>
            <Avatar initials={d.proprio.avatar} size={40} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.propreNom}>{d.proprio.nom}</Text>
              <Text style={styles.animalLine}>
                {d.animal.emoji} {d.animal.nom} · {d.animal.race ?? d.animal.espece} · {d.animal.age}
              </Text>
            </View>
            <View style={styles.montantPill}>
              <Text style={styles.montant}>{d.montant} €</Text>
            </View>
          </View>

          {/* Dates */}
          <View style={styles.datesBox}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Début</Text>
              <Text style={styles.dateVal}>{formatDate(d.date_debut)}</Text>
            </View>
            <View style={styles.dateSep} />
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Fin</Text>
              <Text style={styles.dateVal}>{formatDate(d.date_fin)}</Text>
            </View>
            <View style={styles.dateSep} />
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Durée</Text>
              <Text style={styles.dateVal}>{d.nb_jours} jours</Text>
            </View>
          </View>

          {/* Message proprio */}
          {d.message && (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>"{d.message}"</Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.refuserBtn]}
              onPress={() => handleRefuser(d.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.refuserText}>✗ Refuser</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.accepterBtn]}
              onPress={() => handleAccepter(d.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.accepterText}>✓ Accepter</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ))}

      {/* Historique */}
      <SectionLabel label="Historique" />
      {HISTORIQUE.map(h => (
        <Card key={h.id} style={styles.histCard}>
          <View style={styles.histRow}>
            <Avatar initials={h.proprio.avatar} size={34} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.histNom}>{h.proprio.nom} · {h.animal.emoji} {h.animal.nom}</Text>
              <Text style={styles.histDates}>
                {formatDate(h.date_debut)} → {formatDate(h.date_fin)} · {h.montant} €
              </Text>
            </View>
            <Badge
              label={h.statut === 'acceptee' ? '✓ Acceptée' : '✗ Refusée'}
              color={h.statut === 'acceptee' ? 'ok' : 'warn'}
            />
          </View>
        </Card>
      ))}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.sand },
  content:   { padding: 16, paddingBottom: 100 },

  demandeCard: { marginBottom: 16 },
  demandeHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  propreNom:     { fontSize: 15, ...FONTS.bold, color: COLORS.ink, marginBottom: 3 },
  animalLine:    { fontSize: 13, color: COLORS.muted },
  montantPill:   { backgroundColor: COLORS.warm, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1.5, borderColor: COLORS.bark },
  montant:       { fontSize: 16, ...FONTS.heavy, color: COLORS.bark },

  datesBox:  { flexDirection: 'row', backgroundColor: COLORS.sand, borderRadius: RADIUS.sm, padding: 12, marginBottom: 12 },
  dateItem:  { flex: 1, alignItems: 'center' },
  dateLabel: { fontSize: 11, color: COLORS.muted, ...FONTS.medium, marginBottom: 3 },
  dateVal:   { fontSize: 13, ...FONTS.bold, color: COLORS.ink, textTransform: 'capitalize' },
  dateSep:   { width: 1, backgroundColor: COLORS.border, marginHorizontal: 8 },

  messageBox: {
    backgroundColor: COLORS.warm, borderRadius: RADIUS.sm,
    padding: 12, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: COLORS.clay,
  },
  messageText: { fontSize: 13, color: COLORS.ink, lineHeight: 19, fontStyle: 'italic' },

  actions:     { flexDirection: 'row', gap: 10 },
  actionBtn:   { flex: 1, borderRadius: RADIUS.md, padding: 12, alignItems: 'center' },
  refuserBtn:  { backgroundColor: COLORS.warnBg, borderWidth: 1.5, borderColor: COLORS.warnBorder },
  accepterBtn: { backgroundColor: COLORS.moss },
  refuserText: { fontSize: 14, ...FONTS.bold, color: COLORS.clay },
  accepterText:{ fontSize: 14, ...FONTS.bold, color: COLORS.white },

  histCard: { marginBottom: 10 },
  histRow:  { flexDirection: 'row', alignItems: 'center' },
  histNom:  { fontSize: 14, ...FONTS.bold, color: COLORS.ink, marginBottom: 3 },
  histDates:{ fontSize: 12, color: COLORS.muted },

  vide:      { alignItems: 'center', paddingVertical: 24 },
  videTitle: { fontSize: 16, ...FONTS.bold, color: COLORS.ink, marginTop: 12 },
  videSub:   { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 6, lineHeight: 18 },
});
