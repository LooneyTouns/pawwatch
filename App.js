// App.js — Point d'entrée PawWatch
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar, Image, ImageBackground, Appearance } from 'react-native';
import * as SystemUI from 'expo-system-ui';

// Forcer le mode clair — l'app n'a pas de thème sombre
Appearance.setColorScheme?.('light');
SystemUI.setBackgroundColorAsync('#FAF8F4');
import { useFonts } from 'expo-font';
// Stripe n'a pas de module web — on importe conditionnellement pour éviter le crash du bundle web
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51Hk4pOLhKS8wkkRQYe1F2McJyznT9NLPWRfAEN8Z9roEDrqYSVPT60a1JyKKxX87i1vpKO7XbaV5kPEoJ7yVMYWF00Dh7kYEEE';
const StripeProvider = Platform.OS !== 'web'
  ? require('@stripe/stripe-react-native').StripeProvider
  : ({ children }) => children;

const LEDGER_ICON = require('./assets/ledger-icon.png');
const MSG_ICON    = require('./assets/msg.png');
const APP_LOGO    = require('./assets/logo.png');
const PASTEL_BG   = require('./assets/pastel.png');
import { COLORS, FONTS, RADIUS } from './lib/theme';
import { supabase, getUser, getUserProfile, signOut, getGardesEnCours, getConversations, sendMessage, createOrGetConversation, markMessagesRead } from './lib/supabase';
import { estProfilPetsitterComplet } from './lib/onboardingMap';
import { useNotifications, scheduleJournalReminder } from './hooks/useNotifications';

// Écrans
import LoginScreen        from './screens/auth/LoginScreen';
import JournalScreen      from './screens/proprietaire/JournalScreen';
import PaiementScreen     from './screens/proprietaire/PaiementScreen';
import JournalFormScreen  from './screens/gardien/JournalFormScreen';
import JournalListScreen  from './screens/gardien/JournalListScreen';
import DemandesScreen        from './screens/gardien/DemandesScreen';
import NotificationsScreen   from './screens/shared/NotificationsScreen';
import ProfilScreen          from './screens/shared/ProfilScreen';
import SearchPetsitterScreen from './screens/proprietaire/SearchPetsitterScreen';
import MessagesScreen        from './screens/shared/MessagesScreen';
import ChatScreen            from './screens/shared/ChatScreen';
import OnboardingScreen      from './screens/shared/OnboardingScreen';
import AdminScreen           from './screens/admin/AdminScreen';


// ─── Paw SVG en texte emoji ───────────────────────────────────────
const PawIcon = () => <Text style={{ fontSize: 20 }}>🐾</Text>;

// ─── Profil simplifié pour l'admin ───────────────────────────────
function AdminProfilView({ user, onLogout }) {
  const nom   = user?.user_metadata?.nom ?? 'Admin';
  const email = user?.email ?? '';
  const initiales = nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.sand }}>
      <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, backgroundColor: COLORS.ink }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.bark, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: COLORS.white }}>{initiales}</Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.white, marginBottom: 4 }}>{nom}</Text>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>{email}</Text>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, paddingHorizontal: 14, paddingVertical: 4 }}>
          <Text style={{ fontSize: 13, color: COLORS.white, fontWeight: '700' }}>🛡️ Administrateur</Text>
        </View>
      </View>
      <View style={{ flex: 1, padding: 20 }}>
        <TouchableOpacity
          onPress={onLogout}
          style={{ backgroundColor: '#EF4444', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 }}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.white }}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// L'onboarding utilise "pawsitter" mais tout le reste de l'app attend "petsitter"
const normRole = (r) => (r === 'pawsitter' ? 'petsitter' : (r ?? 'proprietaire'));

export default function App() {
  const [fontsLoaded] = useFonts({
    'KoalaStation': require('./assets/fonts/KoalaStation.ttf'),
  });

  const [user,              setUser]              = useState(null);
  const [role,              setRole]              = useState(null);
  const [activeTab,         setActiveTab]         = useState('journal');
  const [loading,           setLoading]           = useState(true);
  const [journalAnimal,          setJournalAnimal]          = useState(null);
  const [journauxCompletes,      setJournauxCompletes]      = useState([]);
  const [profilPetsitterComplet, setProfilPetsitterComplet] = useState(null);
  const [profilInitialTab, setProfilInitialTab] = useState('profil');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingAnswers, setOnboardingAnswers] = useState(null);
  const [showEmailConfirm, setShowEmailConfirm]   = useState(false);
  const [pendingEmail,     setPendingEmail]        = useState('');

  // ── Garde en cours ──
  const [gardeEnCours, setGardeEnCours] = useState(null);

  // ── Messagerie ──
  const [conversations,        setConversations]        = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const activeConversation = conversations.find(c => c.id === activeConversationId) ?? null;

  // Hook notifications
  useNotifications(user?.id);

  // Realtime : badge messages mis à jour dès qu'un message arrive
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('global-msg-badge')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.new.from_id !== user.id) {
          getConversations(user.id).then(setConversations).catch(() => {});
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Realtime : proprio voit quand son petsitter accepte (statut → en_cours)
  useEffect(() => {
    if (!user?.id || role !== 'proprietaire') return;
    const channel = supabase
      .channel('gardes-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'gardes',
          filter: `proprio_id=eq.${user.id}` }, (payload) => {
        const s = payload.new?.statut;
        if (s === 'en_cours') {
          getGardesEnCours(user.id, 'proprietaire')
            .then(data => { if (data?.length > 0) setGardeEnCours(data[0]); })
            .catch(() => {});
        } else if (s === 'refusee') {
          setGardeEnCours(null);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, role]);

  // null = pas encore vérifié : le bandeau « profil incomplet » ne s'affiche que sur un false avéré
  useEffect(() => {
    setProfilPetsitterComplet(null);
    if (!user?.id || role !== 'petsitter') return;
    let annule = false;
    getUserProfile(user.id)
      .then(p => { if (!annule) setProfilPetsitterComplet(estProfilPetsitterComplet(p)); })
      .catch(() => {});
    return () => { annule = true; };
  }, [user?.id, role]);

  useEffect(() => {
    getUser().then(u => {
      if (u) {
        setUser(u);
        const r = normRole(u.user_metadata?.role);
        setRole(r);
        // Charger la garde en cours
        getGardesEnCours(u.id, r).then(data => {
          if (data && data.length > 0) setGardeEnCours(data[0]);
        }).catch(() => {});
        // Charger les conversations
        getConversations(u.id).then(setConversations).catch(() => {});
      }
      setLoading(false);
    });
  }, []);

  const handleLogin = (u, isNewUser = false) => {
    setUser(u);
    const r = normRole(u.user_metadata?.role);
    setRole(r);
    if (isNewUser && !u.app_metadata?.isAdmin) {
      setShowOnboarding(true);
    } else if (!isNewUser && u.id && !u.app_metadata?.isAdmin) {
      // Charger les données Supabase après connexion
      getGardesEnCours(u.id, r).then(data => {
        if (data && data.length > 0) setGardeEnCours(data[0]);
      }).catch(() => {});
      getConversations(u.id).then(setConversations).catch(() => {});
    }
    if (r === 'petsitter') {
      scheduleJournalReminder(u.user_metadata?.nom ?? 'Pawsitter').catch(() => {});
    }
  };

  const handleOnboardingComplete = (answers, supabaseUser, session) => {
    if (answers?.role) setRole(normRole(answers.role));
    setOnboardingAnswers(answers);
    setShowOnboarding(false);

    // Si la confirmation email est désactivée, signUp renvoie déjà une session
    // → on connecte l'utilisateur directement, pas d'écran "vérifie ta boîte mail".
    if (session && supabaseUser) {
      setUser(supabaseUser);
      const r = normRole(supabaseUser.user_metadata?.role ?? answers?.role);
      setRole(r);
      getGardesEnCours(supabaseUser.id, r).then(data => {
        if (data && data.length > 0) setGardeEnCours(data[0]);
      }).catch(() => {});
      getConversations(supabaseUser.id).then(setConversations).catch(() => {});
      return;
    }

    if (answers?.email) {
      setPendingEmail(answers.email);
      setShowEmailConfirm(true);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setRole(null);
    setActiveTab('journal');
  };

  // Crée une conversation Supabase après confirmation d'une garde avec un petsitter
  const handleMatch = async (petsitter, messageText) => {
    if (!user?.id) return;
    try {
      const convId = await createOrGetConversation(user.id, petsitter.id, gardeEnCours?.id ?? null);
      // Premier message envoyé par le proprio (from_id = user.id, conforme à la RLS msg_insert)
      await sendMessage(convId, user.id,
        messageText ?? `Bonjour ! Je viens de vous envoyer une demande de garde 🐾 N'hésitez pas à me répondre ici !`
      );
      // Recharger les conversations
      const updated = await getConversations(user.id);
      setConversations(updated);
      setActiveConversationId(convId);
      setActiveTab('messages');
    } catch {
      // Fallback local si Supabase échoue
      const convId = `conv_${Date.now()}`;
      setConversations(prev => [{
        id: convId,
        partnerName: petsitter.nom,
        partnerSpecialite: petsitter.animaux?.join(' · ') ?? 'Pawsitter',
        animalNom: null,
        unread: 1,
        messages: [{
          id: `msg_${Date.now()}`,
          text: `Bonjour ! J'ai bien reçu votre demande de garde. Je serais ravi(e) de m'occuper de votre compagnon 🐾`,
          from: 'them',
          timestamp: new Date(),
        }],
      }, ...prev]);
      setActiveConversationId(convId);
      setActiveTab('messages');
    }
  };

  // Envoie un message — sauvegarde dans Supabase puis met à jour l'état local
  const handleSendMessage = async (convId, text, from = 'me') => {
    const newMsg = {
      id: `msg_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
      text,
      from,
      timestamp: new Date(),
    };
    // Mise à jour optimiste immédiate
    setConversations(prev => prev.map(c => {
      if (c.id !== convId) return c;
      return {
        ...c,
        messages: [...c.messages, newMsg],
        unread: from === 'them' && activeConversationId !== convId ? (c.unread || 0) + 1 : c.unread,
      };
    }));
    // Persistence Supabase (silencieusement)
    if (user?.id && from === 'me' && !convId.startsWith('conv_')) {
      sendMessage(convId, user.id, text).catch(() => {});
    }
  };

  if (loading) return (
    <View style={styles.splash}>
      <Image source={APP_LOGO} style={styles.splashLogo} resizeMode="contain" />
      <Text style={styles.splashTitle}>PawWatch</Text>
    </View>
  );

  if (!user) return (
    <LoginScreen onLogin={handleLogin} />
  );

  if (showEmailConfirm) return (
    <View style={styles.confirmScreen}>
      <Text style={styles.confirmEmoji}>📬</Text>
      <Text style={styles.confirmTitle}>Vérifie ta boîte mail !</Text>
      <Text style={styles.confirmSub}>
        Un email de confirmation a été envoyé à{'\n'}
        <Text style={styles.confirmEmail}>{pendingEmail}</Text>
      </Text>
      <Text style={styles.confirmHint}>
        Clique sur le lien dans l'email pour activer ton compte, puis reviens te connecter.
      </Text>
      <TouchableOpacity style={styles.confirmBtn} onPress={() => { setShowEmailConfirm(false); setUser(null); setRole(null); }}>
        <Text style={styles.confirmBtnText}>Aller me connecter →</Text>
      </TouchableOpacity>
    </View>
  );

  if (showOnboarding) return (
    <OnboardingScreen
      user={user}
      onComplete={handleOnboardingComplete}
      onSkip={() => { setShowOnboarding(false); setUser(null); setRole(null); }}
    />
  );

  // Navigation tabs selon rôle
  const msgUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0);

  const journalTab = { id: 'journal', image: LEDGER_ICON, label: 'Journal' };
  const messagesTab = { id: 'messages', image: MSG_ICON, label: 'Messages', badge: msgUnread > 0 ? msgUnread : null };

  const adminTab = { id: 'admin', icon: '🛠', label: 'Admin' };

  const tabs = user?.app_metadata?.isAdmin
    ? [
        journalTab,
        messagesTab,
        adminTab,
        { id: 'profil', icon: '👤', label: 'Profil' },
      ]
    : role === 'proprietaire'
    ? [
        journalTab,
        { id: 'chercher',  icon: '🔍', label: 'Chercher'  },
        { id: 'paiement',  icon: '💳', label: 'Paiement'  },
        messagesTab,
        { id: 'profil',    icon: '👤', label: 'Profil'    },
      ]
    : [
        journalTab,
        messagesTab,
        { id: 'demandes', icon: '📨', label: 'Demandes' },
        { id: 'notifs',   icon: '🔔', label: 'Notifs'   },
        { id: 'profil',   icon: '👤', label: 'Profil'   },
      ];

  const isPetsitterRole = role === 'petsitter';

  const renderJournalPetsitter = () => {
    if (journalAnimal) {
      return (
        <JournalFormScreen
          garde={{ ...gardeEnCours, animaux: journalAnimal }}
          user={user}
          onBack={() => setJournalAnimal(null)}
          onSubmit={() => {
            setJournauxCompletes(prev => [...prev, journalAnimal.id]);
            setJournalAnimal(null);
          }}
        />
      );
    }
    return (
      <JournalListScreen
        garde={gardeEnCours}
        journauxCompletes={journauxCompletes}
        onSelectAnimal={setJournalAnimal}
        user={user}
      />
    );
  };

  const renderMessages = () => {
    if (activeConversation) {
      return (
        <ChatScreen
          conversation={activeConversation}
          userId={user?.id}
          onBack={() => {
            setActiveConversationId(null);
            // Recharger les conversations pour mettre à jour les badges non-lus
            if (user?.id) getConversations(user.id).then(setConversations).catch(() => {});
          }}
          onSend={handleSendMessage}
        />
      );
    }
    return (
      <MessagesScreen
        conversations={conversations}
        onOpenChat={(conv) => {
          setConversations(prev => prev.map(c =>
            c.id === conv.id ? { ...c, unread: 0 } : c
          ));
          setActiveConversationId(conv.id);
          // Marquer comme lu dans Supabase
          if (user?.id && !conv.id.startsWith('conv_')) {
            markMessagesRead(conv.id, user.id).catch(() => {});
          }
        }}
      />
    );
  };

  const renderScreen = () => {
    // Admin overlay — visible quel que soit le rôle sélectionné
    if (user?.app_metadata?.isAdmin && activeTab === 'admin') {
      return <AdminScreen onLogout={handleLogout} />;
    }
    // Admin profil : vue dédiée simple (ProfilScreen est conçu pour les petsitters standards)
    if (user?.app_metadata?.isAdmin && activeTab === 'profil') {
      return <AdminProfilView user={user} onLogout={handleLogout} />;
    }
    if (role === 'proprietaire') {
      const ouvrirFichesAnimaux = () => { setProfilInitialTab('modifier'); setActiveTab('profil'); };
      if (activeTab === 'journal')  return <JournalScreen  garde={gardeEnCours} user={user} onGardeTerminee={() => setGardeEnCours(null)} onCompleterAnimaux={ouvrirFichesAnimaux} onChercherPawsitter={() => setActiveTab('chercher')} />;
      if (activeTab === 'chercher') return <SearchPetsitterScreen user={user} onMatch={handleMatch} onCompleterAnimaux={ouvrirFichesAnimaux} />;
      if (activeTab === 'paiement') return <PaiementScreen garde={gardeEnCours} user={user} />;
      if (activeTab === 'messages') return renderMessages();
      if (activeTab === 'profil')   return (
        <ProfilScreen user={user} onLogout={handleLogout} initialData={onboardingAnswers}
          initialTab={profilInitialTab}
          onInitialTabConsumed={() => setProfilInitialTab('profil')} />
      );
    }
    if (role === 'petsitter') {
      if (activeTab === 'journal')  return renderJournalPetsitter();
      if (activeTab === 'messages') return renderMessages();
      if (activeTab === 'demandes') return <DemandesScreen user={user} onOuvrirDispos={() => { setProfilInitialTab('dispo'); setActiveTab('profil'); }} />;
      if (activeTab === 'notifs')   return <NotificationsScreen />;
      if (activeTab === 'profil')   return (
        <ProfilScreen user={user} onLogout={handleLogout}
          profilComplet={profilPetsitterComplet}
          onProfilComplet={() => setProfilPetsitterComplet(true)}
          initialData={onboardingAnswers}
          initialTab={profilInitialTab}
          onInitialTabConsumed={() => setProfilInitialTab('profil')} />
      );
    }
  };

  const prenom = user?.user_metadata?.nom?.split(' ')[0] ?? '';
  const msgUnreadTotal = conversations.reduce((s, c) => s + (c.unread || 0), 0);

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.pawwatch.app"
    >
    <>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <ImageBackground source={PASTEL_BG} style={styles.app} imageStyle={styles.appBg}>

        {/* ── Header ── */}
        <ImageBackground source={PASTEL_BG} style={styles.header} imageStyle={styles.headerBg}>
          <View style={styles.headerLeft}>
            <Image source={APP_LOGO} style={styles.headerLogo} resizeMode="contain" />
            <Text style={styles.headerGreet}>
              {prenom ? `Bonjour, ${prenom} 👋` : 'PawWatch 🐾'}
            </Text>
          </View>

          <View style={styles.headerRight}>
            {/* Cloche notifications */}
            <TouchableOpacity
              style={styles.headerBell}
              onPress={() => setActiveTab('notifs')}
            >
              <Text style={styles.headerBellIcon}>🔔</Text>
              {msgUnreadTotal > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{msgUnreadTotal}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Toggle rôle admin uniquement */}
            {user?.app_metadata?.isAdmin && (
              <View style={styles.roleToggle}>
                {[
                  { id: 'proprietaire', label: '🏠' },
                  { id: 'petsitter',    label: '🤝' },
                ].map(r => (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => { setRole(r.id); setActiveTab('journal'); }}
                    style={[styles.roleBtn, role === r.id && styles.roleBtnActive]}
                  >
                    <Text style={styles.roleBtnText}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ImageBackground>

        {/* Bandeau profil incomplet */}
        {isPetsitterRole && profilPetsitterComplet === false && (
          <TouchableOpacity
            style={styles.profilGate}
            onPress={() => { setProfilInitialTab('modifier'); setActiveTab('profil'); }}
            activeOpacity={0.85}
          >
            <Text style={styles.profilGateIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.profilGateTitle}>Profil incomplet — aucune mise en relation possible</Text>
              <Text style={styles.profilGateSub}>Appuie ici pour compléter ton profil →</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── Contenu ── */}
        <View style={styles.screen}>
          {renderScreen()}
        </View>

        {/* ── Bottom Nav ── */}
        <View style={styles.bottomNav}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.navItem, isActive && styles.navItemActive]}
                activeOpacity={0.8}
              >
                <View style={{ position: 'relative' }}>
                  {tab.image
                    ? <Image source={tab.image} style={[styles.navIconImg, isActive && styles.navIconImgActive]} />
                    : <Text style={[styles.navIcon, isActive && styles.navIconActive]}>{tab.icon}</Text>
                  }
                  {tab.badge > 0 && (
                    <View style={styles.navBadge}>
                      <Text style={styles.navBadgeText}>{tab.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ImageBackground>
    </>
    </StripeProvider>
  );
}


// ─── Styles globaux ───────────────────────────────────────────────
const styles = StyleSheet.create({
  app:   { flex: 1, backgroundColor: COLORS.sand },
  appBg: { resizeMode: 'cover', opacity: 0.07 },

  splash:      { flex: 1, backgroundColor: COLORS.sand, alignItems: 'center', justifyContent: 'center' },
  splashLogo:  { width: 240, height: 240, marginBottom: 16 },
  splashTitle: { fontSize: 32, ...FONTS.heavy, color: COLORS.ink },

  confirmScreen: { flex: 1, backgroundColor: COLORS.sand, alignItems: 'center', justifyContent: 'center', padding: 32 },
  confirmEmoji:  { fontSize: 72, marginBottom: 20 },
  confirmTitle:  { fontSize: 26, ...FONTS.heavy, color: COLORS.ink, textAlign: 'center', marginBottom: 16 },
  confirmSub:    { fontSize: 15, color: COLORS.muted, textAlign: 'center', lineHeight: 24, marginBottom: 12 },
  confirmEmail:  { color: COLORS.bark, ...FONTS.bold },
  confirmHint:   { fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 20, marginBottom: 36 },
  confirmBtn:    { backgroundColor: COLORS.ink, borderRadius: RADIUS.md, paddingVertical: 16, paddingHorizontal: 32 },
  confirmBtnText:{ fontSize: 16, ...FONTS.heavy, color: COLORS.white },

  header: {
    paddingTop: Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight ?? 24) + 10,
    paddingBottom: 16, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    overflow: 'hidden',
  },
  headerBg: { resizeMode: 'cover', opacity: 0.3 },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo:  { width: 40, height: 40 },
  headerGreet: { fontSize: 17, color: COLORS.ink, ...FONTS.heavy },
  headerTitle: { color: COLORS.ink, fontSize: 16, ...FONTS.heavy, letterSpacing: 0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBell:  { position: 'relative', padding: 4 },
  headerBellIcon: { fontSize: 20 },
  headerBadge: {
    position: 'absolute', top: 0, right: 0,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#FF3B30',
    alignItems: 'center', justifyContent: 'center',
  },
  headerBadgeText: { fontSize: 9, color: '#fff', ...FONTS.bold },

  roleToggle: { flexDirection: 'row', backgroundColor: COLORS.border, borderRadius: RADIUS.sm, padding: 2, gap: 1 },
  roleBtn:    { paddingHorizontal: 8, paddingVertical: 5, borderRadius: RADIUS.sm - 2 },
  roleBtnActive:     { backgroundColor: COLORS.bark },
  roleBtnText:       { fontSize: 14, color: COLORS.ink },
  roleBtnTextActive: { color: COLORS.white },

  screen: { flex: 1 },

  profilGate: {
    backgroundColor: '#FEF3C7', borderBottomWidth: 1.5, borderBottomColor: '#FCD34D',
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  profilGateIcon:  { fontSize: 18 },
  profilGateTitle: { fontSize: 12, ...FONTS.heavy, color: '#92400E' },
  profilGateSub:   { fontSize: 11, color: '#B45309', marginTop: 1 },

  bottomNav: {
    flexDirection: 'row',
    backgroundColor: COLORS.cream,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 8,
    paddingHorizontal: 6,
    gap: 4,
  },
  navItem: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 7, paddingHorizontal: 4,
    borderRadius: 14, gap: 3,
  },
  navItemActive: {
    backgroundColor: COLORS.warm,
  },
  navIcon:       { fontSize: 20, opacity: 0.4 },
  navIconActive: { opacity: 1 },
  navIconImg:       { width: 22, height: 22, resizeMode: 'contain', opacity: 0.4 },
  navIconImgActive: { opacity: 1 },
  navBadge: {
    position: 'absolute', top: -3, right: -3,
    minWidth: 12, height: 12, borderRadius: 6,
    backgroundColor: '#FF3B30', paddingHorizontal: 2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.cream,
  },
  navBadgeText: { fontSize: 7, color: '#fff', ...FONTS.bold },
  navLabel:       { fontSize: 10, ...FONTS.medium, color: COLORS.muted },
  navLabelActive: { color: COLORS.clay, ...FONTS.bold },

});
