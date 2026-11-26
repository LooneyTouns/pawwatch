// screens/proprietaire/JournalScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl,
  TouchableOpacity, StyleSheet, Image, ActivityIndicator,
  Modal, TextInput, Alert,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../lib/theme';
import { Badge, Avatar, Card, SectionLabel } from '../../components/UI';
import { getJournaux, validerJournal, marquerGardeTerminee, soumettreAvis, hasAvis, getHistoriqueProprio, getMesDemandesOuvertes, annulerDemandeOuverte, creerDemandeOuverte, modifierDemandeOuverte, getAnimaux } from '../../lib/supabase';
import { sendLocalNotification } from '../../hooks/useNotifications';
import DemandeGardeModal from '../../components/DemandeGardeModal';

const DOG_ICON = require('../../assets/dog-icon.png');
const CAT_ICON = require('../../assets/cat-icon.png');

const ANIMAL_EMOJI = { chien: '🐕', chat: '🐈', lapin: '🐇', rongeur: '🐹', oiseau: '🐦', reptile: '🦎', autre: '🐾' };
const formatDateFr = (str) => new Date(str + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

const AnimalAvatar = ({ animal, size = 60 }) => {
  if (animal?.photo) {
    return (
      <Image
        source={{ uri: animal.photo }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS.sand }}
      />
    );
  }
  if (animal?.type === 'chien') return <Image source={DOG_ICON} style={{ width: size, height: size }} />;
  if (animal?.type === 'chat')  return <Image source={CAT_ICON} style={{ width: size, height: size }} />;
  return (
    <Text style={{ fontSize: size * 0.75 }}>
      {animal?.type === 'rongeur' ? '🐹' : animal?.type === 'equin' ? '🐴' : '🐾'}
    </Text>
  );
};

// ── Modal d'avis ─────────────────────────────────────────────────
const MIN_COMMENT = 10;

function AvisModal({ visible, gardienNom, onSubmit, submitting }) {
  const [note,        setNote]        = useState(0);
  const [commentaire, setCommentaire] = useState('');

  const canSubmit = note > 0 && commentaire.trim().length >= MIN_COMMENT && !submitting;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => {}}>
      <View style={av.overlay}>
        <View style={av.sheet}>
          <Text style={av.titre}>Évaluer {gardienNom ?? 'le pawsitter'}</Text>
          <Text style={av.sub}>Note et commentaire obligatoires pour valider la garde.</Text>

          {/* Étoiles */}
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

          {/* Commentaire */}
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
  sheet:      { backgroundColor: COLORS.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 44 },
  titre:      { fontSize: 20, ...FONTS.heavy, color: COLORS.ink, textAlign: 'center', marginBottom: 4 },
  sub:        { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginBottom: 20 },
  stars:      { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 8 },
  star:       { fontSize: 44, color: COLORS.border },
  starActive: { color: '#F59E0B' },
  noteLabel:  { fontSize: 14, color: COLORS.ink, textAlign: 'center', marginBottom: 18, ...FONTS.medium },
  input: {
    backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: 12, fontSize: 14, color: COLORS.ink,
    minHeight: 80, textAlignVertical: 'top', marginBottom: 4,
  },
  inputWarn:   { borderColor: COLORS.clay },
  hint:        { fontSize: 12, color: COLORS.clay, marginBottom: 12, marginLeft: 2 },
  btn:         { backgroundColor: COLORS.bark, borderRadius: RADIUS.md, padding: 15, alignItems: 'center', marginTop: 8 },
  btnOff:      { backgroundColor: COLORS.border },
  btnText:     { fontSize: 16, ...FONTS.heavy, color: COLORS.white },
  obligatoire: { fontSize: 12, color: COLORS.muted, textAlign: 'center', marginTop: 14 },
});

const formatDate = (str) =>
  new Date(str).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

export default function JournalScreen({ garde, user, onGardeTerminee }) {
  const [journaux,      setJournaux]      = useState([]);
  const [historique,    setHistorique]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [showAvis,      setShowAvis]      = useState(false);
  const [dejaNoté,      setDejaNoté]      = useState(false);
  const [submittingAvis,setSubmittingAvis] = useState(false);
  const [terminant,     setTerminant]     = useState(false);

  // ── Demandes de garde ──
  const [mesDemandes,      setMesDemandes]      = useState([]);
  const [mesAnimaux,       setMesAnimaux]       = useState([]);
  const [showDemandeModal, setShowDemandeModal] = useState(false);
  const [editingDemande,   setEditingDemande]   = useState(null); // null = création, objet = édition

  const resetDemandeForm = () => setEditingDemande(null);

  const openCreerDemande = () => {
    setEditingDemande(null);
    setShowDemandeModal(true);
  };

  const openEditerDemande = (d) => {
    setEditingDemande(d);
    setShowDemandeModal(true);
  };

  // Charger historique, demandes et animaux
  useEffect(() => {
    if (!user?.id) return;
    getHistoriqueProprio(user.id).then(setHistorique).catch(() => {});
    getMesDemandesOuvertes(user.id).then(setMesDemandes).catch(() => {});
    getAnimaux(user.id).then(setMesAnimaux).catch(() => {});
  }, [user?.id]);

  // Les erreurs remontent jusqu'au formulaire, qui les affiche sans perdre la saisie.
  const handleSauvegarderDemande = async ({ animaux, debut, fin, message }) => {
    const payload = {
      date_debut: debut,
      date_fin:   fin,
      message:    message || null,
      animal_ids: animaux.map(a => a.id),
    };
    const etaitEdition = !!editingDemande;
    if (etaitEdition) await modifierDemandeOuverte(editingDemande.id, payload);
    else              await creerDemandeOuverte({ proprio_id: user.id, ...payload });

    setShowDemandeModal(false);
    resetDemandeForm();
    getMesDemandesOuvertes(user.id).then(setMesDemandes).catch(() => {});
    Alert.alert(
      etaitEdition ? '✓ Demande modifiée' : '✓ Demande publiée',
      etaitEdition ? 'Les modifications sont enregistrées.' : 'Elle est maintenant visible par les pawsitters compatibles.'
    );
  };

  const handleAnnulerDemande = (id) => {
    Alert.alert(
      'Annuler la demande',
      'Cette demande ne sera plus visible par les pawsitters.',
      [
        { text: 'Garder', style: 'cancel' },
        {
          text: 'Annuler la demande', style: 'destructive',
          onPress: async () => {
            try {
              await annulerDemandeOuverte(id);
              setMesDemandes(prev => prev.filter(d => d.id !== id));
              setShowDemandeModal(false);
              resetDemandeForm();
            } catch {
              Alert.alert('Erreur', 'Impossible d\'annuler cette demande.');
            }
          },
        },
      ]
    );
  };

  if (!garde) return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* ── Mes demandes de garde ── */}
        <SectionLabel label={`📅 Mes demandes de garde (${mesDemandes.length})`} />

        {mesDemandes.length === 0 ? (
          <Card style={{ marginBottom: 4 }}>
            <View style={styles.demandeVide}>
              <Text style={{ fontSize: 36 }}>🐾</Text>
              <Text style={styles.demandeVideTitle}>Aucune demande active</Text>
              <Text style={styles.demandeVideSub}>
                Publie une demande pour qu'elle soit visible par les pawsitters compatibles avec ton profil.
              </Text>
            </View>
          </Card>
        ) : (
          mesDemandes.map(d => {
            const animauxList = d.animaux?.length > 0
              ? d.animaux.map(a => `${ANIMAL_EMOJI[a.espece?.toLowerCase()] ?? '🐾'} ${a.nom}`).join(', ')
              : '🐾 Animal non précisé';
            return (
              <TouchableOpacity key={d.id} onPress={() => openEditerDemande(d)} activeOpacity={0.82}>
                <Card style={styles.demandeCard}>
                  <View style={styles.demandeRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.demandeDates}>
                        {formatDateFr(d.date_debut)} → {formatDateFr(d.date_fin)}
                      </Text>
                      <Text style={styles.demandeAnimal}>{animauxList}</Text>
                      {d.message ? (
                        <Text style={styles.demandeMsg} numberOfLines={2}>"{d.message}"</Text>
                      ) : null}
                    </View>
                    <View style={styles.demandeActions}>
                      <View style={styles.demandeEditBadge}>
                        <Text style={styles.demandeEditText}>Modifier ›</Text>
                      </View>
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation?.(); handleAnnulerDemande(d.id); }}
                        style={styles.demandeCancelBtn}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.demandeCancelText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}

        <TouchableOpacity
          style={styles.demandeAddBtn}
          onPress={openCreerDemande}
          activeOpacity={0.85}
        >
          <Text style={styles.demandeAddText}>➕ Créer une demande de garde</Text>
        </TouchableOpacity>

        {historique.length > 0 && (
          <>
            <SectionLabel label="Gardes passées" />
            {historique.map(h => (
              <Card key={h.id} style={styles.histCard}>
                <View style={styles.histRow}>
                  <Text style={styles.histEmoji}>{h.animal?.emoji ?? '🐾'}</Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.histNom}>
                      {h.animal?.nom ?? 'Animal'} · {h.gardien.nom}
                    </Text>
                    <Text style={styles.histDates}>
                      {formatDate(h.date_debut)} → {formatDate(h.date_fin)}
                      {h.nb_jours ? ` · ${h.nb_jours} j` : ''}
                      {h.montant  ? ` · ${h.montant} €` : ''}
                    </Text>
                  </View>
                  <View style={styles.histBadgeWrap}>
                    <Text style={[
                      styles.histBadge,
                      { color: h.statut === 'terminee' ? COLORS.moss : h.statut === 'refusee' ? COLORS.clay : COLORS.ink }
                    ]}>
                      {h.statut === 'terminee' ? '✓ Terminée' : h.statut === 'refusee' ? '✗ Refusée' : '✓ Acceptée'}
                    </Text>
                  </View>
                </View>
                {h.paiement_statut === 'paye' && (
                  <Text style={styles.histPaye}>💳 Paiement effectué</Text>
                )}
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      <DemandeGardeModal
        visible={showDemandeModal}
        onClose={() => { setShowDemandeModal(false); resetDemandeForm(); }}
        mode="ouverte"
        titre={editingDemande ? 'Modifier la demande' : 'Nouvelle demande de garde'}
        sousTitre={editingDemande
          ? 'Change les animaux, les dates ou le message.'
          : 'Visible par tous les pawsitters compatibles, tu n\'as pas à en choisir un.'}
        mesAnimaux={mesAnimaux}
        initial={editingDemande ? {
          animaux: editingDemande.animaux,
          debut:   editingDemande.date_debut,
          fin:     editingDemande.date_fin,
          message: editingDemande.message,
        } : null}
        submitLabel={editingDemande ? '💾 Enregistrer les modifications' : '📢 Publier la demande'}
        onSubmit={handleSauvegarderDemande}
        onDelete={editingDemande ? () => handleAnnulerDemande(editingDemande.id) : undefined}
      />
    </View>
  );

  const animaux = Array.isArray(garde.animaux)
    ? garde.animaux
    : garde.animaux ? [garde.animaux] : [];

  const load = useCallback(async () => {
    try {
      const [data, deja] = await Promise.all([
        getJournaux(garde.id),
        user?.id ? hasAvis(garde.id, user.id) : false,
      ]);
      setJournaux(data);
      setDejaNoté(deja);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [garde.id, user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleTerminer = () => {
    Alert.alert(
      'Terminer la garde',
      'Confirmer la fin de la garde ? Le pawsitter sera notifié.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Terminer ✓',
          onPress: async () => {
            setTerminant(true);
            try {
              await marquerGardeTerminee(garde.id);
              setShowAvis(true);
            } catch {
              Alert.alert('Erreur', 'Impossible de terminer la garde.');
            } finally {
              setTerminant(false);
            }
          },
        },
      ]
    );
  };

  const handleSubmitAvis = async (note, commentaire) => {
    if (!user?.id || !garde.gardien_id) return;
    setSubmittingAvis(true);
    try {
      await soumettreAvis(garde.id, user.id, garde.gardien_id, note, commentaire);
      setDejaNoté(true);
      setShowAvis(false);
      Alert.alert('Merci ! 🐾', 'Ton avis a été envoyé.');
      onGardeTerminee?.();
    } catch {
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'avis.');
    } finally {
      setSubmittingAvis(false);
    }
  };

  const handleValider = async (journalId) => {
    await validerJournal(journalId);
    setJournaux(j => j.map(x => x.id === journalId ? { ...x, vu_par_proprio: true } : x));
    await sendLocalNotification({
      title: '👍 Journal validé',
      body: 'Le pawsitter a été notifié de votre validation.',
    });
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.bark} />
    </View>
  );

  const jours_complets = journaux.filter(j => j.repas_done && j.promenade_done).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.bark} />}
    >
      {/* Résumé animaux */}
      <Card style={styles.animalCard}>
        <View style={styles.gardeHeader}>
          <View>
            <Text style={styles.gardeTitle}>Garde en cours</Text>
            <Text style={styles.gardeGardien}>
              Chez {garde.users?.nom} · jusqu'au{' '}
              {new Date(garde.date_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </Text>
          </View>
          <Badge label="En cours" color="ok" />
        </View>

        <View style={styles.animauxRow}>
          {animaux.map(animal => (
            <View key={animal.id} style={styles.animalItem}>
              <View style={styles.animalAvatarWrap}>
                <AnimalAvatar animal={animal} size={64} />
              </View>
              <Text style={styles.animalNom} numberOfLines={1}>{animal.nom ?? 'Animal'}</Text>
              {animal.race ? (
                <Text style={styles.animalRace} numberOfLines={1}>{animal.race}</Text>
              ) : null}
            </View>
          ))}
        </View>
      </Card>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Repas',      val: `${journaux.filter(j=>j.repas_done).length}/${journaux.length}`,     ok: true,  icon: '🍗' },
          { label: 'Promenades', val: `${journaux.filter(j=>j.promenade_done).length}/${journaux.length}`, ok: journaux.every(j=>j.promenade_done), icon: '🌳' },
          { label: 'Complets',   val: `${jours_complets}/${journaux.length}`,                               ok: jours_complets === journaux.length,  icon: '📋' },
        ].map(s => (
          <View key={s.label} style={[styles.statCard, { borderColor: s.ok ? COLORS.okBorder : COLORS.warnBorder, backgroundColor: s.ok ? COLORS.okBg : COLORS.warnBg }]}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={[styles.statVal, { color: s.ok ? COLORS.moss : COLORS.clay }]}>{s.val}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <SectionLabel label="Journal de bord" />

      {journaux.length === 0 && (
        <Card>
          <Text style={styles.empty}>Aucun journal envoyé pour l'instant.</Text>
          <Text style={styles.emptySub}>Le pawsitter enverra le premier journal aujourd'hui.</Text>
        </Card>
      )}

      {journaux.map(j => (
        <JournalCard key={j.id} journal={j} onValider={handleValider} />
      ))}

      {/* Terminer la garde */}
      {garde.statut === 'en_cours' && !dejaNoté && (
        <TouchableOpacity
          style={styles.terminerBtn}
          onPress={handleTerminer}
          disabled={terminant}
          activeOpacity={0.85}
        >
          {terminant
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.terminerText}>✓ Terminer & noter la garde</Text>
          }
        </TouchableOpacity>
      )}

      {dejaNoté && (
        <View style={styles.dejaNotéBox}>
          <Text style={styles.dejaNotéText}>⭐ Avis déjà envoyé — merci !</Text>
        </View>
      )}

      <AvisModal
        visible={showAvis}
        gardienNom={garde.users?.nom}
        onSubmit={handleSubmitAvis}
        submitting={submittingAvis}
      />

      {/* Signalement */}
      <TouchableOpacity style={styles.alertBox} activeOpacity={0.7}
        onPress={() => sendLocalNotification({ title: '⚠️ Signalement envoyé', body: 'Le support PawWatch a été alerté.' })}>
        <Text style={styles.alertIcon}>⚠️</Text>
        <View>
          <Text style={styles.alertTitle}>Signaler un problème</Text>
          <Text style={styles.alertSub}>Contacter le pawsitter ou le support</Text>
        </View>
      </TouchableOpacity>

      {historique.length > 0 && (
        <>
          <SectionLabel label="Gardes passées" />
          {historique.map(h => (
            <Card key={h.id} style={styles.histCard}>
              <View style={styles.histRow}>
                <Text style={styles.histEmoji}>{h.animal?.emoji ?? '🐾'}</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.histNom}>
                    {h.animal?.nom ?? 'Animal'} · {h.gardien?.nom ?? ''}
                  </Text>
                  <Text style={styles.histDates}>
                    {formatDate(h.date_debut)} → {formatDate(h.date_fin)}
                    {h.nb_jours ? ` · ${h.nb_jours} j` : ''}
                    {h.montant  ? ` · ${h.montant} €` : ''}
                  </Text>
                </View>
                <View style={styles.histBadgeWrap}>
                  <Text style={[
                    styles.histBadge,
                    { color: h.statut === 'terminee' ? COLORS.moss : h.statut === 'refusee' ? COLORS.clay : COLORS.ink }
                  ]}>
                    {h.statut === 'terminee' ? '✓ Terminée' : h.statut === 'refusee' ? '✗ Refusée' : '✓ Acceptée'}
                  </Text>
                </View>
              </View>
              {h.paiement_statut === 'paye' && (
                <Text style={styles.histPaye}>💳 Paiement effectué</Text>
              )}
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const ARRIVEE_LABEL = { joyeux: '😄 Joyeux', calme: '😊 Calme', anxieux: '😟 Anxieux', fatigue: '😴 Fatigué' };
const REPAS_LABEL   = { tout: '😋 Tout mangé', moitie: '🙂 La moitié', peu: '😐 Un peu', rien: '😟 Rien' };
const COMPORTEMENT_LABEL = { normal: '😊 Normal', agite: '⚡ Agité', fatigue: '😴 Fatigué', malade: '🤒 Malade' };

const DetailRow = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailIcon}>{icon}</Text>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

function getDetailRows(journal) {
  const rows = [];
  if (journal.humeur_arrivee) rows.push({ icon: '🌅', label: 'Arrivée', value: ARRIVEE_LABEL[journal.humeur_arrivee] ?? journal.humeur_arrivee });
  if (journal.repas_quantite) rows.push({ icon: '🍽', label: 'Repas', value: REPAS_LABEL[journal.repas_quantite] ?? journal.repas_quantite });
  if (journal.repas_eau != null) rows.push({ icon: '💧', label: 'A bu', value: journal.repas_eau ? 'Oui' : 'Non' });
  if (journal.nb_sorties != null) rows.push({ icon: '🚪', label: 'Sorties besoins', value: journal.nb_sorties >= 5 ? '5+' : String(journal.nb_sorties) });
  if (journal.jeux) rows.push({ icon: '🎾', label: 'Jeux', value: journal.type_jeux?.length ? journal.type_jeux.join(', ') : 'Oui' });
  if (journal.calins) rows.push({ icon: '🤗', label: 'Câlins', value: 'Oui' });
  if (journal.a_dormi != null) rows.push({ icon: '😴', label: 'Sieste', value: journal.a_dormi ? (journal.duree_dodo ? `Oui · ${journal.duree_dodo}` : 'Oui') : 'Non' });
  if (journal.comportement) rows.push({ icon: '❤️', label: 'Comportement', value: COMPORTEMENT_LABEL[journal.comportement] ?? journal.comportement });
  return rows;
}

const JournalDetails = ({ rows, noteSante, photosJour }) => (
  <View style={styles.detailsBox}>
    {rows.map(r => <DetailRow key={r.label} {...r} />)}
    {noteSante ? (
      <View style={styles.detailNote}>
        <Text style={styles.detailNoteLabel}>🩺 Observations santé</Text>
        <Text style={styles.detailNoteText}>{noteSante}</Text>
      </View>
    ) : null}
    {photosJour.length > 0 && (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosJourRow}>
        {photosJour.map(p => <Image key={p.id} source={{ uri: p.url }} style={styles.photoJour} />)}
      </ScrollView>
    )}
  </View>
);

const JournalCard = ({ journal, onValider }) => {
  const [showDetails, setShowDetails] = useState(false);
  const photos = journal.photos ?? [];
  const photoPromenade = photos.find(p => p.type === 'promenade');
  const photosJour = photos.filter(p => p.type === 'jour');
  const animalObj = journal.animal ?? null;

  const alertes = [];
  if (journal.comportement === 'malade') alertes.push({ grave: true,  text: '🤒 Semblait malade' });
  if (journal.vomissement)               alertes.push({ grave: true,  text: '🤢 Vomissement ou selles anormales' });
  if (journal.medicament)                alertes.push({ grave: false, text: `💊 Médicament donné${journal.desc_medicament ? ` : ${journal.desc_medicament}` : ''}` });
  if (journal.accident)                  alertes.push({ grave: false, text: '💛 Petit accident en intérieur' });

  const detailRows = getDetailRows(journal);
  const hasDetails = detailRows.length > 0 || !!journal.note_sante || photosJour.length > 0;

  return (
    <Card>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardAvatarWrap}>
          <AnimalAvatar animal={animalObj} size={40} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.cardAnimal}>{journal.animal_nom ?? animalObj?.nom ?? 'Animal'}</Text>
          <Text style={styles.cardDate}>
            {new Date(journal.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </Text>
        </View>
        <Text style={{ fontSize: 24 }}>{journal.humeur ?? '😊'}</Text>
      </View>

      {/* Activités */}
      <View style={styles.activiteRow}>
        {[
          { key: 'repas',     label: 'Repas',     done: journal.repas_done,     heure: journal.repas_heure,     photo: null },
          { key: 'promenade', label: 'Promenade', done: journal.promenade_done, heure: journal.promenade_heure, photo: photoPromenade, duree: journal.promenade_duree },
        ].map(a => (
          <View key={a.key} style={[styles.activiteCard, { backgroundColor: a.done ? COLORS.okBg : COLORS.warnBg, borderColor: a.done ? COLORS.okBorder : COLORS.warnBorder }]}>
            {a.photo?.url
              ? <Image source={{ uri: a.photo.url }} style={styles.activitePhoto} />
              : <Text style={styles.activiteEmoji}>{a.done ? (a.key === 'repas' ? '🍗' : '🌳') : '❓'}</Text>
            }
            <Text style={styles.activiteLabel}>{a.label}</Text>
            <Text style={[styles.activiteStatus, { color: a.done ? COLORS.moss : COLORS.clay }]}>
              {a.done ? `✓ ${a.heure ?? ''}${a.duree ? ` · ${a.duree}` : ''}` : '⏳ En attente'}
            </Text>
          </View>
        ))}
      </View>

      {/* Note */}
      {journal.note ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteText}>{journal.note}</Text>
        </View>
      ) : null}

      {alertes.map(a => (
        <View key={a.text} style={[styles.alerteBox, a.grave ? styles.alerteGrave : styles.alerteInfo]}>
          <Text style={[styles.alerteText, { color: a.grave ? '#991B1B' : '#92400E' }]}>{a.text}</Text>
        </View>
      ))}

      {hasDetails && (
        <>
          <TouchableOpacity onPress={() => setShowDetails(v => !v)} style={styles.detailsToggle} activeOpacity={0.7}>
            <Text style={styles.detailsToggleText}>
              {showDetails ? 'Masquer le détail ▴' : 'Voir le détail de la journée ▾'}
            </Text>
          </TouchableOpacity>
          {showDetails && <JournalDetails rows={detailRows} noteSante={journal.note_sante} photosJour={photosJour} />}
        </>
      )}

      {/* Validation */}
      <View style={styles.cardFooter}>
        <Text style={styles.vuText}>{journal.vu_par_proprio ? '✓ Lu' : 'Non lu'}</Text>
        {!journal.vu_par_proprio
          ? <TouchableOpacity style={styles.validerBtn} onPress={() => onValider(journal.id)}>
              <Text style={styles.validerText}>👍 Valider</Text>
            </TouchableOpacity>
          : <Badge label={journal.repas_done && journal.promenade_done ? '✓ Tout bon' : '⚠ Incomplet'}
                   color={journal.repas_done && journal.promenade_done ? 'ok' : 'warn'} />
        }
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.sand },
  content:   { padding: 16, paddingBottom: 100 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.sand },

  animalCard:    { marginBottom: 14 },
  gardeHeader:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  gardeTitle:    { fontSize: 16, ...FONTS.heavy, color: COLORS.ink, marginBottom: 2 },
  gardeGardien:  { fontSize: 12, color: COLORS.muted },

  animauxRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  animalItem:    { alignItems: 'center', width: 80 },
  animalAvatarWrap: { marginBottom: 6, borderRadius: 36, overflow: 'hidden', borderWidth: 2.5, borderColor: COLORS.bark },
  animalNom:     { fontSize: 13, ...FONTS.heavy, color: COLORS.ink, textAlign: 'center' },
  animalRace:    { fontSize: 11, color: COLORS.muted, textAlign: 'center' },

  cardAvatarWrap: { borderRadius: 22, overflow: 'hidden', borderWidth: 2, borderColor: COLORS.border },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, borderRadius: RADIUS.md,
    padding: 12, alignItems: 'center', borderWidth: 1.5,
    ...SHADOW.card,
  },
  statIcon:  { fontSize: 20 },
  statVal:   { fontSize: 16, ...FONTS.heavy, marginTop: 2 },
  statLabel: { fontSize: 11, color: COLORS.muted, marginTop: 2 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardAnimal: { fontSize: 14, ...FONTS.bold, color: COLORS.ink },
  cardDate:   { fontSize: 12, color: COLORS.muted },

  activiteRow:  { flexDirection: 'row', gap: 10, marginBottom: 12 },
  activiteCard: {
    flex: 1, borderRadius: RADIUS.md, padding: 10,
    borderWidth: 1, alignItems: 'center',
  },
  activitePhoto: { width: '100%', height: 60, borderRadius: RADIUS.sm, marginBottom: 6 },
  activiteEmoji: { fontSize: 22, marginBottom: 4 },
  activiteLabel: { fontSize: 13, ...FONTS.bold, color: COLORS.ink },
  activiteStatus:{ fontSize: 11, marginTop: 2 },

  noteBox:  { backgroundColor: COLORS.sand, borderRadius: RADIUS.sm, padding: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: COLORS.clay },
  noteText: { fontSize: 13, color: COLORS.ink, lineHeight: 20 },

  alerteBox:   { borderRadius: RADIUS.sm, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 8 },
  alerteGrave: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
  alerteInfo:  { backgroundColor: COLORS.warnBg, borderColor: COLORS.warnBorder },
  alerteText:  { fontSize: 13, ...FONTS.bold },

  detailsToggle:     { paddingVertical: 8, marginBottom: 4 },
  detailsToggleText: { fontSize: 13, ...FONTS.bold, color: COLORS.moss },
  detailsBox:  { backgroundColor: COLORS.sand, borderRadius: RADIUS.md, padding: 12, marginBottom: 12, gap: 8 },
  detailRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailIcon:  { fontSize: 15, width: 22, textAlign: 'center' },
  detailLabel: { fontSize: 13, color: COLORS.muted, flex: 1 },
  detailValue: { fontSize: 13, ...FONTS.bold, color: COLORS.ink, flexShrink: 1, textAlign: 'right' },
  detailNote:      { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },
  detailNoteLabel: { fontSize: 12, ...FONTS.bold, color: COLORS.muted, marginBottom: 4 },
  detailNoteText:  { fontSize: 13, color: COLORS.ink, lineHeight: 19 },
  photosJourRow: { gap: 8, paddingTop: 4 },
  photoJour:     { width: 96, height: 96, borderRadius: RADIUS.sm },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vuText:     { fontSize: 12, color: COLORS.muted },
  validerBtn: { backgroundColor: COLORS.moss, borderRadius: RADIUS.full, paddingHorizontal: 16, paddingVertical: 6 },
  validerText:{ fontSize: 13, ...FONTS.medium, color: COLORS.white },

  alertBox: {
    backgroundColor: COLORS.warnBg, borderWidth: 1.5, borderColor: COLORS.warnBorder,
    borderRadius: RADIUS.md, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8,
  },
  alertIcon:  { fontSize: 24 },
  alertTitle: { fontSize: 14, ...FONTS.bold, color: COLORS.bark },
  alertSub:   { fontSize: 12, color: COLORS.muted },

  empty:    { fontSize: 14, ...FONTS.medium, color: COLORS.ink, textAlign: 'center', marginBottom: 4 },
  emptySub: { fontSize: 13, color: COLORS.muted, textAlign: 'center' },

  terminerBtn: {
    backgroundColor: COLORS.moss, borderRadius: RADIUS.md,
    padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 8,
  },
  terminerText: { fontSize: 16, ...FONTS.heavy, color: COLORS.white },

  dejaNotéBox: {
    backgroundColor: COLORS.okBg, borderWidth: 1.5, borderColor: COLORS.okBorder,
    borderRadius: RADIUS.md, padding: 14, alignItems: 'center', marginTop: 8, marginBottom: 8,
  },
  dejaNotéText: { fontSize: 14, ...FONTS.bold, color: COLORS.moss },

  emptyState:  { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  emptyTitle:  { fontSize: 18, color: COLORS.ink, textAlign: 'center', marginTop: 12, ...FONTS.heavy },
  emptySub:    { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  // ── Demandes de garde ──
  demandeCard:   { marginBottom: 10 },
  demandeRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  demandeActions:{ flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  demandeEditBadge:{ backgroundColor: COLORS.warm, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.bark },
  demandeEditText: { fontSize: 12, ...FONTS.bold, color: COLORS.bark },
  demandeDates:  { fontSize: 14, ...FONTS.bold, color: COLORS.ink, marginBottom: 2, textTransform: 'capitalize' },
  demandeAnimal: { fontSize: 13, color: COLORS.muted, marginBottom: 4 },
  demandeMsg:    { fontSize: 12, color: COLORS.ink, fontStyle: 'italic' },
  demandeCancelBtn:  { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.warnBg, alignItems: 'center', justifyContent: 'center' },
  demandeCancelText: { fontSize: 13, color: COLORS.clay, ...FONTS.bold },
  demandeAddBtn: { backgroundColor: COLORS.bark, borderRadius: RADIUS.md, padding: 14, alignItems: 'center', marginTop: 12, marginBottom: 24 },
  demandeAddText:{ fontSize: 14, ...FONTS.heavy, color: COLORS.white },
  demandeVide:       { alignItems: 'center', paddingVertical: 20 },
  demandeVideTitle:  { fontSize: 15, ...FONTS.bold, color: COLORS.ink, marginTop: 10 },
  demandeVideSub:    { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 6, lineHeight: 19 },

  histCard:      { marginBottom: 10 },
  histRow:       { flexDirection: 'row', alignItems: 'center' },
  histEmoji:     { fontSize: 30 },
  histNom:       { fontSize: 14, ...FONTS.bold, color: COLORS.ink, marginBottom: 3 },
  histDates:     { fontSize: 12, color: COLORS.muted },
  histBadgeWrap: { marginLeft: 8 },
  histBadge:     { fontSize: 12, ...FONTS.bold },
  histPaye:      { fontSize: 12, color: COLORS.moss, marginTop: 8, ...FONTS.medium },
});
