// screens/shared/ProfilScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, Switch, Image, ActivityIndicator, Modal,
  Animated, Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../lib/theme';
import {
  supabase, getUserProfile, updateUserProfile, uploadProfilePhoto, uploadAnimalPhoto, uploadJardinPhoto,
  getGardeCount, getAnimaux, saveAnimaux,
  getProfilPhotos, uploadProfilPhoto, addProfilPhoto, deleteProfilPhoto,
} from '../../lib/supabase';
import { Card, Avatar, SectionLabel, PhotoUpload, AnimalEditor, PriceInput, validateAnimaux } from '../../components/UI';
import AddressAutocomplete from '../../components/AddressAutocomplete';
import CalendrierDispo from '../../components/CalendrierDispo';
import { getDisponibilites, saveDisponibilites } from '../../lib/supabase';
import { onboardingToAnimaux, onboardingToPetsitter } from '../../lib/onboardingMap';

const DOG_ICON = require('../../assets/dog-icon.png');
const CAT_ICON = require('../../assets/cat-icon.png');

const ANIMAL_EMOJI = { chien: '🐕', chat: '🐈', lapin: '🐇', rongeur: '🐹', oiseau: '🐦', reptile: '🦎', autre: '🐾' };
const formatDateFr = (str) => new Date(str + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

// ── Sélecteur de date (14 prochains jours) ─────────────────────────
const InlineDatePicker = ({ label, date, onSelect }) => {
  const today = new Date();
  const days = Array.from({ length: 21 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={ps.fieldLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {days.map((d, i) => {
          const sel = date && d.toDateString() === date.toDateString();
          return (
            <TouchableOpacity key={i} onPress={() => onSelect(d)}
              style={[ps.dayBtn, sel && ps.dayBtnSel]} activeOpacity={0.75}>
              <Text style={[ps.dayName, sel && ps.dayNameSel]}>
                {['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][d.getDay()]}
              </Text>
              <Text style={[ps.dayNum, sel && ps.dayNumSel]}>{d.getDate()}</Text>
              <Text style={[ps.dayMon, sel && ps.dayMonSel]}>{MONTHS_FR[d.getMonth()]}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

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


export default function ProfilScreen({ user, onLogout, onProfilComplet, profilComplet, initialData, initialTab, onInitialTabConsumed }) {
  const nom      = user?.user_metadata?.nom ?? user?.email ?? 'Utilisateur';
  const email    = user?.email ?? '';
  const rawRole  = user?.user_metadata?.role ?? initialData?.role ?? 'proprietaire';
  const role     = rawRole === 'pawsitter' ? 'petsitter' : rawRole;
  const initiales = nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const isProprio   = role === 'proprietaire';
  const isPetsitter = role === 'petsitter';

  // ── Photo de profil ──
  const [photoProfi,      setPhotoProfi]      = useState(null);
  const [uploadingPhoto,  setUploadingPhoto]  = useState(false);
  const [profileStats,    setProfileStats]    = useState({ gardes: 0, note: null, nb_avis: 0 });
  const [saving,          setSaving]          = useState(false);
  // Blob des réponses d'onboarding (persisté dans users.onboarding), maintenu à jour aux sauvegardes
  const [onboardingBlob,  setOnboardingBlob]  = useState(() => initialData ?? null);

  // Charger la photo et les stats depuis Supabase
  // ── Lat/lon sauvegardées depuis AddressAutocomplete ──
  const [adresseLat, setAdresseLat] = useState(null);
  const [adresseLon, setAdresseLon] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      getUserProfile(user.id),
      getGardeCount(user.id, role).catch(() => 0),
      isProprio ? getAnimaux(user.id).catch(() => []) : Promise.resolve([]),
    ]).then(([profile, gardes, animaux]) => {
      if (profile?.photo_url) setPhotoProfi(profile.photo_url);
      if (profile?.telephone)     setTelephone(profile.telephone);
      if (profile?.adresse)       setAdresse(profile.adresse);
      if (profile?.ville)         setVille(profile.ville);
      if (profile?.onboarding?.date_naissance) setDateNaissance(profile.onboarding.date_naissance);
      if (profile?.latitude)  setAdresseLat(profile.latitude);
      if (profile?.longitude) setAdresseLon(profile.longitude);
      setProfileStats({
        gardes,
        note:    profile?.note ?? null,
        nb_avis: profile?.nb_avis ?? 0,
      });

      if (profile?.onboarding && typeof profile.onboarding === 'object') {
        setOnboardingBlob(profile.onboarding);
      }

      // Reporter les réponses d'onboarding hors session d'inscription (reconnexion) :
      // initialData est vide, on relit le blob persisté dans users.onboarding.
      const od = (!initialData && profile?.onboarding) ? profile.onboarding : null;

      if (isProprio) {
        if (animaux.length > 0) setMesAnimaux(animaux);
        else if (od) setMesAnimaux(onboardingToAnimaux(od));
      } else if (od) {
        const m = onboardingToPetsitter(od);
        // Champs avec colonne dédiée : la valeur enregistrée du profil prime, sinon onboarding
        const acc = Array.isArray(profile?.animaux_acceptes) ? profile.animaux_acceptes : [];
        const sv  = Array.isArray(profile?.services) ? profile.services : [];
        setIsDogsitter(acc.length ? acc.includes('chiens') : m.isDogsitter);
        setIsCatsitter(acc.length ? acc.includes('chats')  : m.isCatsitter);
        setIsAllsitter(acc.length ? acc.some(a => ['rongeurs', 'oiseaux', 'reptiles'].includes(a)) : m.isAllsitter);
        setModePromenade(sv.length ? sv.includes('promenade')      : m.modePromenade);
        setModeChezProprio(sv.length ? sv.includes('visite')        : m.modeChezProprio);
        setModeGardeJour(sv.length ? sv.includes('garde_domicile') : m.modeGardeJour);
        setModeGardeJourPetsi(sv.length ? sv.includes('garde_jour') : m.modeGardeJourPetsi);
        setModePension(sv.length ? (sv.includes('pension') || sv.includes('nuitee')) : m.modePension);
        setExperience(profile?.bio || m.experience || '');
        // Champs sans colonne : depuis le blob onboarding (mis à jour à chaque sauvegarde)
        setADesAnimaux(m.aDesAnimaux);
        setAnimauxPerso(m.animauxPerso);
        setLogement(m.logement);
        setAJardin(m.aJardin);
        setJardinClos(m.jardinClos);
        if (m.photoJardin) setPhotoJardin(m.photoJardin);
        setPrixPromenade(m.prixPromenade);
        setPrixPension(m.prixPension);
        setPrixGardeJour(m.prixGardeJour);
        setPrixVisite(m.prixVisite);
        setPrixGardeJourPetsi(m.prixGardeJourPetsi);
      }
    }).catch(() => {});
  }, [user?.id]);

  // Charger les disponibilités quand l'onglet dispo s'ouvre
  useEffect(() => {
    if (activeTab !== 'dispo' || !user?.id || !isPetsitter) return;
    setLoadingDispo(true);
    getDisponibilites(user.id)
      .then(dates => setDispoDates(new Set(dates)))
      .catch(() => {})
      .finally(() => setLoadingDispo(false));
  }, [activeTab, user?.id, isPetsitter]);

  const saveTimerRef = useRef(null);
  const [dispoSaved, setDispoSaved] = useState(false);

  const triggerAutoSave = useCallback((dates) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setDispoSaved(false);
    saveTimerRef.current = setTimeout(async () => {
      if (!user?.id) return;
      setSavingDispo(true);
      try {
        await saveDisponibilites(user.id, [...dates]);
        setDispoSaved(true);
        setTimeout(() => setDispoSaved(false), 2500);
      } catch {
        Alert.alert('Erreur', 'Impossible de sauvegarder les disponibilités.');
      } finally {
        setSavingDispo(false);
      }
    }, 1200);
  }, [user?.id]);

  const handleToggleDispo = useCallback((iso) => {
    setDispoDates(prev => {
      const next = new Set(prev);
      next.has(iso) ? next.delete(iso) : next.add(iso);
      triggerAutoSave(next);
      return next;
    });
  }, [triggerAutoSave]);

  const handleClearDispo = useCallback(() => {
    const empty = new Set();
    setDispoDates(empty);
    triggerAutoSave(empty);
  }, [triggerAutoSave]);

  const handleAddManyDispo = useCallback((isoArray) => {
    setDispoDates(prev => {
      const next = new Set(prev);
      isoArray.forEach(iso => next.add(iso));
      triggerAutoSave(next);
      return next;
    });
  }, [triggerAutoSave]);

  // ── Photos de garde ──
  useEffect(() => {
    if (activeTab !== 'photos' || !user?.id || !isPetsitter) return;
    setLoadingPhotos(true);
    getProfilPhotos(user.id)
      .then(photos => setGardePhotos(prev => photos.length > 0 ? photos : prev))
      .catch(() => {})
      .finally(() => setLoadingPhotos(false));
  }, [activeTab, user?.id, isPetsitter]);

  const openAddPhotoModal = useCallback(() => {
    setNewPhotoUri(null);
    setNewPhotoCaption('');
    setSavingPhoto(false);
    setShowAddPhotoModal(true);
  }, []);

  const pickNewPhoto = useCallback(async (fromCamera) => {
    const isWeb = require('react-native').Platform.OS === 'web';
    try {
      if (fromCamera && !isWeb) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission refusée', 'Autorise l\'accès à la caméra dans les réglages.'); return; }
        const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.85 });
        if (!r.canceled) setNewPhotoUri(r.assets[0].uri);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission refusée', 'Autorise l\'accès à la galerie dans les réglages.'); return; }
        const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
        if (!r.canceled) setNewPhotoUri(r.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Erreur', e?.message ?? 'Impossible d\'accéder aux photos.');
    }
  }, []);

  const saveNewPhoto = async () => {
    if (!newPhotoUri || !user?.id) return;
    setSavingPhoto(true);
    try {
      const uri = newPhotoUri;
      const uid = user.id;
      const caption = newPhotoCaption.trim() || null;
      const url = await uploadProfilPhoto(uid, uri);
      await addProfilPhoto(uid, url, caption);
      const photos = await getProfilPhotos(uid);
      setGardePhotos(photos);
      setShowAddPhotoModal(false);
      setNewPhotoUri(null);
      setNewPhotoCaption('');
    } catch (e) {
      Alert.alert('Erreur', e?.message ?? 'Impossible d\'ajouter la photo.');
    } finally {
      setSavingPhoto(false);
    }
  };

  const confirmDeletePhoto = useCallback((photoId, photoUrl) => {
    Alert.alert('Supprimer cette photo ?', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await deleteProfilPhoto(user.id, photoId, photoUrl);
          setGardePhotos(prev => prev.filter(p => p.id !== photoId));
          setViewingPhoto(null);
        } catch (e) {
          Alert.alert('Erreur', e?.message ?? 'Impossible de supprimer la photo.');
        }
      }},
    ]);
  }, [viewingPhoto, user?.id]);

  const pickPhotoProfi = async (fromCamera = true) => {
    const isWeb = require('react-native').Platform.OS === 'web';
    // Sur web, la caméra native n'est pas fiable → forcer la galerie
    const useCamera = fromCamera && !isWeb;
    const fn = useCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    if (useCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission requise', 'Accès à la caméra refusé.');
        return;
      }
    }
    const result = await fn({ allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (result.canceled) return;

    const uri = result.assets[0].uri;
    setPhotoProfi(uri);

    // Upload vers Supabase Storage
    if (user?.id) {
      setUploadingPhoto(true);
      uploadProfilePhoto(user.id, uri)
        .then(url => setPhotoProfi(url))
        .catch(e => {
          console.error('[uploadProfilePhoto]', e?.message ?? e);
          Alert.alert('Erreur upload', e?.message ?? 'Impossible d\'uploader la photo.');
        })
        .finally(() => setUploadingPhoto(false));
    }
  };

  // ── Tabs ──
  const [activeTab, setActiveTab] = useState(initialTab ?? 'profil');
  useEffect(() => {
    if (initialTab && initialTab !== 'profil') onInitialTabConsumed?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(0)).current;
  const tabMeasurements = useRef({});
  const pillInitialised = useRef(false);

  const onTabLayout = useCallback((id) => (e) => {
    const { x, width } = e.nativeEvent.layout;
    tabMeasurements.current[id] = { x, width };
    if (id === activeTab && !pillInitialised.current) {
      pillX.setValue(x + 3);
      pillW.setValue(width - 6);
      pillInitialised.current = true;
    }
  }, [activeTab, pillX, pillW]);

  const selectTab = useCallback((id) => {
    const m = tabMeasurements.current[id];
    if (m) {
      Animated.parallel([
        Animated.spring(pillX, { toValue: m.x + 3, useNativeDriver: false, damping: 20, stiffness: 220, mass: 0.7 }),
        Animated.spring(pillW, { toValue: m.width - 6, useNativeDriver: false, damping: 20, stiffness: 220, mass: 0.7 }),
      ]).start();
    }
    setActiveTab(id);
  }, [pillX, pillW]);

  // ── Disponibilités (pawsitter) ──
  const [dispoDates,   setDispoDates]   = useState(new Set());
  const [loadingDispo, setLoadingDispo] = useState(false);
  const [savingDispo,  setSavingDispo]  = useState(false);

  // ── Photos de garde (petsitter) ──
  const [gardePhotos,       setGardePhotos]       = useState([]);
  const [loadingPhotos,     setLoadingPhotos]     = useState(false);
  const [viewingPhoto,      setViewingPhoto]      = useState(null);
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [newPhotoUri,       setNewPhotoUri]       = useState(null);
  const [newPhotoCaption,   setNewPhotoCaption]   = useState('');
  const [savingPhoto,       setSavingPhoto]       = useState(false);

  // ── Notifications ──
  const [notifPush,  setNotifPush]  = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);

  // ── Coordonnées propriétaire ──
  const [telephone,     setTelephone]     = useState('');
  const [adresse,       setAdresse]       = useState('');
  const [codePostal,    setCodePostal]    = useState('');
  const [ville,         setVille]         = useState('');
  const [dateNaissance, setDateNaissance] = useState('');

  // ── Mapping onboarding → profil (réponses de la session d'inscription) ──
  const od = initialData ?? {};
  const PS = onboardingToPetsitter(od);

  // ── Animaux du propriétaire (à confier) — pré-remplis depuis l'onboarding ──
  const [mesAnimaux, setMesAnimaux] = useState(() => onboardingToAnimaux(od));


  // ── Petsitter : spécialités ──
  const [isCatsitter, setIsCatsitter] = useState(PS.isCatsitter);
  const [isDogsitter, setIsDogsitter] = useState(PS.isDogsitter);
  const [isAllsitter, setIsAllsitter] = useState(PS.isAllsitter);

  // ── Petsitter : expérience ──
  const [experience, setExperience] = useState(PS.experience);

  // ── Petsitter : animaux perso ──
  const [aDesAnimaux,  setADesAnimaux]  = useState(PS.aDesAnimaux);
  const [animauxPerso, setAnimauxPerso] = useState(PS.animauxPerso);

  // ── Petsitter : logement ──
  const [logement,    setLogement]    = useState(PS.logement);
  const [aJardin,     setAJardin]     = useState(PS.aJardin);
  const [jardinClos,  setJardinClos]  = useState(PS.jardinClos);
  const [photoJardin, setPhotoJardin] = useState(PS.photoJardin ?? null);

  // ── Petsitter : modes de garde ──
  const [modePromenade,     setModePromenade]     = useState(PS.modePromenade);
  const [modeChezProprio,   setModeChezProprio]   = useState(PS.modeChezProprio);
  const [modeGardeJour,     setModeGardeJour]     = useState(PS.modeGardeJour);
  const [modeGardeJourPetsi,setModeGardeJourPetsi]= useState(PS.modeGardeJourPetsi);
  const [modePension,       setModePension]       = useState(PS.modePension);

  // ── Petsitter : tarifs ──
  const [prixPromenade,     setPrixPromenade]     = useState(PS.prixPromenade);
  const [prixPension,       setPrixPension]       = useState(PS.prixPension);
  const [prixGardeJour,     setPrixGardeJour]     = useState(PS.prixGardeJour);
  const [prixVisite,        setPrixVisite]        = useState(PS.prixVisite);
  const [prixGardeJourPetsi,setPrixGardeJourPetsi]= useState(PS.prixGardeJourPetsi);

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

  const labelRole = role === 'petsitter' ? '🤝 Pawsitter' : '🏠 Propriétaire';

  const rolePillColor = role === 'petsitter'
    ? { bg: COLORS.okBg,   text: COLORS.moss }
    : { bg: COLORS.warnBg, text: COLORS.clay };

  const isProfilComplet = () => {
    if (!isPetsitter) return true;
    if (!photoProfi) return false;
    if (!isCatsitter && !isDogsitter && !isAllsitter) return false;
    if (!modePromenade && !modeChezProprio && !modeGardeJour && !modeGardeJourPetsi && !modePension) return false;
    if (!String(experience || '').trim()) return false;
    if (!logement) return false;
    if (aJardin === null) return false;
    if (aJardin && !photoJardin) return false;
    return true;
  };

  const handleSauvegarder = async () => {
    if (isPetsitter && aJardin && !photoJardin) {
      Alert.alert('Photo manquante', 'Une photo du jardin est obligatoire si vous avez un jardin.');
      return;
    }
    if (!user?.id) return;

    const payload = {
      telephone:  telephone.trim()  || null,
      adresse:    adresse.trim()    || null,
      ville:      ville.trim()      || null,
      latitude:   adresseLat        ?? null,
      longitude:  adresseLon        ?? null,
      onboarding: { ...(onboardingBlob || {}), date_naissance: dateNaissance.trim() || null },
    };
    let mergedOnboarding = null;

    if (isPetsitter) {
      const animaux_acceptes = [
        ...(isDogsitter ? ['chiens'] : []),
        ...(isCatsitter ? ['chats']  : []),
        ...(isAllsitter ? ['rongeurs', 'oiseaux', 'reptiles'] : []),
      ];
      const services = [
        ...(modePromenade      ? ['promenade']      : []),
        ...(modeChezProprio    ? ['visite']         : []),
        ...(modeGardeJour      ? ['garde_domicile'] : []),
        ...(modeGardeJourPetsi ? ['garde_jour']     : []),
        ...(modePension        ? ['nuitee']         : []),
      ];
      // Champs sans colonne dédiée : conservés dans le blob onboarding
      // Upload de la photo jardin si URI locale
      let photoJardinUrl = photoJardin;
      if (aJardin && photoJardin && !photoJardin.startsWith('http')) {
        try {
          photoJardinUrl = await uploadJardinPhoto(user.id, photoJardin);
          setPhotoJardin(photoJardinUrl);
        } catch (e) {
          console.error('[uploadJardinPhoto]', e?.message ?? e);
        }
      }

      mergedOnboarding = {
        ...(onboardingBlob || {}),
        date_naissance:    dateNaissance.trim() || null,
        logement:          (logement === 'maison' && aJardin) ? 'maison_jardin' : logement,
        logement__cloture: aJardin ? (jardinClos ? 'oui' : 'non') : 'sans_jardin',
        photo_jardin:      aJardin ? (photoJardinUrl || null) : null,
        animaux_maison: aDesAnimaux ? ['autre'] : ['aucun'],
        animaux_perso: (animauxPerso || [])
          .map(a => ({ nom: (a.nom || '').trim(), race: (a.race || '').trim() || null }))
          .filter(a => a.nom),
        tarif_promenade:      prixPromenade      || '',
        tarif_nuitee:         prixPension        || '',
        tarif_garde_domicile: prixGardeJour      || '',
        tarif_visite:         prixVisite         || '',
        tarif_garde_jour:     prixGardeJourPetsi || '',
      };
      Object.assign(payload, {
        animaux_acceptes,
        services,
        bio: String(experience || '').trim() || null,
        onboarding: mergedOnboarding,
      });
    }

    setSaving(true);
    try {
      await updateUserProfile(user.id, payload);
      if (mergedOnboarding) setOnboardingBlob(mergedOnboarding);

      if (isProprio && mesAnimaux.length > 0) {
        // Upload des photos d'animaux locales (URI local → URL permanente)
        let animauxFinal = mesAnimaux;
        const hasLocalPhotos = mesAnimaux.some(a => a.photo && !a.photo.startsWith('http'));
        if (hasLocalPhotos) {
          animauxFinal = await Promise.all(mesAnimaux.map(async (animal, idx) => {
            if (!animal.photo || animal.photo.startsWith('http')) return animal;
            const slug = `${user.id}_${(animal.nom || 'animal').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20)}_${idx}`;
            try {
              const url = await uploadAnimalPhoto(slug, animal.photo);
              return { ...animal, photo: url };
            } catch { return animal; }
          }));
          setMesAnimaux(animauxFinal);
          // Persister les URLs dans users.onboarding
          const updatedBlob = { ...(onboardingBlob || {}) };
          animauxFinal.forEach((a, idx) => { if (a.photo) updatedBlob[`photo_nom_animal_${idx}`] = a.photo; });
          const { error: blobErr } = await supabase.from('users').update({ onboarding: updatedBlob }).eq('id', user.id);
          if (blobErr) console.warn('Mise à jour onboarding:', blobErr.message);
          setOnboardingBlob(updatedBlob);
        }
        // Les ids réels remplacent les ids temporaires : sinon une 2e sauvegarde recréerait les animaux
        const saved = await saveAnimaux(user.id, animauxFinal);
        setMesAnimaux(saved);
      }
      const animalErrors = isProprio ? validateAnimaux(mesAnimaux) : [];
      if (isPetsitter && isProfilComplet() && onProfilComplet && !profilComplet) {
        onProfilComplet();
        Alert.alert('🎉 Profil validé !', 'Ton profil pawsitter est maintenant visible. Tu peux recevoir des demandes de garde.');
      } else if (isProprio && mesAnimaux.length === 0) {
        Alert.alert('Profil sauvegardé ✓', 'Ajoute tes animaux et complète leur fiche pour pouvoir demander une garde.');
      } else if (animalErrors.length > 0) {
        Alert.alert(
          'Brouillon enregistré',
          'Tes demandes de garde resteront invisibles pour les pawsitters tant que ces champs ne sont pas remplis :\n\n'
            + animalErrors.join('\n'),
        );
      } else {
        Alert.alert('Profil sauvegardé ✓', isProprio
          ? 'Les fiches de tes animaux sont complètes : tu peux demander une garde.'
          : 'Vos informations ont été mises à jour.');
      }
    } catch (e) {
      console.error('[handleSauvegarder]', e?.message ?? e);
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil. Réessaie.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={ps.wrapper}>

      {/* ── Barre d'onglets ── */}
      <View style={ps.tabBar}>
        <Animated.View style={[ps.tabPill, { left: pillX, width: pillW }]} />
        {[
          { id: 'profil',   label: '👤 Profil'   },
          { id: 'modifier', label: '✏️ Modifier' },
          isPetsitter && { id: 'dispo',   label: '📅 Dispo'  },
          isPetsitter && { id: 'photos',  label: '📷 Photos' },
          { id: 'params',   label: '⚙️ Config'   },
        ].filter(Boolean).map(t => (
          <TouchableOpacity
            key={t.id}
            onPress={() => selectTab(t.id)}
            onLayout={onTabLayout(t.id)}
            style={ps.tabBtn}
          >
            <Text style={[ps.tabBtnText, activeTab === t.id && ps.tabBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={ps.container} contentContainerStyle={ps.content} keyboardShouldPersistTaps="handled">

        {/* ════════ MON PROFIL ════════ */}
        {activeTab === 'profil' && (
          <>
            {/* Hero */}
            <View style={ps.heroSection}>
              <TouchableOpacity
                style={ps.heroAvatarRing}
                onPress={() => Alert.alert(
                  'Photo de profil',
                  'Choisir la source',
                  [
                    { text: '📷 Caméra',  onPress: () => pickPhotoProfi(true)  },
                    { text: '🖼️ Galerie', onPress: () => pickPhotoProfi(false) },
                    { text: 'Annuler', style: 'cancel' },
                  ]
                )}
                activeOpacity={0.85}
              >
                <Avatar initials={initiales} size={72} photoUri={photoProfi} />
                <View style={ps.heroAvatarBadge}>
                  {uploadingPhoto
                    ? <ActivityIndicator size="small" color={COLORS.white} />
                    : <Text style={{ fontSize: 12 }}>📸</Text>
                  }
                </View>
              </TouchableOpacity>
              {/* Bandeau obligatoire si pawsitter sans photo */}
              {isPetsitter && !photoProfi && (
                <View style={ps.photoWarning}>
                  <Text style={ps.photoWarningText}>
                    📸 Photo obligatoire pour apparaître dans la recherche
                  </Text>
                </View>
              )}
              <Text style={ps.heroNom}>{nom}</Text>
              <Text style={ps.heroEmail}>{email}</Text>
              <View style={ps.heroRolePill}>
                <Text style={ps.heroRolePillText}>{labelRole}</Text>
              </View>
              <View style={ps.heroStatsRow}>
                {[
                  { val: String(profileStats.gardes), label: 'Gardes' },
                  { val: profileStats.note ? `⭐ ${profileStats.note}` : '⭐ —', label: `${profileStats.nb_avis} avis` },
                  { val: String(mesAnimaux.length), label: 'Animaux' },
                ].map((s, i) => (
                  <View key={s.label} style={[ps.heroStat, i < 2 && ps.heroStatBorder]}>
                    <Text style={ps.heroStatVal}>{s.val}</Text>
                    <Text style={ps.heroStatLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>

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
            {/* Bandeau profil petsitter */}
            {isPetsitter && (() => {
              const steps = [
                !!photoProfi,
                isDogsitter || isCatsitter || isAllsitter,
                modePromenade || modeChezProprio || modeGardeJour || modeGardeJourPetsi || modePension,
                experience.trim().length > 0,
                !!logement,
                aJardin !== null && (!aJardin || !!photoJardin),
              ];
              const done  = steps.filter(Boolean).length;
              const total = steps.length;
              const pct   = Math.round((done / total) * 100);

              if (profilComplet) return (
                <View style={ps.statusCard}>
                  <Text style={ps.statusCardIcon}>✅</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[ps.statusCardTitle, { color: COLORS.moss }]}>Profil validé · tu es visible !</Text>
                    <Text style={ps.statusCardSub}>Les propriétaires peuvent te contacter.</Text>
                  </View>
                </View>
              );

              return (
                <View style={ps.statusCard}>
                  <Text style={ps.statusCardIcon}>⚠️</Text>
                  <View style={{ flex: 1 }}>
                    <View style={ps.statusCardHeader}>
                      <Text style={ps.statusCardTitle}>Profil incomplet</Text>
                      <Text style={ps.statusCardPct}>{pct} %</Text>
                    </View>
                    <Text style={ps.statusCardSub}>Complète ton profil pour recevoir des demandes.</Text>
                    <View style={ps.statusBar}>
                      <View style={[ps.statusBarFill, { width: `${pct}%` }]} />
                    </View>
                  </View>
                  <TouchableOpacity
                    style={ps.statusCardBtn}
                    onPress={() => {/* scroll vers première section manquante */}}
                    activeOpacity={0.8}
                  >
                    <Text style={ps.statusCardBtnText}>Compléter →</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}

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

              <Text style={ps.fieldLabel}>Date de naissance <Text style={{ color: COLORS.clay }}>*</Text></Text>
              <TextInput
                style={ps.coordInput}
                placeholder="JJ/MM/AAAA"
                placeholderTextColor={COLORS.border}
                value={dateNaissance}
                onChangeText={t => {
                  const d = t.replace(/[^0-9]/g, '').slice(0, 8);
                  let val;
                  if (d.length <= 2) val = d;
                  else if (d.length <= 4) val = `${d.slice(0,2)}/${d.slice(2)}`;
                  else val = `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4,8)}`;
                  setDateNaissance(val);
                }}
                keyboardType="number-pad"
                maxLength={10}
              />

              <Text style={[ps.fieldLabel, { marginTop: 12 }]}>Téléphone</Text>
              <TextInput
                style={ps.coordInput}
                placeholder="06 12 34 56 78"
                placeholderTextColor={COLORS.border}
                value={telephone}
                onChangeText={setTelephone}
                keyboardType="phone-pad"
              />

              <Text style={[ps.fieldLabel, { marginTop: 12 }]}>Adresse</Text>
              <AddressAutocomplete
                value={adresse}
                onChangeText={setAdresse}
                onSelect={({ adresse: a, ville: v, codePostal: cp, latitude: lat, longitude: lon }) => {
                  setAdresse(a);
                  if (v)   setVille(v);
                  if (cp)  setCodePostal(cp);
                  if (lat) setAdresseLat(lat);
                  if (lon) setAdresseLon(lon);
                }}
                placeholder="12 rue des Lilas, Paris…"
              />

              <Text style={[ps.fieldLabel, { marginTop: 12 }]}>Ville</Text>
              <TextInput
                style={ps.coordInput}
                placeholder="Paris"
                placeholderTextColor={COLORS.border}
                value={ville}
                onChangeText={setVille}
              />
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
                  <CheckOption label="🏠 Garde au domicile du propriétaire" sub="Je me déplace chez le proprio"
                    checked={modeChezProprio} onToggle={() => setModeChezProprio(!modeChezProprio)} />
                  <CheckOption label="☀️ Garde de jour (chez moi)" sub="Accueil à la journée chez moi"
                    checked={modeGardeJourPetsi} onToggle={() => setModeGardeJourPetsi(!modeGardeJourPetsi)} />
                  <CheckOption label="🏡 Garde chez le propriétaire" sub="Je surveille l'animal chez lui"
                    checked={modeGardeJour} onToggle={() => setModeGardeJour(!modeGardeJour)} />
                  <CheckOption label="🏨 Pension" sub="Hébergement nuit et jour chez moi"
                    checked={modePension} onToggle={() => setModePension(!modePension)} />
                </Card>

                {/* Tarifs */}
                <SectionLabel label="Mes tarifs" />
                <Card>
                  <Text style={ps.cardHint}>Fourchette colorée : 🟢 économique · 🟡 dans la moyenne · 🔴 premium</Text>
                  <PriceInput label="Garde de jour (chez moi)"            icon="☀️" type="gardeJour" value={prixGardeJourPetsi} onChange={setPrixGardeJourPetsi} />
                  <PriceInput label="Garde au domicile du propriétaire"  icon="🏡" type="gardeJour" value={prixGardeJour}      onChange={setPrixGardeJour}      />
                  <PriceInput label="Nuitée / Pension"                   icon="🌙" type="pension"   value={prixPension}        onChange={setPrixPension}        />
                  <PriceInput label="Promenade"                          icon="🐕" type="promenade" value={prixPromenade}      onChange={setPrixPromenade}      />
                  <PriceInput label="Visite à domicile"                  icon="🐱" type="visite"    value={prixVisite}         onChange={setPrixVisite}         />
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
              style={[ps.saveBtn, isPetsitter && !profilComplet && isProfilComplet() && ps.saveBtnReady, saving && { opacity: 0.7 }]}
              onPress={saving ? undefined : handleSauvegarder}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={ps.saveText}>
                    {isPetsitter && !profilComplet && isProfilComplet()
                      ? '🎉 Valider mon profil'
                      : isPetsitter && profilComplet
                      ? '💾 Sauvegarder les modifications'
                      : isPetsitter
                      ? '💾 Sauvegarder (profil pawsitter incomplet)'
                      : '💾 Sauvegarder'}
                  </Text>
              }
            </TouchableOpacity>
          </>
        )}

        {/* ════════ DISPONIBILITÉS ════════ */}
        {activeTab === 'dispo' && (
          <>
            {/* Header compact */}
            <View style={ps.dispoHeader}>
              <View style={{ flex: 1 }}>
                <Text style={ps.dispoTitle}>Mes disponibilités</Text>
                <Text style={ps.dispoSub}>Appuie sur les jours pour les activer</Text>
              </View>
              {dispoDates.size > 0 && !savingDispo && (
                <TouchableOpacity onPress={handleClearDispo} activeOpacity={0.7}>
                  <Text style={ps.dispoEffacerText}>Tout effacer</Text>
                </TouchableOpacity>
              )}
            </View>

            {loadingDispo ? (
              <ActivityIndicator size="large" color={COLORS.bark} style={{ marginTop: 32 }} />
            ) : (
              <CalendrierDispo
                selected={dispoDates}
                onToggle={handleToggleDispo}
                onAddMany={handleAddManyDispo}
              />
            )}

            {/* Bouton sauvegarder */}
            <TouchableOpacity
              style={[ps.dispoSaveBtn, dispoSaved && ps.dispoSaveBtnDone, savingDispo && { opacity: 0.6 }]}
              onPress={() => triggerAutoSave(dispoDates)}
              disabled={savingDispo}
              activeOpacity={0.8}
            >
              {savingDispo
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <Text style={ps.dispoSaveBtnText}>{dispoSaved ? '✓ Disponibilités sauvegardées' : '💾 Sauvegarder mes dispos'}</Text>
              }
            </TouchableOpacity>
          </>
        )}

        {/* ════════ PHOTOS GARDES ════════ */}
        {activeTab === 'photos' && (() => {
          const PHOTO_SIZE = (Dimensions.get('window').width - 32 - 8) / 2;
          return (
            <>
              {/* Header */}
              <View style={ps.photosHeader}>
                <View>
                  <Text style={ps.photosTitle}>Galerie de gardes</Text>
                  <Text style={ps.photosSub}>
                    {gardePhotos.length > 0
                      ? `${gardePhotos.length} photo${gardePhotos.length > 1 ? 's' : ''}`
                      : 'Montre tes plus belles gardes'}
                  </Text>
                </View>
                <TouchableOpacity style={ps.photosAddBtn} onPress={openAddPhotoModal} activeOpacity={0.8}>
                  <Text style={ps.photosAddBtnText}>+ Ajouter</Text>
                </TouchableOpacity>
              </View>

              {loadingPhotos ? (
                <ActivityIndicator size="large" color={COLORS.bark} style={{ marginTop: 40 }} />
              ) : gardePhotos.length === 0 ? (
                <TouchableOpacity style={ps.photosEmpty} onPress={openAddPhotoModal} activeOpacity={0.8}>
                  <Text style={ps.photosEmptyIcon}>📷</Text>
                  <Text style={ps.photosEmptyTitle}>Aucune photo pour l'instant</Text>
                  <Text style={ps.photosEmptySub}>Ajoute des photos de tes gardes pour enrichir ton profil</Text>
                  <View style={ps.photosEmptyBtn}><Text style={ps.photosEmptyBtnText}>Ajouter une photo</Text></View>
                </TouchableOpacity>
              ) : (
                <View style={ps.photosGrid}>
                  {gardePhotos.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[ps.photoItem, { width: PHOTO_SIZE, height: PHOTO_SIZE }]}
                      onPress={() => setViewingPhoto(p)}
                      onLongPress={() => confirmDeletePhoto(p.id, p.url)}
                      activeOpacity={0.9}
                    >
                      <Image source={{ uri: p.url }} style={ps.photoItemImg} />
                      {p.caption ? (
                        <View style={ps.photoItemCaption}>
                          <Text style={ps.photoItemCaptionText} numberOfLines={1}>{p.caption}</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  ))}
                  {/* Bouton + intégré dans la grille */}
                  <TouchableOpacity
                    style={[ps.photoItem, ps.photoItemAdd, { width: PHOTO_SIZE, height: PHOTO_SIZE }]}
                    onPress={openAddPhotoModal}
                    activeOpacity={0.8}
                  >
                    <Text style={ps.photoItemAddIcon}>+</Text>
                    <Text style={ps.photoItemAddLabel}>Ajouter</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── Viewer plein écran ── */}
              <Modal visible={!!viewingPhoto} transparent animationType="fade" onRequestClose={() => setViewingPhoto(null)}>
                <View style={ps.photoViewer}>
                  <TouchableOpacity style={ps.photoViewerClose} onPress={() => setViewingPhoto(null)}>
                    <Text style={ps.photoViewerCloseText}>✕</Text>
                  </TouchableOpacity>
                  {viewingPhoto && (
                    <>
                      <Image source={{ uri: viewingPhoto.url }} style={ps.photoViewerImg} resizeMode="contain" />
                      {viewingPhoto.caption ? (
                        <Text style={ps.photoViewerCaption}>{viewingPhoto.caption}</Text>
                      ) : null}
                      <TouchableOpacity
                        style={ps.photoViewerDeleteBtn}
                        onPress={() => confirmDeletePhoto(viewingPhoto.id, viewingPhoto.url)}
                        activeOpacity={0.8}
                      >
                        <Text style={ps.photoViewerDeleteText}>🗑 Supprimer</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </Modal>

              {/* ── Modal ajout photo ── */}
              <Modal
                visible={showAddPhotoModal}
                transparent
                animationType="slide"
                onRequestClose={() => { setShowAddPhotoModal(false); setNewPhotoUri(null); setSavingPhoto(false); }}
              >
                <View style={ps.addPhotoOverlay}>
                  <View style={ps.addPhotoBox}>
                    <Text style={ps.addPhotoTitle}>Nouvelle photo</Text>

                    {!newPhotoUri ? (
                      <View style={ps.addPhotoPickerRow}>
                        <TouchableOpacity style={ps.addPhotoPickerBtn} onPress={() => pickNewPhoto(true)} activeOpacity={0.8}>
                          <Text style={ps.addPhotoPickerIcon}>📸</Text>
                          <Text style={ps.addPhotoPickerLabel}>Caméra</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={ps.addPhotoPickerBtn} onPress={() => pickNewPhoto(false)} activeOpacity={0.8}>
                          <Text style={ps.addPhotoPickerIcon}>🖼</Text>
                          <Text style={ps.addPhotoPickerLabel}>Galerie</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <Image source={{ uri: newPhotoUri }} style={ps.addPhotoPreview} resizeMode="cover" />
                        <TouchableOpacity onPress={() => setNewPhotoUri(null)} activeOpacity={0.7} style={{ alignSelf: 'center', marginBottom: 10 }}>
                          <Text style={{ fontSize: 12, color: COLORS.muted }}>Changer de photo</Text>
                        </TouchableOpacity>
                        <TextInput
                          style={ps.addPhotoCaptionInput}
                          placeholder="Légende (optionnel)"
                          placeholderTextColor={COLORS.muted}
                          value={newPhotoCaption}
                          onChangeText={setNewPhotoCaption}
                        />
                        <TouchableOpacity
                          style={[ps.addPhotoSaveBtn, savingPhoto && { opacity: 0.6 }]}
                          onPress={saveNewPhoto}
                          disabled={savingPhoto}
                          activeOpacity={0.8}
                        >
                          {savingPhoto
                            ? <ActivityIndicator color={COLORS.white} />
                            : <Text style={ps.addPhotoSaveBtnText}>✓ Publier la photo</Text>
                          }
                        </TouchableOpacity>
                      </>
                    )}

                    <TouchableOpacity
                      onPress={() => { setShowAddPhotoModal(false); setNewPhotoUri(null); setNewPhotoCaption(''); setSavingPhoto(false); }}
                      style={{ alignItems: 'center', marginTop: 12 }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: COLORS.clay, fontSize: 14 }}>Annuler</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            </>
          );
        })()}

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
                  'Cette action est irréversible. Toutes tes données seront effacées définitivement.',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    {
                      text: 'Supprimer définitivement', style: 'destructive',
                      onPress: async () => {
                        try {
                          await supabase.rpc('delete_my_account');
                          onLogout();
                        } catch (e) {
                          Alert.alert('Erreur', e?.message ?? 'Impossible de supprimer le compte.');
                        }
                      },
                    },
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
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    shadowColor: '#1A2756', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  tabPill: {
    position: 'absolute',
    top: 8, bottom: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bark,
  },
  tabBtn: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    zIndex: 1,
  },
  tabBtnText:      { fontSize: 12, ...FONTS.medium, color: COLORS.muted },
  tabBtnTextActive:{ fontSize: 12, ...FONTS.bold, color: COLORS.white },

  // ── Hero ──
  heroSection: { alignItems: 'center', paddingTop: 24, paddingBottom: 0, paddingHorizontal: 20, backgroundColor: COLORS.ink },
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

  // ── Carte statut profil petsitter (compacte) ──
  statusCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.warnBg, borderWidth: 1.5, borderColor: COLORS.warnBorder,
    borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 14,
  },
  statusCardIcon:   { fontSize: 20 },
  statusCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  statusCardTitle:  { fontSize: 13, ...FONTS.heavy, color: COLORS.clay },
  statusCardPct:    { fontSize: 12, ...FONTS.heavy, color: COLORS.clay },
  statusCardSub:    { fontSize: 11, color: COLORS.muted, marginBottom: 6 },
  statusBar:        { height: 4, backgroundColor: COLORS.warnBorder, borderRadius: 2, overflow: 'hidden' },
  statusBarFill:    { height: '100%', backgroundColor: COLORS.bark, borderRadius: 2 },
  statusCardBtn: {
    backgroundColor: COLORS.bark, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  statusCardBtnText: { fontSize: 12, ...FONTS.heavy, color: COLORS.white },

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

  photoWarning: {
    backgroundColor: COLORS.warnBg,
    borderWidth: 1, borderColor: COLORS.warnBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 8,
    marginTop: 10,
  },
  photoWarningText: { fontSize: 12, color: COLORS.clay, textAlign: 'center', ...FONTS.medium },

  dispoHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  dispoTitle:       { fontSize: 18, ...FONTS.heavy, color: COLORS.ink },
  dispoSub:         { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  dispoSavedBadge:  { fontSize: 12, ...FONTS.bold, color: COLORS.bark },
  dispoEffacerText: { fontSize: 12, color: COLORS.clay, ...FONTS.medium },
  dispoSaveBtn:     { marginTop: 16, backgroundColor: COLORS.bark, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  dispoSaveBtnDone: { backgroundColor: '#2E7D32' },
  dispoSaveBtnText: { color: COLORS.white, fontSize: 15, ...FONTS.bold },

  // ── Photos ──
  photosHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  photosTitle:  { fontSize: 18, ...FONTS.heavy, color: COLORS.ink },
  photosSub:    { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  photosAddBtn: { backgroundColor: COLORS.bark, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8 },
  photosAddBtnText: { fontSize: 13, ...FONTS.bold, color: COLORS.white },

  photosEmpty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  photosEmptyIcon:  { fontSize: 48, marginBottom: 12 },
  photosEmptyTitle: { fontSize: 16, ...FONTS.heavy, color: COLORS.ink, textAlign: 'center', marginBottom: 6 },
  photosEmptySub:   { fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  photosEmptyBtn:   { backgroundColor: COLORS.bark, borderRadius: RADIUS.full, paddingHorizontal: 20, paddingVertical: 10 },
  photosEmptyBtnText: { fontSize: 14, ...FONTS.bold, color: COLORS.white },

  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoItem:  { borderRadius: RADIUS.md, overflow: 'hidden', backgroundColor: COLORS.sand },
  photoItemImg: { width: '100%', height: '100%' },
  photoItemCaption: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4 },
  photoItemCaptionText: { fontSize: 11, color: COLORS.white },
  photoItemAdd: { backgroundColor: COLORS.sand, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoItemAddIcon:  { fontSize: 28, color: COLORS.muted },
  photoItemAddLabel: { fontSize: 12, color: COLORS.muted, ...FONTS.medium },

  photoViewer:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  photoViewerClose:   { position: 'absolute', top: 52, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  photoViewerCloseText: { fontSize: 16, color: COLORS.white, ...FONTS.bold },
  photoViewerImg:     { width: '100%', aspectRatio: 1 },
  photoViewerCaption: { marginTop: 16, fontSize: 15, color: COLORS.white, textAlign: 'center', paddingHorizontal: 24 },
  photoViewerDeleteBtn: { marginTop: 20, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: RADIUS.md, paddingHorizontal: 24, paddingVertical: 10 },
  photoViewerDeleteText: { fontSize: 14, color: '#FF6B6B', ...FONTS.bold },

  addPhotoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  addPhotoBox:     { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  addPhotoTitle:   { fontSize: 18, ...FONTS.heavy, color: COLORS.ink, marginBottom: 20, textAlign: 'center' },
  addPhotoPickerRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  addPhotoPickerBtn: { flex: 1, backgroundColor: COLORS.sand, borderRadius: RADIUS.md, padding: 20, alignItems: 'center', gap: 8 },
  addPhotoPickerIcon: { fontSize: 36 },
  addPhotoPickerLabel: { fontSize: 14, ...FONTS.bold, color: COLORS.ink },
  addPhotoPreview: { width: '100%', height: 200, borderRadius: RADIUS.md, marginBottom: 8 },
  addPhotoCaptionInput: { backgroundColor: COLORS.sand, borderRadius: RADIUS.md, padding: 12, fontSize: 14, color: COLORS.ink, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  addPhotoSaveBtn: { backgroundColor: COLORS.bark, borderRadius: RADIUS.md, padding: 15, alignItems: 'center' },
  addPhotoSaveBtnText: { fontSize: 15, ...FONTS.heavy, color: COLORS.white },


  // ── Sélecteur de date inline (InlineDatePicker) ──
  dayBtn:     { alignItems: 'center', padding: 10, marginRight: 8, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white, minWidth: 58 },
  dayBtnSel:  { backgroundColor: COLORS.bark, borderColor: COLORS.bark },
  dayName:    { fontSize: 11, color: COLORS.muted, ...FONTS.medium },
  dayNameSel: { color: 'rgba(255,255,255,0.8)' },
  dayNum:     { fontSize: 20, ...FONTS.heavy, color: COLORS.ink, marginVertical: 2 },
  dayNumSel:  { color: COLORS.white },
  dayMon:     { fontSize: 11, color: COLORS.muted },
  dayMonSel:  { color: 'rgba(255,255,255,0.8)' },
});
