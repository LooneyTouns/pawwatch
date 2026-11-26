// screens/shared/NotificationsScreen.js
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../lib/theme';

const MOCK_NOTIFS = [
  {
    id: '1', lu: false, heure: 'Il y a 5 min',
    icon: '📋', titre: 'Journal reçu',
    corps: 'Le pawsitter a envoyé le journal du mardi 24 juin pour Luna.',
  },
  {
    id: '2', lu: false, heure: 'Il y a 2 h',
    icon: '🍗', titre: 'Repas confirmé',
    corps: 'Luna a bien mangé à 12h30. Une photo a été ajoutée.',
  },
  {
    id: '3', lu: true, heure: 'Hier 18h42',
    icon: '🌳', titre: 'Promenade effectuée',
    corps: 'Balade de 45 min dans le parc — géolocalisation enregistrée.',
  },
  {
    id: '4', lu: true, heure: 'Hier 09h00',
    icon: '👍', titre: 'Journal validé',
    corps: 'Vous avez validé le journal du lundi 23 juin.',
  },
  {
    id: '5', lu: true, heure: 'Lun. 09h00',
    icon: '🐾', titre: 'Garde commencée',
    corps: 'La garde de Luna a démarré. Votre pawsitter est prêt !',
  },
];

export default function NotificationsScreen() {
  const [notifs, setNotifs] = useState(MOCK_NOTIFS);

  const nonLues = notifs.filter(n => !n.lu).length;

  const marquerToutLu = () => setNotifs(ns => ns.map(n => ({ ...n, lu: true })));
  const marquerLu = (id) => setNotifs(ns => ns.map(n => n.id === id ? { ...n, lu: true } : n));

  return (
    <View style={styles.container}>
      {nonLues > 0 && (
        <View style={styles.topBar}>
          <View style={styles.countPill}>
            <Text style={styles.topSub}>🔔 {nonLues} non lue{nonLues > 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity onPress={marquerToutLu} activeOpacity={0.7}>
            <Text style={styles.toutLuBtn}>Tout marquer lu</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {notifs.length === 0 && (
          <View style={styles.vide}>
            <Text style={{ fontSize: 48 }}>🔔</Text>
            <Text style={styles.videTitle}>Aucune notification</Text>
            <Text style={styles.videSub}>Vous serez alerté dès que votre pawsitter envoie un journal.</Text>
          </View>
        )}

        {notifs.map((n, i) => (
          <TouchableOpacity
            key={n.id}
            onPress={() => marquerLu(n.id)}
            activeOpacity={0.75}
            style={[
              styles.notifCard,
              !n.lu && styles.notifCardNonLue,
              i === notifs.length - 1 && { marginBottom: 0 },
            ]}
          >
            <View style={styles.notifIconWrap}>
              <Text style={styles.notifIcon}>{n.icon}</Text>
              {!n.lu && <View style={styles.dot} />}
            </View>
            <View style={styles.notifBody}>
              <View style={styles.notifHeader}>
                <Text style={[styles.notifTitre, !n.lu && styles.notifTitreNonLu]}>{n.titre}</Text>
                <Text style={styles.notifHeure}>{n.heure}</Text>
              </View>
              <Text style={styles.notifCorps}>{n.corps}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.sand },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  countPill: {
    backgroundColor: COLORS.warm, borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  topSub:   { fontSize: 12, color: COLORS.bark, ...FONTS.bold },
  toutLuBtn:{ fontSize: 13, color: COLORS.bark, ...FONTS.bold },

  list: { padding: 16, paddingBottom: 100 },

  notifCard: {
    flexDirection: 'row', backgroundColor: COLORS.cream,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, marginBottom: 10,
    ...SHADOW.card,
  },
  notifCardNonLue: {
    backgroundColor: '#FFF8F4',
    borderColor: COLORS.warnBorder,
  },

  notifIconWrap: { width: 42, height: 42, position: 'relative', marginRight: 12 },
  notifIcon: { fontSize: 28 },
  dot: {
    position: 'absolute', top: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORS.clay, borderWidth: 2, borderColor: COLORS.cream,
  },

  notifBody:   { flex: 1 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  notifTitre:  { fontSize: 14, ...FONTS.medium, color: COLORS.muted, flex: 1 },
  notifTitreNonLu: { color: COLORS.ink, ...FONTS.bold },
  notifHeure:  { fontSize: 11, color: COLORS.muted, marginLeft: 8, marginTop: 1 },
  notifCorps:  { fontSize: 13, color: COLORS.muted, lineHeight: 18 },

  vide:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  videTitle: { fontSize: 18, ...FONTS.bold, color: COLORS.ink, marginTop: 16 },
  videSub:   { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 8, lineHeight: 18 },
});
