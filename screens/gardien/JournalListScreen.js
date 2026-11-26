// screens/gardien/JournalListScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../lib/theme';
import { Avatar, Card, SectionLabel } from '../../components/UI';
import {
  getDemandesGardien,
  accepterGarde,
  refuserGarde,
  supabase,
} from '../../lib/supabase';
import { SERVICE_MAP } from '../../lib/services';
import AnimalFiche from '../../components/AnimalFiche';

const DOG_ICON = require('../../assets/dog-icon.png');
const CAT_ICON = require('../../assets/cat-icon.png');

const animalIcon = (type) => {
  if (type === 'chien') return <Image source={DOG_ICON} style={{ width: 52, height: 52 }} />;
  if (type === 'chat')  return <Image source={CAT_ICON} style={{ width: 52, height: 52 }} />;
  return <Text style={{ fontSize: 44 }}>{type === 'rongeur' ? '🐹' : type === 'equin' ? '🐴' : '🐾'}</Text>;
};

const formatDate = (str) =>
  new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

export default function JournalListScreen({ garde, journauxCompletes, onSelectAnimal, user }) {
  const animaux  = garde?.animaux ?? [];
  const total    = animaux.length;
  const completes = journauxCompletes?.length ?? 0;
  const allDone  = completes === total && total > 0;

  const [demandes,   setDemandes]   = useState([]);
  const [actionId,   setActionId]   = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const date = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const load = useCallback(async (quiet = false) => {
    if (!user?.id) return;
    try {
      const dem = await getDemandesGardien(user.id);
      setDemandes(dem);
    } catch (e) {
      console.error('JournalListScreen load demandes:', e);
    } finally {
      if (!quiet) setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('journal-demandes-petsitter')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gardes',
          filter: `gardien_id=eq.${user.id}` }, () => load(true))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'gardes',
          filter: `gardien_id=eq.${user.id}` }, () => load(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, load]);

  const handleAccepter = (id) => {
    Alert.alert(
      'Accepter la demande',
      'Confirmer que vous acceptez cette garde ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter ✓',
          onPress: async () => {
            setActionId(id);
            try {
              await accepterGarde(id);
              await load(true);
            } catch {
              Alert.alert('Erreur', 'Impossible d\'accepter la demande.');
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  };

  const handleRefuser = (id) => {
    Alert.alert(
      'Refuser la demande',
      'Êtes-vous sûr de vouloir refuser ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            setActionId(id);
            try {
              await refuserGarde(id);
              await load(true);
            } catch {
              Alert.alert('Erreur', 'Impossible de refuser la demande.');
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(true); }}
          tintColor={COLORS.bark}
        />
      }
    >

      {/* ── Demandes en attente ── */}
      <SectionLabel label={`📨 Demandes en attente (${demandes.length})`} />

      {demandes.length === 0 ? (
        <Card style={{ marginBottom: 20 }}>
          <View style={styles.vide}>
            <Text style={{ fontSize: 40 }}>📭</Text>
            <Text style={styles.videTitle}>Aucune demande</Text>
            <Text style={styles.videSub}>
              Les nouvelles demandes de garde apparaîtront ici.{'\n'}Tire vers le bas pour actualiser.
            </Text>
          </View>
        </Card>
      ) : (
        demandes.map(d => {
          const acting = actionId === d.id;
          return (
            <Card key={d.id} style={styles.demandeCard}>
              <View style={styles.demandeHeader}>
                <Avatar initials={d.proprio.avatar} size={40} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.propreNom}>{d.proprio.nom}</Text>
                  {d.animal ? (
                    <Text style={styles.animalLine}>
                      {d.animal.emoji} {d.animal.nom}
                      {d.animal.race ? ` · ${d.animal.race}` : ` · ${d.animal.espece}`}
                    </Text>
                  ) : (
                    <Text style={styles.animalLine}>🐾 Animal non précisé</Text>
                  )}
                </View>
                {d.montant && (
                  <View style={styles.montantPill}>
                    <Text style={styles.montant}>{d.montant} €</Text>
                  </View>
                )}
              </View>

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
                {d.nb_jours && (
                  <>
                    <View style={styles.dateSep} />
                    <View style={styles.dateItem}>
                      <Text style={styles.dateLabel}>Durée</Text>
                      <Text style={styles.dateVal}>{d.nb_jours} jour{d.nb_jours > 1 ? 's' : ''}</Text>
                    </View>
                  </>
                )}
              </View>

              {SERVICE_MAP[d.service] ? (
                <Text style={styles.serviceLine}>{SERVICE_MAP[d.service].icon} {SERVICE_MAP[d.service].label}</Text>
              ) : null}

              {d.animaux?.map(a => <AnimalFiche key={a.id} animal={a} />)}

              {d.message ? (
                <View style={styles.messageBox}>
                  <Text style={styles.messageText}>"{d.message}"</Text>
                </View>
              ) : null}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.refuserBtn, acting && styles.actionBtnDisabled]}
                  onPress={() => handleRefuser(d.id)}
                  disabled={acting}
                  activeOpacity={0.8}
                >
                  {acting
                    ? <ActivityIndicator size="small" color={COLORS.clay} />
                    : <Text style={styles.refuserText}>✗ Refuser</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.accepterBtn, acting && styles.actionBtnDisabled]}
                  onPress={() => handleAccepter(d.id)}
                  disabled={acting}
                  activeOpacity={0.8}
                >
                  {acting
                    ? <ActivityIndicator size="small" color={COLORS.white} />
                    : <Text style={styles.accepterText}>✓ Accepter</Text>
                  }
                </TouchableOpacity>
              </View>
            </Card>
          );
        })
      )}

      {/* ── Journal du jour ── */}
      {garde && (
        <>
          <SectionLabel label="📋 Journal du jour" />

          <View style={styles.headerCard}>
            <View style={styles.headerRow}>
              <View style={styles.headerIconCircle}>
                <Text style={styles.headerEmoji}>📋</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Journaux du jour</Text>
                <Text style={styles.headerSub}>
                  {garde?.users?.nom ?? 'Propriétaire'} · {date}
                </Text>
              </View>
              <View style={styles.headerCounter}>
                <Text style={styles.headerCounterText}>{completes}/{total}</Text>
              </View>
            </View>

            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                { width: total > 0 ? `${(completes / total) * 100}%` : '0%' },
                allDone && { backgroundColor: '#4ADE80' },
              ]} />
            </View>
            {allDone && (
              <Text style={styles.progressLabel}>✓ Tous les journaux complétés !</Text>
            )}
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              📌 Remplis un journal par animal gardé. Le propriétaire recevra un rapport complet pour chacun.
            </Text>
          </View>

          {animaux.map((animal) => {
            const done = journauxCompletes?.includes(animal.id);
            const espece = animal.type === 'chien' ? 'Chien'
              : animal.type === 'chat' ? 'Chat'
              : animal.type === 'rongeur' ? 'Rongeur'
              : animal.type === 'equin' ? 'Équin' : 'Animal';

            return (
              <View key={animal.id} style={[styles.animalCard, done && styles.animalCardDone]}>
                <View style={styles.animalTop}>
                  <View style={[styles.animalIconWrap, done && styles.animalIconWrapDone]}>
                    {animalIcon(animal.type)}
                  </View>
                  <View style={styles.animalInfo}>
                    <Text style={styles.animalNom}>{animal.nom}</Text>
                    <Text style={styles.animalEspece}>
                      {espece}{animal.race ? ` · ${animal.race}` : ''}
                    </Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, done && styles.statusDotDone]} />
                      <Text style={[styles.statusLabel, done && styles.statusLabelDone]}>
                        {done ? 'Journal complété' : 'Journal non rempli'}
                      </Text>
                    </View>
                  </View>
                </View>

                <AnimalFiche animal={animal} />

                <View style={styles.animalFooter}>
                  <Text style={styles.animalFooterLabel}>Journal du jour</Text>
                  {done ? (
                    <View style={styles.doneBadge}>
                      <Text style={styles.doneText}>✓ Envoyé au propriétaire</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.fillBtn}
                      onPress={() => onSelectAnimal(animal)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.fillBtnText}>Remplir →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}

          {allDone && (
            <View style={styles.successBox}>
              <Text style={styles.successIcon}>🎉</Text>
              <Text style={styles.successTitle}>Tous les journaux sont envoyés !</Text>
              <Text style={styles.successSub}>
                Le propriétaire a été notifié et peut consulter les rapports de ses animaux.
              </Text>
            </View>
          )}
        </>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.sand },
  content:   { padding: 16, paddingBottom: 60 },

  vide:      { alignItems: 'center', paddingVertical: 24 },
  videTitle: { fontSize: 16, ...FONTS.bold, color: COLORS.ink, marginTop: 12 },
  videSub:   { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 6, lineHeight: 18 },

  demandeCard:   { marginBottom: 14 },
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

  serviceLine: { fontSize: 13, ...FONTS.bold, color: COLORS.ink, marginBottom: 8 },
  messageBox: {
    backgroundColor: COLORS.warm, borderRadius: RADIUS.sm,
    padding: 12, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: COLORS.clay,
  },
  messageText: { fontSize: 13, color: COLORS.ink, lineHeight: 19, fontStyle: 'italic' },

  actions:           { flexDirection: 'row', gap: 10 },
  actionBtn:         { flex: 1, borderRadius: RADIUS.md, padding: 12, alignItems: 'center' },
  actionBtnDisabled: { opacity: 0.6 },
  refuserBtn:        { backgroundColor: COLORS.warnBg, borderWidth: 1.5, borderColor: COLORS.warnBorder },
  accepterBtn:       { backgroundColor: COLORS.moss },
  refuserText:       { fontSize: 14, ...FONTS.bold, color: COLORS.clay },
  accepterText:      { fontSize: 14, ...FONTS.bold, color: COLORS.white },

  headerCard: {
    backgroundColor: COLORS.ink, borderRadius: RADIUS.lg,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  headerRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  headerIconCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerEmoji:  { fontSize: 18 },
  headerTitle:  { fontSize: 15, ...FONTS.heavy, color: COLORS.white },
  headerSub:    { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  headerCounter: {
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  headerCounterText: { fontSize: 13, ...FONTS.heavy, color: COLORS.white },

  progressBar:   { height: 5, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: COLORS.white, borderRadius: 3 },
  progressLabel: { fontSize: 11, ...FONTS.bold, color: 'rgba(255,255,255,0.9)', marginTop: 5 },

  infoBox: {
    backgroundColor: COLORS.okBg, borderWidth: 1, borderColor: COLORS.okBorder,
    borderRadius: RADIUS.md, padding: 12, marginBottom: 16,
  },
  infoText: { fontSize: 12, color: COLORS.moss, lineHeight: 18 },

  animalCard: {
    backgroundColor: COLORS.cream, borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.border,
    marginBottom: 12, overflow: 'hidden',
    ...SHADOW.card,
  },
  animalCardDone: {
    borderColor: '#86EFAC', backgroundColor: '#F0FDF4',
  },

  animalTop: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, padding: 14, paddingBottom: 12,
  },
  animalIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.warm,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  animalIconWrapDone: {
    backgroundColor: '#DCFCE7', borderColor: '#86EFAC',
  },
  animalInfo:   { flex: 1 },
  animalNom:    { fontSize: 18, ...FONTS.heavy, color: COLORS.ink },
  animalEspece: { fontSize: 12, color: COLORS.muted, marginTop: 2, marginBottom: 8 },

  statusRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  statusDotDone: { backgroundColor: '#22C55E' },
  statusLabel:     { fontSize: 12, ...FONTS.bold, color: '#EF4444' },
  statusLabelDone: { color: '#16A34A' },

  animalFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(250,248,244,0.6)',
  },
  animalFooterLabel: { fontSize: 12, ...FONTS.bold, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.4 },

  doneBadge: {
    backgroundColor: '#DCFCE7', borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#86EFAC',
  },
  doneText: { fontSize: 12, ...FONTS.bold, color: '#16A34A' },

  fillBtn: {
    backgroundColor: COLORS.bark, borderRadius: RADIUS.full,
    paddingHorizontal: 18, paddingVertical: 7,
  },
  fillBtnText: { fontSize: 13, ...FONTS.heavy, color: COLORS.white },

  successBox: {
    backgroundColor: COLORS.okBg, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.okBorder,
    padding: 24, alignItems: 'center', marginTop: 8,
  },
  successIcon:  { fontSize: 48, marginBottom: 12 },
  successTitle: { fontSize: 17, ...FONTS.heavy, color: COLORS.moss, marginBottom: 6 },
  successSub:   { fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 20 },
});
