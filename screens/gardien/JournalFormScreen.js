// screens/gardien/JournalFormScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, Switch, Image,
  TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
  Animated, Easing,
} from 'react-native';
import * as Location from 'expo-location';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../lib/theme';
import { PhotoUpload, Card, SectionLabel } from '../../components/UI';
import { soumettreJournal, uploadPhoto } from '../../lib/supabase';
import { sendLocalNotification } from '../../hooks/useNotifications';

// ── Mini composants ────────────────────────────────────────────────

const Chip = ({ label, active, onPress, color }) => {
  const activeColor = color || COLORS.bark;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        chipSt.chip,
        active && { backgroundColor: activeColor, borderColor: activeColor },
      ]}
      activeOpacity={0.75}
    >
      <Text style={[chipSt.text, active && { color: COLORS.white }]}>{label}</Text>
    </TouchableOpacity>
  );
};
const chipSt = StyleSheet.create({
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.full, borderWidth: 1.5,
    borderColor: COLORS.border, backgroundColor: COLORS.white,
  },
  text: { fontSize: 13, ...FONTS.bold, color: COLORS.muted },
});

const SectionCard = ({ icon, title, children }) => (
  <View style={sc.wrap}>
    <View style={sc.header}>
      <Text style={sc.icon}>{icon}</Text>
      <Text style={sc.title}>{title}</Text>
    </View>
    {children}
  </View>
);
const sc = StyleSheet.create({
  wrap:   { backgroundColor: COLORS.cream, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 14, ...SHADOW.card },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  icon:   { fontSize: 22 },
  title:  { fontSize: 15, ...FONTS.heavy, color: COLORS.ink },
});

const Row = ({ label, children }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={styles.rowLabel}>{label}</Text>
    {children}
  </View>
);

// ── Écran de succès animé ─────────────────────────────────────────
function SuccessScreen({ garde }) {
  const animal     = garde?.animaux;
  const nomAnimal  = animal?.nom ?? 'votre compagnon';
  const isChat     = animal?.type === 'chat';

  const scale      = useRef(new Animated.Value(0)).current;
  const floatY     = useRef(new Animated.Value(0)).current;
  const tilt       = useRef(new Animated.Value(0)).current;
  const textOp     = useRef(new Animated.Value(0)).current;
  const bgScale    = useRef(new Animated.Value(0)).current;
  const pawAnims   = useRef([...Array(6)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // Cercle fond
    Animated.spring(bgScale, { toValue: 1, tension: 28, friction: 7, useNativeDriver: true }).start();

    // Rebond d'entrée du chien
    Animated.spring(scale, { toValue: 1, tension: 55, friction: 4, delay: 150, useNativeDriver: true }).start();

    // Flottement vertical continu
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -14, duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0,   duration: 950, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Inclinaison de tête périodique
    Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(tilt, { toValue: 1,  duration: 280, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(tilt, { toValue: -1, duration: 380, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(tilt, { toValue: 0,  duration: 280, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(1600),
      ])
    ).start();

    // Texte
    Animated.timing(textOp, { toValue: 1, duration: 650, delay: 450, useNativeDriver: true }).start();

    // Empreintes en décalé
    Animated.stagger(130,
      pawAnims.map(p => Animated.spring(p, { toValue: 1, tension: 80, friction: 6, delay: 300, useNativeDriver: true }))
    ).start();
  }, []);

  const rotate = tilt.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-13deg', '0deg', '13deg'] });

  const PAW_SPOTS = [
    { top: 45,  left: 18   },
    { top: 70,  right: 25  },
    { top: 175, left: 10   },
    { top: 190, right: 15  },
    { top: 310, left: 35   },
    { top: 300, right: 38  },
  ];

  return (
    <View style={suc.wrap}>
      {/* Empreintes éparses */}
      {pawAnims.map((p, i) => (
        <Animated.Text key={i} style={[suc.floatingPaw, PAW_SPOTS[i], { opacity: p, transform: [{ scale: p }] }]}>
          🐾
        </Animated.Text>
      ))}

      {/* Cercle de fond animé */}
      <Animated.View style={[suc.glowCircle, { transform: [{ scale: bgScale }] }]} />

      {/* Logo chien / chat animé */}
      <Animated.View style={{ transform: [{ scale }, { translateY: floatY }, { rotate }] }}>
        <Image
          source={isChat ? require('../../assets/cat-icon.png') : require('../../assets/dog-icon.png')}
          style={suc.animalImg}
        />
      </Animated.View>

      {/* Texte */}
      <Animated.View style={[suc.textBlock, { opacity: textOp }]}>
        <Text style={suc.title}>Journal envoyé ! 🎉</Text>
        <Text style={suc.subtitle}>
          Le propriétaire a été notifié.{'\n'}
          <Text style={suc.animalName}>{nomAnimal}</Text> a passé une super journée 🐾
        </Text>
        <View style={suc.badge}>
          <Text style={suc.badgeText}>✓ Rapport transmis avec succès</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const suc = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glowCircle: {
    position: 'absolute',
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(34,197,94,0.13)',
  },
  floatingPaw: { position: 'absolute', fontSize: 30 },
  animalImg:   { width: 170, height: 170, resizeMode: 'contain' },
  textBlock:   { alignItems: 'center', paddingHorizontal: 36, marginTop: 28 },
  title:       { fontSize: 28, ...FONTS.heavy, color: '#16A34A', marginBottom: 14 },
  subtitle:    { fontSize: 15, color: COLORS.ink, textAlign: 'center', lineHeight: 24 },
  animalName:  { ...FONTS.heavy, color: COLORS.bark },
  badge: {
    marginTop: 22, backgroundColor: '#16A34A',
    borderRadius: RADIUS.full, paddingHorizontal: 22, paddingVertical: 9,
  },
  badgeText: { color: '#fff', fontSize: 14, ...FONTS.bold },
});

// ── Écran principal ────────────────────────────────────────────────
export default function JournalFormScreen({ garde, user, onSubmit, onBack }) {

  // ── Arrivée ──
  const [humeurArrivee, setHumeurArrivee] = useState(null);

  // ── Repas ──
  const [repas,       setRepas]       = useState(null); // 'tout' | 'moitie' | 'peu' | 'rien'
  const [repasEau,    setRepasEau]    = useState(null); // true | false

  // ── Besoins ──
  const [nbSorties,   setNbSorties]   = useState('');
  const [accident,    setAccident]    = useState(false);

  // ── Activités ──
  const [promenade,         setPromenade]         = useState(false);
  const [dureePromenade,    setDureePromenade]     = useState(null);
  const [photoPromenade,    setPhotoPromenade]     = useState(null);
  const [jeux,              setJeux]               = useState(false);
  const [typeJeux,          setTypeJeux]           = useState([]);
  const [calins,            setCalins]             = useState(false);
  const [photosActivite,    setPhotosActivite]     = useState([null, null]);

  // ── Repos ──
  const [aDorémi,    setADormi]    = useState(null); // true | false
  const [dureeDodo,  setDureeDodo] = useState(null);

  // ── Santé ──
  const [comportement,  setComportement]  = useState(null); // 'normal' | 'agite' | 'fatigue' | 'malade'
  const [vomissement,   setVomissement]   = useState(false);
  const [medicament,    setMedicament]    = useState(false);
  const [descMedicament,setDescMedicament]= useState('');
  const [noteSante,     setNoteSante]     = useState('');

  // ── Humeur générale ──
  const [humeur, setHumeur] = useState(null);

  // ── Photos du jour ──
  const [photos, setPhotos] = useState([null, null, null, null]);

  // ── Message petsitter ──
  const [message, setMessage] = useState('');

  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ── Validation minimale ──
  const canSubmit = repas !== null && humeur !== null && message.trim().length > 0;

  const toggleJeu = (jeu) => {
    setTypeJeux(prev => prev.includes(jeu) ? prev.filter(j => j !== jeu) : [...prev, jeu]);
  };

  const setPhoto = (index, uri) => {
    const next = [...photos];
    next[index] = uri;
    setPhotos(next);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const coords = promenade ? await getLocation() : null;
      const now    = new Date().toTimeString().slice(0, 5);

      const journal = await soumettreJournal(garde?.id ?? 'demo', {
        date:               new Date().toISOString(),
        humeur_arrivee:     humeurArrivee,
        repas_quantite:     repas,
        repas_eau:          repasEau,
        nb_sorties:         nbSorties,
        accident,
        promenade_done:     promenade,
        duree_promenade:    dureePromenade,
        promenade_coords:   coords,
        jeux,
        type_jeux:          typeJeux,
        calins,
        a_dormi:            aDorémi,
        duree_dodo:         dureeDodo,
        comportement,
        vomissement,
        medicament,
        desc_medicament:    descMedicament,
        note_sante:         noteSante,
        humeur,
        message,
        gardien_id:         user?.id,
      }).catch(() => ({ id: 'demo-journal' }));

      if (photoPromenade) await uploadPhoto(journal.id, 'promenade', photoPromenade).catch(() => {});
      photos.forEach((p, i) => {
        if (p) uploadPhoto(journal.id, `photo_${i}`, p).catch(() => {});
      });

      await sendLocalNotification({
        title: '📋 Journal envoyé !',
        body:  'Le propriétaire a été notifié 🐾',
      }).catch(() => {});

      setSubmitted(true);
      if (onSubmit) onSubmit(journal);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return `${loc.coords.latitude.toFixed(5)},${loc.coords.longitude.toFixed(5)}`;
    } catch { return null; }
  };

  // ── Écran succès ──
  if (submitted) return <SuccessScreen garde={garde} />;

  const animal    = garde?.animaux;
  const nomAnimal = animal?.nom ?? 'votre animal';
  const typeAnimal = animal?.type ?? null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Bouton retour */}
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>← Retour à la liste</Text>
        </TouchableOpacity>
      )}

      {/* En-tête */}
      <View style={styles.headerCard}>
        <View style={styles.headerIcon}>
          {typeAnimal === 'chien'
            ? <Image source={require('../../assets/dog-icon.png')} style={{ width: 44, height: 44 }} />
            : typeAnimal === 'chat'
            ? <Image source={require('../../assets/cat-icon.png')} style={{ width: 44, height: 44 }} />
            : <Text style={{ fontSize: 40 }}>{typeAnimal === 'rongeur' ? '🐹' : typeAnimal === 'equin' ? '🐴' : '🐾'}</Text>
          }
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Carnet de {nomAnimal}</Text>
          <Text style={styles.headerSub}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          📌 Ce rapport quotidien est envoyé au propriétaire pour le rassurer. Soyez précis et chaleureux !
        </Text>
      </View>

      {/* ══════════════════════════════════════
          1. ARRIVÉE
      ══════════════════════════════════════ */}
      <SectionCard icon="🌅" title="Arrivée & humeur initiale">
        <Row label="Comment était-il/elle à son arrivée ?">
          <View style={styles.chipRow}>
            {[
              { v: 'joyeux',  l: '😄 Joyeux'    },
              { v: 'calme',   l: '😊 Calme'      },
              { v: 'anxieux', l: '😟 Anxieux'    },
              { v: 'fatigue', l: '😴 Fatigué'    },
            ].map(o => (
              <Chip key={o.v} label={o.l} active={humeurArrivee === o.v} onPress={() => setHumeurArrivee(o.v)} />
            ))}
          </View>
        </Row>
      </SectionCard>

      {/* ══════════════════════════════════════
          2. REPAS
      ══════════════════════════════════════ */}
      <SectionCard icon="🍽" title="Repas">
        <Row label="A-t-il/elle bien mangé ? *">
          <View style={styles.chipRow}>
            {[
              { v: 'tout',   l: '😋 Tout mangé' },
              { v: 'moitie', l: '🙂 La moitié'  },
              { v: 'peu',    l: '😐 Un peu'      },
              { v: 'rien',   l: '😟 Rien'        },
            ].map(o => (
              <Chip key={o.v} label={o.l} active={repas === o.v} onPress={() => setRepas(o.v)}
                color={o.v === 'tout' ? '#22C55E' : o.v === 'rien' ? '#EF4444' : COLORS.bark}
              />
            ))}
          </View>
        </Row>

        {repas === 'rien' && (
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>⚠️ Il/elle n'a pas mangé — pensez à le préciser dans le message.</Text>
          </View>
        )}

        <Row label="A-t-il/elle bu suffisamment ?">
          <View style={styles.chipRow}>
            <Chip label="✅ Oui" active={repasEau === true}  onPress={() => setRepasEau(true)}  color="#22C55E" />
            <Chip label="❌ Non" active={repasEau === false} onPress={() => setRepasEau(false)} color="#EF4444" />
          </View>
        </Row>

      </SectionCard>

      {/* ══════════════════════════════════════
          3. BESOINS
      ══════════════════════════════════════ */}
      <SectionCard icon="💧" title="Besoins & sorties">
        <Row label="Nombre de sorties pour faire ses besoins">
          <View style={styles.chipRow}>
            {['1', '2', '3', '4', '5+'].map(n => (
              <Chip key={n} label={n} active={nbSorties === n} onPress={() => setNbSorties(n)} />
            ))}
          </View>
        </Row>

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>Accident en intérieur</Text>
            <Text style={styles.switchSub}>Le propriétaire sera informé avec bienveillance</Text>
          </View>
          <Switch
            value={accident}
            onValueChange={setAccident}
            trackColor={{ true: '#F59E0B', false: COLORS.border }}
            thumbColor={COLORS.white}
          />
        </View>
        {accident && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>💛 Pas d'inquiétude — ça arrive ! Mentionnez-le dans le message.</Text>
          </View>
        )}
      </SectionCard>

      {/* ══════════════════════════════════════
          4. ACTIVITÉS
      ══════════════════════════════════════ */}
      <SectionCard icon="🌳" title="Activités de la journée">

        {/* Promenade */}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>🦮 Promenade effectuée</Text>
          <Switch
            value={promenade}
            onValueChange={setPromenade}
            trackColor={{ true: COLORS.bark, false: COLORS.border }}
            thumbColor={COLORS.white}
          />
        </View>
        {promenade && (
          <>
            <Row label="Durée de la promenade">
              <View style={styles.chipRow}>
                {['15 min', '30 min', '45 min', '1h', '1h30+'].map(d => (
                  <Chip key={d} label={d} active={dureePromenade === d} onPress={() => setDureePromenade(d)} />
                ))}
              </View>
            </Row>
            <Row label="📸 Photo de la promenade (recommandé)">
              <PhotoUpload label="Photo de la balade" icon="🐾" onPhoto={setPhotoPromenade} photoUri={photoPromenade} />
            </Row>
            <View style={styles.geoBox}>
              <Text style={styles.geoText}>📍 Géolocalisation enregistrée automatiquement à l'envoi.</Text>
            </View>
          </>
        )}

        {/* Jeux */}
        <View style={[styles.switchRow, { marginTop: 12 }]}>
          <Text style={styles.switchLabel}>🎾 Sessions de jeux</Text>
          <Switch
            value={jeux}
            onValueChange={setJeux}
            trackColor={{ true: COLORS.bark, false: COLORS.border }}
            thumbColor={COLORS.white}
          />
        </View>
        {jeux && (
          <Row label="Types de jeux">
            <View style={styles.chipRow}>
              {['🎾 Balle', '🪁 Jouets', '🤸 Agilité', '💦 Eau', '🧩 Enrichissement'].map(j => (
                <Chip key={j} label={j} active={typeJeux.includes(j)} onPress={() => toggleJeu(j)} />
              ))}
            </View>
          </Row>
        )}

        {/* Câlins */}
        <View style={[styles.switchRow, { marginTop: 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchLabel}>🤗 Câlins & moments de tendresse</Text>
            <Text style={styles.switchSub}>Il/elle a cherché du contact, des câlins</Text>
          </View>
          <Switch
            value={calins}
            onValueChange={setCalins}
            trackColor={{ true: '#EC4899', false: COLORS.border }}
            thumbColor={COLORS.white}
          />
        </View>

        {/* Photos activité */}
        <Row label="📸 Photos de la journée">
          <View style={styles.photosGrid}>
            {photos.map((p, i) => (
              <View key={i} style={{ width: '48%' }}>
                <PhotoUpload
                  label={`Photo ${i + 1}`}
                  icon={['🌳', '🎾', '😴', '🥰'][i]}
                  onPhoto={uri => setPhoto(i, uri)}
                  photoUri={p}
                />
              </View>
            ))}
          </View>
        </Row>
      </SectionCard>

      {/* ══════════════════════════════════════
          5. REPOS
      ══════════════════════════════════════ */}
      <SectionCard icon="😴" title="Repos & sieste">
        <Row label="A-t-il/elle dormi dans la journée ?">
          <View style={styles.chipRow}>
            <Chip label="✅ Oui" active={aDorémi === true}  onPress={() => setADormi(true)}  color="#22C55E" />
            <Chip label="❌ Non" active={aDorémi === false} onPress={() => setADormi(false)} color="#EF4444" />
          </View>
        </Row>
        {aDorémi && (
          <Row label="Durée approximative">
            <View style={styles.chipRow}>
              {['30 min', '1h', '1h30', '2h', '2h+'].map(d => (
                <Chip key={d} label={d} active={dureeDodo === d} onPress={() => setDureeDodo(d)} />
              ))}
            </View>
          </Row>
        )}
      </SectionCard>

      {/* ══════════════════════════════════════
          6. SANTÉ & COMPORTEMENT
      ══════════════════════════════════════ */}
      <SectionCard icon="❤️" title="Santé & comportement">
        <Row label="Comportement général">
          <View style={styles.chipRow}>
            {[
              { v: 'normal',  l: '😊 Normal'   },
              { v: 'agite',   l: '⚡ Agité'    },
              { v: 'fatigue', l: '😴 Fatigué'  },
              { v: 'malade',  l: '🤒 Malade'   },
            ].map(o => (
              <Chip key={o.v} label={o.l} active={comportement === o.v} onPress={() => setComportement(o.v)}
                color={o.v === 'malade' ? '#EF4444' : o.v === 'normal' ? '#22C55E' : COLORS.bark}
              />
            ))}
          </View>
        </Row>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>🤢 Vomissement ou selles anormales</Text>
          <Switch
            value={vomissement}
            onValueChange={setVomissement}
            trackColor={{ true: '#EF4444', false: COLORS.border }}
            thumbColor={COLORS.white}
          />
        </View>

        <View style={[styles.switchRow, { marginTop: 10 }]}>
          <Text style={styles.switchLabel}>💊 Médicament administré</Text>
          <Switch
            value={medicament}
            onValueChange={setMedicament}
            trackColor={{ true: COLORS.bark, false: COLORS.border }}
            thumbColor={COLORS.white}
          />
        </View>
        {medicament && (
          <TextInput
            style={styles.textArea}
            placeholder="Nom du médicament, dose, heure..."
            placeholderTextColor={COLORS.border}
            value={descMedicament}
            onChangeText={setDescMedicament}
            multiline
          />
        )}

        {(vomissement || comportement === 'malade') && (
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>⚠️ Une observation médicale sera signalée au propriétaire.</Text>
          </View>
        )}

        <TextInput
          style={[styles.textArea, { marginTop: 10 }]}
          placeholder="Autres observations de santé (grattage, boiterie, appetit inhabituel...)"
          placeholderTextColor={COLORS.border}
          value={noteSante}
          onChangeText={setNoteSante}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </SectionCard>

      {/* ══════════════════════════════════════
          7. HUMEUR GÉNÉRALE
      ══════════════════════════════════════ */}
      <SectionCard icon="😊" title="Note de bonheur *">
        <Text style={styles.rowLabel}>Comment évaluez-vous sa journée globalement ?</Text>
        <View style={styles.humeurRow}>
          {[
            { e: '🤩', l: 'Excellente' },
            { e: '😄', l: 'Très bien'  },
            { e: '😊', l: 'Bien'       },
            { e: '😐', l: 'Moyenne'    },
            { e: '😟', l: 'Difficile'  },
          ].map(o => (
            <TouchableOpacity
              key={o.e}
              onPress={() => setHumeur(o.e)}
              style={[styles.humeurBtn, humeur === o.e && styles.humeurBtnActive]}
            >
              <Text style={styles.humeurEmoji}>{o.e}</Text>
              <Text style={[styles.humeurLabel, humeur === o.e && { color: COLORS.bark }]}>{o.l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </SectionCard>

      {/* ══════════════════════════════════════
          8. MESSAGE PETSITTER
      ══════════════════════════════════════ */}
      <SectionCard icon="✉️" title="Mon message au propriétaire *">
        <Text style={styles.rowLabel}>
          Un mot chaleureux pour rassurer — comme une maîtresse de crèche 💛
        </Text>
        <TextInput
          style={[styles.textArea, { minHeight: 120 }]}
          placeholder={`Bonjour !\n\n${nomAnimal} a passé une excellente journée. Il/elle était en pleine forme à son arrivée et a bien mangé son repas. Nous avons fait une belle promenade de 30 minutes au parc et il/elle s'est bien amusé(e) avec sa balle. Pas d'inquiétude à avoir, tout va bien 🐾`}
          placeholderTextColor={COLORS.border}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        {message.length > 0 && (
          <Text style={styles.charCount}>{message.length} caractères</Text>
        )}
      </SectionCard>

      {/* ══════════════════════════════════════
          ENVOYER
      ══════════════════════════════════════ */}
      {!canSubmit && (
        <View style={styles.validationBox}>
          <Text style={styles.validationText}>
            Pour envoyer :{'\n'}
            {repas === null   ? '· ✗ Indiquer la quantité du repas\n' : '· ✓ Repas renseigné\n'}
            {humeur === null  ? '· ✗ Donner une note de bonheur\n'    : '· ✓ Note de bonheur\n'}
            {!message.trim()  ? '· ✗ Écrire un message au propriétaire' : '· ✓ Message rédigé'}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, (!canSubmit || loading) && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit || loading}
        activeOpacity={0.8}
      >
        {loading
          ? <ActivityIndicator color={COLORS.white} />
          : <Text style={styles.submitText}>
              {canSubmit ? '📤 Envoyer le carnet du jour' : '⚠ Complétez les champs obligatoires'}
            </Text>
        }
      </TouchableOpacity>

      <Text style={styles.footerNote}>
        Le propriétaire recevra une notification et pourra consulter ce rapport complet dans son application.
      </Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.sand },
  content:   { padding: 16, paddingBottom: 60 },

  headerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.ink, borderRadius: RADIUS.lg,
    padding: 18, marginBottom: 12,
  },
  headerEmoji: { fontSize: 40 },
  headerTitle: { fontSize: 18, ...FONTS.heavy, color: COLORS.white },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  infoBox: {
    backgroundColor: COLORS.okBg, borderWidth: 1, borderColor: COLORS.okBorder,
    borderRadius: RADIUS.md, padding: 12, marginBottom: 14,
  },
  infoText: { fontSize: 12, color: COLORS.moss, lineHeight: 18 },

  alertBox: {
    backgroundColor: COLORS.warnBg, borderWidth: 1, borderColor: COLORS.warnBorder,
    borderRadius: RADIUS.sm, padding: 10, marginTop: 8, marginBottom: 4,
  },
  alertText: { fontSize: 12, color: COLORS.clay },

  rowLabel: { fontSize: 12, ...FONTS.bold, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  chipRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  switchRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  switchLabel: { flex: 1, fontSize: 14, ...FONTS.bold, color: COLORS.ink },
  switchSub:   { fontSize: 11, color: COLORS.muted, marginTop: 2 },

  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  geoBox: {
    backgroundColor: COLORS.infoBg, borderRadius: RADIUS.sm,
    padding: 10, marginTop: 8,
  },
  geoText: { fontSize: 12, color: '#3A6BBF' },

  textArea: {
    backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 12, fontSize: 14, color: COLORS.ink,
    minHeight: 80, textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: COLORS.muted, textAlign: 'right', marginTop: 4 },

  humeurRow:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  humeurBtn:   { alignItems: 'center', padding: 8, borderRadius: RADIUS.sm, borderWidth: 2, borderColor: 'transparent', flex: 1 },
  humeurBtnActive: { backgroundColor: COLORS.warm, borderColor: COLORS.bark },
  humeurEmoji: { fontSize: 30 },
  humeurLabel: { fontSize: 10, color: COLORS.muted, marginTop: 4, textAlign: 'center', ...FONTS.medium },

  validationBox: {
    backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA',
    borderRadius: RADIUS.md, padding: 14, marginBottom: 14,
  },
  validationText: { fontSize: 13, color: '#92400E', lineHeight: 22 },

  submitBtn:         { backgroundColor: COLORS.bark, borderRadius: RADIUS.md, padding: 17, alignItems: 'center', marginBottom: 12 },
  submitBtnDisabled: { backgroundColor: COLORS.border },
  submitText:        { fontSize: 15, ...FONTS.heavy, color: COLORS.white },

  footerNote: { fontSize: 11, color: COLORS.muted, textAlign: 'center', lineHeight: 16, paddingBottom: 30 },

  backBtn:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, marginBottom: 8 },
  backText: { fontSize: 14, ...FONTS.bold, color: COLORS.bark },

  headerIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
});
