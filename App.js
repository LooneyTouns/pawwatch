// App.js — Point d'entrée PawWatch
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar, Image } from 'react-native';

const LEDGER_ICON = require('./assets/ledger-icon.png');
import { COLORS, FONTS, RADIUS } from './lib/theme';
import { getUser, signOut }       from './lib/supabase';
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

// Conversations demo pré-peuplées
const DEMO_CONVERSATIONS = [
  {
    id: 'conv_demo_1',
    partnerName: 'Emma Rousseau',
    partnerSpecialite: '🐕 Dogsitter · 🐈 Catsitter · Pension',
    animalNom: null,
    unread: 2,
    messages: [
      { id: 'er1', text: "Bonjour ! Je serais ravie de garder votre animal 🐾", from: 'them', timestamp: new Date(Date.now() - 7_200_000) },
      { id: 'er2', text: "Il est actif ? Il aime les longues promenades ?", from: 'them', timestamp: new Date(Date.now() - 7_140_000) },
    ],
  },
  {
    id: 'conv_demo_2',
    partnerName: 'Thomas R.',
    partnerSpecialite: '🐕 Dogsitter · 🐈 Catsitter',
    animalNom: null,
    unread: 0,
    messages: [
      { id: 'tr1', text: "Je confirme la garde du 20 au 23 juillet ✅", from: 'them', timestamp: new Date(Date.now() - 86_400_000) },
      { id: 'tr2', text: "Parfait, merci ! On se retrouve à 9h alors.", from: 'me', timestamp: new Date(Date.now() - 86_340_000) },
    ],
  },
];

// Données de garde mock (remplace par un vrai fetch Supabase)
const MOCK_GARDE = {
  id: 'garde-001',
  date_debut: '2026-06-23', date_fin: '2026-06-26',
  animaux: [
    { id: 'animal-1', nom: 'Luna',  type: 'chien', race: 'Golden Retriever' },
    { id: 'animal-2', nom: 'Minou', type: 'chat',  race: 'Maine Coon'       },
  ],
  users:    { nom: 'Sophie M.' },
  journaux: [],
};

// ─── Paw SVG en texte emoji ───────────────────────────────────────
const PawIcon = () => <Text style={{ fontSize: 20 }}>🐾</Text>;

export default function App() {
  const [user,              setUser]              = useState(null);
  const [role,              setRole]              = useState(null);
  const [activeTab,         setActiveTab]         = useState('journal');
  const [loading,           setLoading]           = useState(true);
  const [journalAnimal,          setJournalAnimal]          = useState(null);
  const [journauxCompletes,      setJournauxCompletes]      = useState([]);
  const [profilPetsitterComplet, setProfilPetsitterComplet] = useState(false);

  // ── Messagerie ──
  const [conversations,        setConversations]        = useState(DEMO_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const activeConversation = conversations.find(c => c.id === activeConversationId) ?? null;

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
    // Planifier rappel quotidien si petsitter ou les_deux
    if (u.user_metadata?.role === 'petsitter' || u.user_metadata?.role === 'les_deux') {
      scheduleJournalReminder(u.user_metadata?.nom ?? 'Petsitter').catch(() => {});
    }
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setRole(null);
    setActiveTab('journal');
  };

  // Crée une conversation après confirmation d'une garde avec un petsitter
  const handleMatch = (petsitter) => {
    const convId = `conv_${Date.now()}`;
    const newConv = {
      id: convId,
      partnerName: petsitter.nom,
      partnerSpecialite: petsitter.animaux?.join(' · ') ?? 'Petsitter',
      animalNom: null,
      unread: 1,
      messages: [
        {
          id: `msg_${Date.now()}`,
          text: `Bonjour ! J'ai bien reçu votre demande de garde. Je serais ravi(e) de m'occuper de votre compagnon 🐾 N'hésitez pas à me poser des questions !`,
          from: 'them',
          timestamp: new Date(),
        },
      ],
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(convId);
    setActiveTab('messages');
  };

  // Ajoute un message dans une conversation (from = 'me' | 'them')
  const handleSendMessage = (convId, text, from = 'me') => {
    const newMsg = {
      id: `msg_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
      text,
      from,
      timestamp: new Date(),
    };
    setConversations(prev => prev.map(c => {
      if (c.id !== convId) return c;
      return {
        ...c,
        messages: [...c.messages, newMsg],
        // badge non-lu seulement si message entrant et conversation pas ouverte
        unread: from === 'them' && activeConversationId !== convId
          ? (c.unread || 0) + 1
          : c.unread,
      };
    }));
  };

  if (loading) return (
    <View style={styles.splash}>
      <Text style={{ fontSize: 64 }}>🐾</Text>
      <Text style={styles.splashTitle}>PawWatch</Text>
    </View>
  );

  if (!user) return (
    <LoginScreen onLogin={handleLogin} />
  );

  // Navigation tabs selon rôle
  const msgUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0);
  const msgIcon   = msgUnread > 0 ? '🔴' : '💬';

  const journalTab = { id: 'journal', image: LEDGER_ICON, label: 'Journal' };

  const tabs = role === 'proprietaire'
    ? [
        journalTab,
        { id: 'chercher', icon: '🔍', label: 'Chercher' },
        { id: 'messages', icon: msgIcon, label: 'Messages' },
        { id: 'notifs',   icon: '🔔', label: 'Notifs'   },
        { id: 'profil',   icon: '👤', label: 'Profil'   },
      ]
    : role === 'petsitter'
    ? [
        journalTab,
        { id: 'messages', icon: msgIcon, label: 'Messages' },
        { id: 'demandes', icon: '📨', label: 'Demandes' },
        { id: 'notifs',   icon: '🔔', label: 'Notifs'   },
        { id: 'profil',   icon: '👤', label: 'Profil'   },
      ]
    : /* les_deux */ [
        journalTab,
        { id: 'chercher', icon: '🔍', label: 'Chercher' },
        { id: 'messages', icon: msgIcon, label: 'Messages' },
        { id: 'demandes', icon: '📨', label: 'Demandes' },
        { id: 'profil',   icon: '👤', label: 'Profil'   },
      ];

  const isPetsitterRole = role === 'petsitter' || role === 'les_deux';

  const renderJournalPetsitter = () => {
    if (journalAnimal) {
      return (
        <JournalFormScreen
          garde={{ ...MOCK_GARDE, animaux: journalAnimal }}
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
        garde={MOCK_GARDE}
        journauxCompletes={journauxCompletes}
        onSelectAnimal={setJournalAnimal}
      />
    );
  };

  const renderMessages = () => {
    if (activeConversation) {
      return (
        <ChatScreen
          conversation={activeConversation}
          onBack={() => setActiveConversationId(null)}
          onSend={handleSendMessage}
        />
      );
    }
    return (
      <MessagesScreen
        conversations={conversations}
        onOpenChat={(conv) => {
          // Marquer comme lu à l'ouverture
          setConversations(prev => prev.map(c =>
            c.id === conv.id ? { ...c, unread: 0 } : c
          ));
          setActiveConversationId(conv.id);
        }}
      />
    );
  };

  const renderScreen = () => {
    if (role === 'proprietaire') {
      if (activeTab === 'journal')  return <JournalScreen  garde={MOCK_GARDE} user={user} />;
      if (activeTab === 'chercher') return <SearchPetsitterScreen user={user} onMatch={handleMatch} />;
      if (activeTab === 'messages') return renderMessages();
      if (activeTab === 'notifs')   return <NotificationsScreen />;
      if (activeTab === 'profil')   return <ProfilScreen user={user} onLogout={handleLogout} />;
    }
    if (role === 'petsitter') {
      if (activeTab === 'journal')  return renderJournalPetsitter();
      if (activeTab === 'messages') return renderMessages();
      if (activeTab === 'demandes') return <DemandesScreen profilComplet={profilPetsitterComplet} />;
      if (activeTab === 'notifs')   return <NotificationsScreen />;
      if (activeTab === 'profil')   return (
        <ProfilScreen user={user} onLogout={handleLogout}
          profilComplet={profilPetsitterComplet}
          onProfilComplet={() => setProfilPetsitterComplet(true)} />
      );
    }
    if (role === 'les_deux') {
      if (activeTab === 'journal')  return renderJournalPetsitter();
      if (activeTab === 'chercher') return <SearchPetsitterScreen user={user} onMatch={handleMatch} />;
      if (activeTab === 'messages') return renderMessages();
      if (activeTab === 'demandes') return <DemandesScreen profilComplet={profilPetsitterComplet} />;
      if (activeTab === 'profil')   return (
        <ProfilScreen user={user} onLogout={handleLogout}
          profilComplet={profilPetsitterComplet}
          onProfilComplet={() => setProfilPetsitterComplet(true)} />
      );
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bark} />
      <View style={styles.app}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <PawIcon />
            <Text style={styles.headerTitle}>PawWatch</Text>
          </View>

          {/* Toggle Proprio / Petsitter / Les deux */}
          <View style={styles.roleToggle}>
            {[
              { id: 'proprietaire', label: '🏠 Proprio'  },
              { id: 'petsitter',    label: '🤝 Sitter'   },
              { id: 'les_deux',     label: '🌟 Les deux' },
            ].map(r => (
              <TouchableOpacity
                key={r.id}
                onPress={() => { setRole(r.id); setActiveTab('journal'); }}
                style={[styles.roleBtn, role === r.id && styles.roleBtnActive]}
              >
                <Text style={[styles.roleBtnText, role === r.id && styles.roleBtnTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bandeau profil incomplet (petsitter / les_deux) */}
        {isPetsitterRole && !profilPetsitterComplet && (
          <TouchableOpacity
            style={styles.profilGate}
            onPress={() => setActiveTab('profil')}
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
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={styles.navItem}
              activeOpacity={0.7}
            >
              {tab.image
                ? <Image source={tab.image} style={[styles.navIconImg, activeTab === tab.id && styles.navIconImgActive]} />
                : <Text style={styles.navIcon}>{tab.icon}</Text>
              }
              <Text style={[styles.navLabel, activeTab === tab.id && styles.navLabelActive]}>
                {tab.label}
              </Text>
              {activeTab === tab.id && <View style={styles.navDot} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );
}


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
  roleBtn:    { paddingHorizontal: 7, paddingVertical: 6, borderRadius: RADIUS.sm - 2 },
  roleBtnActive:     { backgroundColor: COLORS.white },
  roleBtnText:       { fontSize: 10, ...FONTS.bold, color: COLORS.white },
  roleBtnTextActive: { color: COLORS.bark },

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
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 10,
  },
  navItem:  { flex: 1, alignItems: 'center', gap: 2 },
  navIcon:  { fontSize: 22 },
  navIconImg:       { width: 24, height: 24, resizeMode: 'contain', opacity: 0.45 },
  navIconImgActive: { opacity: 1 },
  navLabel: { fontSize: 10, ...FONTS.medium, color: COLORS.muted },
  navLabelActive: { color: COLORS.bark, ...FONTS.bold },
  navDot:   { width: 18, height: 3, borderRadius: 3, backgroundColor: COLORS.clay, marginTop: 2 },

});
