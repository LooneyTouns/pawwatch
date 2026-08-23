// screens/shared/ProfilScreen.js
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, Switch, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { Card, Avatar, SectionLabel, PhotoUpload, AnimalEditor, PriceInput } from '../../components/UI';

const DOG_ICON = require('../../assets/dog-icon.png');
const CAT_ICON = require('../../assets/cat-icon.png');

// ── Checkbox ──────────────────────────────────────────────────────
const CheckOption = ({ label, sub, checked, onToggle, image }) => (
  <TouchableOpacity onPress={onToggle} style={[ps.checkOpt, checked && ps.checkOptActive]} activeOpacity={0.7}>
    <View style={[ps.checkBox, checked && ps.checkBoxActive]}>
      {checked && <Text style={ps.checkMark}>✓</Text>}
    </View>
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {image && <Image source={image} style={{ width: 20, height: 20 }} />}
        <Text style={[ps.checkOptLabel, checked && { color: COLORS.bark }]}>{label}</Text>
      </View>
      {sub && <Text style={ps.checkOptSub}>{sub}</Text>}
    </View>
  </TouchableOpacity>
);

// ── Toggle Oui / Non ──────────────────────────────────────────────
const OuiNon = ({ value, onChange }) => (
  <View style={ps.ouiNonRow}>
    {['Oui', 'Non'].map(v => (
      <TouchableOpacity
        key={v}
        onPress={() => onChange(v === 'Oui')}
        style={[ps.ouiNonBtn, value === (v === 'Oui') && ps.ouiNonBtnActive]}
      >
        <Text style={[ps.ouiNonText, value === (v === 'Oui') && ps.ouiNonTextActive]}>{v}</Text>
      </TouchableOpacity>
    ))}
  </View>
);


export default function ProfilScreen({ user, onLogout, onProfilComplet, profilComplet }) {
  const nom      = user?.user_metadata?.nom ?? user?.email ?? 'Utilisateur';
  const email    = user?.email ?? '';
  const role     = user?.user_metadata?.role ?? 'proprietaire';
  const initiales = nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const isProprio   = role === 'proprietaire';
  const isPetsitter = role === 'petsitter';

  // ── Photo de profil ──
  const [photoProfi, setPhotoProfi] = useState(null);

  const pickPhotoProfi = async (fromCamera = true) => {
    const fn = fromCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission requise', fromCamera ? 'Accès à la caméra refusé.' : 'Accès à la galerie refusé.');
      return;
    }
    const result = await fn({
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (!result.canceled) setPhotoProfi(result.assets[0].uri);
  };

  // ── Tabs ──
  const [activeTab, setActiveTab] = useState('profil');

  // ── Notifications ──
  const [notifPush,  setNotifPush]  = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);

  // ── Coordonnées propriétaire ──
  const [telephone,   setTelephone]   = useState('');
  const [adresse,     setAdresse]     = useState('');
  const [codePostal,  setCodePostal]  = useState('');
  const [ville,       setVille]       = useState('');

  // ── Animaux du propriétaire (à confier) ──
  const [mesAnimaux, setMesAnimaux] = useState([]);

  // ── Petsitter : spécialités ──
  const [isCatsitter, setIsCatsitter] = useState(false);
  const [isDogsitter, setIsDogsitter] = useState(false);
  const [isAllsitter, setIsAllsitter] = useState(false);

  // ── Petsitter : expérience ──
  const [experience, setExperience] = useState('');

  // ── Petsitter : animaux perso ──
  const [aDesAnimaux,  setADesAnimaux]  = useState(false);
  const [animauxPerso, setAnimauxPerso] = useState([]);

  // ── Petsitter : logement ──
  const [logement,    setLogement]    = useState('appartement');
  const [aJardin,     setAJardin]     = useState(false);
  const [jardinClos,  setJardinClos]  = useState(false);
  const [photoJardin, setPhotoJardin] = useState(null);

  // ── Petsitter : modes de garde ──
  const [modePromenade,   setModePromenade]   = useState(false);
  const [modeChezProprio, setModeChezProprio] = useState(false);
  const [modeGardeJour,   setModeGardeJour]   = useState(false);
  const [modePension,     setModePension]     = useState(false);

  // ── Petsitter : tarifs ──
  const [prixPromenade, setPrixPromenade] = useState('');
  const [prixPension,   setPrixPension]   = useState('');
  const [prixGardeJour, setPrixGardeJour] = useState('');

  // ── Mon compte : changement email / mdp ──
  const [newEmail,       setNewEmail]       = useState('');
  const [newPassword,    setNewPassword]    = useState('');
  const [confirmPassword,setConfirmPassword]= useState('');
  const [showEmailForm,  setShowEmailForm]  = useState(false);
  const [showPwdForm,    setShowPwdForm]    = useState(false);

  const handleChangerEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      Alert.alert('Email invalide', 'Saisis une adresse email valide.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert('Email modifié', 'Un lien de confirmation a été envoyé à ta nouvelle adresse.');
      setNewEmail('');
      setShowEmailForm(false);
    }
  };

  const handleChangerMDP = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Mot de passe trop court', 'Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mots de passe différents', 'Les deux mots de passe ne correspondent pas.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      Alert.alert('Erreur', error.message);
    } else {
      Alert.alert('Mot de passe modifié ✓', 'Ton mot de passe a été mis à jour.');
      setNewPassword('');
      setConfirmPassword('');
      setShowPwdForm(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Se déconnecter',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', style: 'destructive', onPress: onLogout },
      ]
    );
  };

  const labelRole = role === 'petsitter' ? '🤝 Petsitter' : '🏠 Propriétaire';

  const rolePillColor = role === 'petsitter'
    ? { bg: COLORS.okBg,   text: COLORS.moss }
    : { bg: COLORS.warnBg, text: COLORS.clay };

  const isProfilComplet = () => {
    if (!isPetsitter) return true;
    if (!photoProfi) return false;
    if (!isCatsitter && !isDogsitter && !isAllsitter) return false;
    if (!modePromenade && !modeChezProprio && !modeGardeJour && !modePension) return false;
    if (!experience.trim()) return false;
    if (!logement) return false;
    if (aJardin === null) return false;
    if (aJardin && !photoJardin) return false;
    return true;
  };

  const handleSauvegarder = () => {
    if (isPetsitter && aJardin && !photoJardin) {
      Alert.alert('Photo manquante', 'Une photo du jardin est obligatoire si vous avez un jardin.');
      return;
    }
    if (isPetsitter && isProfilComplet() && onProfilComplet && !profilComplet) {
      onProfilComplet();
      Alert.alert('🎉 Profil validé !', 'Ton profil petsitter est maintenant visible. Tu peux recevoir des demandes de garde.');
    } else {
      Alert.alert('Profil sauvegardé ✓', 'Vos informations ont été mises à jour.');
    }
  };

  return (
    <View style={ps.wrapper}>

      {/* ── Barre d'onglets ── */}
      <View style={ps.tabBar}>
        {[
          { id: 'profil',   label: '👤 Profil'    },
          { id: 'modifier', label: '✏️ Modifier'  },
          { id: 'params',   label: '⚙️ Paramètres' },
        ].map(t => (
          <TouchableOpacity
            key={t.id}
            onPress={() => setActiveTab(t.id)}
            style={[ps.tabBtn, activeTab === t.id && ps.tabBtnActive]}
          >
            <Text style={[ps.tabBtnText, activeTab === t.id && ps.tabBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={ps.container} contentContainerStyle={ps.content}>

        {/* ════════ MON PROFIL ════════ */}
        {activeTab === 'profil' && (
          <>
            {/* Hero */}
            <LinearGradient
              colors={['#1A2756', '#E8922A']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={ps.heroSection}
            >
              <TouchableOpacity
                style={ps.heroAvatarRing}
                onPress={() => pickPhotoProfi(true)}
                onLongPress={() => pickPhotoProfi(false)}
                activeOpacity={0.85}
              >
                <Avatar initials={initiales} size={72} photoUri={photoProfi} />
                <View style={ps.heroAvatarBadge}>
                  <Text style={{ fontSize: 12 }}>📸</Text>
                </View>
              </TouchableOpacity>
              <Text style={ps.heroNom}>{nom}</Text>
              <Text style={ps.heroEmail}>{email}</Text>
              <View style={ps.heroRolePill}>
                <Text style={ps.heroRolePillText}>{labelRole}</Text>
              </View>
              <View style={ps.heroStatsRow}>
                {[
                  { val: '0', label: 'Gardes' },
                  { val: '⭐ —', label: 'Évaluation' },
                  { val: String(mesAnimaux.length), label: 'Animaux' },
                ].map((s, i) => (
                  <View key={s.label} style={[ps.heroStat, i < 2 && ps.heroStatBorder]}>
                    <Text style={ps.heroStatVal}>{s.val}</Text>
                    <Text style={ps.heroStatLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>

            {/* Infos compte */}
            <SectionLabel label="Mon compte" />
            <Card style={ps.infoCard}>
              {[
                { label: 'Nom complet',   value: nom },
                { label: 'Email',         value: email },
                { label: 'Rôle',          value: labelRole },
                { label: 'Membre depuis', value: 'Juin 2026' },
              ].map((row, i, arr) => (
                <View key={row.label} style={[ps.infoRow, i < arr.length - 1 && ps.infoRowBorder]}>
                  <Text style={ps.infoLabel}>{row.label}</Text>
                  <Text style={ps.infoValue}>{row.value}</Text>
                </View>
              ))}
            </Card>

            {/* Notifications */}
            <SectionLabel label="Notifications" />
            <Card>
              <View style={ps.switchRow}>
                <View style={ps.switchLeft}>
                  <Text style={ps.switchTitle}>Notifications push</Text>
                  <Text style={ps.switchSub}>Alertes journaux et messages</Text>
                </View>
                <Switch value={notifPush} onValueChange={setNotifPush}
                  trackColor={{ true: COLORS.bark, false: COLORS.border }} thumbColor={COLORS.white} />
              </View>
              <View style={[ps.switchRow, { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 2, paddingTop: 14 }]}>
                <View style={ps.switchLeft}>
                  <Text style={ps.switchTitle}>Résumé par email</Text>
                  <Text style={ps.switchSub}>Récapitulatif hebdomadaire</Text>
                </View>
                <Switch value={notifEmail} onValueChange={setNotifEmail}
                  trackColor={{ true: COLORS.bark, false: COLORS.border }} thumbColor={COLORS.white} />
              </View>
            </Card>

            {/* Support */}
            <SectionLabel label="Support" />
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {[
                { icon: '📄', label: 'Conditions générales' },
                { icon: '🔒', label: 'Politique de confidentialité' },
                { icon: '❓', label: "Centre d'aide" },
                { icon: '⭐', label: "Évaluer l'application" },
              ].map((item, i, arr) => (
                <TouchableOpacity key={item.label}
                  style={[ps.linkRow, i < arr.length - 1 && ps.linkRowBorder]} activeOpacity={0.7}>
                  <Text style={ps.linkIcon}>{item.icon}</Text>
                  <Text style={ps.linkLabel}>{item.label}</Text>
                  <Text style={ps.linkArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </Card>

            {/* Déconnexion */}
            <TouchableOpacity style={ps.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
              <Text style={ps.logoutText}>Se déconnecter</Text>
            </TouchableOpacity>

            <Text style={ps.version}>PawWatch v1.0.0</Text>
          </>
        )}

        {/* ════════ MODIFIER PROFIL ════════ */}
        {activeTab === 'modifier' && (
          <>
            {/* Bandeau profil petsitter incomplet/complet */}
            {isPetsitter && !profilComplet && (
              <View style={ps.incompletBanner}>
                <Text style={ps.incompletIcon}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={ps.incompletTitle}>Profil petsitter incomplet</Text>
                  <Text style={ps.incompletSub}>
                    Remplis toutes les sections ci-dessous et clique sur «{' '}
                    <Text style={{ ...FONTS.bold }}>Valider mon profil</Text>
                    {' '}» pour être visible des propriétaires.
                  </Text>
                  <View style={ps.checklistWrap}>
                    {[
                      { label: 'Photo de profil',                       done: !!photoProfi },
                      { label: 'Spécialité (Dogsitter / Catsitter)',   done: isDogsitter || isCatsitter || isAllsitter },
                      { label: 'Mode de garde accepté',                 done: modePromenade || modeChezProprio || modeGardeJour || modePension },
                      { label: 'Expérience décrite',                    done: experience.trim().length > 0 },
                      { label: 'Type de logement',                      done: !!logement },
                      { label: aJardin ? 'Photo du jardin uploadée' : 'Jardin (oui / non)', done: aJardin !== null && (!aJardin || !!photoJardin) },
                    ].map(item => (
                      <View key={item.label} style={ps.checklistItem}>
                        <Text style={[ps.checklistDot, { color: item.done ? '#22C55E' : COLORS.clay }]}>
                          {item.done ? '✓' : '✗'}
                        </Text>
                        <Text style={[ps.checklistLabel, item.done && { color: '#16A34A' }]}>{item.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
            {isPetsitter && profilComplet && (
              <View style={ps.completBanner}>
                <Text style={ps.incompletIcon}>✅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={ps.completTitle}>Profil petsitter validé — tu es visible !</Text>
                  <Text style={ps.incompletSub}>Les propriétaires peuvent te contacter pour des gardes.</Text>
                </View>
              </View>
            )}

            {/* ─────── PHOTO DE PROFIL ─────── */}
            <SectionLabel label={isPetsitter ? 'Photo de profil *obligatoire' : 'Photo de profil'} />
            <Card>
              <View style={ps.photoProfiRow}>
                <TouchableOpacity
                  onPress={() => pickPhotoProfi(true)}
                  onLongPress={() => pickPhotoProfi(false)}
                  activeOpacity={0.85}
                  style={ps.photoProfiCircle}
                >
                  {photoProfi
                    ? <Image source={{ uri: photoProfi }} style={ps.photoProfiImg} />
                    : <View style={ps.photoProfiPlaceholder}>
                        <Text style={{ fontSize: 36 }}>👤</Text>
                      </View>
                  }
                  <View style={ps.photoProfiCamera}>
                    <Text style={{ fontSize: 14 }}>📸</Text>
                  </View>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={ps.photoProfiTitle}>
                    {photoProfi ? '✓ Photo ajoutée' : 'Ajouter une photo'}
                  </Text>
                  <Text style={ps.photoProfiHint}>
                    {photoProfi
                      ? 'Appuie pour changer · maintenir = galerie'
                      : '📸 Appuyer = caméra · Maintenir = galerie'}
                  </Text>
                  {isPetsitter && !photoProfi && (
                    <View style={ps.photoProfiAlerte}>
                      <Text style={ps.photoProfiAlerteText}>Obligatoire pour activer le profil</Text>
                    </View>
                  )}
                </View>
              </View>
            </Card>

            {/* ─────── COORDONNÉES (tous les rôles) ─────── */}
            <SectionLabel label="Mes coordonnées" />
            <Card>
              <Text style={ps.cardHint}>Partagées avec ton interlocuteur lors d'une mise en relation</Text>

              <Text style={ps.fieldLabel}>Téléphone</Text>
              <TextInput
                style={ps.coordInput}
                placeholder="06 12 34 56 78"
                placeholderTextColor={COLORS.border}
                value={telephone}
                onChangeText={setTelephone}
                keyboardType="phone-pad"
              />

              <Text style={[ps.fieldLabel, { marginTop: 12 }]}>Adresse</Text>
              <TextInput
                style={ps.coordInput}
                placeholder="12 rue des Lilas"
                placeholderTextColor={COLORS.border}
                value={adresse}
                onChangeText={setAdresse}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <View style={{ width: 100 }}>
                  <Text style={ps.fieldLabel}>Code postal</Text>
                  <TextInput
                    style={ps.coordInput}
                    placeholder="75011"
                    placeholderTextColor={COLORS.border}
                    value={codePostal}
                    onChangeText={setCodePostal}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ps.fieldLabel}>Ville</Text>
                  <TextInput
                    style={ps.coordInput}
                    placeholder="Paris"
                    placeholderTextColor={COLORS.border}
                    value={ville}
                    onChangeText={setVille}
                  />
                </View>
              </View>
            </Card>

            {/* ─────── SECTION PROPRIÉTAIRE ─────── */}
            {isProprio && (
              <>
                {/* Animaux */}
                <SectionLabel label="Mes animaux" />
                <Card>
                  <Text style={ps.cardHint}>Ajoute les animaux dont tu confies la garde</Text>
                  <AnimalEditor animaux={mesAnimaux} onChange={setMesAnimaux} />
                </Card>
              </>
            )}

            {/* ─────── SECTION PETSITTER ─────── */}
            {isPetsitter && (
              <>

                {/* Spécialités */}
                <SectionLabel label="Mes spécialités" />
                <Card>
                  <Text style={ps.cardHint}>Sélectionne les types d'animaux que tu gardes</Text>
                  <CheckOption label="Dogsitter" image={DOG_ICON} sub="Je garde des chiens"
                    checked={isDogsitter}
                    onToggle={() => { setIsDogsitter(!isDogsitter); setIsAllsitter(false); }} />
                  <CheckOption label="Catsitter" image={CAT_ICON} sub="Je garde des chats"
                    checked={isCatsitter}
                    onToggle={() => { setIsCatsitter(!isCatsitter); setIsAllsitter(false); }} />
                  <CheckOption label="🐾 Allsitter" sub="Je garde tous types d'animaux"
                    checked={isAllsitter}
                    onToggle={() => {
                      const next = !isAllsitter;
                      setIsAllsitter(next);
                      if (next) { setIsDogsitter(false); setIsCatsitter(false); }
                    }} />
                </Card>

                {/* Modes de garde */}
                <SectionLabel label="Modes de garde acceptés" />
                <Card>
                  <CheckOption label="🚶 Promenade" sub="Je promène les animaux"
                    checked={modePromenade} onToggle={() => setModePromenade(!modePromenade)} />
                  <CheckOption label="🏠 Garde chez le propriétaire" sub="Je me déplace chez le proprio"
                    checked={modeChezProprio} onToggle={() => setModeChezProprio(!modeChezProprio)} />
                  <CheckOption label="☀️ Garde de jour" sub="Accueil à la journée chez moi"
                    checked={modeGardeJour} onToggle={() => setModeGardeJour(!modeGardeJour)} />
                  <CheckOption label="🏨 Pension" sub="Hébergement nuit et jour chez moi"
                    checked={modePension} onToggle={() => setModePension(!modePension)} />
                </Card>

                {/* Tarifs */}
                <SectionLabel label="Mes tarifs" />
                <Card>
                  <Text style={ps.cardHint}>Fourchette colorée : 🟢 économique · 🟡 dans la moyenne · 🔴 premium</Text>
                  <PriceInput label="Promenade"     icon="🚶" type="promenade" value={prixPromenade} onChange={setPrixPromenade} />
                  <PriceInput label="Pension"       icon="🏨" type="pension"   value={prixPension}   onChange={setPrixPension}   />
                  <PriceInput label="Garde de jour" icon="☀️" type="gardeJour" value={prixGardeJour} onChange={setPrixGardeJour} />
                </Card>

                {/* Expérience */}
                <SectionLabel label="Mon expérience" />
                <Card>
                  <Text style={ps.cardHint}>Décris ton expérience avec les animaux</Text>
                  <TextInput
                    style={ps.textarea}
                    value={experience}
                    onChangeText={setExperience}
                    placeholder="Ex : J'ai grandi avec des chiens, j'ai travaillé dans un refuge pendant 2 ans..."
                    placeholderTextColor={COLORS.border}
                    multiline numberOfLines={4} textAlignVertical="top"
                  />
                </Card>

                {/* Animaux perso */}
                <SectionLabel label="Mes animaux (à la maison)" />
                <Card>
                  <View style={ps.switchRow}>
                    <View style={ps.switchLeft}>
                      <Text style={ps.switchTitle}>J'ai des animaux chez moi</Text>
                      <Text style={ps.switchSub}>Les propriétaires seront informés</Text>
                    </View>
                    <Switch value={aDesAnimaux}
                      onValueChange={v => { setADesAnimaux(v); if (!v) setAnimauxPerso([]); }}
                      trackColor={{ true: COLORS.bark, false: COLORS.border }} thumbColor={COLORS.white} />
                  </View>
                  {aDesAnimaux && (
                    <View style={{ marginTop: 14 }}>
                      <AnimalEditor animaux={animauxPerso} onChange={setAnimauxPerso} />
                    </View>
                  )}
                </Card>

                {/* Logement */}
                <SectionLabel label="Mon logement" />
                <Card>
                  <Text style={ps.fieldLabel}>Type de logement</Text>
                  <View style={ps.logementRow}>
                    {[
                      { id: 'maison',      label: '🏡 Maison' },
                      { id: 'appartement', label: '🏢 Appartement' },
                    ].map(l => (
                      <TouchableOpacity key={l.id} onPress={() => setLogement(l.id)}
                        style={[ps.logementBtn, logement === l.id && ps.logementBtnActive]}>
                        <Text style={[ps.logementText, logement === l.id && ps.logementTextActive]}>{l.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={ps.fieldRow}>
                    <Text style={ps.fieldLabel}>Jardin</Text>
                    <OuiNon value={aJardin} onChange={v => { setAJardin(v); if (!v) { setJardinClos(false); setPhotoJardin(null); } }} />
                  </View>

                  {aJardin && (
                    <>
                      <View style={[ps.fieldRow, ps.fieldBorder]}>
                        <Text style={ps.fieldLabel}>Jardin clôturé</Text>
                        <OuiNon value={jardinClos} onChange={setJardinClos} />
                      </View>
                      <View style={[ps.fieldBorder, { paddingTop: 14 }]}>
                        <Text style={ps.fieldLabel}>
                          Photo du jardin <Text style={{ color: COLORS.clay }}>*obligatoire</Text>
                        </Text>
                        <View style={{ marginTop: 8 }}>
                          <PhotoUpload label="Photo du jardin" icon="🌿"
                            onPhoto={setPhotoJardin} photoUri={photoJardin} />
                        </View>
                      </View>
                    </>
                  )}
                </Card>
              </>
            )}

            {/* ── Bouton sauvegarder / valider ── */}
            <TouchableOpacity
              style={[ps.saveBtn, isPetsitter && !profilComplet && isProfilComplet() && ps.saveBtnReady]}
              onPress={handleSauvegarder}
              activeOpacity={0.8}
            >
              <Text style={ps.saveText}>
                {isPetsitter && !profilComplet && isProfilComplet()
                  ? '🎉 Valider mon profil'
                  : isPetsitter && profilComplet
                  ? '💾 Sauvegarder les modifications'
                  : isPetsitter
                  ? '💾 Sauvegarder (profil petsitter incomplet)'
                  : '💾 Sauvegarder'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ════════ PARAMÈTRES ════════ */}
        {activeTab === 'params' && (
          <>
            {/* ── Mon compte ── */}
            <SectionLabel label="Mon compte" />
            <Card style={{ padding: 0, overflow: 'hidden' }}>

              {/* Email actuel */}
              <View style={ps.paramInfoRow}>
                <Text style={ps.paramInfoIcon}>✉️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={ps.paramInfoLabel}>Adresse email</Text>
                  <Text style={ps.paramInfoValue}>{email}</Text>
                </View>
              </View>

              <View style={ps.accountSep} />

              {/* Changer l'email */}
              <TouchableOpacity style={ps.accountRow} onPress={() => setShowEmailForm(!showEmailForm)} activeOpacity={0.7}>
                <Text style={ps.accountRowIcon}>✏️</Text>
                <Text style={ps.accountRowLabel}>Changer l'adresse email</Text>
                <Text style={ps.accountRowArrow}>{showEmailForm ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showEmailForm && (
                <View style={ps.accountForm}>
                  <Text style={ps.fieldLabel}>Nouvelle adresse email</Text>
                  <TextInput
                    style={ps.coordInput}
                    placeholder="nouveau@email.com"
                    placeholderTextColor={COLORS.border}
                    value={newEmail}
                    onChangeText={setNewEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={ps.accountSaveBtn} onPress={handleChangerEmail} activeOpacity={0.8}>
                    <Text style={ps.accountSaveBtnText}>Confirmer le changement</Text>
                  </TouchableOpacity>
                  <Text style={ps.paramHint}>Un lien de confirmation sera envoyé à ta nouvelle adresse.</Text>
                </View>
              )}

              <View style={ps.accountSep} />

              {/* Changer le mot de passe */}
              <TouchableOpacity style={ps.accountRow} onPress={() => setShowPwdForm(!showPwdForm)} activeOpacity={0.7}>
                <Text style={ps.accountRowIcon}>🔑</Text>
                <Text style={ps.accountRowLabel}>Changer le mot de passe</Text>
                <Text style={ps.accountRowArrow}>{showPwdForm ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showPwdForm && (
                <View style={ps.accountForm}>
                  <Text style={ps.fieldLabel}>Nouveau mot de passe</Text>
                  <TextInput
                    style={ps.coordInput}
                    placeholder="Minimum 8 caractères"
                    placeholderTextColor={COLORS.border}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                  />
                  <Text style={[ps.fieldLabel, { marginTop: 12 }]}>Confirmer le mot de passe</Text>
                  <TextInput
                    style={ps.coordInput}
                    placeholder="Répéter le mot de passe"
                    placeholderTextColor={COLORS.border}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                  <TouchableOpacity style={ps.accountSaveBtn} onPress={handleChangerMDP} activeOpacity={0.8}>
                    <Text style={ps.accountSaveBtnText}>Modifier le mot de passe</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>

            {/* ── Notifications ── */}
            <SectionLabel label="Notifications" />
            <Card>
              <View style={ps.switchRow}>
                <View style={ps.switchLeft}>
                  <Text style={ps.switchTitle}>Notifications push</Text>
                  <Text style={ps.switchSub}>Alertes journaux et messages</Text>
                </View>
                <Switch value={notifPush} onValueChange={setNotifPush}
                  trackColor={{ true: COLORS.bark, false: COLORS.border }} thumbColor={COLORS.white} />
              </View>
              <View style={[ps.switchRow, { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 2, paddingTop: 14 }]}>
                <View style={ps.switchLeft}>
                  <Text style={ps.switchTitle}>Résumé par email</Text>
                  <Text style={ps.switchSub}>Récapitulatif hebdomadaire</Text>
                </View>
                <Switch value={notifEmail} onValueChange={setNotifEmail}
                  trackColor={{ true: COLORS.bark, false: COLORS.border }} thumbColor={COLORS.white} />
              </View>
            </Card>

            {/* ── Confidentialité ── */}
            <SectionLabel label="Confidentialité & légal" />
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {[
                { icon: '📄', label: 'Conditions générales d\'utilisation' },
                { icon: '🔒', label: 'Politique de confidentialité' },
                { icon: '🍪', label: 'Gestion des cookies' },
              ].map((item, i, arr) => (
                <TouchableOpacity key={item.label}
                  style={[ps.linkRow, i < arr.length - 1 && ps.linkRowBorder]} activeOpacity={0.7}>
                  <Text style={ps.linkIcon}>{item.icon}</Text>
                  <Text style={ps.linkLabel}>{item.label}</Text>
                  <Text style={ps.linkArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </Card>

            {/* ── Zone danger ── */}
            <SectionLabel label="Zone danger" />
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <TouchableOpacity
                style={[ps.linkRow, ps.linkRowBorder]}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Text style={ps.linkIcon}>🚪</Text>
                <Text style={[ps.linkLabel, { color: COLORS.clay }]}>Se déconnecter</Text>
                <Text style={ps.linkArrow}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={ps.linkRow}
                onPress={() => Alert.alert(
                  'Supprimer le compte',
                  'Cette action est irréversible. Toutes tes données seront effacées.',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Supprimer définitivement', style: 'destructive', onPress: () => {} },
                  ]
                )}
                activeOpacity={0.7}
              >
                <Text style={ps.linkIcon}>🗑️</Text>
                <Text style={[ps.linkLabel, { color: '#DC2626' }]}>Supprimer mon compte</Text>
                <Text style={ps.linkArrow}>›</Text>
              </TouchableOpacity>
            </Card>

            <Text style={ps.version}>PawWatch v1.0.0</Text>
          </>
        )}

      </ScrollView>
    </View>
  );
}

const ps = StyleSheet.create({
  wrapper:   { flex: 1, backgroundColor: COLORS.sand },
  container: { flex: 1 },
  content:   { padding: 16, paddingBottom: 100 },

  // ── Tabs ──
  tabBar: {
    flexDirection: 'row', gap: 6,
    backgroundColor: COLORS.sand,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tabBtn: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    borderRadius: RADIUS.full,
  },
  tabBtnActive:    { backgroundColor: COLORS.bark },
  tabBtnText:      { fontSize: 13, ...FONTS.medium, color: COLORS.muted },
  tabBtnTextActive:{ fontSize: 13, ...FONTS.bold, color: COLORS.white },

  // ── Hero ──
  heroSection: { alignItems: 'center', paddingTop: 24, paddingBottom: 0, paddingHorizontal: 20 },
  heroAvatarRing: {
    width: 84, height: 84, borderRadius: 42,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, position: 'relative',
  },
  heroNom:       { fontSize: 22, ...FONTS.heavy, color: COLORS.white, marginBottom: 3 },
  heroEmail:     { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 12 },
  heroRolePill:  { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 5, marginBottom: 20 },
  heroRolePillText: { fontSize: 12, ...FONTS.bold, color: COLORS.white },
  heroStatsRow:  { flexDirection: 'row', width: '100%', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: RADIUS.md, marginBottom: 0 },
  heroStat:      { flex: 1, alignItems: 'center', paddingVertical: 14 },
  heroStatBorder:{ borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.2)' },
  heroStatVal:   { fontSize: 18, ...FONTS.heavy, color: COLORS.white },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', ...FONTS.medium, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },

  // ── Compte ──
  infoCard:      { marginBottom: 14 },
  infoRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel:     { fontSize: 13, color: COLORS.muted, ...FONTS.medium },
  infoValue:     { fontSize: 14, ...FONTS.bold, color: COLORS.ink, flex: 1, textAlign: 'right' },

  sectionDivider: {
    height: 1, backgroundColor: COLORS.border,
    marginVertical: 20,
  },

  cardHint: { fontSize: 12, color: COLORS.muted, marginBottom: 12 },

  // ── CheckOption ──
  checkOpt:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  checkOptActive: {},
  checkBox:       { width: 22, height: 22, borderRadius: 6, backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  checkBoxActive: { backgroundColor: COLORS.bark, borderColor: COLORS.bark },
  checkMark:      { color: COLORS.white, fontSize: 13, ...FONTS.bold },
  checkOptLabel:  { fontSize: 14, ...FONTS.bold, color: COLORS.ink },
  checkOptSub:    { fontSize: 12, color: COLORS.muted, marginTop: 1 },

  // ── OuiNon ──
  ouiNonRow:        { flexDirection: 'row', gap: 8 },
  ouiNonBtn:        { paddingHorizontal: 18, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white },
  ouiNonBtnActive:  { backgroundColor: COLORS.bark, borderColor: COLORS.bark },
  ouiNonText:       { fontSize: 13, ...FONTS.bold, color: COLORS.muted },
  ouiNonTextActive: { color: COLORS.white },

  textarea: {
    backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 12, fontSize: 14, color: COLORS.ink,
    minHeight: 100,
  },

  switchRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLeft:  { flex: 1, marginRight: 16 },
  switchTitle: { fontSize: 14, ...FONTS.bold, color: COLORS.ink, marginBottom: 2 },
  switchSub:   { fontSize: 12, color: COLORS.muted },

  // ── Logement ──
  fieldRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  fieldBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  fieldLabel:  { fontSize: 14, ...FONTS.bold, color: COLORS.ink, marginBottom: 4 },
  logementRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  logementBtn: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.white, alignItems: 'center',
  },
  logementBtnActive:  { borderColor: COLORS.bark, backgroundColor: COLORS.warm },
  logementText:       { fontSize: 14, ...FONTS.bold, color: COLORS.muted },
  logementTextActive: { color: COLORS.bark },

  // ── Sauvegarde ──
  coordInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 12,
    fontSize: 14, color: COLORS.ink,
  },

  saveBtn:      { backgroundColor: COLORS.bark, borderRadius: RADIUS.md, padding: 15, alignItems: 'center', marginBottom: 8, marginTop: 8 },
  saveBtnReady: { backgroundColor: '#16A34A' },
  saveText:     { fontSize: 15, ...FONTS.heavy, color: COLORS.white },

  // ── Bandeaux profil petsitter ──
  incompletBanner: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: COLORS.warnBg, borderWidth: 1.5, borderColor: COLORS.warnBorder,
    borderRadius: RADIUS.md, padding: 14, marginBottom: 16,
  },
  incompletIcon:  { fontSize: 22, marginTop: 2 },
  incompletTitle: { fontSize: 14, ...FONTS.heavy, color: COLORS.clay, marginBottom: 4 },
  incompletSub:   { fontSize: 12, color: COLORS.muted, lineHeight: 18, marginBottom: 10 },
  checklistWrap:  { gap: 4 },
  checklistItem:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checklistDot:   { fontSize: 13, ...FONTS.heavy, width: 16 },
  checklistLabel: { fontSize: 12, color: COLORS.muted },

  completBanner: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: COLORS.okBg, borderWidth: 1.5, borderColor: COLORS.okBorder,
    borderRadius: RADIUS.md, padding: 14, marginBottom: 16,
  },
  completTitle: { fontSize: 14, ...FONTS.heavy, color: COLORS.moss, marginBottom: 2 },

  // ── Mon compte (expandable) ──
  accountRow: {
    flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
  },
  accountRowIcon:  { fontSize: 18, width: 24, textAlign: 'center' },
  accountRowLabel: { flex: 1, fontSize: 14, ...FONTS.medium, color: COLORS.ink },
  accountRowArrow: { fontSize: 12, color: COLORS.muted },
  accountForm: {
    paddingHorizontal: 16, paddingBottom: 16,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  accountSep: { height: 1, backgroundColor: COLORS.border },
  accountSaveBtn: {
    backgroundColor: COLORS.bark, borderRadius: RADIUS.md,
    padding: 12, alignItems: 'center', marginTop: 14,
  },
  accountSaveBtnText: { fontSize: 14, ...FONTS.bold, color: COLORS.white },

  // ── Paramètres ──
  paramInfoRow:   { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  paramInfoIcon:  { fontSize: 18, width: 24, textAlign: 'center' },
  paramInfoLabel: { fontSize: 11, color: COLORS.muted, ...FONTS.medium, marginBottom: 2 },
  paramInfoValue: { fontSize: 14, color: COLORS.ink, ...FONTS.bold },
  paramHint:      { fontSize: 11, color: COLORS.muted, marginTop: 8, lineHeight: 16 },

  // ── Support / liens ──
  linkRow:       { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  linkRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  linkIcon:      { fontSize: 18, width: 24, textAlign: 'center' },
  linkLabel:     { flex: 1, fontSize: 14, ...FONTS.medium, color: COLORS.ink },
  linkArrow:     { fontSize: 20, color: COLORS.muted },

  logoutBtn:  { backgroundColor: COLORS.warnBg, borderWidth: 1.5, borderColor: COLORS.warnBorder, borderRadius: RADIUS.md, padding: 15, alignItems: 'center', marginTop: 8 },
  logoutText: { fontSize: 15, ...FONTS.bold, color: COLORS.clay },

  version: { fontSize: 12, color: COLORS.border, textAlign: 'center', marginTop: 20 },

  // ── Photo de profil (Modifier) ──
  photoProfiRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  photoProfiCircle: {
    width: 80, height: 80, borderRadius: 40,
    position: 'relative',
  },
  photoProfiImg:  { width: 80, height: 80, borderRadius: 40 },
  photoProfiPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.sand,
    borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  photoProfiCamera: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.bark,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.white,
  },
  photoProfiTitle: { fontSize: 14, ...FONTS.heavy, color: COLORS.ink, marginBottom: 4 },
  photoProfiHint:  { fontSize: 11, color: COLORS.muted, lineHeight: 16 },
  photoProfiAlerte: {
    marginTop: 8, backgroundColor: COLORS.warnBg,
    borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: COLORS.warnBorder,
    alignSelf: 'flex-start',
  },
  photoProfiAlerteText: { fontSize: 11, color: COLORS.clay, ...FONTS.bold },

  // ── Badge camera sur hero ──
  heroAvatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.bark,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.white,
  },
});
