// screens/shared/OnboardingScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Animated,
  Dimensions, ScrollView, Platform, StatusBar, Alert, ImageBackground, Image,
  KeyboardAvoidingView,
} from 'react-native';

const PASTEL_BG    = require('../../assets/pastel.png');
const CAT_DOG_IMG  = require('../../assets/cat&dog.png');
const HOUSE_DOG_IMG= require('../../assets/housedog.png');
const NB1_IMG      = require('../../assets/1.png');
const NB2_IMG      = require('../../assets/2.png');
const NB3_IMG      = require('../../assets/3.png');
const NB4_IMG      = require('../../assets/4.png');
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONTS, RADIUS } from '../../lib/theme';
import { supabase, signUp, saveAnimaux, uploadAnimalPhoto } from '../../lib/supabase';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import { PriceInput, PRICE_RANGES } from '../../components/UI';
import { onboardingToAnimaux, onboardingToPetsitter, nettoyerOnboarding } from '../../lib/onboardingMap';

// Barème par service — aligné sur celui du profil pawsitter (PRICE_RANGES)
const SERVICE_TARIFS = {
  garde_domicile: { label: 'Garde au domicile du propriétaire', icon: '🏠', ...PRICE_RANGES.gardeJour },
  garde_jour:     { label: 'Garde de jour (chez le pawsitter)',  icon: '☀️', ...PRICE_RANGES.gardeJour },
  promenade:      { label: 'Promenade',        icon: '🐕', ...PRICE_RANGES.promenade },
  nuitee:         { label: 'Nuitée',           icon: '🌙', ...PRICE_RANGES.pension   },
  visite:         { label: 'Visite',           icon: '🐱', low: 8, high: 15, unit: 'visite', ref: 'Marché : 8 – 15 €/visite' },
};
const tarifKey = (svcId) => `tarif_${svcId}`;

const { width: W, height: H } = Dimensions.get('window');

// ─── Question rôle (toujours en premier) ──────────────────────────
const ROLE_QUESTION = {
  id: 'role',
  question: 'Quel est ton profil ?',
  type: 'single',
  options: [
    { id: 'proprietaire', image: CAT_DOG_IMG,   label: 'Propriétaire', sub: 'Je cherche un Pawsitter' },
    { id: 'pawsitter',    image: HOUSE_DOG_IMG, label: 'Pawsitter',    sub: 'Je garde les animaux' },
  ],
};

// ─── Questions pawsitter ───────────────────────────────────────────
const PAWSITTER_QUESTIONS = [
  // Slide 1 — Expérience
  {
    id: 'experience_niveau',
    question: 'As-tu déjà gardé des animaux ?',
    type: 'single',
    options: [
      { id: 'regulierement',    emoji: '⭐', label: 'Oui, régulièrement' },
      { id: 'occasionnellement',emoji: '🌱', label: 'Oui, occasionnellement' },
      { id: 'jamais',           emoji: '🐾', label: 'Non, mais j\'adore les animaux' },
    ],
  },
  {
    id: 'animaux_gardes',
    question: 'Quels animaux as-tu déjà gardés ?',
    subtitle: 'Plusieurs réponses possibles',
    type: 'multi',
    options: [
      { id: 'chien',   emoji: '🐶', label: 'Chien' },
      { id: 'chat',    emoji: '🐱', label: 'Chat' },
      { id: 'lapin',   emoji: '🐰', label: 'Lapin' },
      { id: 'rongeur', emoji: '🐹', label: 'Rongeur' },
      { id: 'oiseau',  emoji: '🦜', label: 'Oiseau' },
      { id: 'poisson', emoji: '🐠', label: 'Poisson' },
    ],
  },
  // Slide 2 — Profils à l'aise
  {
    id: 'profils_aise',
    question: 'Avec quels profils es-tu à l\'aise ?',
    subtitle: 'Plusieurs réponses possibles',
    type: 'multi',
    options: [
      { id: 'chiens',            emoji: '🐶', label: 'Chiens' },
      { id: 'chats',             emoji: '🐱', label: 'Chats' },
      { id: 'grands_chiens',     emoji: '🐕', label: 'Grande taille' },
      { id: 'chiens_energiques', emoji: '🐕‍🦺', label: 'Très énergiques' },
      { id: 'chiens_ages',       emoji: '🐾', label: 'Chiens âgés' },
      { id: 'soins_speciaux',    emoji: '💊', label: 'Soins spéciaux' },
    ],
  },
  // Slide 3 — Logement
  {
    id: 'logement',
    question: 'Où accueilles-tu les animaux ? 🏠',
    type: 'single',
    options: [
      { id: 'appartement',   emoji: '🏢', label: 'Appartement' },
      { id: 'maison',        emoji: '🏠', label: 'Maison' },
      { id: 'maison_jardin', emoji: '🌳', label: 'Maison avec jardin' },
    ],
    // Si "Maison" / "Maison avec jardin" → question clôture sur la même slide
    extraSingle: {
      key: 'cloture',
      label: 'Le jardin est-il clôturé ?',
      showOn: ['maison', 'maison_jardin'],
      options: [
        { id: 'oui',          emoji: '✅', label: 'Oui, complètement' },
        { id: 'partiellement',emoji: '⚠️', label: 'Partiellement' },
        { id: 'non',          emoji: '❌', label: 'Non' },
        { id: 'sans_jardin',  emoji: '🏢', label: 'Pas de jardin' },
      ],
    },
  },
  // Slide 4 — Les autres habitants
  {
    id: 'animaux_maison',
    question: 'Y a-t-il d\'autres animaux chez toi ?',
    subtitle: 'Plusieurs réponses possibles',
    type: 'multi',
    options: [
      { id: 'chien',  emoji: '🐶', label: 'Un chien' },
      { id: 'chat',   emoji: '🐱', label: 'Un chat' },
      { id: 'autre',  emoji: '🐾', label: 'Un autre animal' },
      { id: 'aucun',  emoji: '🚫', label: 'Aucun', exclusive: true },
    ],
    // Sauf "Aucun" → nom + race de chaque animal du foyer, sur la même slide
    addList: {
      showOn: ['chien', 'chat', 'autre'],
      key: 'animaux_perso',
      label: 'Le nom et la race de tes animaux',
      addLabel: 'Ajouter un animal',
      fields: [
        { key: 'nom',  placeholder: 'Nom (ex: Rex)' },
        { key: 'race', placeholder: 'Race (ex: berger allemand)' },
      ],
    },
  },
  {
    id: 'enfants',
    question: 'Y a-t-il des enfants chez toi ?',
    subtitle: 'Paw Watch détecte automatiquement les incompatibilités',
    type: 'single',
    options: [
      { id: 'oui', emoji: '👶', label: 'Oui' },
      { id: 'non', emoji: '🚫', label: 'Non' },
    ],
    // Si "Oui" → âge de chaque enfant (ajout multiple) sur la même slide
    addList: {
      showOn: ['oui'],
      key: 'enfants_ages',
      label: 'Quel âge ont les enfants ?',
      placeholder: 'Enfant {n} — âge',
      addLabel: 'Ajouter un enfant',
      numeric: true,
    },
  },
  // Slide 5 — Ton quotidien
  {
    id: 'temps_seul',
    question: 'Combien de temps l\'animal serait-il seul ?',
    type: 'single',
    options: [
      { id: 'jamais',   emoji: '🏠', label: 'Jamais' },
      { id: 'moins_2h', emoji: '⏱️', label: 'Moins de 2h' },
      { id: '2_4h',     emoji: '🕑', label: '2–4h' },
      { id: '4_6h',     emoji: '🕓', label: '4–6h' },
      { id: 'plus_6h',  emoji: '🕕', label: '+6h' },
    ],
  },
  {
    id: 'promenades_jour',
    question: 'Combien de promenades peux-tu faire par jour ?',
    type: 'single',
    options: [
      { id: '1',  emoji: '1️⃣', label: '1 promenade' },
      { id: '2',  emoji: '2️⃣', label: '2 promenades' },
      { id: '3',  emoji: '3️⃣', label: '3 promenades' },
      { id: '4+', emoji: '4️⃣', label: '4 et plus' },
    ],
  },
  // Slide 6 — Services
  {
    id: 'services',
    question: 'Quels services proposes-tu ?',
    subtitle: 'Plusieurs réponses possibles',
    type: 'multi',
    options: [
      { id: 'garde_domicile', emoji: '🏠', label: 'Garde au domicile du propriétaire' },
      { id: 'garde_jour',     emoji: '☀️', label: 'Garde de jour (chez le pawsitter)' },
      { id: 'promenade',      emoji: '🐕', label: 'Promenade' },
      { id: 'visite',         emoji: '🐱', label: 'Visite' },
      { id: 'nuitee',         emoji: '🌙', label: 'Nuitée' },
    ],
  },
  // Slide 7 — Limites
  {
    id: 'limites',
    question: 'Avec quels animaux ne souhaites-tu pas travailler ?',
    subtitle: 'Optionnel — laisse vide si tu acceptes tous les profils',
    type: 'multi',
    optional: true,
    options: [
      { id: 'chiens_agressifs',     emoji: '⚠️', label: 'Chiens agressifs' },
      { id: 'chiens_energiques',    emoji: '⚡', label: 'Très énergiques' },
      { id: 'non_propres',          emoji: '🚿', label: 'Non propres' },
      { id: 'medicaments_complexes',emoji: '💊', label: 'Médicaments' },
      { id: 'gros_chiens',          emoji: '🐕', label: 'Gros chiens' },
      { id: 'anxieux',              emoji: '😰', label: 'Animaux anxieux' },
    ],
  },
  // Slide 8 — Motivation
  {
    id: 'motivation',
    question: 'Pourquoi souhaites-tu devenir pawsitter ? ❤️',
    type: 'single',
    options: [
      { id: 'amour_animaux', emoji: '❤️', label: 'J\'adore les animaux' },
      { id: 'revenus',       emoji: '💰', label: 'Arrondir mes fins de mois' },
      { id: 'activite',      emoji: '🚀', label: 'En faire mon activité' },
      { id: 'compagnie',     emoji: '🤗', label: 'J\'aime leur compagnie' },
      { id: 'autre',         emoji: '✨', label: 'Autre', followUp: 'Dis-nous en plus…' },
    ],
  },
  // Slide 9 — Disponibilités
  {
    id: 'disponibilite',
    question: 'Quand es-tu disponible ?',
    subtitle: 'Plusieurs réponses possibles',
    type: 'multi',
    options: [
      { id: 'semaine',    emoji: '📅', label: 'En semaine' },
      { id: 'weekend',    emoji: '🗓️', label: 'Week-ends' },
      { id: 'vacances',   emoji: '🌴', label: 'Vacances scolaires' },
      { id: 'temps_plein',emoji: '⏰', label: 'Temps plein' },
      { id: 'sur_demande',emoji: '📲', label: 'Sur demande' },
    ],
  },
  // Slide 10 — Tarifs par service
  {
    id: 'tarif',
    question: 'Tes tarifs par service 💰',
    subtitle: 'Barème indicatif du marché — tu pourras les ajuster dans ton profil',
    type: 'servicetarifs',
  },
  // Compte & coordonnées (intacts)
  { id: 'date_naissance',   question: 'Ta date de naissance 🎂',       type: 'text',             placeholder: 'JJ/MM/AAAA',             keyboardType: 'number-pad', minLength: 10 },
  { id: 'email',            question: 'Ton adresse email 📧',          type: 'text',             placeholder: 'sophie@email.com',       keyboardType: 'email-address', autoCapitalize: 'none' },
  { id: 'password',         question: 'Choisis un mot de passe 🔒',    type: 'password_pair',    placeholder: 'Minimum 6 caractères', placeholder2: 'Répète ton mot de passe' },
  { id: 'telephone',        question: 'Ton numéro de téléphone 📱',    type: 'text',             placeholder: '06 12 34 56 78',         keyboardType: 'phone-pad', optional: true },
  { id: 'adresse',          question: 'Ton adresse 📍',                type: 'address',          placeholder: '12 rue des Lilas, Paris…', optional: true },
];

// ─── Labels pour le slide récap ───────────────────────────────────
const AGE_LABELS      = { moins_1an:'< 1 an', '1_3ans':'1–3 ans', '4_7ans':'4–7 ans', '8_12ans':'8–12 ans', plus_12ans:'+12 ans' };
const CAR_EMOJI       = { tres_sociable:'😍', sociable:'🙂', reserve:'😐', craintif:'😬', peut_mordre:'😡' };
const CAR_LABEL       = { tres_sociable:'Très sociable', sociable:'Sociable', reserve:'Réservé', craintif:'Craintif', peut_mordre:'Peut être agressif' };
const TYPE_EMOJI      = { chien:'🐶', chat:'🐱', lapin:'🐰', autre:'🐹' };

function getNbAnimaux(answers) {
  const v = answers?.nb_animaux;
  if (!v || v === '1') return 1;
  if (v === '4+') return 4;
  return parseInt(v, 10) || 1;
}

// ─── Questions propriétaire — avant animaux ────────────────────────
const PROPRIO_BEFORE_ANIMAL = [
  {
    id: 'nb_animaux',
    question: 'Combien d\'animaux souhaites-tu faire garder ?',
    type: 'single',
    options: [
      { id: '1',  image: NB1_IMG, label: '1 animal' },
      { id: '2',  image: NB2_IMG, label: '2 animaux' },
      { id: '3',  image: NB3_IMG, label: '3 animaux' },
      { id: '4+', image: NB4_IMG, label: '4 et plus' },
    ],
  },
];

// ─── Questions propriétaire — par animal ──────────────────────────
const PROPRIO_PER_ANIMAL = [
  {
    id: 'nom_animal',
    question: 'Comment s\'appelle ton animal ?',
    subtitle: 'Montre nous sa frimousse 📸',
    type: 'text',
    placeholder: 'Max, Luna, Milo…',
    minLength: 1,
    hasPhoto: true,
  },
  {
    id: 'type_per_animal',
    question: 'Quel animal est-ce ?',
    questionWithName: 'Quel animal est {nom} ?',
    type: 'single',
    options: [
      { id: 'chien',   emoji: '🐶', label: 'Chien' },
      { id: 'chat',    emoji: '🐱', label: 'Chat' },
      { id: 'lapin',   emoji: '🐰', label: 'Lapin' },
      { id: 'oiseau',  emoji: '🦜', label: 'Oiseau' },
      { id: 'rongeur', emoji: '🐹', label: 'Rongeur' },
      { id: 'autre',   emoji: '🐾', label: 'Autre', followUp: 'Précise le type d\'animal…' },
    ],
  },
  {
    id: 'race_animal',
    question: 'Quelle est sa race ?',
    questionWithName: 'Quelle est la race de {nom} ?',
    type: 'text',
    placeholder: 'Ex: Labrador, Siamois, Persan…',
    optional: true,
  },
  {
    id: 'age_animal',
    question: 'Quel âge a-t-il ?',
    questionWithName: 'Quel âge a {nom} ?',
    type: 'picker',
    pickerMin: 0,
    pickerMax: 20,
    pickerUnit: 'ans',
  },
  {
    id: 'sexe_animal',
    question: 'Mâle ou femelle ?',
    questionWithName: '{nom} est mâle ou femelle ?',
    type: 'single',
    options: [
      { id: 'male',   emoji: '♂️', label: 'Mâle' },
      { id: 'femelle',emoji: '♀️', label: 'Femelle' },
    ],
    extraSingle: {
      key: 'sterilise',
      label: 'Stérilisée / Castré ou non ?',
      options: [
        { id: 'oui',     emoji: '✅', label: 'Oui' },
        { id: 'non',     emoji: '❌', label: 'Non' },
        { id: 'inconnu', emoji: '🤷', label: 'Je ne sais pas' },
      ],
    },
  },
  {
    id: 'caractere',
    question: 'Comment décrirais-tu ton animal ? ❤️',
    questionWithName: 'Comment décrirais-tu {nom} ? ❤️',
    type: 'single',
    options: [
      { id: 'tres_sociable', emoji: '😍', label: 'Très sociable' },
      { id: 'sociable',      emoji: '🙂', label: 'Sociable' },
      { id: 'reserve',       emoji: '😐', label: 'Plutôt réservé' },
      { id: 'craintif',      emoji: '😬', label: 'Craintif' },
      { id: 'peut_mordre',   emoji: '😡', label: 'Peut être agressif' },
    ],
  },
  {
    id: 'compatibilite_animaux',
    question: 'Avec les autres animaux ?',
    questionWithName: 'Comment {nom} se comporte avec les autres animaux ?',
    type: 'single',
    options: [
      { id: 'adore',      emoji: '🐶', label: 'Adore les autres animaux' },
      { id: 'ca_depend',  emoji: '🙂', label: 'Ça dépend' },
      { id: 'seul',       emoji: '🚫', label: 'Préfère être seul' },
    ],
  },
];

// ─── Questions propriétaire — globales (garde + compte) ───────────
const PROPRIO_GLOBAL = [
  {
    id: 'type_garde',
    question: 'Quel type de service recherches-tu ?',
    subtitle: 'Plusieurs réponses possibles',
    type: 'multi',
    groups: { jour: '☀️ Services de jour', nuit: '🌙 Pension' },
    options: [
      { id: 'chez_petsitter', emoji: '🏠', label: 'Chez le petsitter', group: 'jour' },
      { id: 'visite',         emoji: '🐾', label: 'Visite à domicile', group: 'jour' },
      { id: 'promenade',      emoji: '🚶', label: 'Promenade',         group: 'jour' },
      { id: 'nuit',           emoji: '🌙', label: 'Garde de nuit',     group: 'nuit' },
    ],
  },
  {
    id: 'temps_seul',
    question: 'Combien de temps peut-il rester seul ?',
    type: 'single',
    options: [
      { id: 'jamais',  emoji: '🏠', label: 'Jamais' },
      { id: '1_2h',    emoji: '⏱️', label: '1–2h' },
      { id: '3_5h',    emoji: '🕑', label: '3–5h' },
      { id: 'plus_5h', emoji: '🕕', label: '5h+' },
    ],
  },
  // Slide 7 — Routine
  {
    id: 'routine',
    question: 'À quoi ressemble une journée normale ?',
    subtitle: 'Plusieurs réponses possibles',
    type: 'multi',
    options: [
      { id: 'reveil',    emoji: '🌅', label: 'Réveil tôt' },
      { id: 'repas',     emoji: '🍽️', label: 'Repas à heure fixe' },
      { id: 'promenade', emoji: '🚶', label: 'Promenade quotidienne' },
      { id: 'sieste',    emoji: '💤', label: 'Sieste' },
      { id: 'jeu',       emoji: '🎾', label: 'Temps de jeu' },
      { id: 'coucher',   emoji: '🌙', label: 'Coucher tôt' },
    ],
  },
  // Slide 8 — Le petit plus
  {
    id: 'petsitter_ideal',
    question: 'Quel serait le petsitter idéal pour ton animal ?',
    type: 'text',
    placeholder: 'Ex: quelqu\'un de patient, qui a un jardin, sans autres animaux…',
    optional: true,
  },
  // Slide 10 — Disponibilité
  {
    id: 'quand_garde',
    question: 'Quand as-tu besoin d\'une garde ?',
    subtitle: 'Plusieurs réponses possibles',
    type: 'multi',
    options: [
      { id: 'ce_weekend',   emoji: '🗓️', label: 'Ce week-end' },
      { id: 'cette_semaine',emoji: '📅', label: 'Cette semaine' },
      { id: 'vacances',     emoji: '🌴', label: 'Prochaines vacances' },
      { id: 'regulier',     emoji: '🔄', label: 'Régulièrement' },
      { id: 'date_precise', emoji: '📲', label: 'Date précise', followUp: 'Ex: du 15 au 22 juillet…' },
    ],
  },
  { id: 'date_naissance',   question: 'Ta date de naissance 🎂',       type: 'text',          placeholder: 'JJ/MM/AAAA',             keyboardType: 'number-pad', minLength: 10 },
  { id: 'email',    question: 'Ton adresse email 📧',       type: 'text',          placeholder: 'sophie@email.com', keyboardType: 'email-address', autoCapitalize: 'none' },
  { id: 'password', question: 'Choisis un mot de passe 🔒', type: 'password_pair', placeholder: 'Minimum 6 caractères', placeholder2: 'Répète ton mot de passe' },
  { id: 'telephone',        question: 'Ton numéro de téléphone 📱',   type: 'text',             placeholder: '06 12 34 56 78',      keyboardType: 'phone-pad', optional: true },
  { id: 'adresse',          question: 'Ton adresse 📍',               type: 'address',          placeholder: '12 rue des Lilas, Paris…', optional: true },
];

function getQuestions(answers) {
  const role = answers?.role;
  const base = [ROLE_QUESTION];
  if (!role) return base;
  if (role === 'pawsitter') return [...base, ...PAWSITTER_QUESTIONS];

  // Propriétaire — génère les questions par animal dynamiquement
  const nb = getNbAnimaux(answers);
  const animalQs = [];
  for (let i = 0; i < nb; i++) {
    PROPRIO_PER_ANIMAL.forEach(q => {
      const nom = answers?.[`nom_animal_${i}`];
      let questionText;
      if (nom && q.questionWithName) {
        questionText = q.questionWithName.replace('{nom}', nom);
      } else if (nb > 1) {
        const label = nom || `Animal ${i + 1}`;
        questionText = `${q.question.replace(' ❤️','').replace(' ⚠️','')} — ${label}`;
      } else {
        questionText = q.question;
      }
      animalQs.push({ ...q, id: `${q.id}_${i}`, question: questionText });
    });
  }

  const recapSlide = {
    id: 'recap_animaux',
    type: 'recap',
    question: nb > 1 ? 'Récap de tes animaux 🐾' : 'Récap de ton animal 🐾',
    subtitle: nb > 1
      ? 'Vérifie les infos de chaque animal avant de continuer'
      : 'Vérifie les infos avant de continuer',
  };

  return [...base, ...PROPRIO_BEFORE_ANIMAL, ...animalQs, recapSlide, ...PROPRIO_GLOBAL];
}

function renderOnboardingOption(opt, isMulti, answer, handleSelect, styles) {
  const selected = isMulti
    ? Array.isArray(answer) && answer.includes(opt.id)
    : answer === opt.id;
  const isExclusive = opt.exclusive === true;
  return (
    <TouchableOpacity
      key={opt.id}
      onPress={() => handleSelect(opt.id)}
      activeOpacity={0.8}
      style={[
        styles.option,
        selected && styles.optionSelected,
        isExclusive && styles.optionExclusive,
        isExclusive && selected && styles.optionExclusiveSelected,
      ]}
    >
      {opt.image
        ? <Image source={opt.image} style={styles.optionImg} resizeMode="contain" />
        : <Text style={styles.optionEmoji}>{opt.emoji}</Text>
      }
      <Text style={[
        styles.optionLabel,
        selected && styles.optionLabelSelected,
        isExclusive && selected && { color: '#065F46' },
      ]}>
        {opt.label}
      </Text>
      {selected && (
        <View style={[styles.checkBadge, isExclusive && { backgroundColor: '#10B981' }]}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Composant principal ───────────────────────────────────────────
export default function OnboardingScreen({ user, onComplete, onSkip }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers]           = useState({});
  const [followUpTexts, setFollowUpTexts] = useState({});
  const [saving, setSaving]             = useState(false);
  const [signUpError, setSignUpError]   = useState(null);
  const [showPwd, setShowPwd]           = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const questions = getQuestions(answers);
  const question  = questions[currentIndex];
  const answer   = answers[question.id];
  const isMulti   = question.type === 'multi';
  const isText    = question.type === 'text';
  const isAddress = question.type === 'address';
  const isPwd     = question.type === 'password';
  const isPwdConf = question.type === 'password_confirm';
  const isPwdPair = question.type === 'password_pair';
  const isRecap   = question.type === 'recap';
  const isPicker  = question.type === 'picker';
  const isServiceTarifs = question.type === 'servicetarifs';

  // Tarifs par service sélectionné (slide 14 pawsitter)
  const tarifServices = isServiceTarifs
    ? (Array.isArray(answers.services) ? answers.services : []).filter(s => SERVICE_TARIFS[s])
    : [];
  const tarifsOk = !isServiceTarifs
    || (tarifServices.length > 0
        && tarifServices.every(s => (parseFloat(answers[tarifKey(s)]) || 0) > 0));

  // Sous-question optionnelle affichée sur la même slide (ex: stérilisé sous sexe)
  const extraKey    = question.extraSingle ? `${question.id}__${question.extraSingle.key}` : null;
  const extraAnswer = extraKey ? answers[extraKey] : undefined;
  const extraShown  = !!question.extraSingle
    && (!question.extraSingle.showOn || question.extraSingle.showOn.includes(answer));

  // Liste dynamique (ajout multiple) sur la même slide, selon l'option choisie
  const listCfg      = question.addList;
  const listFields   = listCfg?.fields ?? null;               // [{key, placeholder}] si multi-champs
  const mkListEmpty  = () => (listFields ? {} : '');
  const listSelected = Array.isArray(answer) ? answer : (answer != null ? [answer] : []);
  const listActive   = !!listCfg && listSelected.some(v => listCfg.showOn.includes(v));
  const listKey      = listCfg?.key;
  const listItems    = listActive
    ? (Array.isArray(answers[listKey]) && answers[listKey].length ? answers[listKey] : [mkListEmpty()])
    : [];
  const listItemOk   = (v) => listFields
    ? String(v?.[listFields[0].key] ?? '').trim() !== ''
    : String(v ?? '').trim() !== '';
  const listOk       = !listActive || listItems.some(listItemOk);
  const setListItems = (next) => setAnswers(a => ({ ...a, [listKey]: next }));

  const isAnswered = (question.optional || isRecap)
    ? true
    : isServiceTarifs
      ? tarifsOk
    : isMulti
      ? Array.isArray(answer) && answer.length > 0 && listOk
      : isPwdPair
        ? typeof answers['password'] === 'string' && answers['password'].trim().length >= 6
          && typeof answers['password_confirm'] === 'string' && answers['password_confirm'] === answers['password']
      : isText || isPwd || isAddress
        ? typeof answer === 'string' && answer.trim().length >= (isPwd ? 6 : (question.minLength ?? 4))
          && (!question.hasPhoto || !!answers[`photo_${question.id}`])
        : isPwdConf
          ? typeof answer === 'string' && answer === answers['password']
          : !!answer && (!extraShown || !!extraAnswer) && listOk;

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
      const opt  = question.options?.find(o => o.id === optionId);
      let next;
      if (opt?.exclusive) {
        // Sélection exclusive : vide tous les autres, toggle lui-même
        next = prev.includes(optionId) ? [] : [optionId];
      } else {
        // Sélection normale : retire les options exclusives si présentes
        const withoutExcl = prev.filter(id => !question.options?.find(o => o.id === id)?.exclusive);
        next = withoutExcl.includes(optionId)
          ? withoutExcl.filter(id => id !== optionId)
          : [...withoutExcl, optionId];
      }
      setAnswers(a => ({ ...a, [question.id]: next }));
    } else {
      setAnswers(a => ({ ...a, [question.id]: optionId }));
    }
  };

  const handlePickPhoto = async (source) => {
    const photoKey = `photo_${question.id}`;
    let result;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
      result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    }
    if (!result.canceled && result.assets?.[0]?.uri) {
      setAnswers(a => ({ ...a, [photoKey]: result.assets[0].uri }));
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
    setSignUpError(null);
    const finalAnswers = { ...answers, ...Object.fromEntries(
      Object.entries(followUpTexts).map(([k, v]) => [k + '_detail', v])
    )};
    // Tarif "vitrine" (colonne users.tarif) : garde à domicile > nuitée > 1er service tarifé
    const tarifPrincipal =
      ['garde_domicile', 'nuitee', 'promenade', 'visite']
        .map(s => parseFloat(finalAnswers[tarifKey(s)]))
        .find(v => v > 0);
    if (tarifPrincipal != null && (finalAnswers.tarif == null || finalAnswers.tarif === '')) {
      finalAnswers.tarif = String(tarifPrincipal);
    }
    try {
      const nom = user?.user_metadata?.nom ?? 'Utilisateur';
      const role = finalAnswers.role ?? 'proprietaire';
      const isPawsitter = role === 'pawsitter' || role === 'petsitter';
      const ps = isPawsitter ? onboardingToPetsitter(finalAnswers) : null;
      const extraData = {
        telephone:        finalAnswers.telephone ?? null,
        adresse:          finalAnswers.adresse ?? null,
        ville:            finalAnswers._ville ?? null,
        latitude:         finalAnswers._latitude ?? null,
        longitude:        finalAnswers._longitude ?? null,
        animaux_acceptes: ps?.animaux_acceptes ?? [],
        services:         Array.isArray(finalAnswers.services) ? finalAnswers.services : [],
        badges:           [],
        tarif:            finalAnswers.tarif ?? null,
        bio:              (ps?.experience || finalAnswers.bio) ?? null,
        // Réponses complètes de l'onboarding — relues par ProfilScreen à chaque chargement
        onboarding:       finalAnswers,
      };
      const data = await signUp(finalAnswers.email, finalAnswers.password, nom, role, extraData);
      const userId = data.user.id;

      // ── Upload des photos d'animaux vers Supabase Storage ──────────
      // Les clés photo_nom_animal_N contiennent des URIs locaux (data: ou file://).
      // On les uploade maintenant qu'on est authentifié, puis on remplace les URIs
      // par des URLs permanentes dans le blob onboarding stocké en DB.
      const photoKeys = Object.keys(finalAnswers).filter(
        k => /^photo_nom_animal_\d+$/.test(k) && finalAnswers[k] && !finalAnswers[k].startsWith('http')
      );
      if (photoKeys.length > 0) {
        const updatedAnswers = { ...finalAnswers };
        await Promise.all(photoKeys.map(async (key) => {
          const idx = key.replace('photo_nom_animal_', '');
          const nomAnimal = (finalAnswers[`nom_animal_${idx}`] ?? 'animal')
            .toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
          const slug = `${userId}_${nomAnimal}_${idx}`;
          try {
            const url = await uploadAnimalPhoto(slug, finalAnswers[key]);
            updatedAnswers[key] = url;
          } catch (e) {
            console.warn(`Upload photo animal ${key}:`, e?.message);
          }
        }));
        // Mettre à jour le blob onboarding en DB avec les URLs permanentes
        const { error: blobErr } = await supabase.from('users')
          .update({ onboarding: nettoyerOnboarding(updatedAnswers) })
          .eq('id', userId);
        if (blobErr) console.warn('Mise à jour onboarding:', blobErr.message);
        // Propager les URLs dans finalAnswers pour la suite (saveAnimaux, onComplete)
        Object.assign(finalAnswers, updatedAnswers);
      }

      // Propriétaire : créer les fiches animaux saisies pendant l'onboarding
      if (!isPawsitter) {
        const animaux = onboardingToAnimaux(finalAnswers);
        if (animaux.length > 0) {
          await saveAnimaux(userId, animaux).catch(e => console.warn('saveAnimaux onboarding:', e?.message));
        }
      }
      // Copie aussi dans user_metadata (best-effort : échoue si l'email doit être confirmé,
      // ce n'est pas grave, le blob est déjà dans la table users via signUp)
      await supabase.auth.updateUser({
        data: { onboarding: nettoyerOnboarding(finalAnswers), onboarding_done: true },
      }).catch(() => {});
      onComplete(finalAnswers, data.user, data.session);
    } catch (e) {
      setSignUpError(e.message ?? 'Une erreur est survenue.');
      setSaving(false);
    }
  };

  const progress = (currentIndex + 1) / questions.length;

  const handleSkip = () => {
    Alert.alert(
      'Tu nous quittes déjà ? 😞',
      'Tu pourras compléter ton profil plus tard \nLes animaux ont besoin de toi 🥰 ',
      [
        { text: 'Rester', style: 'cancel' },
        { text: 'Quitter', style: 'destructive', onPress: () => onSkip?.() },
      ]
    );
  };

  return (
    <ImageBackground source={PASTEL_BG} style={styles.root} imageStyle={styles.rootBg}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerStep}>{currentIndex + 1} / {questions.length}</Text>
          <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.headerClose}>✕</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Ton profil PawWatch 🐾</Text>
        {/* Barre de progression */}
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
        </View>
      </View>

      {/* Slide */}
      <KeyboardAvoidingView
        style={styles.slide}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
      <Animated.View style={[styles.slideInner, { transform: [{ translateX: slideAnim }] }]}>
        <ScrollView
          contentContainerStyle={styles.slideContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <Text style={styles.question}>{question.question}</Text>
          {question.subtitle && question.options && !isServiceTarifs && (
            <Text style={styles.questionSub}>{question.subtitle}</Text>
          )}

          {isServiceTarifs ? (
            <View>
              {question.subtitle && (
                <Text style={styles.tarifIntro}>{question.subtitle}</Text>
              )}
              {tarifServices.length === 0 ? (
                <Text style={styles.tarifIntro}>
                  Reviens en arrière pour choisir au moins un service.
                </Text>
              ) : (
                tarifServices.map(svc => {
                  const cfg = SERVICE_TARIFS[svc];
                  return (
                    <View key={svc} style={{ marginTop: 12 }}>
                      <PriceInput
                        label={cfg.label}
                        icon={cfg.icon}
                        range={cfg}
                        value={answers[tarifKey(svc)] ?? ''}
                        onChange={t => {
                          const digits = t.replace(/[^0-9.]/g, '');
                          setAnswers(a => ({ ...a, [tarifKey(svc)]: digits }));
                        }}
                      />
                    </View>
                  );
                })
              )}
            </View>
          ) : isRecap ? (
            <View style={styles.recapList}>
              {Array.from({ length: getNbAnimaux(answers) }, (_, i) => {
                const nom    = answers[`nom_animal_${i}`] || `Animal ${i + 1}`;
                const typeV  = answers[`type_per_animal_${i}`] ?? answers.type_animal;
                const race   = answers[`race_animal_${i}`];
                const rawAge = answers[`age_animal_${i}`];
                const age    = AGE_LABELS[rawAge]
                  ?? (rawAge === '0' ? 'Moins d\'1 an'
                      : rawAge === '1' ? '1 an'
                      : rawAge ? `${rawAge} ans`
                      : '—');
                const sexeV  = answers[`sexe_animal_${i}`];
                const sexe   = sexeV === 'male' ? '♂️ Mâle' : sexeV === 'femelle' ? '♀️ Femelle' : '—';
                const steriV = answers[`sexe_animal_${i}__sterilise`];
                const steri  = steriV === 'oui' ? 'Stérilisé' : steriV === 'non' ? 'Non stérilisé' : null;
                const carV   = answers[`caractere_${i}`];
                const besoinsArr = answers[`besoins_specifiques_${i}`] ?? [];
                const autresBesoins = besoinsArr.filter(b => b !== 'aucun');
                const photoV = answers[`photo_nom_animal_${i}`];
                return (
                  <View key={i} style={styles.recapCard}>
                    <View style={styles.recapCardHead}>
                      {photoV
                        ? <Image source={{ uri: photoV }} style={styles.recapPhoto} />
                        : <Text style={styles.recapEmoji}>{TYPE_EMOJI[typeV] ?? '🐾'}</Text>
                      }
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recapNom}>{nom}</Text>
                        <Text style={styles.recapMeta}>{race ? `${race} · ` : ''}{age} · {sexe}{steri ? ` · ${steri}` : ''}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.recapEditBtn}
                        activeOpacity={0.7}
                        onPress={() => {
                          const idx = questions.findIndex(q => q.id === `nom_animal_${i}`);
                          if (idx !== -1) animateSlide('prev', () => setCurrentIndex(idx));
                        }}
                      >
                        <Text style={styles.recapEditText}>✏️ Modifier</Text>
                      </TouchableOpacity>
                    </View>
                    {carV ? <Text style={styles.recapItem}>{CAR_EMOJI[carV]} {CAR_LABEL[carV]}</Text> : null}
                    {autresBesoins.length > 0 ? (
                      <Text style={styles.recapItem}>⚠️ {autresBesoins.join(', ')}</Text>
                    ) : null}
                    {answers[`infos_importantes_${i}`] ? (
                      <Text style={styles.recapInfo}>{answers[`infos_importantes_${i}`]}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : isPicker ? (
            <View style={styles.pickerContainer}>
              {Array.from(
                { length: question.pickerMax - question.pickerMin + 1 },
                (_, i) => {
                  const val = question.pickerMin + i;
                  const label = val === 0
                    ? 'Moins d\'1 an'
                    : val === 1
                      ? `1 ${question.pickerUnit}`
                      : `${val} ${question.pickerUnit}`;
                  const sel = answer === String(val);
                  return (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setAnswers(a => ({ ...a, [question.id]: String(val) }))}
                      style={[styles.pickerRow, sel && styles.pickerRowSel]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pickerRowText, sel && styles.pickerRowTextSel]}>{label}</Text>
                      {sel && <Text style={styles.pickerCheck}>✓</Text>}
                    </TouchableOpacity>
                  );
                }
              )}
            </View>
          ) : isAddress ? (
            <>
              <AddressAutocomplete
                value={answer ?? ''}
                onChangeText={t => setAnswers(a => ({ ...a, adresse: t }))}
                onSelect={({ adresse, ville, codePostal, latitude, longitude }) =>
                  setAnswers(a => ({
                    ...a, adresse,
                    _ville: ville, _codePostal: codePostal,
                    _latitude: latitude, _longitude: longitude,
                  }))
                }
                placeholder={question.placeholder}
                style={{ marginTop: 8 }}
                inputStyle={{ fontSize: 16, paddingVertical: 15 }}
              />
              {signUpError ? (
                <Text style={styles.inputError}>{signUpError}</Text>
              ) : null}
            </>
          ) : isPwdPair ? (
            <>
              <View style={styles.pwdRow}>
                <TextInput
                  style={[styles.textInput, styles.pwdInput]}
                  placeholder={question.placeholder}
                  placeholderTextColor={COLORS.muted}
                  value={answers['password'] ?? ''}
                  onChangeText={t => setAnswers(a => ({ ...a, password: t }))}
                  secureTextEntry={!showPwd}
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.pwdToggle}
                  onPress={() => setShowPwd(s => !s)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pwdToggleText}>{showPwd ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {typeof answers['password'] === 'string' && answers['password'].length > 0 && answers['password'].length < 6 && (
                <Text style={styles.inputHint}>Minimum 6 caractères</Text>
              )}
              <View style={[styles.pwdRow, { marginTop: 14 }]}>
                <TextInput
                  style={[styles.textInput, styles.pwdInput]}
                  placeholder={question.placeholder2}
                  placeholderTextColor={COLORS.muted}
                  value={answers['password_confirm'] ?? ''}
                  onChangeText={t => setAnswers(a => ({ ...a, password_confirm: t }))}
                  secureTextEntry={!showPwd}
                />
                <TouchableOpacity
                  style={styles.pwdToggle}
                  onPress={() => setShowPwd(s => !s)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pwdToggleText}>{showPwd ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              {typeof answers['password_confirm'] === 'string' && answers['password_confirm'].length > 0 && answers['password_confirm'] !== answers['password'] && (
                <Text style={styles.inputError}>Les mots de passe ne correspondent pas</Text>
              )}
              {signUpError && (
                <Text style={styles.inputError}>{signUpError}</Text>
              )}
            </>
          ) : (isText || isPwd || isPwdConf) ? (
            <>
              <TextInput
                style={styles.textInput}
                placeholder={question.placeholder}
                placeholderTextColor={COLORS.muted}
                value={answer ?? ''}
                onChangeText={t => {
                  let val = t;
                  if (question.id === 'date_naissance') {
                    const d = t.replace(/[^0-9]/g, '').slice(0, 8);
                    if (d.length <= 2) val = d;
                    else if (d.length <= 4) val = `${d.slice(0,2)}/${d.slice(2)}`;
                    else val = `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4,8)}`;
                  }
                  setAnswers(a => ({ ...a, [question.id]: val }));
                }}
                keyboardType={question.keyboardType ?? 'default'}
                autoCapitalize={question.autoCapitalize ?? 'sentences'}
                secureTextEntry={isPwd || isPwdConf}
                maxLength={question.id === 'date_naissance' ? 10 : undefined}
                autoFocus
              />
              {isPwd && typeof answer === 'string' && answer.length > 0 && answer.length < 6 && (
                <Text style={styles.inputHint}>Minimum 6 caractères</Text>
              )}
              {isPwdConf && typeof answer === 'string' && answer.length > 0 && answer !== answers['password'] && (
                <Text style={styles.inputError}>Les mots de passe ne correspondent pas</Text>
              )}
              {signUpError && (
                <Text style={styles.inputError}>{signUpError}</Text>
              )}
              {question.subtitle && (
                <Text style={styles.inputSubtitle}>{question.subtitle}</Text>
              )}
              {question.id === 'tarif' && (() => {
                const val = parseInt(answer ?? '', 10);
                if (!answer || isNaN(val)) return (
                  <Text style={styles.tarifRef}>💡 En moyenne sur Paw Watch : 20€/jour</Text>
                );
                const feedback = val < 15
                  ? { label: '🟢 Très attractif — en dessous du marché', color: '#16A34A', bg: '#F0FDF4' }
                  : val <= 30
                  ? { label: '✅ Dans la moyenne — très bon prix', color: '#15803D', bg: '#F0FDF4' }
                  : val <= 45
                  ? { label: '🟠 Un peu au-dessus de la moyenne', color: '#D97706', bg: '#FFFBEB' }
                  : { label: '🔴 Élevé pour débuter — les propriétaires hésiteront', color: '#DC2626', bg: '#FEF2F2' };
                return (
                  <View style={[styles.tarifFeedback, { backgroundColor: feedback.bg, borderColor: feedback.color }]}>
                    <Text style={[styles.tarifFeedbackText, { color: feedback.color }]}>{feedback.label}</Text>
                    <Text style={styles.tarifRef}>Référence marché : 15–30€/jour</Text>
                  </View>
                );
              })()}
              {question.hasPhoto && (
                <View style={styles.photoSection}>
                  {answers[`photo_${question.id}`] ? (
                    <View style={styles.photoPreviewBox}>
                      <Image source={{ uri: answers[`photo_${question.id}`] }} style={styles.photoPreview} />
                      <TouchableOpacity
                        style={styles.photoRemove}
                        onPress={() => setAnswers(a => { const n = { ...a }; delete n[`photo_${question.id}`]; return n; })}
                        activeOpacity={0.8}>
                        <Text style={styles.photoRemoveText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.photoButtons}>
                      <TouchableOpacity style={styles.photoBtn} onPress={() => handlePickPhoto('camera')} activeOpacity={0.8}>
                        <Text style={styles.photoBtnEmoji}>📷</Text>
                        <Text style={styles.photoBtnText}>Prendre une photo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.photoBtn} onPress={() => handlePickPhoto('gallery')} activeOpacity={0.8}>
                        <Text style={styles.photoBtnEmoji}>🖼️</Text>
                        <Text style={styles.photoBtnText}>Galerie</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </>
          ) : question.groups ? (
            Object.keys(question.groups).map(groupId => (
              <View key={groupId} style={styles.optionGroup}>
                <Text style={styles.optionGroupLabel}>{question.groups[groupId]}</Text>
                <View style={styles.optionsGrid}>
                  {question.options.filter(opt => opt.group === groupId).map(opt =>
                    renderOnboardingOption(opt, isMulti, answer, handleSelect, styles)
                  )}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.optionsGrid}>
              {question.options.map(opt =>
                renderOnboardingOption(opt, isMulti, answer, handleSelect, styles)
              )}
            </View>
          )}

          {/* Sous-question sur la même slide (ex: stérilisé sous le sexe, clôture sous logement) */}
          {extraShown && (
            <View style={styles.extraBlock}>
              <Text style={styles.extraLabel}>{question.extraSingle.label}</Text>
              <View style={styles.optionsGrid}>
                {question.extraSingle.options.map(opt => {
                  const selected = extraAnswer === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => setAnswers(a => ({ ...a, [extraKey]: opt.id }))}
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
            </View>
          )}

          {/* Liste dynamique (âge des enfants, nom+race des animaux…) — même slide, ajout multiple */}
          {listActive && (
            <View style={styles.extraBlock}>
              <Text style={styles.extraLabel}>{listCfg.label}</Text>
              {listItems.map((item, idx) => (
                <View key={idx} style={styles.childRow}>
                  {listFields ? (
                    <View style={styles.listFieldsCol}>
                      {listFields.map(f => (
                        <TextInput
                          key={f.key}
                          style={[styles.childInput, { marginTop: f === listFields[0] ? 0 : 8 }]}
                          placeholder={f.placeholder}
                          placeholderTextColor={COLORS.muted}
                          value={String(item?.[f.key] ?? '')}
                          onChangeText={t => setListItems(
                            listItems.map((v, i) => (i === idx ? { ...v, [f.key]: t.slice(0, 60) } : v))
                          )}
                          maxLength={60}
                        />
                      ))}
                    </View>
                  ) : (
                    <TextInput
                      style={styles.childInput}
                      placeholder={(listCfg.placeholder ?? 'Élément {n}').replace('{n}', String(idx + 1))}
                      placeholderTextColor={COLORS.muted}
                      value={String(item ?? '')}
                      onChangeText={t => {
                        const val = listCfg.numeric
                          ? t.replace(/[^0-9]/g, '').slice(0, 2)
                          : t.slice(0, 60);
                        setListItems(listItems.map((v, i) => (i === idx ? val : v)));
                      }}
                      keyboardType={listCfg.numeric ? 'number-pad' : 'default'}
                      maxLength={listCfg.numeric ? 2 : 60}
                    />
                  )}
                  {listItems.length > 1 && (
                    <TouchableOpacity
                      style={styles.childRemove}
                      onPress={() => setListItems(listItems.filter((_, i) => i !== idx))}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.childRemoveText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity
                style={styles.childAddBtn}
                onPress={() => setListItems([...listItems, mkListEmpty()])}
                activeOpacity={0.8}
              >
                <Text style={styles.childAddText}>＋ {listCfg.addLabel ?? 'Ajouter'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Champ texte libre si l'option sélectionnée a un followUp */}
          {(() => {
            if (!question.options) return null;
            const selectedOpt = question.options.find(o =>
              isMulti
                ? Array.isArray(answer) && answer.includes(o.id) && o.followUp
                : answer === o.id && o.followUp
            );
            if (!selectedOpt) return null;
            return (
              <TextInput
                style={styles.followUpInput}
                placeholder={selectedOpt.followUp}
                placeholderTextColor={COLORS.muted}
                value={followUpTexts[question.id] ?? ''}
                onChangeText={t => setFollowUpTexts(prev => ({ ...prev, [question.id]: t }))}
                autoFocus
              />
            );
          })()}
        </ScrollView>
      </Animated.View>
      </KeyboardAvoidingView>

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
            colors={isAnswered && !saving ? ['#C4741A', COLORS.bark] : [COLORS.border, COLORS.border]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.nextGradient}
          >
            <Text style={[styles.nextText, (!isAnswered || saving) && { color: COLORS.muted }]}>
              {saving
                ? 'Enregistrement…'
                : currentIndex === questions.length - 1
                  ? 'Terminer 🐾'
                  : 'Suivant →'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.sand },
  rootBg: { resizeMode: 'cover', opacity: 0.9 },

  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight ?? 24) + 12,
    paddingBottom: 24,
    paddingHorizontal: 24,
    backgroundColor: '#FDEBD0',
    overflow: 'hidden',
  },
  headerTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  headerClose: { fontSize: 18, color: 'rgba(26,39,86,0.45)', ...FONTS.bold, paddingLeft: 8 },
  headerStep:  { fontSize: 12, color: 'rgba(26,39,86,0.5)', ...FONTS.bold, letterSpacing: 1 },
  headerTitle: { fontSize: 20, color: COLORS.ink, ...FONTS.heavy, marginBottom: 16 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressBar: { flex: 1, height: 6, backgroundColor: 'rgba(232,146,42,0.2)', borderRadius: 3, overflow: 'hidden' },
  progressFill:{ height: '100%', backgroundColor: COLORS.bark, borderRadius: 3 },
  progressPct: { fontSize: 12, ...FONTS.bold, color: COLORS.bark, minWidth: 34, textAlign: 'right' },

  slide: { flex: 1, backgroundColor: 'rgba(250, 248, 244, 0.82)' },
  slideInner: { flex: 1 },
  slideContent: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 120, flexGrow: 1 },

  question:    { fontSize: 20, ...FONTS.heavy, color: COLORS.ink, marginBottom: 6, lineHeight: 28 },
  questionSub: { fontSize: 13, color: COLORS.muted, marginBottom: 20 },
  tarifIntro:  { fontSize: 13, color: COLORS.muted, marginTop: 4, marginBottom: 4, lineHeight: 19 },

  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },

  optionGroup:      { marginTop: 8 },
  optionGroupLabel: { fontSize: 13, ...FONTS.bold, color: COLORS.muted, marginBottom: 8, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  extraBlock: { marginTop: 24, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 16 },
  extraLabel: { fontSize: 16, ...FONTS.heavy, color: COLORS.ink, marginBottom: 4 },

  childRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  listFieldsCol: { flex: 1 },
  childInput: {
    flex: 1, backgroundColor: COLORS.white,
    borderWidth: 1.5, borderColor: COLORS.bark,
    borderRadius: RADIUS.md, paddingVertical: 12, paddingHorizontal: 14,
    fontSize: 16, color: COLORS.ink,
  },
  childRemove: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  childRemoveText: { fontSize: 15, color: COLORS.ink, ...FONTS.bold },
  childAddBtn: { marginTop: 12, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 4 },
  childAddText: { fontSize: 15, ...FONTS.bold, color: COLORS.bark },
  textInput: {
    marginTop: 8, backgroundColor: COLORS.white,
    borderWidth: 1.5, borderColor: COLORS.bark,
    borderRadius: RADIUS.md, padding: 16,
    fontSize: 16, color: COLORS.ink,
  },
  inputHint:  { marginTop: 6, fontSize: 12, color: COLORS.muted },
  inputError: { marginTop: 6, fontSize: 12, color: '#E53E3E', ...FONTS.medium },

  pwdRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  pwdInput: { flex: 1, marginTop: 0 },
  pwdToggle: {
    width: 52, height: 52, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.bark, borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
  },
  pwdToggleText: { fontSize: 20 },

  pickerContainer:  { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, overflow: 'hidden', backgroundColor: COLORS.white, marginTop: 8 },
  pickerRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerRowSel:     { backgroundColor: '#FFF4E6' },
  pickerRowText:    { fontSize: 15, ...FONTS.medium, color: COLORS.ink },
  pickerRowTextSel: { ...FONTS.bold, color: COLORS.bark },
  pickerCheck:      { fontSize: 14, color: COLORS.bark, ...FONTS.bold },

  tarifFeedback:     { marginTop: 14, borderWidth: 1.5, borderRadius: RADIUS.md, padding: 12 },
  tarifFeedbackText: { fontSize: 14, ...FONTS.bold, marginBottom: 4 },
  tarifRef:          { marginTop: 10, fontSize: 12, color: COLORS.muted, ...FONTS.medium },

  recapList:     { gap: 12 },
  recapCard:     { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, padding: 14, gap: 6 },
  recapCardHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  recapEmoji:    { fontSize: 32 },
  recapPhoto:    { width: 44, height: 44, borderRadius: 22 },
  recapNom:      { fontSize: 16, ...FONTS.heavy, color: COLORS.ink },
  recapMeta:     { fontSize: 13, color: COLORS.muted },
  recapItem:     { fontSize: 13, color: COLORS.ink, ...FONTS.medium },
  recapInfo:     { fontSize: 12, color: COLORS.muted, fontStyle: 'italic', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 6, marginTop: 2 },
  recapEditBtn:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.bark },
  recapEditText: { fontSize: 12, ...FONTS.bold, color: COLORS.bark },
  inputSubtitle:   { marginTop: 14, fontSize: 17, ...FONTS.heavy, color: COLORS.ink, textAlign: 'center' },
  photoSection:    { marginTop: 16, alignItems: 'center' },
  photoPreviewBox: { position: 'relative', width: 120, height: 120 },
  photoPreview:    { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: COLORS.bark },
  photoRemove:     { position: 'absolute', top: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  photoRemoveText: { color: '#fff', fontSize: 12, ...FONTS.bold },
  photoButtons:    { flexDirection: 'row', gap: 12 },
  photoBtn:        { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.bark, backgroundColor: COLORS.white },
  photoBtnEmoji:   { fontSize: 24, marginBottom: 4 },
  photoBtnText:    { fontSize: 12, ...FONTS.medium, color: COLORS.ink, textAlign: 'center' },
  followUpInput: {
    marginTop: 16, backgroundColor: COLORS.white,
    borderWidth: 1.5, borderColor: COLORS.bark,
    borderRadius: RADIUS.md, padding: 13,
    fontSize: 15, color: COLORS.ink,
  },
  option: {
    width: (W - 52) / 2,
    backgroundColor: COLORS.white,
    borderWidth: 2, borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 18,
    alignItems: 'center',
    position: 'relative',
  },
  optionSelected:          { borderColor: COLORS.bark, backgroundColor: '#FFF4E6' },
  optionExclusive:         { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 8, borderColor: '#6EE7B7', backgroundColor: '#F0FDF4' },
  optionExclusiveSelected: { borderColor: '#10B981', backgroundColor: '#D1FAE5' },
  optionEmoji:    { fontSize: 32, marginBottom: 8 },
  optionImg:      { width: 138, height: 138, marginBottom: 8 },
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
