// screens/proprietaire/PaiementScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../lib/theme';
import { Badge, Card, SectionLabel } from '../../components/UI';
import { getPaiement, debloquerPaiement } from '../../lib/supabase';
import { sendLocalNotification } from '../../hooks/useNotifications';

// 👉 URL de ton backend (Supabase Edge Function ou serveur Node)
const BACKEND_URL = 'https://TON_PROJECT.supabase.co/functions/v1';

export default function PaiementScreen({ garde }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [paiement,      setPaiement]      = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [paying,        setPaying]        = useState(false);
  const [confirmModal,  setConfirmModal]  = useState(false);

  useEffect(() => { loadPaiement(); }, []);

  const loadPaiement = async () => {
    try {
      const data = await getPaiement(garde.id);
      setPaiement(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const journauxComplets = garde.journaux?.filter(j => j.repas_done && j.promenade_done).length ?? 0;
  const journauxTotal    = garde.journaux?.length ?? 0;
  const peutDebloquer    = journauxComplets >= journauxTotal && journauxTotal > 0;
  const progress         = journauxTotal > 0 ? journauxComplets / journauxTotal : 0;

  // ── Débloquer le solde ──────────────────────────────────────────
  const handleDebloquer = async () => {
    setConfirmModal(false);
    try {
      await debloquerPaiement(garde.id);
      setPaiement(p => ({ ...p, statut: 'debloque' }));
      await sendLocalNotification({
        title: '🔓 Paiement débloqué !',
        body:  `${garde.users?.nom} va recevoir ${paiement?.montant_solde}€`,
      });
    } catch (e) {
      Alert.alert('Erreur', e.message);
    }
  };

  // ── Payer avec Stripe ───────────────────────────────────────────
  const handlePayer = async () => {
    setPaying(true);
    try {
      // 1. Demander un PaymentIntent à ton backend
      const res = await fetch(`${BACKEND_URL}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ garde_id: garde.id, montant: paiement.montant_solde }),
      });
      const { clientSecret, ephemeralKey, customerId } = await res.json();

      // 2. Initialiser Stripe Payment Sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName:  'PawWatch',
        customerId,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret:  clientSecret,
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: { name: 'Propriétaire PawWatch' },
        appearance: {
          colors: {
            primary:         COLORS.bark,
            background:      COLORS.cream,
            componentBackground: COLORS.white,
          },
        },
      });
      if (initError) throw new Error(initError.message);

      // 3. Présenter la feuille de paiement
      const { error: payError } = await presentPaymentSheet();
      if (payError) throw new Error(payError.message);

      // 4. Succès
      setPaiement(p => ({ ...p, statut: 'paye' }));
      await sendLocalNotification({
        title: '✅ Paiement effectué !',
        body:  `Merci d'avoir utilisé PawWatch. ${garde.users?.nom} a été payé(e) 🐾`,
      });

    } catch (e) {
      if (e.message !== 'Canceled') Alert.alert('Erreur paiement', e.message);
    } finally {
      setPaying(false);
    }
  };

  if (loading) return (
    <View style={styles.center}><ActivityIndicator size="large" color={COLORS.bark} /></View>
  );

  const historique = [
    { id: 1, label: 'Acompte à la réservation (30%)', montant: paiement?.montant_acompte ?? 0, statut: 'payé' },
    { id: 2, label: 'Solde fin de garde (70%)',        montant: paiement?.montant_solde   ?? 0, statut: paiement?.statut ?? 'bloqué' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Carte solde */}
      <View style={styles.soldeCard}>
        <Text style={styles.soldeLabel}>GARDE {(garde.animaux?.nom ?? '').toUpperCase()} — {(garde.users?.nom ?? '').toUpperCase()}</Text>
        <Text style={styles.soldeMontant}>{paiement?.montant_total ?? 0}€</Text>
        <Text style={styles.soldeSub}>{journauxTotal} jours · {((paiement?.montant_total ?? 0) / (journauxTotal || 1)).toFixed(0)}€/jour</Text>

        {/* Barre progression */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, {
            width: `${progress * 100}%`,
            backgroundColor: peutDebloquer ? '#6FCF97' : '#F2C94C',
          }]} />
        </View>
        <Text style={styles.progressLabel}>
          {journauxComplets}/{journauxTotal} journaux complets · {peutDebloquer ? 'Prêt à débloquer ✓' : 'En cours...'}
        </Text>
      </View>

      {/* Détail */}
      <SectionLabel label="Détail du paiement" />
      {historique.map(h => (
        <Card key={h.id} style={styles.ligneCard}>
          <View>
            <Text style={styles.ligneLabel}>{h.label}</Text>
            <Text style={styles.ligneDate}>{h.date ?? '—'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.ligneMontant}>{h.montant}€</Text>
            <Badge
              label={h.statut === 'payé' ? '✓ Payé' : h.statut === 'debloque' ? '🔓 Débloqué' : '🔒 Bloqué'}
              color={h.statut === 'payé' ? 'ok' : h.statut === 'debloque' ? 'info' : 'warn'}
            />
          </View>
        </Card>
      ))}

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          🔒 Le solde est débloqué automatiquement quand <Text style={styles.infoBold}>tous les journaux sont complets avec photos.</Text>
        </Text>
      </View>

      {/* CTA */}
      {paiement?.statut === 'bloque' && (
        <TouchableOpacity
          style={[styles.cta, !peutDebloquer && styles.ctaDisabled]}
          onPress={() => peutDebloquer && setConfirmModal(true)}
          disabled={!peutDebloquer}
        >
          <Text style={styles.ctaText}>
            {peutDebloquer ? '🔓 Débloquer le paiement' : '⏳ Journaux incomplets'}
          </Text>
        </TouchableOpacity>
      )}

      {paiement?.statut === 'debloque' && (
        <TouchableOpacity style={[styles.cta, { backgroundColor: COLORS.clay }]} onPress={handlePayer} disabled={paying}>
          {paying
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.ctaText}>💳 Payer maintenant — {paiement.montant_solde}€</Text>
          }
        </TouchableOpacity>
      )}

      {paiement?.statut === 'paye' && (
        <View style={styles.successBox}>
          <Text style={{ fontSize: 40 }}>🎉</Text>
          <Text style={styles.successTitle}>Garde terminée & payée !</Text>
        </View>
      )}

      {/* Modal confirmation */}
      <Modal visible={confirmModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Confirmer le déblocage ?</Text>
            <Text style={styles.modalSub}>
              {paiement?.montant_solde}€ seront transférés à {garde.users?.nom} une fois la garde terminée.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setConfirmModal(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleDebloquer}>
                <Text style={styles.modalConfirmText}>✓ Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.sand },
  content:   { padding: 16, paddingBottom: 100 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  soldeCard: {
    background: 'linear-gradient(135deg, #5C3D2E, #8B5A3A)',
    backgroundColor: COLORS.bark,
    borderRadius: RADIUS.xl, padding: 22, marginBottom: 20,
  },
  soldeLabel:   { fontSize: 11, color: 'rgba(255,255,255,0.7)', ...FONTS.bold, marginBottom: 4 },
  soldeMontant: { fontSize: 40, ...FONTS.heavy, color: COLORS.white, marginBottom: 2 },
  soldeSub:     { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 16 },
  progressBg:   { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, height: 8 },
  progressFill: { height: 8, borderRadius: 8, transition: 'width 0.5s' },
  progressLabel:{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 8 },

  ligneCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ligneLabel:  { fontSize: 14, ...FONTS.medium, color: COLORS.ink, marginBottom: 4 },
  ligneDate:   { fontSize: 12, color: COLORS.muted },
  ligneMontant:{ fontSize: 18, ...FONTS.heavy, color: COLORS.ink, marginBottom: 4 },

  infoBox: {
    backgroundColor: '#F0F5FF', borderWidth: 1, borderColor: '#C3D4F5',
    borderRadius: RADIUS.md, padding: 14, marginBottom: 20,
  },
  infoText: { fontSize: 13, color: '#3A5FA0', lineHeight: 18 },
  infoBold: { ...FONTS.bold },

  cta: {
    backgroundColor: COLORS.moss, borderRadius: RADIUS.md,
    padding: 16, alignItems: 'center', marginBottom: 12,
  },
  ctaDisabled: { backgroundColor: COLORS.border },
  ctaText: { fontSize: 16, ...FONTS.heavy, color: COLORS.white },

  successBox: {
    backgroundColor: COLORS.okBg, borderWidth: 1, borderColor: COLORS.okBorder,
    borderRadius: RADIUS.lg, padding: 28, alignItems: 'center',
  },
  successTitle: { fontSize: 18, ...FONTS.bold, color: COLORS.moss, marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:   {
    backgroundColor: COLORS.cream, borderRadius: '20px 20px 0 0',
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 28,
  },
  modalTitle:  { fontSize: 18, ...FONTS.heavy, color: COLORS.ink, marginBottom: 8 },
  modalSub:    { fontSize: 14, color: COLORS.muted, marginBottom: 24 },
  modalBtns:   { flexDirection: 'row', gap: 10 },
  modalCancel: {
    flex: 1, padding: 14, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.sand,
    alignItems: 'center',
  },
  modalCancelText:  { fontSize: 14, ...FONTS.medium, color: COLORS.muted },
  modalConfirm:     { flex: 2, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.moss, alignItems: 'center' },
  modalConfirmText: { fontSize: 15, ...FONTS.heavy, color: COLORS.white },
});
