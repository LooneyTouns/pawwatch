// components/DemandeGardeModal.js — formulaire unique de demande de garde
// (demande ouverte à tous les pawsitters, ou demande directe à un pawsitter)
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity, Pressable, TextInput, Image,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { COLORS, FONTS, RADIUS } from '../lib/theme';
import { SERVICE_MAP, getTarifService, getServicesPetsitter, nbUnitesFacturees } from '../lib/services';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MOIS  = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
               'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const ANIMAL_EMOJI = { chien: '🐕', chat: '🐈', lapin: '🐇', rongeur: '🐹', oiseau: '🐦', reptile: '🦎' };

// Dates manipulées en 'YYYY-MM-DD' local : toISOString() décalerait d'un jour en France avant 1-2h du matin.
function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fromISO(iso) { return new Date(iso + 'T12:00:00'); }
function nbJoursEntre(debut, fin) { return Math.round((fromISO(fin) - fromISO(debut)) / 86_400_000) + 1; }
function formatCourt(iso) {
  return fromISO(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function buildGrid(year, month) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const cells = [];
  for (let i = 0; i < (first.getDay() + 6) % 7; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ── Calendrier de période : 1re touche = début, 2e touche = fin ──────
function PeriodeCalendrier({ debut, fin, onChange, dispos }) {
  const todayISO = toISO(new Date());
  const start = debut ? fromISO(debut) : new Date();
  const [year,  setYear]  = useState(start.getFullYear());
  const [month, setMonth] = useState(start.getMonth());
  const cells = useMemo(() => buildGrid(year, month), [year, month]);

  const now = new Date();
  const canGoBack = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());

  const changeMonth = (dir) => {
    let m = month + dir, y = year;
    if (m < 0)  { m = 11; y--; }
    if (m > 11) { m = 0;  y++; }
    setMonth(m); setYear(y);
  };

  const handlePress = (iso) => {
    if (!debut || fin)      onChange(iso, null);
    else if (iso < debut)   onChange(iso, null);
    else                    onChange(debut, iso);
  };

  return (
    <View style={cal.wrap}>
      <View style={cal.nav}>
        <Pressable onPress={() => canGoBack && changeMonth(-1)} style={[cal.navBtn, !canGoBack && { opacity: 0.3 }]} hitSlop={8}>
          <Text style={cal.navArrow}>‹</Text>
        </Pressable>
        <Text style={cal.navTitle}>{MOIS[month]} {year}</Text>
        <Pressable onPress={() => changeMonth(1)} style={cal.navBtn} hitSlop={8}>
          <Text style={cal.navArrow}>›</Text>
        </Pressable>
      </View>

      <View style={cal.row}>
        {JOURS.map((j, i) => (
          <View key={i} style={cal.cell}><Text style={cal.dayHeader}>{j}</Text></View>
        ))}
      </View>

      {Array.from({ length: cells.length / 7 }, (_, w) => (
        <View key={w} style={cal.row}>
          {cells.slice(w * 7, w * 7 + 7).map((d, i) => {
            if (!d) return <View key={i} style={cal.cell} />;
            const iso     = toISO(d);
            const isPast  = iso < todayISO;
            const isStart = iso === debut;
            const isEnd   = iso === fin;
            const inRange = debut && fin && iso > debut && iso < fin;
            const isDispo = dispos?.has(iso);
            return (
              <View key={i} style={[cal.cell, inRange && cal.cellRange, isStart && fin && fin !== debut && cal.cellRangeStart, isEnd && fin !== debut && cal.cellRangeEnd]}>
                <Pressable
                  onPress={() => handlePress(iso)}
                  disabled={isPast}
                  style={[cal.day, (isStart || isEnd) && cal.daySel, iso === todayISO && !isStart && !isEnd && cal.dayToday]}
                >
                  <Text style={[cal.dayNum, isPast && cal.dayPast, (isStart || isEnd) && cal.dayNumSel]}>{d.getDate()}</Text>
                  {isDispo && !isPast && <View style={[cal.dispoDot, (isStart || isEnd) && { backgroundColor: COLORS.white }]} />}
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}

      <Text style={cal.hint}>
        {!debut ? 'Touche le premier jour de la garde'
          : !fin ? 'Touche le dernier jour (ou le même jour pour une seule journée)'
          : 'Touche une date pour recommencer'}
      </Text>
      {dispos?.size > 0 && (
        <View style={cal.legend}>
          <View style={cal.legendDot} />
          <Text style={cal.legendText}>Jours où le pawsitter s'est déclaré disponible</Text>
        </View>
      )}
    </View>
  );
}

const Section = ({ num, titre, children, right }) => (
  <View style={st.section}>
    <View style={st.sectionHead}>
      <View style={st.sectionNum}><Text style={st.sectionNumText}>{num}</Text></View>
      <Text style={st.sectionTitre}>{titre}</Text>
      {right}
    </View>
    {children}
  </View>
);

/**
 * @param mode        'ouverte' (tous les pawsitters compatibles) | 'directe' (un pawsitter précis)
 * @param petsitter   pawsitter ciblé (mode directe) : services, tarifs et disponibilités
 * @param initial     valeurs de départ pour une modification : { animaux, debut, fin, message }
 * @param onSubmit    async ({ animaux, debut, fin, message, service, nbJours, tarif, estimation }) — lever une erreur pour l'afficher
 */
export default function DemandeGardeModal({
  visible, onClose, mode = 'ouverte', titre, sousTitre, mesAnimaux = [], petsitter,
  initial, extraHeader, submitLabel, onSubmit, onDelete,
}) {
  const [animaux, setAnimaux] = useState([]);
  const [debut,   setDebut]   = useState(null);
  const [fin,     setFin]     = useState(null);
  const [service, setService] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState(null);

  const services = useMemo(() => (mode === 'directe' ? getServicesPetsitter(petsitter) : []), [mode, petsitter]);
  const dispos   = useMemo(() => new Set(petsitter?.dispoDates ?? []), [petsitter]);

  useEffect(() => {
    if (!visible) return;
    setDebut(initial?.debut ?? null);
    setFin(initial?.fin ?? null);
    setMessage(initial?.message ?? '');
    setService(services.length === 1 ? services[0] : null);
    setError(null);
    setSending(false);
  }, [visible]);

  // Animaux pré-cochés : ceux de la demande modifiée, sinon tous (y compris si la liste arrive après l'ouverture)
  useEffect(() => {
    if (!visible) return;
    const source = initial?.animaux?.length ? initial.animaux : mesAnimaux;
    const ids = new Set(source.map(a => a.id));
    setAnimaux(mesAnimaux.filter(a => ids.has(a.id)));
  }, [visible, mesAnimaux]);

  const toggleAnimal = (a) => setAnimaux(prev =>
    prev.some(x => x.id === a.id) ? prev.filter(x => x.id !== a.id) : [...prev, a]
  );
  const tousSelectionnes = mesAnimaux.length > 0 && animaux.length === mesAnimaux.length;

  const nbJours = debut && fin ? nbJoursEntre(debut, fin) : 0;
  const tarif   = mode === 'directe' ? (service ? getTarifService(petsitter, service) : petsitter?.tarif ?? null) : null;
  const unite   = service ? SERVICE_MAP[service]?.unit : '/jour';
  const estimation = tarif != null && nbJours > 0 ? tarif * nbUnitesFacturees(service, nbJours) : null;

  const manque =
    mesAnimaux.length > 0 && animaux.length === 0 ? 'Choisis au moins un animal'
    : !debut ? 'Choisis le premier jour'
    : !fin ? 'Choisis le dernier jour'
    : null;

  const handleSubmit = async () => {
    if (manque || sending) return;
    setSending(true);
    setError(null);
    try {
      await onSubmit({ animaux, debut, fin, message: message.trim(), service, nbJours, tarif, estimation });
    } catch (e) {
      setError(e?.message ?? 'Une erreur est survenue. Réessaie.');
      setSending(false);
    }
  };

  let num = 1;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={st.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.sheet}>
          <View style={st.header}>
            <View style={{ flex: 1 }}>
              <Text style={st.titre}>{titre}</Text>
              {sousTitre ? <Text style={st.sousTitre}>{sousTitre}</Text> : null}
            </View>
            <TouchableOpacity onPress={onClose} style={st.closeBtn} hitSlop={10}>
              <Text style={st.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 12 }}>
            {extraHeader}

            {mesAnimaux.length > 0 && (
              <Section
                num={num++}
                titre={mesAnimaux.length > 1 ? 'Quels animaux confier ?' : 'Animal à confier'}
                right={mesAnimaux.length > 1 && (
                  <TouchableOpacity onPress={() => setAnimaux(tousSelectionnes ? [] : mesAnimaux)} hitSlop={8}>
                    <Text style={st.toutLien}>{tousSelectionnes ? 'Tout désélectionner' : 'Tout sélectionner'}</Text>
                  </TouchableOpacity>
                )}
              >
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 2 }}>
                  {mesAnimaux.map(a => {
                    const sel = animaux.some(x => x.id === a.id);
                    const emoji = ANIMAL_EMOJI[(a.type ?? a.espece)?.toLowerCase()] ?? '🐾';
                    return (
                      <TouchableOpacity key={a.id} onPress={() => toggleAnimal(a)} activeOpacity={0.8} style={[st.animalCard, sel && st.animalCardSel]}>
                        <View style={st.animalAvatar}>
                          {a.photo
                            ? <Image source={{ uri: a.photo }} style={st.animalPhoto} />
                            : <Text style={{ fontSize: 28 }}>{emoji}</Text>}
                        </View>
                        <Text style={[st.animalNom, sel && { color: COLORS.ink }]} numberOfLines={1}>{a.nom || 'Animal'}</Text>
                        <View style={[st.check, sel && st.checkSel]}>
                          {sel && <Text style={st.checkMark}>✓</Text>}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </Section>
            )}

            <Section num={num++} titre="Quand ?">
              <PeriodeCalendrier debut={debut} fin={fin} dispos={dispos} onChange={(d, f) => { setDebut(d); setFin(f); }} />
            </Section>

            {services.length > 0 && (
              <Section num={num++} titre="Quel service ?">
                <View style={{ gap: 8 }}>
                  {services.map(id => {
                    const svc = SERVICE_MAP[id];
                    const t   = getTarifService(petsitter, id);
                    const sel = service === id;
                    return (
                      <TouchableOpacity key={id} onPress={() => setService(sel ? null : id)} activeOpacity={0.8} style={[st.serviceRow, sel && st.serviceRowSel]}>
                        <Text style={{ fontSize: 20 }}>{svc.icon}</Text>
                        <Text style={[st.serviceLabel, sel && { color: COLORS.ink }]}>{svc.label}</Text>
                        {t != null && <Text style={[st.serviceTarif, sel && { color: COLORS.bark }]}>{t} €{svc.unit}</Text>}
                        <View style={[st.radio, sel && st.radioSel]}>{sel && <View style={st.radioDot} />}</View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Section>
            )}

            <Section num={num++} titre="Un mot (optionnel)">
              <TextInput
                style={st.msgInput}
                placeholder={mode === 'directe'
                  ? 'Présente ton animal, ses habitudes, tes attentes…'
                  : 'Habitudes de ton animal, précisions sur la garde…'}
                placeholderTextColor={COLORS.muted}
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={300}
              />
            </Section>

            {onDelete && (
              <TouchableOpacity onPress={onDelete} style={st.deleteBtn}>
                <Text style={st.deleteText}>🗑 Annuler cette demande</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={st.footer}>
            {debut && fin && (
              <View style={st.recap}>
                <Text style={st.recapLigne}>
                  📅 {debut === fin ? formatCourt(debut) : `${formatCourt(debut)} → ${formatCourt(fin)}`} · {nbJours} jour{nbJours > 1 ? 's' : ''}
                </Text>
                {animaux.length > 0 && (
                  <Text style={st.recapLigne} numberOfLines={1}>🐾 {animaux.map(a => a.nom).join(', ')}</Text>
                )}
                {estimation != null && (
                  <Text style={st.recapPrix}>≈ {estimation} € <Text style={st.recapPrixSub}>({tarif} €{unite})</Text></Text>
                )}
              </View>
            )}
            {error && <Text style={st.error}>⚠️ {error}</Text>}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!!manque || sending}
              activeOpacity={0.85}
              style={[st.submitBtn, (manque || sending) && st.submitBtnOff]}
            >
              {sending
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={[st.submitText, manque && { color: COLORS.muted }]}>{manque ?? submitLabel}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const CELL = 42;

const cal = StyleSheet.create({
  wrap:      { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: 12 },
  nav:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  navBtn:    { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.sand, alignItems: 'center', justifyContent: 'center' },
  navArrow:  { fontSize: 22, color: COLORS.ink, lineHeight: 26 },
  navTitle:  { fontSize: 15, ...FONTS.heavy, color: COLORS.ink },
  row:       { flexDirection: 'row' },
  cell:      { flex: 1, height: CELL, alignItems: 'center', justifyContent: 'center' },
  cellRange:      { backgroundColor: COLORS.warm },
  cellRangeStart: { backgroundColor: COLORS.warm, borderTopLeftRadius: CELL / 2, borderBottomLeftRadius: CELL / 2 },
  cellRangeEnd:   { backgroundColor: COLORS.warm, borderTopRightRadius: CELL / 2, borderBottomRightRadius: CELL / 2 },
  dayHeader: { fontSize: 11, ...FONTS.bold, color: COLORS.muted },
  day:       { width: CELL - 6, height: CELL - 6, borderRadius: (CELL - 6) / 2, alignItems: 'center', justifyContent: 'center' },
  daySel:    { backgroundColor: COLORS.bark },
  dayToday:  { borderWidth: 1.5, borderColor: COLORS.bark },
  dayNum:    { fontSize: 14, ...FONTS.medium, color: COLORS.ink },
  dayNumSel: { color: COLORS.white, ...FONTS.bold },
  dayPast:   { color: COLORS.border },
  dispoDot:  { position: 'absolute', bottom: 4, width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.ok },
  hint:      { fontSize: 12, color: COLORS.muted, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
  legend:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 },
  legendDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.ok },
  legendText:{ fontSize: 11, color: COLORS.muted },
});

const st = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: COLORS.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: SCREEN_HEIGHT * 0.92, paddingTop: 20 },
  header:    { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 12 },
  titre:     { fontSize: 20, ...FONTS.heavy, color: COLORS.ink },
  sousTitre: { fontSize: 13, color: COLORS.muted, marginTop: 3 },
  closeBtn:  { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.sand, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  closeText: { fontSize: 14, color: COLORS.ink, ...FONTS.bold },

  section:       { paddingHorizontal: 20, marginBottom: 20 },
  sectionHead:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionNum:    { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.ink, alignItems: 'center', justifyContent: 'center' },
  sectionNumText:{ fontSize: 12, ...FONTS.heavy, color: COLORS.white },
  sectionTitre:  { flex: 1, fontSize: 15, ...FONTS.heavy, color: COLORS.ink },
  toutLien:      { fontSize: 13, ...FONTS.bold, color: COLORS.moss },

  animalCard:    { width: 92, alignItems: 'center', padding: 10, borderRadius: RADIUS.lg, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.white },
  animalCardSel: { borderColor: COLORS.bark, backgroundColor: COLORS.warm },
  animalAvatar:  { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.sand, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 6 },
  animalPhoto:   { width: 54, height: 54 },
  animalNom:     { fontSize: 13, ...FONTS.bold, color: COLORS.muted, maxWidth: 76 },
  check:         { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  checkSel:      { backgroundColor: COLORS.bark, borderColor: COLORS.bark },
  checkMark:     { color: COLORS.white, fontSize: 12, ...FONTS.heavy },

  serviceRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white },
  serviceRowSel: { borderColor: COLORS.bark, backgroundColor: COLORS.warm },
  serviceLabel:  { flex: 1, fontSize: 14, ...FONTS.medium, color: COLORS.muted },
  serviceTarif:  { fontSize: 13, ...FONTS.bold, color: COLORS.muted },
  radio:         { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  radioSel:      { borderColor: COLORS.bark },
  radioDot:      { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.bark },

  msgInput:  { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, fontSize: 14, color: COLORS.ink, minHeight: 80, textAlignVertical: 'top' },

  deleteBtn:  { alignItems: 'center', padding: 12, marginHorizontal: 20 },
  deleteText: { fontSize: 14, ...FONTS.bold, color: COLORS.alert },

  footer:       { borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 34 : 18, backgroundColor: COLORS.cream },
  recap:        { marginBottom: 10, gap: 2 },
  recapLigne:   { fontSize: 13, color: COLORS.ink, ...FONTS.medium },
  recapPrix:    { fontSize: 16, ...FONTS.heavy, color: COLORS.bark, marginTop: 2 },
  recapPrixSub: { fontSize: 12, ...FONTS.medium, color: COLORS.muted },
  error:        { fontSize: 13, color: COLORS.alert, marginBottom: 8 },
  submitBtn:    { backgroundColor: COLORS.bark, borderRadius: RADIUS.md, paddingVertical: 15, alignItems: 'center' },
  submitBtnOff: { backgroundColor: COLORS.border },
  submitText:   { fontSize: 16, ...FONTS.heavy, color: COLORS.white },
});
