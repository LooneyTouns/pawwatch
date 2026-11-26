// screens/proprietaire/PaiementScreen.js  — version web (sans Stripe natif)
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../lib/theme';
import { Card, Badge, SectionLabel } from '../../components/UI';
import { getPaiement, getJournaux } from '../../lib/supabase';

export default function PaiementScreen({ garde }) {
  const [paiement,  setPaiement]  = useState(null);
  const [journaux,  setJournaux]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!garde?.id) { setLoading(false); return; }
    Promise.all([
      getPaiement(garde.id).catch(() => null),
      getJournaux(garde.id).catch(() => []),
    ]).then(([pai, jours]) => {
      if (pai)   setPaiement(pai);
      if (jours) setJournaux(jours);
    }).finally(() => setLoading(false));
  }, [garde?.id]);

  const tousValides  = journaux.length > 0 && journaux.every(j => j.vu_par_proprio);
  const tousComplets = journaux.length > 0 && journaux.every(j => j.repas_done && j.promenade_done);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.bark} />
    </View>
  );

  if (!paiement || !garde) return (
    <View style={styles.center}>
      <Text style={{ fontSize: 48 }}>💰</Text>
      <Text style={styles.emptyTitle}>Aucune garde en cours</Text>
      <Text style={styles.emptySub}>Les paiements apparaîtront ici une fois une garde confirmée.</Text>
    </View>
  );

  const isPaye     = paiement.statut === 'paye';
  const isDebloque = paiement.statut === 'debloque';
  const statutColor = isPaye ? 'ok' : isDebloque ? 'info' : 'warn';
  const statutLabel = isPaye ? '✓ Payé' : isDebloque ? '⏳ En cours' : '🔒 En attente';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <Card style={styles.montantCard}>
        <View style={styles.montantRow}>
          <View>
            <Text style={styles.montantLabel}>Total garde</Text>
            <Text style={styles.montantVal}>{paiement.montant} €</Text>
            <Text style={styles.montantDetail}>
              {paiement.nb_jours} jour{paiement.nb_jours > 1 ? 's' : ''} × {paiement.tarif_jour} €/jour
            </Text>
          </View>
          <Badge label={statutLabel} color={statutColor} />
        </View>

        {isPaye && (
          <View style={[styles.infoBox, styles.infoBoxOk]}>
            <Text style={[styles.infoText, { color: COLORS.moss }]}>
              ✅ Paiement effectué le {new Date(paiement.paye_at).toLocaleDateString('fr-FR')}.
            </Text>
          </View>
        )}
      </Card>

      <SectionLabel label="Avancement des journaux" />
      <Card>
        {journaux.length === 0 && (
          <Text style={{ color: COLORS.muted, fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>
            Aucun journal envoyé pour l'instant.
          </Text>
        )}
        {journaux.map((j, i) => {
          const complet = j.repas_done && j.promenade_done;
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
                {complet && j.vu_par_proprio
                  ? <Badge label="✓ Validé" color="ok" />
                  : complet
                  ? <Badge label="À valider" color="warn" />
                  : <Badge label="Incomplet" color="warn" />
                }
              </View>
            </View>
          );
        })}
      </Card>

      <SectionLabel label="Conditions de paiement" />
      <Card>
        {[
          { label: 'Tous les journaux remplis',            ok: tousComplets },
          { label: 'Tous les journaux validés par vous',   ok: tousValides  },
          { label: 'Garde terminée',                       ok: garde.statut === 'terminee' || isPaye },
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

      {!isPaye && !isDebloque && (
        <View style={styles.mobileOnlyBox}>
          <Text style={styles.mobileOnlyIcon}>📱</Text>
          <Text style={styles.mobileOnlyTitle}>Paiement disponible sur l'app mobile</Text>
          <Text style={styles.mobileOnlySub}>
            Télécharge l'application PawWatch sur iOS ou Android pour payer par carte via Stripe.
          </Text>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.sand },
  content:   { padding: 16, paddingBottom: 100 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle:{ fontSize: 18, color: COLORS.ink, textAlign: 'center', marginTop: 12 },
  emptySub:  { fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 20, marginTop: 8 },

  montantCard:  { marginBottom: 20 },
  montantRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  montantLabel: { fontSize: 13, color: COLORS.muted, ...FONTS.medium, marginBottom: 4 },
  montantVal:   { fontSize: 36, ...FONTS.heavy, color: COLORS.bark },
  montantDetail:{ fontSize: 13, color: COLORS.muted, marginTop: 2 },

  infoBox:    { backgroundColor: '#EFF6FF', borderRadius: RADIUS.sm, borderWidth: 1, borderColor: '#B3CCEE', padding: 12, marginTop: 14 },
  infoBoxOk:  { backgroundColor: COLORS.okBg, borderColor: COLORS.okBorder },
  infoText:   { fontSize: 13, color: '#3A6BBF', lineHeight: 18 },

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

  mobileOnlyBox:   { marginTop: 20, backgroundColor: COLORS.warm, borderRadius: RADIUS.md, padding: 20, alignItems: 'center', gap: 8 },
  mobileOnlyIcon:  { fontSize: 36 },
  mobileOnlyTitle: { fontSize: 15, ...FONTS.bold, color: COLORS.ink, textAlign: 'center' },
  mobileOnlySub:   { fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 18 },
});
