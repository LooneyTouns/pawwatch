// screens/auth/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS, RADIUS } from '../../lib/theme';
import { signIn, signUp } from '../../lib/supabase';

const PawIcon = () => (
  <Text style={{ fontSize: 52, textAlign: 'center' }}>🐾</Text>
);

export default function LoginScreen({ onLogin }) {
  const [mode, setMode]         = useState('login'); // 'login' | 'register'
  const [role, setRole]         = useState('proprietaire');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const data = await signIn(email, password);
        onLogin(data.user);
      } else {
        const data = await signUp(email, password, nom, role);
        onLogin(data.user);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.header}>
          <PawIcon />
          <Text style={styles.title}>PawWatch</Text>
          <Text style={styles.subtitle}>La garde d'animaux en toute confiance</Text>
        </View>

        {/* Toggle login / register */}
        <View style={styles.toggleRow}>
          {[{ id: 'login', label: 'Se connecter' }, { id: 'register', label: "S'inscrire" }].map(m => (
            <TouchableOpacity
              key={m.id}
              onPress={() => setMode(m.id)}
              style={[styles.toggleBtn, mode === m.id && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, mode === m.id && styles.toggleTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Champs */}
        <View style={styles.form}>
          {mode === 'register' && (
            <>
              <Text style={styles.label}>Prénom et nom</Text>
              <TextInput
                style={styles.input}
                placeholder="Sophie Martin"
                value={nom}
                onChangeText={setNom}
                autoCapitalize="words"
              />

              {/* Rôle */}
              <Text style={styles.label}>Je suis…</Text>
              <View style={styles.roleRow}>
                {[
                  { id: 'proprietaire', label: '🏠 Propriétaire', sub: "Je confie mon animal" },
                  { id: 'gardien',      label: '🤝 Gardien',      sub: "Je garde des animaux" },
                ].map(r => (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => setRole(r.id)}
                    style={[styles.roleCard, role === r.id && styles.roleCardActive]}
                  >
                    <Text style={styles.roleLabel}>{r.label}</Text>
                    <Text style={styles.roleSub}>{r.sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="sophie@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={styles.submitText}>
                  {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                </Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={styles.legal}>
          En continuant, vous acceptez nos CGU et la politique de confidentialité PawWatch.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.sand },
  scroll:    { flexGrow: 1, padding: 24, justifyContent: 'center' },

  header: { alignItems: 'center', marginBottom: 36 },
  title:  { fontSize: 32, ...FONTS.heavy, color: COLORS.bark, marginTop: 12 },
  subtitle: { fontSize: 14, color: COLORS.muted, marginTop: 4 },

  toggleRow: {
    flexDirection: 'row', backgroundColor: COLORS.warm,
    borderRadius: RADIUS.md, padding: 3, marginBottom: 28,
  },
  toggleBtn: {
    flex: 1, padding: 10, borderRadius: RADIUS.sm - 2,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: COLORS.white },
  toggleText:     { fontSize: 14, color: COLORS.muted, ...FONTS.medium },
  toggleTextActive: { color: COLORS.bark, ...FONTS.bold },

  form: { gap: 4 },
  label: { fontSize: 13, ...FONTS.bold, color: COLORS.muted, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: COLORS.cream,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 14,
    fontSize: 15, color: COLORS.ink,
  },

  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  roleCard: {
    flex: 1, backgroundColor: COLORS.cream,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 14,
  },
  roleCardActive: { borderColor: COLORS.bark, backgroundColor: COLORS.warm },
  roleLabel: { fontSize: 14, ...FONTS.bold, color: COLORS.ink, marginBottom: 4 },
  roleSub:   { fontSize: 12, color: COLORS.muted },

  errorBox: {
    backgroundColor: COLORS.warnBg, borderWidth: 1,
    borderColor: COLORS.warnBorder, borderRadius: RADIUS.sm,
    padding: 12, marginTop: 8,
  },
  errorText: { fontSize: 13, color: COLORS.clay },

  submitBtn: {
    backgroundColor: COLORS.bark, borderRadius: RADIUS.md,
    padding: 16, alignItems: 'center', marginTop: 24,
  },
  submitText: { fontSize: 16, ...FONTS.heavy, color: COLORS.white },

  legal: {
    fontSize: 11, color: COLORS.border,
    textAlign: 'center', marginTop: 32, lineHeight: 16,
  },
});
