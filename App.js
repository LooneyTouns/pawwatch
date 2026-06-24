// App.js — Point d'entrée PawWatch
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { COLORS, FONTS, RADIUS } from './lib/theme';
import { getUser, signOut }       from './lib/supabase';
import { useNotifications, scheduleJournalReminder } from './hooks/useNotifications';

// Écrans
import LoginScreen      from './screens/auth/LoginScreen';
import JournalScreen    from './screens/proprietaire/JournalScreen';
import PaiementScreen   from './screens/proprietaire/PaiementScreen';
import JournalFormScreen from './screens/gardien/JournalFormScreen';

// 👉 Clé publique Stripe (dashboard.stripe.com)
const STRIPE_KEY = 'pk_test_TON_CLE_PUBLIQUE_STRIPE';

// Données de garde mock (remplace par un vrai fetch Supabase)
const MOCK_GARDE = {
  id: 'garde-001',
  date_debut: '2026-06-23', date_fin: '2026-06-26',
  animaux:  { nom: 'Luna', emoji: '🐕', espece: 'Chien' },
  users:    { nom: 'Sophie M.' },
  journaux: [],
};

// ─── Paw SVG en texte emoji ───────────────────────────────────────
const PawIcon = () => <Text style={{ fontSize: 20 }}>🐾</Text>;

export default function App() {
  const [user,      setUser]      = useState(null);
  const [role,      setRole]      = useState(null); // 'proprietaire' | 'gardien'
  const [activeTab, setActiveTab] = useState('journal');
  const [loading,   setLoading]   = useState(true);

  // Hook notifications
  useNotifications(user?.id);

  useEffect(() => {
    // Vérifie si un utilisateur est déjà connecté
    getUser().then(u => {
      if (u) {
        setUser(u);
        // TODO: récupérer le rôle depuis Supabase users table
        setRole(u.user_metadata?.role ?? 'proprietaire');
      }
      setLoading(false);
    });
  }, []);

  const handleLogin = (u) => {
    setUser(u);
    setRole(u.user_metadata?.role ?? 'proprietaire');
    // Planifier rappel quotidien si gardien
    if (u.user_metadata?.role === 'gardien') {
      scheduleJournalReminder(u.user_metadata?.nom ?? 'Gardien');
    }
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setRole(null);
    setActiveTab('journal');
  };

  if (loading) return (
    <View style={styles.splash}>
      <Text style={{ fontSize: 64 }}>🐾</Text>
      <Text style={styles.splashTitle}>PawWatch</Text>
    </View>
  );

  if (!user) return (
    <StripeProvider publishableKey={STRIPE_KEY}>
      <LoginScreen onLogin={handleLogin} />
    </StripeProvider>
  );

  // Navigation tabs selon rôle
  const tabs = role === 'proprietaire'
    ? [
        { id: 'journal',  icon: '📋', label: 'Journal'  },
        { id: 'paiement', icon: '💳', label: 'Paiement' },
        { id: 'notifs',   icon: '🔔', label: 'Notifs'   },
        { id: 'profil',   icon: '👤', label: 'Profil'   },
      ]
    : [
        { id: 'journal',  icon: '📋', label: 'Journal'  },
        { id: 'demandes', icon: '📨', label: 'Demandes' },
        { id: 'notifs',   icon: '🔔', label: 'Notifs'   },
        { id: 'profil',   icon: '👤', label: 'Profil'   },
      ];

  const renderScreen = () => {
    if (role === 'proprietaire') {
      if (activeTab === 'journal')  return <JournalScreen  garde={MOCK_GARDE} user={user} />;
      if (activeTab === 'paiement') return <PaiementScreen garde={MOCK_GARDE} />;
      if (activeTab === 'notifs')   return <PlaceholderScreen title="Notifications" icon="🔔" />;
      if (activeTab === 'profil')   return <ProfilScreen user={user} onLogout={handleLogout} />;
    } else {
      if (activeTab === 'journal')  return <JournalFormScreen garde={MOCK_GARDE} user={user} />;
      if (activeTab === 'demandes') return <PlaceholderScreen title="Demandes reçues" icon="📨" />;
      if (activeTab === 'notifs')   return <PlaceholderScreen title="Notifications" icon="🔔" />;
      if (activeTab === 'profil')   return <ProfilScreen user={user} onLogout={handleLogout} />;
    }
  };

  return (
    <StripeProvider publishableKey={STRIPE_KEY}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bark} />
      <View style={styles.app}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <PawIcon />
            <Text style={styles.headerTitle}>PawWatch</Text>
          </View>

          {/* Toggle Proprio / Gardien */}
          <View style={styles.roleToggle}>
            {[
              { id: 'proprietaire', label: '🏠' },
              { id: 'gardien',      label: '🤝' },
            ].map(r => (
              <TouchableOpacity
                key={r.id}
                onPress={() => { setRole(r.id); setActiveTab('journal'); }}
                style={[styles.roleBtn, role === r.id && styles.roleBtnActive]}
              >
                <Text style={[styles.roleBtnText, role === r.id && styles.roleBtnTextActive]}>{r.label} {r.id === 'proprietaire' ? 'Proprio' : 'Gardien'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Contenu ── */}
        <View style={styles.screen}>
          {renderScreen()}
        </View>

        {/* ── Bottom Nav ── */}
        <View style={styles.bottomNav}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={styles.navItem}
              activeOpacity={0.7}
            >
              <Text style={styles.navIcon}>{tab.icon}</Text>
              <Text style={[styles.navLabel, activeTab === tab.id && styles.navLabelActive]}>
                {tab.label}
              </Text>
              {activeTab === tab.id && <View style={styles.navDot} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </StripeProvider>
  );
}

// ─── Écran profil minimal ─────────────────────────────────────────
const ProfilScreen = ({ user, onLogout }) => (
  <View style={styles.profilContainer}>
    <Text style={{ fontSize: 64 }}>👤</Text>
    <Text style={styles.profilNom}>{user.user_metadata?.nom ?? user.email}</Text>
    <Text style={styles.profilEmail}>{user.email}</Text>
    <TouchableOpacity onPress={onLogout} style={styles.logoutBtn}>
      <Text style={styles.logoutText}>Se déconnecter</Text>
    </TouchableOpacity>
  </View>
);

// ─── Placeholder ─────────────────────────────────────────────────
const PlaceholderScreen = ({ title, icon }) => (
  <View style={styles.placeholder}>
    <Text style={{ fontSize: 52 }}>{icon}</Text>
    <Text style={styles.placeholderTitle}>{title}</Text>
    <Text style={styles.placeholderSub}>Fonctionnalité à venir</Text>
  </View>
);

// ─── Styles globaux ───────────────────────────────────────────────
const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: COLORS.sand },

  splash: { flex: 1, backgroundColor: COLORS.bark, alignItems: 'center', justifyContent: 'center' },
  splashTitle: { fontSize: 36, ...FONTS.heavy, color: COLORS.white, marginTop: 16 },

  header: {
    backgroundColor: COLORS.bark,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 8,
    paddingBottom: 14, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: COLORS.white, fontSize: 20, ...FONTS.heavy },

  roleToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: RADIUS.sm, padding: 3, gap: 2 },
  roleBtn:    { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.sm - 2 },
  roleBtnActive:     { backgroundColor: COLORS.white },
  roleBtnText:       { fontSize: 12, ...FONTS.bold, color: COLORS.white },
  roleBtnTextActive: { color: COLORS.bark },

  screen: { flex: 1 },

  bottomNav: {
    flexDirection: 'row',
    backgroundColor: COLORS.cream,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 10,
  },
  navItem:  { flex: 1, alignItems: 'center', gap: 2 },
  navIcon:  { fontSize: 22 },
  navLabel: { fontSize: 10, ...FONTS.medium, color: COLORS.muted },
  navLabelActive: { color: COLORS.bark, ...FONTS.bold },
  navDot:   { width: 18, height: 3, borderRadius: 3, backgroundColor: COLORS.clay, marginTop: 2 },

  profilContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  profilNom:   { fontSize: 22, ...FONTS.heavy, color: COLORS.ink, marginTop: 16 },
  profilEmail: { fontSize: 14, color: COLORS.muted, marginTop: 4, marginBottom: 32 },
  logoutBtn:   { backgroundColor: COLORS.warnBg, borderWidth: 1, borderColor: COLORS.warnBorder, borderRadius: RADIUS.md, padding: 14, paddingHorizontal: 32 },
  logoutText:  { fontSize: 15, ...FONTS.bold, color: COLORS.clay },

  placeholder:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  placeholderTitle: { fontSize: 20, ...FONTS.bold, color: COLORS.ink, marginTop: 16 },
  placeholderSub:   { fontSize: 14, color: COLORS.muted, marginTop: 8 },
});
