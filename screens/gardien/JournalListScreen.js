// screens/gardien/JournalListScreen.js
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image, StyleSheet,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../lib/theme';

const DOG_ICON = require('../../assets/dog-icon.png');
const CAT_ICON = require('../../assets/cat-icon.png');

const animalIcon = (type) => {
  if (type === 'chien') return <Image source={DOG_ICON} style={{ width: 52, height: 52 }} />;
  if (type === 'chat')  return <Image source={CAT_ICON} style={{ width: 52, height: 52 }} />;
  return <Text style={{ fontSize: 44 }}>{type === 'rongeur' ? '🐹' : type === 'equin' ? '🐴' : '🐾'}</Text>;
};

export default function JournalListScreen({ garde, journauxCompletes, onSelectAnimal }) {
  const animaux  = garde?.animaux ?? [];
  const total    = animaux.length;
  const completes = journauxCompletes?.length ?? 0;
  const allDone  = completes === total && total > 0;

  const date = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* En-tête garde */}
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

        {/* Barre de progression */}
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

      {/* Rappel */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          📌 Remplis un journal par animal gardé. Le propriétaire recevra un rapport complet pour chacun.
        </Text>
      </View>

      {/* Liste des animaux */}
      {animaux.map((animal) => {
        const done = journauxCompletes?.includes(animal.id);
        const espece = animal.type === 'chien' ? 'Chien'
          : animal.type === 'chat' ? 'Chat'
          : animal.type === 'rongeur' ? 'Rongeur'
          : animal.type === 'equin' ? 'Équin' : 'Animal';

        return (
          <View key={animal.id} style={[styles.animalCard, done && styles.animalCardDone]}>

            {/* Illustration + infos */}
            <View style={styles.animalTop}>
              <View style={[styles.animalIconWrap, done && styles.animalIconWrapDone]}>
                {animalIcon(animal.type)}
              </View>
              <View style={styles.animalInfo}>
                <Text style={styles.animalNom}>{animal.nom}</Text>
                <Text style={styles.animalEspece}>
                  {espece}{animal.race ? ` · ${animal.race}` : ''}
                </Text>

                {/* Statut */}
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, done && styles.statusDotDone]} />
                  <Text style={[styles.statusLabel, done && styles.statusLabelDone]}>
                    {done ? 'Journal complété' : 'Journal non rempli'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Séparateur + action */}
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.sand },
  content:   { padding: 16, paddingBottom: 60 },

  headerCard: {
    backgroundColor: COLORS.bark, borderRadius: RADIUS.lg,
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
