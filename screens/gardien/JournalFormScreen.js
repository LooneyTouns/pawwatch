// screens/gardien/JournalFormScreen.js
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../lib/theme';
import { PhotoUpload, CheckRow, Button, Card, SectionLabel } from '../../components/UI';
import { soumettreJournal, uploadPhoto } from '../../lib/supabase';
import { sendLocalNotification } from '../../hooks/useNotifications';

export default function JournalFormScreen({ garde, user, onSubmit }) {
  const [repas,          setRepas]          = useState(false);
  const [promenade,      setPromenade]      = useState(false);
  const [photoRepas,     setPhotoRepas]     = useState(null);
  const [photoPromenade, setPhotoPromenade] = useState(null);
  const [note,           setNote]           = useState('');
  const [humeur,         setHumeur]         = useState('😊');
  const [loading,        setLoading]        = useState(false);
  const [submitted,      setSubmitted]      = useState(false);

  // Validation : chaque activité cochée doit avoir sa photo
  const canSubmit = (repas ? !!photoRepas : true) && (promenade ? !!photoPromenade : true) && (repas || promenade);

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return `${loc.coords.latitude.toFixed(5)},${loc.coords.longitude.toFixed(5)}`;
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);

    try {
      const coords = promenade ? await getLocation() : null;
      const now = new Date().toTimeString().slice(0, 5);

      // 1. Créer le journal dans Supabase
      const journal = await soumettreJournal(garde.id, {
        date:              new Date().toISOString(),
        repas_done:        repas,
        repas_heure:       repas ? now : null,
        promenade_done:    promenade,
        promenade_heure:   promenade ? now : null,
        promenade_coords:  coords,
        note,
        humeur,
        gardien_id:        user.id,
      });

      // 2. Uploader les photos
      if (repas && photoRepas)         await uploadPhoto(journal.id, 'repas',     photoRepas);
      if (promenade && photoPromenade) await uploadPhoto(journal.id, 'promenade', photoPromenade);

      // 3. Notif locale (le proprio recevra une notif push via Supabase Edge Function)
      await sendLocalNotification({
        title: '📋 Journal envoyé !',
        body:  'Le propriétaire a été notifié. Bonne journée ! 🐾',
      });

      setSubmitted(true);
      if (onSubmit) onSubmit(journal);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) return (
    <View style={styles.successContainer}>
      <Text style={styles.successIcon}>✅</Text>
      <Text style={styles.successTitle}>Journal envoyé !</Text>
      <Text style={styles.successSub}>
        Le propriétaire a reçu une notification.{'\n'}Le paiement avance d'un pas 🎉
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* Rappel */}
      <View style={styles.reminderBox}>
        <Text style={styles.reminderText}>
          📌 Les photos sont obligatoires pour chaque activité cochée. Le paiement est bloqué jusqu'à ce que tous les journaux soient complets.
        </Text>
      </View>

      <Text style={styles.formTitle}>📋 Journal du jour — {garde.animaux?.nom} {garde.animaux?.emoji}</Text>

      {/* ── REPAS ── */}
      <SectionLabel label="Repas" />
      <CheckRow label="🍗 Repas donné" checked={repas} onToggle={() => setRepas(!repas)} />
      {repas && (
        <PhotoUpload
          label="Photo du repas"
          icon="📸"
          onPhoto={setPhotoRepas}
          photoUri={photoRepas}
        />
      )}
      {repas && !photoRepas && (
        <Text style={styles.photoWarning}>📸 Photo du repas obligatoire</Text>
      )}

      {/* ── PROMENADE ── */}
      <SectionLabel label="Promenade" />
      <CheckRow label="🌳 Promenade effectuée" checked={promenade} onToggle={() => setPromenade(!promenade)} />
      {promenade && (
        <>
          <PhotoUpload
            label="Photo de la balade"
            icon="🐾"
            onPhoto={setPhotoPromenade}
            photoUri={photoPromenade}
          />
          <View style={styles.geoBox}>
            <Text style={styles.geoText}>📍 La géolocalisation sera enregistrée automatiquement à l'envoi.</Text>
          </View>
        </>
      )}
      {promenade && !photoPromenade && (
        <Text style={styles.photoWarning}>📸 Photo de la promenade obligatoire</Text>
      )}

      {/* ── HUMEUR ── */}
      <SectionLabel label="Humeur de l'animal" />
      <View style={styles.humeurRow}>
        {['😄', '😊', '😐', '😟', '🤒'].map(e => (
          <TouchableOpacity
            key={e}
            onPress={() => setHumeur(e)}
            style={[styles.humeurBtn, humeur === e && styles.humeurBtnActive]}
          >
            <Text style={styles.humeurEmoji}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── NOTE ── */}
      <SectionLabel label="Note du jour" />
      <TextInput
        style={styles.noteInput}
        value={note}
        onChangeText={setNote}
        placeholder="Comment s'est passée la journée ? Comportement, incidents, observations..."
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {/* ── ENVOYER ── */}
      <TouchableOpacity
        style={[styles.submitBtn, (!canSubmit || loading) && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit || loading}
        activeOpacity={0.8}
      >
        {loading
          ? <ActivityIndicator color={COLORS.white} />
          : <Text style={styles.submitText}>
              {canSubmit ? '📤 Envoyer le journal' : '⚠ Cochez et ajoutez les photos'}
            </Text>
        }
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.sand },
  content:   { padding: 16, paddingBottom: 120 },

  reminderBox: {
    backgroundColor: COLORS.okBg, borderWidth: 1, borderColor: COLORS.okBorder,
    borderRadius: RADIUS.md, padding: 12, marginBottom: 18,
  },
  reminderText: { fontSize: 13, color: COLORS.moss, lineHeight: 18 },

  formTitle: { fontSize: 16, ...FONTS.bold, color: COLORS.ink, marginBottom: 18 },

  photoWarning: { fontSize: 12, color: COLORS.clay, marginTop: 6, marginBottom: 4 },

  geoBox: {
    backgroundColor: COLORS.infoBg, borderRadius: RADIUS.sm,
    padding: 10, marginTop: 8,
  },
  geoText: { fontSize: 12, color: '#3A6BBF' },

  humeurRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  humeurBtn: {
    padding: 8, borderRadius: RADIUS.sm,
    borderWidth: 2, borderColor: 'transparent',
  },
  humeurBtnActive: {
    backgroundColor: COLORS.warm, borderColor: COLORS.clay,
  },
  humeurEmoji: { fontSize: 28 },

  noteInput: {
    backgroundColor: COLORS.cream, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 14, fontSize: 14, color: COLORS.ink,
    minHeight: 100, marginBottom: 24,
  },

  submitBtn: {
    backgroundColor: COLORS.bark, borderRadius: RADIUS.md,
    padding: 16, alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: COLORS.border },
  submitText: { fontSize: 15, ...FONTS.heavy, color: COLORS.white },

  successContainer: {
    flex: 1, backgroundColor: COLORS.okBg,
    alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  successIcon:  { fontSize: 64, marginBottom: 20 },
  successTitle: { fontSize: 22, ...FONTS.heavy, color: COLORS.moss, marginBottom: 12 },
  successSub:   { fontSize: 15, color: COLORS.muted, textAlign: 'center', lineHeight: 22 },
});
