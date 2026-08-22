// components/UI.js — Composants réutilisables PawWatch
import React from 'react';
import {
  View, Text, TouchableOpacity, Image,
  StyleSheet, Animated, TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONTS, RADIUS, SHADOW } from '../lib/theme';

const DOG_ICON = require('../assets/dog-icon.png');
const CAT_ICON = require('../assets/cat-icon.png');

// ─── Badge ───────────────────────────────────────────────────────
export const Badge = ({ label, color = 'default' }) => {
  const bg    = color === 'ok'   ? COLORS.okBg
              : color === 'warn' ? COLORS.warnBg
              : color === 'info' ? COLORS.infoBg
              : COLORS.sand;
  const fg    = color === 'ok'   ? COLORS.moss
              : color === 'warn' ? COLORS.clay
              : color === 'info' ? '#3A6BBF'
              : COLORS.muted;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
};

// ─── Avatar ──────────────────────────────────────────────────────
export const Avatar = ({ initials, size = 38 }) => (
  <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
    <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
  </View>
);

// ─── PhotoUpload ─────────────────────────────────────────────────
export const PhotoUpload = ({ label, icon, onPhoto, photoUri }) => {
  const handlePress = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission galerie requise pour ajouter une photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) onPhoto(result.assets[0].uri);
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission caméra requise.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) onPhoto(result.assets[0].uri);
  };

  return (
    <TouchableOpacity
      onPress={handleCamera}
      onLongPress={handlePress}
      style={[
        styles.photoUpload,
        photoUri && { borderColor: COLORS.moss, borderStyle: 'solid', backgroundColor: COLORS.okBg },
      ]}
    >
      {photoUri ? (
        <>
          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          <Text style={styles.photoAdded}>✓ Photo ajoutée</Text>
        </>
      ) : (
        <>
          <Text style={styles.photoIcon}>{icon}</Text>
          <Text style={styles.photoLabel}>{label}</Text>
          <Text style={styles.photoHint}>📸 Appuyer = caméra · Maintenir = galerie</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

// ─── CheckRow ────────────────────────────────────────────────────
export const CheckRow = ({ label, checked, onToggle }) => (
  <TouchableOpacity
    onPress={onToggle}
    style={[styles.checkRow, checked && styles.checkRowActive]}
    activeOpacity={0.7}
  >
    <View style={[styles.checkbox, checked && styles.checkboxActive]}>
      {checked && <Text style={styles.checkmark}>✓</Text>}
    </View>
    <Text style={styles.checkLabel}>{label}</Text>
  </TouchableOpacity>
);

// ─── Button ──────────────────────────────────────────────────────
export const Button = ({ label, onPress, disabled, variant = 'primary', style }) => {
  const bg = disabled              ? COLORS.border
           : variant === 'primary' ? COLORS.bark
           : variant === 'success' ? COLORS.moss
           : variant === 'danger'  ? COLORS.clay
           : COLORS.sand;
  const fg = disabled || variant === 'ghost' ? COLORS.muted : COLORS.white;

  return (
    <TouchableOpacity
      onPress={disabled ? null : onPress}
      activeOpacity={disabled ? 1 : 0.8}
      style={[styles.button, { backgroundColor: bg }, style]}
    >
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </TouchableOpacity>
  );
};

// ─── SectionLabel ────────────────────────────────────────────────
export const SectionLabel = ({ label }) => (
  <Text style={styles.sectionLabel}>{label}</Text>
);

// ─── Card ────────────────────────────────────────────────────────
export const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

// ─── AnimalEditor ────────────────────────────────────────────────
const newAnimal = () => ({
  id:            Date.now() + Math.random(),
  // Identité
  nom:           '',
  photo:         null,
  type:          null,
  race:          '',
  sexe:          null,
  age:           '',
  poids:         '',
  // Santé
  sterilise:     null,
  vaccins:       null,
  carnet:        null,
  maladies:      '',
  allergies:     '',
  medicaments:   '',
  // Alimentation
  typeAlim:      null,
  freqRepas:     null,
  quantiteRepas: '',
  // Caractère
  description:   '',
  avecChiens:    null,
  avecChats:     null,
  avecEnfants:   null,
  avecEtrangers: null,
  // Contacts
  vetoNom:       '',
  vetoTel:       '',
  urgenceNom:    '',
  urgenceTel:    '',
});

const Chip = ({ label, active, onPress, image }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[aStyles.chip, active && aStyles.chipActive]}
    activeOpacity={0.75}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      {image && <Image source={image} style={{ width: 18, height: 18 }} />}
      <Text style={[aStyles.chipText, active && aStyles.chipTextActive]}>{label}</Text>
    </View>
  </TouchableOpacity>
);

const ChipRow = ({ label, options, value, onSelect }) => (
  <View style={aStyles.fieldBlock}>
    <Text style={aStyles.fieldLbl}>{label}</Text>
    <View style={aStyles.chipRow}>
      {options.map(o => (
        <Chip key={String(o.value)} label={o.label} image={o.image} active={value === o.value} onPress={() => onSelect(o.value)} />
      ))}
    </View>
  </View>
);

// ── Séparateur de section dans la carte animal ─────────────────
const AnimalSection = ({ icon, title }) => (
  <View style={aStyles.sectionSep}>
    <Text style={aStyles.sectionIcon}>{icon}</Text>
    <Text style={aStyles.sectionTitle}>{title}</Text>
  </View>
);

const AnimalCard = ({ animal, index, onChange, onRemove }) => {
  const upd = (field, val) => onChange({ ...animal, [field]: val });
  const emoji = animal.type === 'rongeur' ? '🐹' : animal.type === 'equin' ? '🐴' : null;

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { alert('Permission galerie requise.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (!result.canceled) upd('photo', result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { alert('Permission caméra requise.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (!result.canceled) upd('photo', result.assets[0].uri);
  };

  return (
    <View style={aStyles.card}>
      {/* ── En-tête ── */}
      <View style={aStyles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {animal.type === 'chien'
            ? <Image source={DOG_ICON} style={{ width: 24, height: 24 }} />
            : animal.type === 'chat'
            ? <Image source={CAT_ICON} style={{ width: 24, height: 24 }} />
            : <Text style={{ fontSize: 20 }}>{emoji ?? '🐾'}</Text>
          }
          <Text style={aStyles.cardTitle}>{animal.nom || `Animal ${index + 1}`}</Text>
        </View>
        <TouchableOpacity onPress={onRemove} style={aStyles.removeBtn}>
          <Text style={aStyles.removeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* ── Photo de profil ── */}
      <View style={aStyles.photoRow}>
        <TouchableOpacity onPress={takePhoto} onLongPress={pickPhoto} style={aStyles.avatarCircle} activeOpacity={0.8}>
          {animal.photo
            ? <Image source={{ uri: animal.photo }} style={aStyles.avatarPhoto} />
            : <View style={aStyles.avatarPlaceholder}>
                {animal.type === 'chien' ? <Image source={DOG_ICON} style={{ width: 44, height: 44 }} />
                  : animal.type === 'chat' ? <Image source={CAT_ICON} style={{ width: 44, height: 44 }} />
                  : <Text style={{ fontSize: 40 }}>{emoji ?? '🐾'}</Text>}
              </View>
          }
          <View style={aStyles.cameraBadge}><Text style={{ fontSize: 12 }}>📸</Text></View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={aStyles.photoTitle}>Photo de profil</Text>
          <Text style={aStyles.photoHint}>
            {animal.photo ? '✓ Photo ajoutée · appuyer pour changer' : '📸 Appuyer = caméra\nMaintenez = galerie'}
          </Text>
        </View>
      </View>

      {/* ════ 1. IDENTITÉ ════ */}
      <AnimalSection icon="👤" title="Identité" />

      <View style={aStyles.fieldBlock}>
        <Text style={aStyles.fieldLbl}>Nom *</Text>
        <TextInput style={aStyles.textInput} placeholder="Ex : Luna" placeholderTextColor={COLORS.border}
          value={animal.nom ?? ''} onChangeText={v => upd('nom', v)} />
      </View>

      <ChipRow label="Type *"
        options={[
          { label: 'Chien', value: 'chien', image: DOG_ICON },
          { label: 'Chat',  value: 'chat',  image: CAT_ICON },
          { label: '🐹 Rongeur', value: 'rongeur' },
          { label: '🐴 Équin',   value: 'equin'   },
        ]}
        value={animal.type} onSelect={v => upd('type', v)}
      />

      <View style={aStyles.fieldBlock}>
        <Text style={aStyles.fieldLbl}>Race</Text>
        <TextInput style={aStyles.textInput} placeholder="Ex : Golden Retriever, Maine Coon…"
          placeholderTextColor={COLORS.border} value={animal.race ?? ''}
          onChangeText={v => upd('race', v)} />
      </View>

      <ChipRow label="Sexe *"
        options={[{ label: '♂ Mâle', value: 'male' }, { label: '♀ Femelle', value: 'femelle' }]}
        value={animal.sexe} onSelect={v => upd('sexe', v)}
      />

      <View style={aStyles.row2}>
        <View style={{ flex: 1 }}>
          <Text style={aStyles.fieldLbl}>Âge *</Text>
          <TextInput style={aStyles.textInput} placeholder="Ex : 3 ans" placeholderTextColor={COLORS.border}
            value={animal.age ?? ''} onChangeText={v => upd('age', v)} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={aStyles.fieldLbl}>Poids</Text>
          <TextInput style={aStyles.textInput} placeholder="Ex : 28 kg" placeholderTextColor={COLORS.border}
            value={animal.poids ?? ''} onChangeText={v => upd('poids', v)} keyboardType="numeric" />
        </View>
      </View>

      {/* ════ 2. SANTÉ ════ */}
      <AnimalSection icon="❤️" title="Santé" />

      <ChipRow label="Stérilisé / Castré"
        options={[{ label: 'Oui', value: true }, { label: 'Non', value: false }]}
        value={animal.sterilise} onSelect={v => upd('sterilise', v)}
      />
      <ChipRow label="Vaccins à jour"
        options={[{ label: 'Oui', value: true }, { label: 'Non', value: false }]}
        value={animal.vaccins} onSelect={v => upd('vaccins', v)}
      />
      <ChipRow label="Carnet de santé"
        options={[{ label: 'Oui', value: true }, { label: 'Non', value: false }]}
        value={animal.carnet} onSelect={v => upd('carnet', v)}
      />

      <View style={aStyles.fieldBlock}>
        <Text style={aStyles.fieldLbl}>Maladies chroniques</Text>
        <TextInput style={aStyles.textArea} placeholder="Ex : diabète, épilepsie, allergie cutanée…"
          placeholderTextColor={COLORS.border} value={animal.maladies ?? ''}
          onChangeText={v => upd('maladies', v)} multiline numberOfLines={2} textAlignVertical="top" />
      </View>

      <View style={aStyles.fieldBlock}>
        <Text style={aStyles.fieldLbl}>Allergies / Intolérances</Text>
        <TextInput style={aStyles.textArea} placeholder="Ex : allergique au poulet, intolérant au lactose…"
          placeholderTextColor={COLORS.border} value={animal.allergies ?? ''}
          onChangeText={v => upd('allergies', v)} multiline numberOfLines={2} textAlignVertical="top" />
      </View>

      <View style={aStyles.fieldBlock}>
        <Text style={aStyles.fieldLbl}>Médicaments en cours</Text>
        <TextInput style={aStyles.textArea} placeholder="Ex : Vetmedin 2.5mg matin et soir, Frontline 1x/mois…"
          placeholderTextColor={COLORS.border} value={animal.medicaments ?? ''}
          onChangeText={v => upd('medicaments', v)} multiline numberOfLines={2} textAlignVertical="top" />
      </View>

      {/* ════ 3. ALIMENTATION ════ */}
      <AnimalSection icon="🍽️" title="Alimentation" />

      <ChipRow label="Type d'alimentation"
        options={[
          { label: '🥣 Croquettes', value: 'croquettes' },
          { label: '🥩 Pâtée',     value: 'pate'       },
          { label: '🥦 BARF',      value: 'barf'       },
          { label: '🔀 Mixte',     value: 'mixte'      },
        ]}
        value={animal.typeAlim} onSelect={v => upd('typeAlim', v)}
      />
      <ChipRow label="Fréquence des repas"
        options={[
          { label: '1×/jour',  value: '1x' },
          { label: '2×/jour',  value: '2x' },
          { label: '3×/jour',  value: '3x' },
          { label: 'Libre',    value: 'libre' },
        ]}
        value={animal.freqRepas} onSelect={v => upd('freqRepas', v)}
      />

      <View style={aStyles.fieldBlock}>
        <Text style={aStyles.fieldLbl}>Quantité & marque</Text>
        <TextInput style={aStyles.textInput} placeholder="Ex : 200g Royal Canin Maxi Adult matin + soir"
          placeholderTextColor={COLORS.border} value={animal.quantiteRepas ?? ''}
          onChangeText={v => upd('quantiteRepas', v)} />
      </View>

      {/* ════ 4. CARACTÈRE ════ */}
      <AnimalSection icon="💭" title="Caractère & comportement" />

      <View style={aStyles.fieldBlock}>
        <Text style={aStyles.fieldLbl}>Description du caractère</Text>
        <TextInput style={aStyles.textArea}
          placeholder="Ex : Luna est très joueuse et câline. Elle adore les promenades et cherche toujours du contact. Légèrement anxieuse lors des orages."
          placeholderTextColor={COLORS.border} value={animal.description ?? ''}
          onChangeText={v => upd('description', v)} multiline numberOfLines={3} textAlignVertical="top" />
      </View>

      <ChipRow label="Avec d'autres chiens"
        options={[
          { label: '✅ Oui',      value: 'oui'      },
          { label: '❌ Non',      value: 'non'      },
          { label: '⚠️ Variable', value: 'variable' },
        ]}
        value={animal.avecChiens} onSelect={v => upd('avecChiens', v)}
      />
      <ChipRow label="Avec des chats"
        options={[
          { label: '✅ Oui',      value: 'oui'      },
          { label: '❌ Non',      value: 'non'      },
          { label: '⚠️ Variable', value: 'variable' },
        ]}
        value={animal.avecChats} onSelect={v => upd('avecChats', v)}
      />
      <ChipRow label="Avec des enfants"
        options={[
          { label: '✅ Oui',      value: 'oui'      },
          { label: '❌ Non',      value: 'non'      },
          { label: '⚠️ Variable', value: 'variable' },
        ]}
        value={animal.avecEnfants} onSelect={v => upd('avecEnfants', v)}
      />
      <ChipRow label="Avec des étrangers"
        options={[
          { label: '✅ Oui',      value: 'oui'      },
          { label: '❌ Non',      value: 'non'      },
          { label: '⚠️ Variable', value: 'variable' },
        ]}
        value={animal.avecEtrangers} onSelect={v => upd('avecEtrangers', v)}
      />

      {/* ════ 5. CONTACTS ════ */}
      <AnimalSection icon="📞" title="Contacts" />

      <View style={aStyles.fieldBlock}>
        <Text style={aStyles.fieldLbl}>Vétérinaire — Nom</Text>
        <TextInput style={aStyles.textInput} placeholder="Ex : Dr. Martin — Clinique Vétérinaire du Parc"
          placeholderTextColor={COLORS.border} value={animal.vetoNom ?? ''}
          onChangeText={v => upd('vetoNom', v)} />
      </View>
      <View style={aStyles.fieldBlock}>
        <Text style={aStyles.fieldLbl}>Vétérinaire — Téléphone</Text>
        <TextInput style={aStyles.textInput} placeholder="Ex : 01 23 45 67 89"
          placeholderTextColor={COLORS.border} value={animal.vetoTel ?? ''}
          onChangeText={v => upd('vetoTel', v)} keyboardType="phone-pad" />
      </View>
      <View style={aStyles.fieldBlock}>
        <Text style={aStyles.fieldLbl}>Contact d'urgence — Nom</Text>
        <TextInput style={aStyles.textInput} placeholder="Ex : Marie (sœur)"
          placeholderTextColor={COLORS.border} value={animal.urgenceNom ?? ''}
          onChangeText={v => upd('urgenceNom', v)} />
      </View>
      <View style={aStyles.fieldBlock}>
        <Text style={aStyles.fieldLbl}>Contact d'urgence — Téléphone</Text>
        <TextInput style={aStyles.textInput} placeholder="Ex : 06 12 34 56 78"
          placeholderTextColor={COLORS.border} value={animal.urgenceTel ?? ''}
          onChangeText={v => upd('urgenceTel', v)} keyboardType="phone-pad" />
      </View>
    </View>
  );
};

export const AnimalEditor = ({ animaux, onChange }) => {
  const add    = () => onChange([...animaux, newAnimal()]);
  const remove = (id) => onChange(animaux.filter(a => a.id !== id));
  const update = (id, updated) => onChange(animaux.map(a => a.id === id ? updated : a));

  return (
    <View>
      {animaux.map((a, i) => (
        <AnimalCard
          key={a.id}
          animal={a}
          index={i}
          onChange={updated => update(a.id, updated)}
          onRemove={() => remove(a.id)}
        />
      ))}
      <TouchableOpacity style={aStyles.addBtn} onPress={add} activeOpacity={0.8}>
        <Text style={aStyles.addBtnText}>➕ Ajouter un animal</Text>
      </TouchableOpacity>
    </View>
  );
};

const aStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    padding: 14, marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  cardTitle:  { fontSize: 14, ...FONTS.heavy, color: COLORS.ink },
  removeBtn:  { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.warnBg, alignItems: 'center', justifyContent: 'center' },
  removeText: { fontSize: 12, color: COLORS.clay, ...FONTS.bold },

  fieldBlock: { marginBottom: 12 },
  fieldLbl:   { fontSize: 11, ...FONTS.bold, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  chipActive:     { backgroundColor: COLORS.bark, borderColor: COLORS.bark },
  chipText:       { fontSize: 13, ...FONTS.bold, color: COLORS.muted },
  chipTextActive: { color: COLORS.white },

  textInput: {
    backgroundColor: COLORS.sand,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 10,
    fontSize: 14, color: COLORS.ink,
  },
  textArea: {
    backgroundColor: COLORS.sand,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 10,
    fontSize: 14, color: COLORS.ink,
    minHeight: 64, textAlignVertical: 'top',
  },
  row2: { flexDirection: 'row', gap: 10, marginBottom: 12 },

  sectionSep: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.warm, borderRadius: RADIUS.sm,
    paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 12, marginTop: 4,
    borderLeftWidth: 3, borderLeftColor: COLORS.bark,
  },
  sectionIcon:  { fontSize: 16 },
  sectionTitle: { fontSize: 12, ...FONTS.heavy, color: COLORS.bark, textTransform: 'uppercase', letterSpacing: 0.5 },

  photoRow:         { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatarCircle:     { width: 72, height: 72, borderRadius: 36, overflow: 'visible', position: 'relative' },
  avatarPhoto:      { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.sand },
  avatarPlaceholder:{ width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.sand, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed' },
  cameraBadge:      { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.white, borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  photoTitle:       { fontSize: 13, ...FONTS.heavy, color: COLORS.ink, marginBottom: 4 },
  photoHint:        { fontSize: 11, color: COLORS.muted, lineHeight: 16 },

  addBtn: {
    borderWidth: 1.5, borderColor: COLORS.bark, borderStyle: 'dashed',
    borderRadius: RADIUS.md, padding: 13, alignItems: 'center',
    backgroundColor: COLORS.warm, marginTop: 4,
  },
  addBtnText: { fontSize: 14, ...FONTS.bold, color: COLORS.bark },
});

// ─── PriceInput ──────────────────────────────────────────────────
// Modifie les seuils ici pour changer la fourchette de couleur :
//   low  = seuil vert → orange
//   high = seuil orange → rouge
const PRICE_RANGES = {
  promenade: { low: 8,  high: 15, unit: 'heure', ref: 'Marché : 8 – 15 €/h'     },
  pension:   { low: 15, high: 40, unit: 'nuit',  ref: 'Marché : 15 – 40 €/nuit' },
  gardeJour: { low: 10, high: 25, unit: 'jour',  ref: 'Marché : 10 – 25 €/jour' },
};

export const PriceInput = ({ label, icon, type, value, onChange }) => {
  const { low, high, unit, ref } = PRICE_RANGES[type];
  const num = parseFloat(value) || 0;

  const tier = num === 0   ? null
             : num < low   ? 'eco'
             : num <= high ? 'moyen'
             :               'premium';

  const tierColor = tier === 'eco'     ? '#22C55E'
                  : tier === 'moyen'   ? '#F59E0B'
                  : tier === 'premium' ? '#EF4444'
                  : COLORS.border;

  const tierLabel = tier === 'eco'     ? '🟢 Super affaire'
                  : tier === 'moyen'   ? '🟡 Moyen'
                  : tier === 'premium' ? '🔴 Risqué'
                  : null;

  const max    = high * 1.6;
  const pct    = num > 0 ? Math.min(num / max, 1) : null;
  const lowPct = (low  / max) * 100;
  const hiPct  = (high / max) * 100;

  return (
    <View style={pStyles.wrap}>
      <View style={pStyles.headerRow}>
        <Text style={pStyles.icon}>{icon}</Text>
        <Text style={pStyles.label}>{label}</Text>
        {tierLabel && (
          <View style={[pStyles.tierBadge, { backgroundColor: tierColor + '22', borderColor: tierColor }]}>
            <Text style={[pStyles.tierText, { color: tierColor }]}>{tierLabel}</Text>
          </View>
        )}
      </View>

      <View style={pStyles.inputRow}>
        <Text style={pStyles.euro}>€</Text>
        <TextInput
          style={pStyles.input}
          placeholder="0"
          placeholderTextColor={COLORS.border}
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          maxLength={5}
        />
        <Text style={pStyles.unit}>/ {unit}</Text>
      </View>

      {/* Barre tricolore */}
      <View style={pStyles.barWrap}>
        <View style={[pStyles.barSeg, { left: 0, width: `${lowPct}%`, backgroundColor: '#22C55E' }]} />
        <View style={[pStyles.barSeg, { left: `${lowPct}%`, width: `${hiPct - lowPct}%`, backgroundColor: '#F59E0B' }]} />
        <View style={[pStyles.barSeg, { left: `${hiPct}%`, right: 0, backgroundColor: '#EF4444' }]} />
        {pct !== null && (
          <View style={[pStyles.marker, { left: `${pct * 100}%`, borderColor: tierColor }]} />
        )}
      </View>

      <View style={pStyles.legends}>
        <Text style={[pStyles.legendTxt, { color: '#22C55E' }]}>Super affaire</Text>
        <Text style={pStyles.refTxt}>{ref}</Text>
        <Text style={[pStyles.legendTxt, { color: '#EF4444' }]}>Risqué</Text>
      </View>

      {tier === 'premium' && (
        <View style={pStyles.warningBox}>
          <Text style={pStyles.warningText}>⚠️ Attention — risque de ne pas trouver de client à ce tarif.</Text>
        </View>
      )}
    </View>
  );
};

const pStyles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    padding: 14, marginBottom: 10,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  icon:      { fontSize: 18 },
  label:     { fontSize: 14, ...FONTS.heavy, color: COLORS.ink, flex: 1 },
  tierBadge: { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  tierText:  { fontSize: 11, ...FONTS.bold },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  euro:     { fontSize: 22, ...FONTS.heavy, color: COLORS.ink },
  input: {
    fontSize: 28, ...FONTS.heavy, color: COLORS.ink,
    borderBottomWidth: 2, borderBottomColor: COLORS.border,
    minWidth: 70, textAlign: 'center', paddingBottom: 2,
  },
  unit: { fontSize: 13, color: COLORS.muted, ...FONTS.medium },

  barWrap: { height: 8, borderRadius: 4, backgroundColor: COLORS.sand, overflow: 'hidden', position: 'relative', marginBottom: 6 },
  barSeg:  { position: 'absolute', top: 0, bottom: 0 },
  marker:  {
    position: 'absolute', top: -4, marginLeft: -8,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: COLORS.white, borderWidth: 3,
  },

  legends:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legendTxt: { fontSize: 10, ...FONTS.bold },
  refTxt:    { fontSize: 10, color: COLORS.muted, textAlign: 'center', flex: 1 },

  warningBox: {
    marginTop: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1, borderColor: '#FCA5A5',
    borderRadius: RADIUS.sm,
    padding: 10,
  },
  warningText: { fontSize: 12, color: '#DC2626', ...FONTS.bold },
});

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  badge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, ...FONTS.medium },

  avatar: {
    backgroundColor: COLORS.clay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: COLORS.white, ...FONTS.bold },

  photoUpload: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    backgroundColor: COLORS.sand,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  photoPreview: {
    width: '100%', height: 80,
    borderRadius: RADIUS.sm,
    marginBottom: 6,
  },
  photoAdded: { fontSize: 11, color: COLORS.moss, ...FONTS.bold },
  photoIcon:  { fontSize: 28, marginBottom: 6 },
  photoLabel: { fontSize: 12, color: COLORS.muted, ...FONTS.medium, marginBottom: 4 },
  photoHint:  { fontSize: 10, color: COLORS.border, textAlign: 'center' },

  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.sand,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 14, marginBottom: 8,
  },
  checkRowActive: {
    backgroundColor: COLORS.okBg,
    borderColor: COLORS.okBorder,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    backgroundColor: COLORS.white,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: COLORS.moss,
    borderColor: COLORS.moss,
  },
  checkmark: { color: COLORS.white, fontSize: 13, ...FONTS.bold },
  checkLabel: { fontSize: 14, color: COLORS.ink, ...FONTS.medium },

  button: {
    borderRadius: RADIUS.md, padding: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonText: { fontSize: 15, ...FONTS.heavy },

  sectionLabel: {
    fontSize: 12, ...FONTS.bold, color: COLORS.muted,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
  },

  card: {
    backgroundColor: COLORS.cream,
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 18,
    marginBottom: 14,
    ...SHADOW.card,
  },
});
