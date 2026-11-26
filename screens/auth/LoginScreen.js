// screens/auth/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator, Dimensions, ImageBackground,
} from 'react-native';

const PASTEL_BG = require('../../assets/pastel.png');
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS } from '../../lib/theme';
import { signIn, signUp } from '../../lib/supabase';

const { height: H } = Dimensions.get('window');

const FieldLabel = ({ text, required }) => (
  <Text style={styles.label}>
    {text}{required && <Text style={{ color: COLORS.clay }}> *</Text>}
  </Text>
);

const SectionBanner = ({ icon, title, sub }) => (
  <View style={styles.sectionBanner}>
    <Text style={styles.sectionBannerIcon}>{icon}</Text>
    <View>
      <Text style={styles.sectionBannerTitle}>{title}</Text>
      {sub && <Text style={styles.sectionBannerSub}>{sub}</Text>}
    </View>
  </View>
);


export default function LoginScreen({ onLogin }) {
  const [mode,     setMode]     = useState('login');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const [prenom,    setPrenom]    = useState('');
  const [nom,       setNom]       = useState('');
  const [role,      setRole]      = useState('proprietaire');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');

  const valider = () => {
    if (mode === 'login') {
      if (!email.trim())   return "L'email est obligatoire.";
      if (!password)       return 'Le mot de passe est obligatoire.';
      return null;
    }
    if (!prenom.trim())    return 'Le prénom est obligatoire.';
    if (!nom.trim())       return 'Le nom est obligatoire.';
    return null;
  };

  const handleSubmit = async () => {
    const err = valider();
    if (err) { setError(err); return; }
    setError(null);
    if (mode === 'register') {
      const nomComplet = `${prenom.trim()} ${nom.trim()}`;
      onLogin({ id: 'new-' + Date.now(), user_metadata: { nom: nomComplet } }, true);
      return;
    }
    setLoading(true);
    try {
      const data = await signIn(email, password);
      onLogin(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => { setMode(m); setError(null); };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      {/* ── TOUT défile ensemble ── */}
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <ImageBackground source={PASTEL_BG} style={styles.hero} imageStyle={styles.heroBg}>
          <View style={styles.heroText}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.heroTitle}>
              <Text style={{ color: COLORS.bark }}>Paw</Text>
              <Text style={{ color: COLORS.moss }}>Watch</Text>
            </Text>
            <Text style={styles.heroSub}>La garde d'animaux en toute confiance</Text>
          </View>
        </ImageBackground>

        <View style={styles.formCard}>

          {/* Toggle login / register */}
          <View style={styles.toggleRow}>
            {[
              { id: 'login',    label: 'Se connecter' },
              { id: 'register', label: "S'inscrire"   },
            ].map(m => (
              <TouchableOpacity
                key={m.id}
                onPress={() => switchMode(m.id)}
                style={[styles.toggleBtn, mode === m.id && styles.toggleBtnActive]}
              >
                <Text style={[styles.toggleText, mode === m.id && styles.toggleTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ════════ INSCRIPTION ════════ */}
          {mode === 'register' ? (
            <>
              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <FieldLabel text="Prénom" required />
                  <TextInput
                    style={styles.input}
                    placeholder="Sophie"
                    placeholderTextColor={COLORS.border}
                    value={prenom}
                    onChangeText={setPrenom}
                    autoCapitalize="words"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FieldLabel text="Nom" required />
                  <TextInput
                    style={styles.input}
                    placeholder="Martin"
                    placeholderTextColor={COLORS.border}
                    value={nom}
                    onChangeText={setNom}
                    autoCapitalize="words"
                  />
                </View>
              </View>

            </>
          ) : (
            <>
              {/* ── Email + MDP (login uniquement) ── */}
              <FieldLabel text="Email" />
              <TextInput
                style={styles.input}
                placeholder="sophie@email.com"
                placeholderTextColor={COLORS.border}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <FieldLabel text="Mot de passe" />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={COLORS.border}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </>
          )}

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#C4741A', '#E8922A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {loading
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.submitText}>
                    {mode === 'login' ? 'Se connecter 🐾' : 'Continuer →'}
                  </Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.legal}>
            En continuant, vous acceptez nos CGU et la politique de confidentialité PawWatch.
          </Text>
        </View>


      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.sand },

  hero:   {
    height: H * 0.55,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#FAF5EE',
    marginHorizontal: -16,
    marginTop: -0,
    marginBottom: 16,
  },
  heroBg: { resizeMode: 'cover', opacity: 0.9 },

  heroText: { alignItems: 'center', paddingTop: 20, marginTop: -38 },
  logo:      { width: 160, height: 160, marginBottom: 14, marginTop: -38 },
  heroTitle: { fontSize: 36, fontFamily: 'KoalaStation', color: COLORS.ink, letterSpacing: 1 },
  heroSub:   { fontSize: 13, color: COLORS.muted, marginTop: 6 },

  formScroll:  { flex: 1 },
  formContent: { paddingHorizontal: 16, paddingBottom: 40 },

  formCard: {
    backgroundColor: COLORS.cream,
    borderRadius: RADIUS.xl,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    marginBottom: 16,
    shadowColor: '#1A2756',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },

  toggleRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.warm,
    borderRadius: RADIUS.md, padding: 3, marginBottom: 20,
  },
  toggleBtn:        { flex: 1, padding: 10, borderRadius: RADIUS.sm - 2, alignItems: 'center' },
  toggleBtnActive:  { backgroundColor: COLORS.white, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  toggleText:       { fontSize: 14, color: COLORS.muted, ...FONTS.medium },
  toggleTextActive: { color: COLORS.bark, ...FONTS.bold },

  label: { fontSize: 11, ...FONTS.bold, color: COLORS.muted, marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 13,
    fontSize: 15, color: COLORS.ink,
  },
  pwdHint: { fontSize: 11, color: COLORS.muted, marginTop: 5 },

  row2: { flexDirection: 'row', gap: 10, marginTop: 4 },

  roleList: { gap: 8, marginTop: 4, marginBottom: 4 },
  roleItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 14,
  },
  roleItemActive:  { borderColor: COLORS.bark, backgroundColor: '#FFF4E6' },

  roleItemEmoji:   { fontSize: 22 },
  roleItemLabel:   { fontSize: 14, ...FONTS.bold, color: COLORS.ink, marginBottom: 2 },
  roleItemSub:     { fontSize: 12, color: COLORS.muted },
  roleCheck:       { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  roleCheckActive: { backgroundColor: COLORS.bark, borderColor: COLORS.bark },
  roleCheckMark:   { color: COLORS.white, fontSize: 13, ...FONTS.bold },

  petsitterInfo: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#FFF4E6',
    borderWidth: 1.5, borderColor: COLORS.bark,
    borderRadius: RADIUS.md, padding: 14, marginTop: 10,
  },
  petsitterInfoIcon:  { fontSize: 22, marginTop: 2 },
  petsitterInfoTitle: { fontSize: 13, ...FONTS.heavy, color: COLORS.bark, marginBottom: 4 },
  petsitterInfoSub:   { fontSize: 12, color: COLORS.muted, lineHeight: 18 },

  sectionBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.warm, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 10,
    marginTop: 20, marginBottom: 6,
    borderLeftWidth: 3, borderLeftColor: COLORS.bark,
  },
  sectionBannerIcon:  { fontSize: 20 },
  sectionBannerTitle: { fontSize: 13, ...FONTS.heavy, color: COLORS.ink },
  sectionBannerSub:   { fontSize: 11, color: COLORS.muted, marginTop: 1 },

  errorBox:  { backgroundColor: COLORS.warnBg, borderWidth: 1, borderColor: COLORS.warnBorder, borderRadius: RADIUS.sm, padding: 12, marginTop: 12 },
  errorText: { fontSize: 13, color: COLORS.clay },

  submitBtn:      { marginTop: 22, borderRadius: RADIUS.md, overflow: 'hidden' },
  submitGradient: { padding: 16, alignItems: 'center' },
  submitText:     { fontSize: 16, ...FONTS.heavy, color: COLORS.white },

  legal: { fontSize: 11, color: COLORS.border, textAlign: 'center', marginTop: 18, lineHeight: 16 },

  demoBox: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: 18, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  demoLabel:    { fontSize: 12, ...FONTS.bold, color: COLORS.muted, textAlign: 'center', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  demoRow:      { flexDirection: 'row', alignItems: 'center' },
  demoDivider:  { width: 1, height: 40, backgroundColor: COLORS.border, marginHorizontal: 8 },
  demoBtn:      { flex: 1, alignItems: 'center', gap: 4 },
  demoBtnEmoji: { fontSize: 26 },
  demoBtnText:  { fontSize: 13, ...FONTS.bold, color: COLORS.bark },

  // ── Admin ──
  adminBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.lg,
    paddingHorizontal: 18, paddingVertical: 14,
    marginTop: 10,
  },
  adminLeft:  { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  adminIcon:  { fontSize: 22 },
  adminTitle: { fontSize: 14, ...FONTS.heavy, color: '#F1F5F9', marginBottom: 2 },
  adminSub:   { fontSize: 11, color: '#94A3B8' },
  adminArrow: { fontSize: 22, color: '#64748B', marginLeft: 8 },
});
