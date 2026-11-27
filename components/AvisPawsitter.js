// components/AvisPawsitter.js — avis laissés par les propriétaires sur un pawsitter
import React, { useEffect, useState } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Dimensions,
} from 'react-native';
import { COLORS, FONTS, RADIUS } from '../lib/theme';
import { getAvisPawsitter } from '../lib/supabase';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const Etoiles = ({ note }) => (
  <Text style={st.etoiles}>
    {'★'.repeat(note)}<Text style={st.etoilesVides}>{'★'.repeat(Math.max(0, 5 - note))}</Text>
  </Text>
);

// « Marie Dupont » → « Marie D. » : le nom complet de l'auteur n'a pas à être affiché
function auteurCourt(nom) {
  const [prenom, ...reste] = String(nom || 'Propriétaire').trim().split(/\s+/);
  return reste.length ? `${prenom} ${reste[reste.length - 1][0].toUpperCase()}.` : prenom;
}

const formatMois = iso => new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

export function AvisListe({ pawsitterId, limite }) {
  const [avis,   setAvis]   = useState(null);
  const [erreur, setErreur] = useState(false);
  const [tout,   setTout]   = useState(false);

  useEffect(() => {
    if (!pawsitterId) return;
    let annule = false;
    setAvis(null); setErreur(false); setTout(false);
    getAvisPawsitter(pawsitterId)
      .then(list => { if (!annule) setAvis(list); })
      .catch(() => { if (!annule) { setErreur(true); setAvis([]); } });
    return () => { annule = true; };
  }, [pawsitterId]);

  if (avis === null) return <ActivityIndicator color={COLORS.bark} style={{ marginVertical: 12 }} />;
  if (erreur)        return <Text style={st.vide}>Impossible de charger les avis.</Text>;
  if (!avis.length)  return <Text style={st.vide}>Pas encore d'avis.</Text>;

  const visibles = tout || !limite ? avis : avis.slice(0, limite);
  return (
    <View style={{ gap: 8 }}>
      {visibles.map(a => (
        <View key={a.id} style={st.avis}>
          <View style={st.avisHead}>
            <Etoiles note={a.note ?? 0} />
            <Text style={st.auteur}>{auteurCourt(a.auteur?.nom)} · {formatMois(a.created_at)}</Text>
          </View>
          {a.commentaire ? <Text style={st.commentaire}>{a.commentaire}</Text> : null}
        </View>
      ))}
      {limite && avis.length > limite && !tout && (
        <TouchableOpacity onPress={() => setTout(true)} hitSlop={8}>
          <Text style={st.voirTout}>Voir les {avis.length} avis</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function AvisModal({ visible, pawsitter, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={st.overlay}>
        <View style={st.sheet}>
          <View style={st.header}>
            <View style={{ flex: 1 }}>
              <Text style={st.titre}>Avis sur {pawsitter?.nom ?? 'ce pawsitter'}</Text>
              {pawsitter?.nb_avis > 0 && (
                <Text style={st.sousTitre}>⭐ {pawsitter.note} sur 5 · {pawsitter.nb_avis} avis</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={st.closeBtn} hitSlop={10}>
              <Text style={st.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 4 }}>
            {visible && <AvisListe pawsitterId={pawsitter?.id} />}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  etoiles:      { fontSize: 14, color: '#F59E0B', letterSpacing: 1 },
  etoilesVides: { color: COLORS.border },
  avis:         { backgroundColor: COLORS.sand, borderRadius: RADIUS.md, padding: 12 },
  avisHead:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  auteur:       { fontSize: 12, color: COLORS.muted, flexShrink: 1, textAlign: 'right' },
  commentaire:  { fontSize: 14, color: COLORS.ink, lineHeight: 20 },
  vide:         { fontSize: 13, color: COLORS.muted, fontStyle: 'italic', paddingVertical: 6 },
  voirTout:     { fontSize: 13, ...FONTS.bold, color: COLORS.moss, paddingVertical: 4 },

  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: COLORS.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: SCREEN_HEIGHT * 0.85, paddingTop: 20, paddingBottom: 24 },
  header:    { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 12 },
  titre:     { fontSize: 20, ...FONTS.heavy, color: COLORS.ink },
  sousTitre: { fontSize: 13, color: COLORS.muted, marginTop: 3 },
  closeBtn:  { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.sand, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  closeText: { fontSize: 14, color: COLORS.ink, ...FONTS.bold },
});
