// screens/shared/OnboardingScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Dimensions, ScrollView, Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

const { width: W, height: H } = Dimensions.get('window');

// ─── Question rôle (toujours en premier) ──────────────────────────
const ROLE_QUESTION = {
  id: 'role',
  question: 'Quel est votre profil ?',
  type: 'single',
  options: [
    { id: 'proprietaire', emoji: '🏠', label: 'Propriétaire', sub: 'Je cherche un petsitter' },
    { id: 'petsitter',    emoji: '🤝', label: 'Petsitter',    sub: 'Je garde les animaux' },
  ],
};

// ─── Questions petsitter ───────────────────────────────────────────
const PETSITTER_QUESTIONS = [
  {
    id: 'logement',
    question: 'Quel est ton type de logement ?',
    type: 'single',
    options: [
      { id: 'appartement', emoji: '🏢', label: 'Appartement' },
      { id: 'maison',      emoji: '🏠', label: 'Maison' },
      { id: 'studio',      emoji: '🛋️', label: 'Studio' },
      { id: 'autre',       emoji: '🏘️', label: 'Autre' },
    ],
  },
  {
    id: 'jardin',
    question: 'As-tu un espace extérieur ?',
    type: 'single',
    options: [
      { id: 'grand_jardin',  emoji: '🌳', label: 'Grand jardin' },
      { id: 'petit_jardin',  emoji: '🌱', label: 'Petit jardin / terrasse' },
      { id: 'sans_exterieur', emoji: '🏙️', label: 'Pas d\'extérieur' },
    ],
  },
  {
    id: 'animaux_propres',
    question: 'As-tu des animaux chez toi ?',
    type: 'single',
    options: [
      { id: 'oui_chien',    emoji: '🐕', label: 'Oui, un chien' },
      { id: 'oui_chat',     emoji: '🐈', label: 'Oui, un chat' },
      { id: 'oui_plusieurs',emoji: '🐾', label: 'Oui, plusieurs' },
      { id: 'non',          emoji: '✖️', label: 'Non' },
    ],
  },
  {
    id: 'experience',
    question: 'Quelle est ton expérience avec les animaux ?',
    type: 'single',
    options: [
      { id: 'debutant',     emoji: '🌱', label: 'Débutant(e)' },
      { id: 'quelques_ans', emoji: '⭐', label: 'Quelques années' },
      { id: 'experimente',  emoji: '🌟', label: 'Expérimenté(e)' },
      { id: 'pro',          emoji: '🏆', label: 'Professionnel(le)' },
    ],
  },
  {
    id: 'animaux_acceptes',
    question: 'Quels animaux acceptes-tu de garder ?',
    subtitle: 'Plusieurs réponses possibles',
    type: 'multi',
    options: [
      { id: 'chiens',   emoji: '🐕', label: 'Chiens' },
      { id: 'chats',    emoji: '🐈', label: 'Chats' },
      { id: 'rongeurs', emoji: '🐹', label: 'Rongeurs' },
      { id: 'oiseaux',  emoji: '🦜', label: 'Oiseaux' },
      { id: 'reptiles', emoji: '🦎', label: 'Reptiles' },
    ],
  },
  {
    id: 'services',
    question: 'Quels services proposes-tu ?',
    subtitle: 'Plusieurs réponses possibles',
    type: 'multi',
    options: [
      { id: 'garde_domicile', emoji: '🏠', label: 'Garde à domicile' },
      { id: 'promenade',      emoji: '🦮', label: 'Promenade' },
      { id: 'visite',         emoji: '👋', label: 'Visite à domicile' },
      { id: 'pension',        emoji: '🛏️', label: 'Pension chez moi' },
    ],
  },
  {
    id: 'disponibilite',
    question: 'Quelles sont tes disponibilités ?',
    subtitle: 'Plusieurs réponses possibles',
    type: 'multi',
    options: [
      { id: 'semaine',    emoji: '📅', label: 'En semaine' },
      { id: 'weekend',    emoji: '🗓️', label: 'Le weekend' },
      { id: 'vacances',   emoji: '🌴', label: 'Vacances scolaires' },
      { id: 'temps_plein',emoji: '⏰', label: 'Temps plein' },
    ],
  },
];

// ─── Questions propriétaire ────────────────────────────────────────
const PROPRIO_QUESTIONS = [
  {
    id: 'type_animal',
    question: 'Quel type d\'animal avez-vous ?',
    subtitle: 'Plusieurs réponses possibles',
    type: 'multi',
    options: [
      { id: 'chien',   emoji: '🐕', label: 'Chien' },
      { id: 'chat',    emoji: '🐈', label: 'Chat' },
      { id: 'rongeur', emoji: '🐹', label: 'Rongeur' },
      { id: 'oiseau',  emoji: '🦜', label: 'Oiseau' },
      { id: 'autre',   emoji: '🐾', label: 'Autre' },
    ],
  },
  {
    id: 'nb_animaux',
    question: 'Combien d\'animaux avez-vous ?',
    type: 'single',
    options: [
      { id: '1',  emoji: '1️⃣', label: '1 animal' },
      { id: '2',  emoji: '2️⃣', label: '2 animaux' },
      { id: '3',  emoji: '3️⃣', label: '3 animaux' },
      { id: '4+', emoji: '🐾', label: '4 et plus' },
    ],
  },
  {
    id: 'besoins_speciaux',
    question: 'Votre animal a-t-il des besoins particuliers ?',
    subtitle: 'Plusieurs réponses possibles',
    type: 'multi',
    options: [
      { id: 'medicaments', emoji: '💊', label: 'Médicaments' },
      { id: 'regime',      emoji: '🥗', label: 'Régime alimentaire' },
      { id: 'anxieux',     emoji: '😰', label: 'Anxieux / craintif' },
      { id: 'aucun',       emoji: '✅', label: 'Aucun besoin particulier' },
    ],
  },
  {
    id: 'type_garde',
    question: 'Quel type de garde recherchez-vous ?',
    subtitle: 'Plusieurs réponses possibles',
    type: 'multi',
    options: [
      { id: 'garde_domicile', emoji: '🏠', label: 'Garde à domicile' },
      { id: 'promenade',      emoji: '🦮', label: 'Promenade' },
      { id: 'visite',         emoji: '👋', label: 'Visite à domicile' },
      { id: 'pension',        emoji: '🛏️', label: 'Pension chez le petsitter' },
    ],
  },
];

function getQuestions(roleAnswer) {
  const base = [ROLE_QUESTION];
  if (!roleAnswer) return base;
  if (roleAnswer === 'petsitter') return [...base, ...PETSITTER_QUESTIONS];
  return [...base, ...PROPRIO_QUESTIONS];
}

// ─── Composant principal ───────────────────────────────────────────
export default function OnboardingScreen({ user, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers]           = useState({});
  const [saving, setSaving]             = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const questions = getQuestions(answers['role']);
  const question  = questions[currentIndex];
  const answer   = answers[question.id];
  const isMulti  = question.type === 'multi';

  const isAnswered = isMulti
    ? Array.isArray(answer) && answer.length > 0
    : !!answer;

  const animateSlide = (direction, callback) => {
    Animated.timing(slideAnim, {
      toValue: direction === 'next' ? -W : W,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      callback();
      slideAnim.setValue(direction === 'next' ? W : -W);
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true,
        tension: 120, friction: 14,
      }).start();
    });
  };

  const handleSelect = (optionId) => {
    if (isMulti) {
      const prev = Array.isArray(answer) ? answer : [];
      const next = prev.includes(optionId)
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId];
      setAnswers(a => ({ ...a, [question.id]: next }));
    } else {
      setAnswers(a => ({ ...a, [question.id]: optionId }));
    }
  };

  const handleNext = () => {
    if (!isAnswered) return;
    if (currentIndex < questions.length - 1) {
      animateSlide('next', () => setCurrentIndex(i => i + 1));
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentIndex === 0) return;
    animateSlide('back', () => setCurrentIndex(i => i - 1));
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await supabase.auth.updateUser({
        data: { onboarding: answers, onboarding_done: true },
      });
    } catch (_) {
      // Si Supabase indisponible, on passe quand même
    }
    onComplete(answers);
  };

  const progress = (currentIndex + 1) / questions.length;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerStep}>{currentIndex + 1} / {questions.length}</Text>
        <Text style={styles.headerTitle}>Ton profil PawWatch 🐾</Text>
        {/* Barre de progression */}
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {/* Slide */}
      <Animated.View style={[styles.slide, { transform: [{ translateX: slideAnim }] }]}>
        <ScrollView
          contentContainerStyle={styles.slideContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.question}>{question.question}</Text>
          {question.subtitle && (
            <Text style={styles.questionSub}>{question.subtitle}</Text>
          )}

          <View style={styles.optionsGrid}>
            {question.options.map(opt => {
              const selected = isMulti
                ? Array.isArray(answer) && answer.includes(opt.id)
                : answer === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => handleSelect(opt.id)}
                  activeOpacity={0.8}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                    {opt.label}
                  </Text>
                  {selected && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Navigation */}
      <View style={styles.nav}>
        {currentIndex > 0 ? (
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <TouchableOpacity
          onPress={handleNext}
          disabled={!isAnswered || saving}
          style={[styles.nextBtn, (!isAnswered || saving) && styles.nextBtnDisabled]}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={isAnswered && !saving ? ['#1A2756', '#E8922A'] : ['#D4C4B5', '#D4C4B5']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.nextGradient}
          >
            <Text style={[styles.nextText, (!isAnswered || saving) && { color: '#999' }]}>
              {saving
                ? 'Enregistrement…'
                : currentIndex === questions.length - 1
                  ? 'Terminer 🐾'
                  : 'Suivant →'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.sand },

  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight ?? 24) + 12,
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: COLORS.ink,
  },
  headerStep:  { fontSize: 12, color: 'rgba(255,255,255,0.7)', ...FONTS.bold, letterSpacing: 1, marginBottom: 4 },
  headerTitle: { fontSize: 20, color: COLORS.white, ...FONTS.heavy, marginBottom: 16 },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' },
  progressFill:{ height: '100%', backgroundColor: COLORS.white, borderRadius: 3 },

  slide: { flex: 1 },
  slideContent: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20 },

  question:    { fontSize: 20, ...FONTS.heavy, color: COLORS.ink, marginBottom: 6, lineHeight: 28 },
  questionSub: { fontSize: 13, color: COLORS.muted, marginBottom: 20 },

  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  option: {
    width: (W - 52) / 2,
    backgroundColor: COLORS.white,
    borderWidth: 2, borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 18,
    alignItems: 'center',
    position: 'relative',
  },
  optionSelected: { borderColor: COLORS.bark, backgroundColor: '#FFF4E6' },
  optionEmoji:    { fontSize: 32, marginBottom: 8 },
  optionLabel:    { fontSize: 13, ...FONTS.bold, color: COLORS.ink, textAlign: 'center' },
  optionLabelSelected: { color: COLORS.bark },
  checkBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.bark,
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { color: COLORS.white, fontSize: 13, ...FONTS.bold },

  nav: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    paddingTop: 12, gap: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  backBtn:  { flex: 1, paddingVertical: 14, alignItems: 'center' },
  backText: { fontSize: 15, color: COLORS.muted, ...FONTS.medium },

  nextBtn:         { flex: 2, borderRadius: RADIUS.md, overflow: 'hidden' },
  nextBtnDisabled: { opacity: 0.6 },
  nextGradient:    { paddingVertical: 16, alignItems: 'center' },
  nextText:        { fontSize: 16, ...FONTS.heavy, color: COLORS.white },
});
