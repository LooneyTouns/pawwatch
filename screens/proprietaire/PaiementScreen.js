// screens/proprietaire/PaiementScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../lib/theme';
import { Card, Badge, SectionLabel } from '../../components/UI';
import { getPaiement, debloquerPaiement, getJournaux } from '../../lib/supabase';

const MOCK_PAIEMENT = {
  id: 'pai-001',
  montant: 120,
  statut: 'en_attente', // 'en_attente' | 'debloque' | 'verse'
  nb_jours: 3,
  tarif_jour: 40,
  debloque_at: null,
  verse_at: null,
};

const MOCK_JOURNAUX = [
  { id: 'j1', date: '2026-06-23', repas_done: true, promenade_done: true, vu_par_proprio: true },
  { id: 'j2', date: '2026-06-24', repas_done: true, promenade_done: true, vu_par_proprio: true },
  { id: 'j3', date: '2026-06-25', repas_done: true, promenade_done: false, vu_par_proprio: false },
];

export default function PaiementScreen({ garde }) {
  const [paiement,  setPaiement]  = useState(MOCK_PAIEMENT);
  const [journaux,  setJournaux]  = useState(MOCK_JOURNAUX);
  const [loading,   setLoading]   = useState(false);
  const [debloquer, setDebloquer] = useState(false);

  const tousValides  = journaux.every(j => j.vu_par_proprio);
  const tousComplets = journaux.every(j => j.repas_done && j.promenade_done);
  const peutDebloquer = tousValides && tousComplets && paiement.statut === 'en_attente';

  const handleDebloquer = () => {
    Alert.alert(
      'Débloquer le paiement',
      `Confirmer le versement de ${paiement.montant} € à votre petsitter ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'default',
          onPress: async () => {
            setDebloquer(true);
            try {
              await debloquerPaiement(garde?.id ?? 'garde-001');
              setPaiement(p => ({ ...p, statut: 'debloque', debloque_at: new Date().toISOString() }));
            } catch (e) {
              // En mode demo, on simule quand même
              setPaiement(p => ({ ...p, statut: 'debloque', debloque_at: new Date().toISOString() }));
            } finally {
              setDebloquer(false);
            }
          },
        },
      ]
    );
  };

  const statutColor = paiement.statut === 'verse'    ? 'ok'
                    : paiement.statut === 'debloque'  ? 'info'
                    : 'warn';
  const statutLabel = paiement.statut === 'verse'    ? '✓ Versé'
                    : paiement.statut === 'debloque'  ? '⏳ En cours de virement'
                    : '🔒 En attente';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Résumé montant */}
      <Card style={styles.montantCard}>
        <View style={styles.montantRow}>
          <View>
            <Text style={styles.montantLabel}>Total garde</Text>
            <Text style={styles.montantVal}>{paiement.montant} €</Text>
            <Text style={styles.montantDetail}>
              {paiement.nb_jours} jours × {paiement.tarif_jour} €/jour
            </Text>
          </View>
          <Badge label={statutLabel} color={statutColor} />
        </View>

        {paiement.statut === 'debloque' && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💸 Paiement débloqué — le virement arrivera sous 1–3 jours ouvrés.
            </Text>
          </View>
        )}
        {paiement.statut === 'verse' && (
          <View style={[styles.infoBox, { backgroundColor: COLORS.okBg, borderColor: COLORS.okBorder }]}>
            <Text style={[styles.infoText, { color: COLORS.moss }]}>
              ✅ Paiement versé le {new Date(paiement.verse_at).toLocaleDateString('fr-FR')}.
            </Text>
          </View>
        )}
      </Card>

      {/* Progression journaux */}
      <SectionLabel label="Avancement des journaux" />
      <Card>
        {journaux.map((j, i) => {
          const complet = j.repas_done && j.promenade_done;
          const lu      = j.vu_par_proprio;
          return (
            <View key={j.id} style={[styles.jourRow, i < journaux.length - 1 && styles.jourRowBorder]}>
              <View style={styles.jourLeft}>
                <Text style={styles.jourDate}>
                  {new Date(j.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                </Text>
                <View style={styles.jourActivites}>
                  <Text style={[styles.jourPuce, { color: j.repas_done ? COLORS.moss : COLORS.clay }]}>
                    {j.repas_done ? '✓' : '✗'} Repas
                  </Text>
                  <Text style={[styles.jourPuce, { color: j.promenade_done ? COLORS.moss : COLORS.clay }]}>
                    {j.promenade_done ? '✓' : '✗'} Balade
                  </Text>
                </View>
              </View>
              <View style={styles.jourRight}>
                {complet && lu
                  ? <Badge label="✓ Validé" color="ok" />
                  : complet && !lu
                  ? <Badge label="À valider" color="warn" />
                  : <Badge label="Incomplet" color="warn" />
                }
              </View>
            </View>
          );
        })}
      </Card>

      {/* Conditions déblocage */}
      <SectionLabel label="Conditions de paiement" />
      <Card>
        {[
          { label: 'Tous les journaux remplis', ok: tousComplets },
          { label: 'Tous les journaux validés par vous', ok: tousValides },
          { label: 'Garde terminée', ok: true },
        ].map(c => (
          <View key={c.label} style={styles.condRow}>
            <Text style={[styles.condIcon, { color: c.ok ? COLORS.moss : COLORS.clay }]}>
              {c.ok ? '✓' : '○'}
            </Text>
            <Text style={[styles.condLabel, { color: c.ok ? COLORS.ink : COLORS.muted }]}>
              {c.label}
            </Text>
          </View>
        ))}
      </Card>

      {/* Bouton débloquer */}
      {paiement.statut === 'en_attente' && (
        <TouchableOpacity
          style={[styles.debloquerBtn, !peutDebloquer && styles.debloquerBtnDisabled]}
          onPress={peutDebloquer ? handleDebloquer : undefined}
          disabled={!peutDebloquer || debloquer}
          activeOpacity={0.8}
        >
          {debloquer
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.debloquerText}>
                {peutDebloquer ? '💸 Débloquer le paiement' : '🔒 Conditions non remplies'}
              </Text>
          }
        </TouchableOpacity>
      )}

      {!peutDebloquer && paiement.statut === 'en_attente' && (
        <Text style={styles.blocageNote}>
          Validez tous les journaux journaliers pour débloquer le paiement automatiquement.
        </Text>
      )}

      {/* Info Stripe */}
      <View style={styles.stripeBox}>
        <Text style={styles.stripeText}>🔒 Paiements sécurisés via Stripe · Virement SEPA sous 3 jours ouvrés</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.sand },
  content:   { padding: 16, paddingBottom: 100 },

  montantCard: { marginBottom: 20 },
  montantRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  montantLabel:{ fontSize: 13, color: COLORS.muted, ...FONTS.medium, marginBottom: 4 },
  montantVal:  { fontSize: 36, ...FONTS.heavy, color: COLORS.bark },
  montantDetail:{ fontSize: 13, color: COLORS.muted, marginTop: 2 },

  infoBox: {
    backgroundColor: COLORS.infoBg, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: '#B3CCEE',
    padding: 12, marginTop: 14,
  },
  infoText: { fontSize: 13, color: '#3A6BBF', lineHeight: 18 },

  jourRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  jourRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  jourLeft:      { flex: 1 },
  jourDate:      { fontSize: 14, ...FONTS.bold, color: COLORS.ink, marginBottom: 4, textTransform: 'capitalize' },
  jourActivites: { flexDirection: 'row', gap: 12 },
  jourPuce:      { fontSize: 12, ...FONTS.medium },
  jourRight:     { marginLeft: 10 },

  condRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  condIcon:  { fontSize: 18, width: 22, textAlign: 'center' },
  condLabel: { fontSize: 14, ...FONTS.medium },

  debloquerBtn: {
    backgroundColor: COLORS.moss, borderRadius: RADIUS.md,
    padding: 16, alignItems: 'center', marginTop: 8,
  },
  debloquerBtnDisabled: { backgroundColor: COLORS.border },
  debloquerText: { fontSize: 16, ...FONTS.heavy, color: COLORS.white },

  blocageNote: {
    fontSize: 13, color: COLORS.muted, textAlign: 'center',
    marginTop: 10, lineHeight: 18,
  },

  stripeBox: {
    marginTop: 28, padding: 14,
    backgroundColor: COLORS.warm, borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  stripeText: { fontSize: 12, color: COLORS.muted, textAlign: 'center' },
});
