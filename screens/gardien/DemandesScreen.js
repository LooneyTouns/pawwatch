// screens/gardien/DemandesScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
  Modal, TextInput,
} from 'react-native';
import { COLORS, FONTS, RADIUS } from '../../lib/theme';
import { Avatar, Badge, Card, SectionLabel } from '../../components/UI';
import {
  getHistoriqueGardien,
  soumettreAvis,
  hasAvis,
  getDemandesOuvertes,
  accepterDemandeOuverte,
  getUserProfile,
  getDisponibilites,
  formatPawsitter,
  createOrGetConversation,
  sendMessage,
  supabase,
} from '../../lib/supabase';
import { calculerCompatibilite, matchColor, adequationDemande, trierDemandesOuvertes } from '../../lib/matching';
import { SERVICE_MAP } from '../../lib/services';
import AnimalFiche from '../../components/AnimalFiche';

const MIN_COMMENT = 10;

function AvisModal({ visible, cibleNom, onSubmit, submitting }) {
  const [note,        setNote]        = useState(0);
  const [commentaire, setCommentaire] = useState('');

  const canSubmit = note > 0 && commentaire.trim().length >= MIN_COMMENT && !submitting;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => {}}>
      <View style={av.overlay}>
        <View style={av.sheet}>
          <Text style={av.titre}>Évaluer {cibleNom ?? 'le propriétaire'}</Text>
          <Text style={av.sub}>Note et commentaire obligatoires pour finaliser la garde.</Text>
          <View style={av.stars}>
            {[1, 2, 3, 4, 5].map(n => (
              <TouchableOpacity key={n} onPress={() => setNote(n)} activeOpacity={0.7}>
                <Text style={[av.star, n <= note && av.starActive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          {note > 0 && (
            <Text style={av.noteLabel}>
              {['', 'Décevant 😞', 'Passable 😐', 'Bien 🙂', 'Très bien 😊', 'Excellent ! 🤩'][note]}
            </Text>
          )}
          <TextInput
            style={[av.input, commentaire.length > 0 && commentaire.trim().length < MIN_COMMENT && av.inputWarn]}
            placeholder="Décris comment s'est passée la garde… (min. 10 caractères)"
            placeholderTextColor={COLORS.border}
            value={commentaire}
            onChangeText={setCommentaire}
            multiline
            maxLength={300}
          />
          {commentaire.length > 0 && commentaire.trim().length < MIN_COMMENT && (
            <Text style={av.hint}>Encore {MIN_COMMENT - commentaire.trim().length} caractère(s) minimum</Text>
          )}
          <TouchableOpacity
            style={[av.btn, !canSubmit && av.btnOff]}
            onPress={() => { if (canSubmit) onSubmit(note, commentaire); }}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color={COLORS.white} />
              : <Text style={av.btnText}>Envoyer mon avis ✓</Text>
            }
          </TouchableOpacity>
          <Text style={av.obligatoire}>L'avis est obligatoire pour finaliser la garde.</Text>
        </View>
      </View>
    </Modal>
  );
}

const av = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: COLORS.cream ?? COLORS.sand, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 44 },
  titre:      { fontSize: 20, ...FONTS.heavy, color: COLORS.ink, textAlign: 'center', marginBottom: 4 },
  sub:        { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginBottom: 20 },
  stars:      { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 8 },
  star:       { fontSize: 44, color: COLORS.border },
  starActive: { color: '#F59E0B' },
  noteLabel:  { fontSize: 14, color: COLORS.ink, textAlign: 'center', marginBottom: 18, ...FONTS.medium },
  input:      { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, fontSize: 14, color: COLORS.ink, minHeight: 80, textAlignVertical: 'top', marginBottom: 4 },
  inputWarn:  { borderColor: COLORS.clay },
  hint:       { fontSize: 12, color: COLORS.clay, marginBottom: 12, marginLeft: 2 },
  btn:        { backgroundColor: COLORS.bark, borderRadius: RADIUS.md, padding: 15, alignItems: 'center', marginTop: 8 },
  btnOff:     { backgroundColor: COLORS.border },
  btnText:    { fontSize: 16, ...FONTS.heavy, color: COLORS.white },
  obligatoire:{ fontSize: 12, color: COLORS.muted, textAlign: 'center', marginTop: 14 },
});

const formatDate = (str) =>
  new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

export default function DemandesScreen({ user, onOuvrirDispos }) {
  const [historique,    setHistorique]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [refreshing,    setRefreshing]    = useState(false);
  const [avisGardeId,   setAvisGardeId]   = useState(null);
  const [notées,        setNotées]        = useState({});   // { [gardeId]: true }
  const [submittingAvis,setSubmittingAvis] = useState(false);
  const [ouvertes,      setOuvertes]      = useState([]);   // demandes ouvertes (tous proprios)
  const [myPawsitter,   setMyPawsitter]   = useState(null); // mon profil formaté, pour le score de compatibilité
  const [acceptingId,   setAcceptingId]   = useState(null);
  const [mesDispos,     setMesDispos]     = useState([]);

  const load = useCallback(async (quiet = false) => {
    if (!user?.id) return;
    if (!quiet) { setLoading(true); setError(null); }
    try {
      const [hist, open, profile, dispos] = await Promise.all([
        getHistoriqueGardien(user.id),
        getDemandesOuvertes().catch(() => []),
        getUserProfile(user.id).catch(() => null),
        getDisponibilites(user.id).catch(() => []),
      ]);
      setHistorique(hist);
      setOuvertes(open);
      setMesDispos(dispos);
      setMyPawsitter(profile ? formatPawsitter(profile) : null);
      // Vérifie quelles gardes terminées ont déjà un avis
      const terminées = (hist ?? []).filter(h => h.statut === 'terminee');
      const checks = await Promise.all(terminées.map(h => hasAvis(h.id, user.id).catch(() => false)));
      const map = {};
      terminées.forEach((h, i) => { if (checks[i]) map[h.id] = true; });
      setNotées(map);
      // Auto-afficher le modal pour la première garde terminée non notée
      const àNoter = terminées.find((h, i) => !checks[i]);
      if (àNoter) setAvisGardeId(àNoter.id);
    } catch (e) {
      console.error('DemandesScreen load:', e);
      const detail = [e?.message, e?.code && `(${e.code})`, e?.hint].filter(Boolean).join(' ');
      if (!quiet) setError(detail || 'Impossible de charger les demandes. Vérifie ta connexion.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  const handleSubmitAvis = async (note, commentaire) => {
    const garde = historique.find(h => h.id === avisGardeId);
    if (!garde || !user?.id) return;
    setSubmittingAvis(true);
    try {
      await soumettreAvis(garde.id, user.id, garde.proprio_id, note, commentaire);
      setNotées(prev => ({ ...prev, [garde.id]: true }));
      setAvisGardeId(null);
      Alert.alert('Merci ! 🐾', 'Ton avis a été envoyé au propriétaire.');
    } catch {
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'avis.');
    } finally {
      setSubmittingAvis(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  // Realtime : rechargement silencieux quand une nouvelle garde en_attente arrive
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('demandes-petsitter')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gardes',
          filter: `gardien_id=eq.${user.id}` }, () => load(true))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'gardes',
          filter: `gardien_id=eq.${user.id}` }, () => load(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, load]);

  const handleAccepterOuverte = (d) => {
    Alert.alert(
      'Accepter cette demande',
      `Confirmer que tu prends en charge la garde du ${formatDate(d.date_debut)} au ${formatDate(d.date_fin)} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter ✓',
          onPress: async () => {
            setAcceptingId(d.id);
            try {
              await accepterDemandeOuverte(d.id, user.id);
              // Ouvre une conversation avec le propriétaire (best-effort)
              try {
                const convId = await createOrGetConversation(d.proprio.id, user.id, d.id);
                await sendMessage(convId, user.id,
                  `Bonjour ! J'ai accepté votre demande de garde du ${formatDate(d.date_debut)} au ${formatDate(d.date_fin)} 🐾 N'hésitez pas si vous avez des questions !`
                );
              } catch { /* la garde reste acceptée même si le message échoue */ }
              await load(true);
              Alert.alert('✓ Garde acceptée', 'Un message a été envoyé au propriétaire dans tes conversations.');
            } catch {
              Alert.alert('Erreur', 'Cette demande n\'est peut-être plus disponible. Actualise la liste.');
              load(true);
            } finally {
              setAcceptingId(null);
            }
          },
        },
      ]
    );
  };

  // Demandes ouvertes : celles qui tombent sur mes jours libres et portent sur un de mes services d'abord
  const ouvertesScored = ouvertes.map(d => {
    const { pct, blocages } = (myPawsitter && d.proprio?.onboarding)
      ? calculerCompatibilite(d.proprio.onboarding, myPawsitter)
      : { pct: null, blocages: [] };
    return { ...d, pct, blocages, ...adequationDemande(d, myPawsitter, mesDispos) };
  }).sort(trierDemandesOuvertes);
  const ouvertesPourMoi = ouvertesScored.filter(d => d.recommandee);
  const ouvertesAutres  = ouvertesScored.filter(d => !d.recommandee);

  const renderOuverte = (d) => {
    const accepting = acceptingId === d.id;
    const colors = d.pct != null ? matchColor(d.pct) : null;
    const dispoBadge = d.joursDispo == null ? null
      : d.joursDispo === d.joursTotal ? { texte: '📅 Disponible toute la période', bg: COLORS.okBg, fg: COLORS.ok }
      : d.joursDispo > 0 ? { texte: `📅 Disponible ${d.joursDispo} jour${d.joursDispo > 1 ? 's' : ''} sur ${d.joursTotal}`, bg: COLORS.warnBg, fg: COLORS.clay }
      : { texte: '📅 Hors de tes disponibilités', bg: COLORS.sand, fg: COLORS.muted };
    return (
      <Card key={d.id} style={styles.demandeCard}>
        <View style={styles.demandeHeader}>
          <Avatar initials={d.proprio.nom?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) ?? '??'} size={40} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.propreNom}>{d.proprio.nom}</Text>
            <Text style={styles.animalLine}>
              {d.proprio.ville ? `📍 ${d.proprio.ville}` : ''}
              {d.animaux?.length > 0
                ? `${d.proprio.ville ? ' · ' : ''}${d.animaux.map(a => `${a.emoji} ${a.nom}`).join(', ')}`
                : (d.proprio.ville ? '' : '🐾 Animal non précisé')}
            </Text>
          </View>
          {d.pct != null && (
            <View style={[styles.ouverteMatchBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Text style={[styles.ouverteMatchText, { color: colors.text }]}>{d.pct}%</Text>
            </View>
          )}
        </View>

        <View style={styles.datesBox}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Début</Text>
            <Text style={styles.dateVal}>{formatDate(d.date_debut)}</Text>
          </View>
          <View style={styles.dateSep} />
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Fin</Text>
            <Text style={styles.dateVal}>{formatDate(d.date_fin)}</Text>
          </View>
        </View>

        <View style={styles.badgesRow}>
          {SERVICE_MAP[d.service] ? (
            <View style={[styles.servicePill, d.serviceOk === false && styles.servicePillKo]}>
              <Text style={styles.servicePillText}>
                {d.serviceOk ? '✓ ' : ''}{SERVICE_MAP[d.service].icon} {SERVICE_MAP[d.service].label}
              </Text>
            </View>
          ) : null}
          {dispoBadge && (
            <View style={[styles.dispoBadge, { backgroundColor: dispoBadge.bg }]}>
              <Text style={[styles.dispoBadgeText, { color: dispoBadge.fg }]}>{dispoBadge.texte}</Text>
            </View>
          )}
        </View>
        {d.serviceOk === false ? (
          <Text style={styles.ouverteBlocage}>⚠️ Tu ne proposes pas ce service dans ton profil</Text>
        ) : null}

        {d.animaux?.map(a => <AnimalFiche key={a.id} animal={a} />)}

        {d.message ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>"{d.message}"</Text>
          </View>
        ) : null}

        {d.blocages?.length > 0 && d.blocages.map((b, i) => (
          <Text key={i} style={styles.ouverteBlocage}>{b}</Text>
        ))}

        <TouchableOpacity
          style={[styles.actionBtn, styles.accepterBtn, accepting && styles.actionBtnDisabled, { marginTop: 4 }]}
          onPress={() => handleAccepterOuverte(d)}
          disabled={accepting}
          activeOpacity={0.8}
        >
          {accepting
            ? <ActivityIndicator size="small" color={COLORS.white} />
            : <Text style={styles.accepterText}>✓ Accepter cette garde</Text>
          }
        </TouchableOpacity>
      </Card>
    );
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.bark} />
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={{ fontSize: 40, marginBottom: 14 }}>📡</Text>
      <Text style={styles.errorTitle}>Erreur de chargement</Text>
      <Text style={styles.errorSub}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => load()}>
        <Text style={styles.retryText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Revenus ─────────────────────────────────────────────────────
  const gardesActives  = historique.filter(h => h.statut !== 'refusee');
  const totalPaye      = gardesActives.filter(h => h.paiement_statut === 'paye')
                                      .reduce((s, h) => s + (h.montant ?? 0), 0);
  const totalAttente   = gardesActives.filter(h => h.paiement_statut !== 'paye')
                                      .reduce((s, h) => s + (h.montant ?? 0), 0);
  const nbGardes       = gardesActives.length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(true); }}
          tintColor={COLORS.bark}
        />
      }
    >
      {/* ── Carte revenus ── */}
      {(historique.length > 0 || true) && (
        <Card style={styles.revenusCard}>
          <Text style={styles.revenusTitle}>Mes revenus</Text>
          <View style={styles.revenusRow}>
            <View style={styles.revenuItem}>
              <Text style={styles.revenuVal}>{totalPaye} €</Text>
              <Text style={styles.revenuLabel}>Encaissés</Text>
            </View>
            <View style={styles.revenuSep} />
            <View style={styles.revenuItem}>
              <Text style={[styles.revenuVal, { color: COLORS.moss }]}>{totalAttente} €</Text>
              <Text style={styles.revenuLabel}>À recevoir</Text>
            </View>
            <View style={styles.revenuSep} />
            <View style={styles.revenuItem}>
              <Text style={styles.revenuVal}>{nbGardes}</Text>
              <Text style={styles.revenuLabel}>Garde{nbGardes > 1 ? 's' : ''}</Text>
            </View>
          </View>
        </Card>
      )}

      {/* ── Demandes ouvertes (publiées par des propriétaires, non attribuées) ── */}
      {ouvertesScored.length > 0 && mesDispos.length === 0 && (
        <TouchableOpacity style={styles.dispoInvite} onPress={onOuvrirDispos} disabled={!onOuvrirDispos} activeOpacity={0.85}>
          <Text style={styles.dispoInviteTitre}>📅 Renseigne tes disponibilités</Text>
          <Text style={styles.dispoInviteTexte}>
            Les demandes qui tombent sur tes jours libres et portent sur tes services passeront en premier.
            {onOuvrirDispos ? ' Appuie ici pour ouvrir ton calendrier →' : ''}
          </Text>
        </TouchableOpacity>
      )}

      {ouvertesPourMoi.length > 0 && (
        <>
          <SectionLabel label={`⭐ Pour toi (${ouvertesPourMoi.length})`} />
          <Text style={styles.sectionSub}>Sur tes jours de disponibilité, pour un service que tu proposes.</Text>
          {ouvertesPourMoi.map(renderOuverte)}
        </>
      )}

      {ouvertesAutres.length > 0 && (
        <>
          <SectionLabel label={`🔍 ${ouvertesPourMoi.length > 0 ? 'Autres demandes' : 'Demandes disponibles'} (${ouvertesAutres.length})`} />
          {ouvertesAutres.map(renderOuverte)}
        </>
      )}


      {/* ── Historique ── */}
      {historique.length > 0 && (
        <>
          <SectionLabel label="Historique" />
          {historique.map(h => (
            <Card key={h.id} style={styles.histCard}>
              <View style={styles.histRow}>
                <Avatar initials={h.proprio.avatar} size={34} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.histNom}>
                    {h.proprio.nom}
                    {h.animal ? ` · ${h.animal.emoji} ${h.animal.nom}` : ''}
                  </Text>
                  <Text style={styles.histDates}>
                    {formatDate(h.date_debut)} → {formatDate(h.date_fin)}
                    {h.montant ? ` · ${h.montant} €` : ''}
                  </Text>
                </View>
                <Badge
                  label={
                    h.statut === 'en_cours'  ? '⏳ En cours' :
                    h.statut === 'refusee'   ? '✗ Refusée'  :
                    h.statut === 'terminee'  ? '✓ Terminée'  :
                                              '✓ Acceptée'
                  }
                  color={
                    h.statut === 'refusee' ? 'warn' :
                    h.statut === 'en_cours' ? 'info' : 'ok'
                  }
                />
              </View>
              {h.statut === 'terminee' && (
                notées[h.id]
                  ? <Text style={styles.dejaNoteText}>⭐ Avis envoyé</Text>
                  : <TouchableOpacity
                      style={styles.noterBtn}
                      onPress={() => setAvisGardeId(h.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.noterText}>⭐ Noter le propriétaire</Text>
                    </TouchableOpacity>
              )}
            </Card>
          ))}
        </>
      )}

      <AvisModal
        visible={!!avisGardeId}
        cibleNom={historique.find(h => h.id === avisGardeId)?.proprio?.nom}
        onSubmit={handleSubmitAvis}
        submitting={submittingAvis}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.sand },
  content:   { padding: 16, paddingBottom: 100 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorTitle: { fontSize: 16, ...FONTS.heavy, color: COLORS.ink, marginBottom: 6, textAlign: 'center' },
  errorSub:   { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginBottom: 20, lineHeight: 19 },
  retryBtn:   { backgroundColor: COLORS.bark, borderRadius: RADIUS.md, paddingHorizontal: 24, paddingVertical: 12 },
  retryText:  { fontSize: 14, ...FONTS.bold, color: COLORS.white },

  demandeCard:   { marginBottom: 16 },
  demandeHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  propreNom:     { fontSize: 15, ...FONTS.bold, color: COLORS.ink, marginBottom: 3 },
  animalLine:    { fontSize: 13, color: COLORS.muted },
  montantPill:   { backgroundColor: COLORS.warm, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1.5, borderColor: COLORS.bark },
  montant:       { fontSize: 16, ...FONTS.heavy, color: COLORS.bark },

  datesBox:  { flexDirection: 'row', backgroundColor: COLORS.sand, borderRadius: RADIUS.sm, padding: 12, marginBottom: 12 },
  dateItem:  { flex: 1, alignItems: 'center' },
  dateLabel: { fontSize: 11, color: COLORS.muted, ...FONTS.medium, marginBottom: 3 },
  dateVal:   { fontSize: 13, ...FONTS.bold, color: COLORS.ink, textTransform: 'capitalize' },
  dateSep:   { width: 1, backgroundColor: COLORS.border, marginHorizontal: 8 },

  messageBox: {
    backgroundColor: COLORS.warm, borderRadius: RADIUS.sm,
    padding: 12, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: COLORS.clay,
  },
  messageText: { fontSize: 13, color: COLORS.ink, lineHeight: 19, fontStyle: 'italic' },

  actions:          { flexDirection: 'row', gap: 10 },
  actionBtn:        { flex: 1, borderRadius: RADIUS.md, padding: 12, alignItems: 'center' },
  actionBtnDisabled:{ opacity: 0.6 },
  refuserBtn:       { backgroundColor: COLORS.warnBg, borderWidth: 1.5, borderColor: COLORS.warnBorder },
  accepterBtn:      { backgroundColor: COLORS.moss },
  refuserText:      { fontSize: 14, ...FONTS.bold, color: COLORS.clay },
  accepterText:     { fontSize: 14, ...FONTS.bold, color: COLORS.white },

  histCard:  { marginBottom: 10 },
  histRow:   { flexDirection: 'row', alignItems: 'center' },
  histNom:   { fontSize: 14, ...FONTS.bold, color: COLORS.ink, marginBottom: 3 },
  histDates: { fontSize: 12, color: COLORS.muted },

  vide:      { alignItems: 'center', paddingVertical: 24 },
  videTitle: { fontSize: 16, ...FONTS.bold, color: COLORS.ink, marginTop: 12 },
  videSub:   { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 6, lineHeight: 18 },

  noterBtn:      { marginTop: 10, backgroundColor: COLORS.warm ?? '#FFF4E6', borderWidth: 1.5, borderColor: COLORS.bark, borderRadius: RADIUS.md, padding: 10, alignItems: 'center' },
  noterText:     { fontSize: 13, ...FONTS.bold, color: COLORS.bark },
  dejaNoteText:  { marginTop: 8, fontSize: 13, color: COLORS.moss, textAlign: 'center', ...FONTS.medium },

  revenusCard:   { marginBottom: 20 },
  revenusTitle:  { fontSize: 13, ...FONTS.bold, color: COLORS.muted, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.6 },
  revenusRow:    { flexDirection: 'row', alignItems: 'center' },
  revenuItem:    { flex: 1, alignItems: 'center' },
  revenuVal:     { fontSize: 26, ...FONTS.heavy, color: COLORS.bark, marginBottom: 4 },
  revenuLabel:   { fontSize: 12, color: COLORS.muted, ...FONTS.medium },
  revenuSep:     { width: 1, height: 44, backgroundColor: COLORS.border, marginHorizontal: 8 },

  ouverteMatchBadge: { borderWidth: 1.5, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4 },
  ouverteMatchText:  { fontSize: 13, ...FONTS.heavy },
  ouverteBlocage:    { fontSize: 12, color: COLORS.clay, marginTop: 4 },
  servicePill:       { alignSelf: 'flex-start', backgroundColor: COLORS.warm, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.warnBorder, paddingHorizontal: 12, paddingVertical: 5 },
  servicePillKo:     { backgroundColor: COLORS.sand, borderColor: COLORS.border },
  badgesRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  dispoBadge:        { borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5 },
  dispoBadgeText:    { fontSize: 12, ...FONTS.bold },
  sectionSub:        { fontSize: 12, color: COLORS.muted, marginTop: -4, marginBottom: 10 },
  dispoInvite:       { backgroundColor: COLORS.infoBg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.moss, padding: 14, marginBottom: 12 },
  dispoInviteTitre:  { fontSize: 14, ...FONTS.heavy, color: COLORS.ink, marginBottom: 4 },
  dispoInviteTexte:  { fontSize: 13, color: COLORS.moss, lineHeight: 19 },
  servicePillText:   { fontSize: 13, ...FONTS.bold, color: COLORS.ink },
});
