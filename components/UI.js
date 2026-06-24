// components/UI.js — Composants réutilisables PawWatch
import React from 'react';
import {
  View, Text, TouchableOpacity, Image,
  StyleSheet, Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONTS, RADIUS, SHADOW } from '../lib/theme';

// ─── Badge ───────────────────────────────────────────────────────
export const Badge = ({ label, color = 'default' }) => {
  const bg    = color === 'ok'   ? COLORS.okBg
              : color === 'warn' ? COLORS.warnBg
              : color === 'info' ? COLORS.infoBg
              : COLORS.sand;
  const fg    = color === 'ok'   ? COLORS.moss
              : color === 'warn' ? COLORS.clay
              : color === 'info' ? '#3A6BBF'
              : COLORS.muted;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
};

// ─── Avatar ──────────────────────────────────────────────────────
export const Avatar = ({ initials, size = 38 }) => (
  <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
    <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
  </View>
);

// ─── PhotoUpload ─────────────────────────────────────────────────
export const PhotoUpload = ({ label, icon, onPhoto, photoUri }) => {
  const handlePress = async () => {
    // Demander la permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission galerie requise pour ajouter une photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      onPhoto(result.assets[0].uri);
    }
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission caméra requise.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      onPhoto(result.assets[0].uri);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleCamera}
      onLongPress={handlePress}
      style={[
        styles.photoUpload,
        photoUri && { borderColor: COLORS.moss, borderStyle: 'solid', backgroundColor: COLORS.okBg },
      ]}
    >
      {photoUri ? (
        <>
          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          <Text style={styles.photoAdded}>✓ Photo ajoutée</Text>
        </>
      ) : (
        <>
          <Text style={styles.photoIcon}>{icon}</Text>
          <Text style={styles.photoLabel}>{label}</Text>
          <Text style={styles.photoHint}>📸 Appuyer = caméra · Maintenir = galerie</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

// ─── CheckRow ────────────────────────────────────────────────────
export const CheckRow = ({ label, checked, onToggle }) => (
  <TouchableOpacity
    onPress={onToggle}
    style={[styles.checkRow, checked && styles.checkRowActive]}
    activeOpacity={0.7}
  >
    <View style={[styles.checkbox, checked && styles.checkboxActive]}>
      {checked && <Text style={styles.checkmark}>✓</Text>}
    </View>
    <Text style={styles.checkLabel}>{label}</Text>
  </TouchableOpacity>
);

// ─── Button ──────────────────────────────────────────────────────
export const Button = ({ label, onPress, disabled, variant = 'primary', style }) => {
  const bg = disabled       ? COLORS.border
           : variant === 'primary'   ? COLORS.bark
           : variant === 'success'   ? COLORS.moss
           : variant === 'danger'    ? COLORS.clay
           : COLORS.sand;
  const fg = disabled || variant === 'ghost' ? COLORS.muted : COLORS.white;

  return (
    <TouchableOpacity
      onPress={disabled ? null : onPress}
      activeOpacity={disabled ? 1 : 0.8}
      style={[styles.button, { backgroundColor: bg }, style]}
    >
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </TouchableOpacity>
  );
};

// ─── SectionLabel ────────────────────────────────────────────────
export const SectionLabel = ({ label }) => (
  <Text style={styles.sectionLabel}>{label}</Text>
);

// ─── Card ────────────────────────────────────────────────────────
export const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  badge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, ...FONTS.medium },

  avatar: {
    background: 'linear-gradient(135deg, #C1714A, #5C3D2E)',
    backgroundColor: COLORS.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.white, ...FONTS.bold },

  photoUpload: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    backgroundColor: COLORS.sand,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  photoPreview: {
    width: '100%', height: 80,
    borderRadius: RADIUS.sm,
    marginBottom: 6,
  },
  photoAdded: { fontSize: 11, color: COLORS.moss, ...FONTS.bold },
  photoIcon:  { fontSize: 28, marginBottom: 6 },
  photoLabel: { fontSize: 12, color: COLORS.muted, ...FONTS.medium, marginBottom: 4 },
  photoHint:  { fontSize: 10, color: COLORS.border, textAlign: 'center' },

  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.sand,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 14, marginBottom: 8,
  },
  checkRowActive: {
    backgroundColor: COLORS.okBg,
    borderColor: COLORS.okBorder,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    backgroundColor: COLORS.white,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.moss,
    borderColor: COLORS.moss,
  },
  checkmark: { color: COLORS.white, fontSize: 13, ...FONTS.bold },
  checkLabel: { fontSize: 14, color: COLORS.ink, ...FONTS.medium },

  button: {
    borderRadius: RADIUS.md, padding: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonText: { fontSize: 15, ...FONTS.heavy },

  sectionLabel: {
    fontSize: 12, ...FONTS.bold, color: COLORS.muted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
  },

  card: {
    backgroundColor: COLORS.cream,
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 18,
    marginBottom: 14,
    ...SHADOW.card,
  },
});
