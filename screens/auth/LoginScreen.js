// screens/auth/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator, Dimensions,
} from 'react-native';
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

const formatDate = (raw, prev) => {
  const digits = raw.replace(/\D/g, '');
  if (raw.length < prev.length) return raw;
  let out = digits;
  if (digits.length > 2) out = digits.slice(0, 2) + '/' + digits.slice(2);
  if (digits.length > 4) out = digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4, 8);
  return out;
};

export default function LoginScreen({ onLogin }) {
  const [mode,     setMode]     = useState('login');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const [prenom,    setPrenom]    = useState('');
  const [nom,       setNom]       = useState('');
  const [dateNaiss, setDateNaiss] = useState('');
  const [role,      setRole]      = useState('proprietaire');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');

  const valider = () => {
    if (mode === 'login') return null;
    if (!prenom.trim())    return 'Le prénom est obligatoire.';
    if (!nom.trim())       return 'Le nom est obligatoire.';
    if (!dateNaiss.trim()) return 'La date de naissance est obligatoire.';
    if (dateNaiss.replace(/\D/g, '').length < 8)
      return 'Date de naissance invalide (JJ/MM/AAAA).';
    if (!email.trim())     return "L'email est obligatoire.";
    if (!password || password.length < 6)
      return 'Le mot de passe doit contenir au moins 6 caractères.';
    return null;
  };

  const handleSubmit = async () => {
    if (mode === 'login' && email.trim() === 'admin@pawwatch.app' && password === 'PawAdmin2024!') {
      onLogin({ id: 'admin-pawwatch', email: 'admin@pawwatch.app', user_metadata: { nom: 'Admin PawWatch', role: 'les_deux', isAdmin: true } });
      return;
    }
    const err = valider();
    if (err) { setError(err); return; }
    setError(null);
    setLoading(true);
    try {
      const nomComplet = `${prenom.trim()} ${nom.trim()}`;
      if (mode === 'login') {
        const data = await signIn(email, password);
        onLogin(data.user);
      } else {
        const data = await signUp(email, password, nomComplet, role);
        onLogin(data.user, true);
      }
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
      {/* ── HERO ── */}
      <LinearGradient
        colors={['#1A2756', '#C4741A', '#E8922A']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={[styles.circle, { width: 220, height: 220, top: -60, right: -60, backgroundColor: 'rgba(255,255,255,0.1)' }]} />
        <View style={[styles.circle, { width: 140, height: 140, top: 40,  left: -50, backgroundColor: 'rgba(255,255,255,0.07)' }]} />
        <View style={[styles.circle, { width: 90,  height: 90,  bottom: 30, right: 30, backgroundColor: 'rgba(255,255,255,0.08)' }]} />

        {/* Ombre chien qui court */}
        <Text style={styles.dogShadow1}>🐕</Text>
        <Text style={styles.dogShadow2}>🐕</Text>

        <View style={styles.heroText}>
          <View style={styles.logoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.heroTitle}>PawWatch</Text>
          <Text style={styles.heroSub}>La garde d'animaux en toute confiance</Text>
        </View>
      </LinearGradient>

      {/* ── FORMULAIRE ── */}
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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
          {mode === 'register' && (
            <>
              <SectionBanner icon="👤" title="Identité" sub="Informations personnelles" />

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

              <FieldLabel text="Date de naissance" required />
              <TextInput
                style={styles.input}
                placeholder="JJ/MM/AAAA"
                placeholderTextColor={COLORS.border}
                value={dateNaiss}
                onChangeText={v => setDateNaiss(formatDate(v, dateNaiss))}
                keyboardType="numeric"
                maxLength={10}
              />

              {/* ── Rôle ── */}
              <FieldLabel text="Je suis…" required />
              <View style={styles.roleList}>
                {[
                  { id: 'proprietaire', emoji: '🏠', label: 'Propriétaire', sub: 'Je confie mon animal à un petsitter' },
                  { id: 'petsitter',    emoji: '🤝', label: 'Petsitter',    sub: 'Je garde les animaux des autres' },
                  { id: 'les_deux',     emoji: '🌟', label: 'Les deux',     sub: 'Je suis proprio ET petsitter' },
                ].map(r => (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => setRole(r.id)}
                    style={[styles.roleItem, role === r.id && styles.roleItemActive]}
                  >
                    <Text style={styles.roleItemEmoji}>{r.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.roleItemLabel, role === r.id && { color: COLORS.bark }]}>{r.label}</Text>
                      <Text style={styles.roleItemSub}>{r.sub}</Text>
                    </View>
                    <View style={[styles.roleCheck, role === r.id && styles.roleCheckActive]}>
                      {role === r.id && <Text style={styles.roleCheckMark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <SectionBanner icon="🔐" title="Mon compte" sub="Email et mot de passe" />
            </>
          )}

          {/* ── Email + MDP ── */}
          <FieldLabel text="Email" required={mode === 'register'} />
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

          <FieldLabel text="Mot de passe" required={mode === 'register'} />
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={COLORS.border}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {mode === 'register' && (
            <Text style={styles.pwdHint}>Minimum 6 caractères</Text>
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
                    {mode === 'login' ? 'Se connecter 🐾' : 'Créer mon compte 🐾'}
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

  hero: { height: H * 0.38, justifyContent: 'flex-end', overflow: 'hidden' },
  circle: { position: 'absolute', borderRadius: 999 },

  dogShadow1: {
    position: 'absolute',
    fontSize: 140,
    opacity: 0.13,
    bottom: -10,
    left: -10,
    transform: [{ rotate: '-8deg' }, { scaleX: -1 }],
  },
  dogShadow2: {
    position: 'absolute',
    fontSize: 80,
    opacity: 0.08,
    bottom: 30,
    left: 110,
    transform: [{ rotate: '-8deg' }, { scaleX: -1 }],
  },
  heroText: { alignItems: 'center', justifyContent: 'center', flex: 1, paddingBottom: 20 },
  logoWrap: {
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  logo:      { width: 120, height: 120 },
  heroTitle: { fontSize: 28, ...FONTS.heavy, color: COLORS.white, letterSpacing: 1 },
  heroSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  formScroll:  { flex: 1, marginTop: -24 },
  formContent: { paddingHorizontal: 16, paddingBottom: 40 },

  formCard: {
    backgroundColor: COLORS.cream,
    borderRadius: RADIUS.xl,
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
