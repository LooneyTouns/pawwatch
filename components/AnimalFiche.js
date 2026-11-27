// components/AnimalFiche.js — fiche détaillée d'un animal, vue par le pawsitter
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Linking } from 'react-native';
import { COLORS, FONTS, RADIUS } from '../lib/theme';
import { LIBELLES } from '../lib/animaux';

const EMOJI = { chien: '🐕', chat: '🐈', lapin: '🐇', rongeur: '🐹', oiseau: '🐦', reptile: '🦎', equin: '🐴' };
const ouiNon = v => (v === true ? 'Oui' : v === false ? 'Non' : null);

const Ligne = ({ label, value }) => (value == null || value === '' ? null : (
  <View style={st.ligne}>
    <Text style={st.ligneLabel}>{label}</Text>
    <Text style={st.ligneValue}>{value}</Text>
  </View>
));

const Bloc = ({ titre, children }) => (
  <View style={st.bloc}>
    <Text style={st.blocTitre}>{titre}</Text>
    {children}
  </View>
);

const Tel = ({ label, nom, tel }) => (!nom && !tel ? null : (
  <View style={st.ligne}>
    <Text style={st.ligneLabel}>{label}</Text>
    <TouchableOpacity onPress={() => tel && Linking.openURL(`tel:${tel.replace(/\s/g, '')}`)} disabled={!tel}>
      <Text style={[st.ligneValue, tel && st.lien]}>{[nom, tel].filter(Boolean).join(' · ')}</Text>
    </TouchableOpacity>
  </View>
));

export default function AnimalFiche({ animal, initialOuvert = false }) {
  const [ouvert, setOuvert] = useState(initialOuvert);
  const a = animal;
  const resume = [a.race, a.age, LIBELLES.sexe[a.sexe], a.poids && `${a.poids}${/kg/i.test(a.poids) ? '' : ' kg'}`]
    .filter(Boolean).join(' · ');
  const alertesSante = [a.maladies, a.allergies, a.medicaments]
    .some(v => v && !/^aucun/i.test(v.trim()));

  return (
    <View style={st.wrap}>
      <TouchableOpacity onPress={() => setOuvert(o => !o)} activeOpacity={0.8} style={st.header}>
        <View style={st.avatar}>
          {a.photo
            ? <Image source={{ uri: a.photo }} style={st.photo} />
            : <Text style={{ fontSize: 22 }}>{EMOJI[a.type] ?? '🐾'}</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={st.nom}>{a.nom}{alertesSante ? '  ⚕️' : ''}</Text>
          {resume ? <Text style={st.resume} numberOfLines={1}>{resume}</Text> : null}
        </View>
        <Text style={st.toggle}>{ouvert ? 'Masquer ▴' : 'Fiche ▾'}</Text>
      </TouchableOpacity>

      {ouvert && (
        <View style={st.corps}>
          {a.fiche_complete === false && (
            <Text style={st.incomplete}>⚠️ Fiche incomplète : demande les détails au propriétaire.</Text>
          )}

          <Bloc titre="❤️ Santé">
            <Ligne label="Stérilisé"   value={ouiNon(a.sterilise)} />
            <Ligne label="Vaccins à jour" value={ouiNon(a.vaccins)} />
            <Ligne label="Carnet de santé" value={ouiNon(a.carnet)} />
            <Ligne label="Maladies"    value={a.maladies} />
            <Ligne label="Allergies"   value={a.allergies} />
            <Ligne label="Médicaments" value={a.medicaments} />
          </Bloc>

          <Bloc titre="🍽️ Alimentation">
            <Ligne label="Type"      value={LIBELLES.typeAlim[a.typeAlim] ?? a.typeAlim} />
            <Ligne label="Fréquence" value={LIBELLES.freqRepas[a.freqRepas] ?? a.freqRepas} />
            <Ligne label="Quantité"  value={a.quantiteRepas} />
          </Bloc>

          <Bloc titre="💭 Caractère">
            {a.description ? <Text style={st.description}>{a.description}</Text> : null}
            <Ligne label="Avec les chiens"   value={LIBELLES.social[a.avecChiens]} />
            <Ligne label="Avec les chats"    value={LIBELLES.social[a.avecChats]} />
            <Ligne label="Avec les enfants"  value={LIBELLES.social[a.avecEnfants]} />
            <Ligne label="Avec les inconnus" value={LIBELLES.social[a.avecEtrangers]} />
          </Bloc>

          {a.contactsVisibles ? (
            <Bloc titre="📞 Contacts">
              <Tel label="Vétérinaire" nom={a.vetoNom}    tel={a.vetoTel} />
              <Tel label="Urgence"     nom={a.urgenceNom} tel={a.urgenceTel} />
            </Bloc>
          ) : (
            <Text style={st.contactsCaches}>📞 Vétérinaire et contact d'urgence visibles une fois la garde acceptée.</Text>
          )}
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap:    { backgroundColor: COLORS.sand, borderRadius: RADIUS.md, marginBottom: 8, overflow: 'hidden' },
  header:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  avatar:  { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo:   { width: 40, height: 40 },
  nom:     { fontSize: 14, ...FONTS.heavy, color: COLORS.ink },
  resume:  { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  toggle:  { fontSize: 12, ...FONTS.bold, color: COLORS.moss },
  corps:   { paddingHorizontal: 12, paddingBottom: 12, gap: 10 },
  bloc:    { backgroundColor: COLORS.white, borderRadius: RADIUS.sm, padding: 10, gap: 4 },
  blocTitre:   { fontSize: 12, ...FONTS.heavy, color: COLORS.bark, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  ligne:       { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  ligneLabel:  { fontSize: 13, color: COLORS.muted },
  ligneValue:  { fontSize: 13, ...FONTS.medium, color: COLORS.ink, flexShrink: 1, textAlign: 'right' },
  lien:        { color: COLORS.moss, textDecorationLine: 'underline' },
  description: { fontSize: 13, color: COLORS.ink, lineHeight: 19, marginBottom: 4 },
  incomplete:  { fontSize: 12, color: COLORS.clay, ...FONTS.bold },
  contactsCaches: { fontSize: 12, color: COLORS.muted, fontStyle: 'italic' },
});
