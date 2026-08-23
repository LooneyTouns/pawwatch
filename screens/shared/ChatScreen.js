// screens/shared/ChatScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, RADIUS } from '../../lib/theme';
import { Avatar } from '../../components/UI';

const AUTO_REPLIES = [
  "Bonjour ! Je serais ravi(e) de garder votre animal 🐾",
  "Bien sûr, je suis disponible à ces dates !",
  "Quelles sont les habitudes de votre compagnon ?",
  "Je propose une visite de présentation gratuite, ça vous convient ?",
  "Parfait ! Je vous envoie mes disponibilités rapidement.",
  "Votre animal a l'air adorable 🥰",
  "Je suis certifié(e) premiers secours animaliers.",
  "On peut se retrouver au parc pour une première rencontre si vous voulez ?",
  "Super, hâte de faire connaissance avec votre compagnon !",
  "D'accord, je note. Merci pour ces informations !",
  "Pas de problème, je m'adapte à ses habitudes 🐕",
];

let replyIndex = 0;

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const formatDateLabel = (ts) => {
  const d = new Date(ts);
  const diffDays = Math.floor((Date.now() - d) / 86_400_000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};

export default function ChatScreen({ conversation, onBack, onSend }) {
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef(null);

  const messages = conversation?.messages || [];

  // Build display list: insert date separators
  const displayItems = [];
  let lastDate = null;
  messages.forEach(msg => {
    const dateKey = new Date(msg.timestamp).toDateString();
    if (dateKey !== lastDate) {
      displayItems.push({ type: 'date', key: `d_${dateKey}`, label: formatDateLabel(msg.timestamp) });
      lastDate = dateKey;
    }
    displayItems.push({ type: 'msg', ...msg });
  });
  if (isTyping) {
    displayItems.push({ type: 'typing', key: 'typing' });
  }

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    onSend(conversation.id, trimmed, 'me');

    // Simulate auto-reply
    setIsTyping(true);
    const delay = 1200 + Math.random() * 1200;
    setTimeout(() => {
      setIsTyping(false);
      const reply = AUTO_REPLIES[replyIndex % AUTO_REPLIES.length];
      replyIndex++;
      onSend(conversation.id, reply, 'them');
    }, delay);
  };

  const initials = (conversation?.partnerName || 'XX').slice(0, 2).toUpperCase();

  return (
    <KeyboardAvoidingView
      style={cs.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <LinearGradient colors={['#7A2D0A', '#D4703A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={cs.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={cs.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={cs.headerAvatarRing}>
          <Avatar initials={initials} size={34} />
        </View>
        <View style={cs.headerInfo}>
          <Text style={cs.headerName}>{conversation?.partnerName}</Text>
          <Text style={cs.headerSub} numberOfLines={1}>
            {conversation?.partnerSpecialite || 'Petsitter'}
          </Text>
        </View>
        <View style={cs.headerOnline}>
          <View style={cs.onlineDot} />
          <Text style={cs.onlineText}>En ligne</Text>
        </View>
      </LinearGradient>

      {/* Message list */}
      <FlatList
        ref={listRef}
        data={displayItems}
        keyExtractor={item => item.key || item.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 6 }}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: true })
        }
        renderItem={({ item }) => {
          if (item.type === 'date') {
            return (
              <View style={cs.dateSep}>
                <Text style={cs.dateLabel}>{item.label}</Text>
              </View>
            );
          }
          if (item.type === 'typing') {
            return (
              <View style={cs.typingRow}>
                <Avatar initials={initials} size={26} />
                <View style={cs.typingBubble}>
                  <Text style={cs.typingDots}>● ● ●</Text>
                </View>
              </View>
            );
          }
          const isMe = item.from === 'me';
          return (
            <View style={[cs.bubbleWrap, isMe ? cs.bubbleWrapMe : cs.bubbleWrapThem]}>
              {!isMe && (
                <Avatar initials={initials} size={26} style={{ marginTop: 2 }} />
              )}
              <View style={[cs.bubble, isMe ? cs.bubbleMe : cs.bubbleThem]}>
                <Text style={[cs.bubbleText, isMe ? cs.bubbleTextMe : cs.bubbleTextThem]}>
                  {item.text}
                </Text>
                <Text style={[cs.bubbleTime, isMe ? cs.bubbleTimeMe : cs.bubbleTimeThem]}>
                  {formatTime(item.timestamp)}
                  {isMe && ' ✓'}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Input bar */}
      <View style={cs.inputBar}>
        <TextInput
          style={cs.input}
          value={text}
          onChangeText={setText}
          placeholder="Votre message..."
          placeholderTextColor={COLORS.muted}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[cs.sendBtn, !text.trim() && cs.sendBtnOff]}
          onPress={handleSend}
          disabled={!text.trim()}
          activeOpacity={0.8}
        >
          <Text style={cs.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const cs = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#EDE8E0' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11, gap: 12,
  },
  backIcon:        { fontSize: 22, color: COLORS.white, ...FONTS.bold, marginRight: 2 },
  headerAvatarRing:{ borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', overflow: 'hidden' },
  headerInfo:      { flex: 1 },
  headerName:      { fontSize: 15, ...FONTS.heavy, color: COLORS.white },
  headerSub:       { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  headerOnline:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80' },
  onlineText:      { fontSize: 11, color: 'rgba(255,255,255,0.8)', ...FONTS.medium },

  // Date separator
  dateSep: { alignItems: 'center', marginVertical: 14 },
  dateLabel: {
    fontSize: 11, color: COLORS.muted,
    backgroundColor: 'rgba(0,0,0,0.07)',
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: RADIUS.full,
  },

  // Bubble wrappers
  bubbleWrap:     { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginVertical: 3 },
  bubbleWrapMe:   { justifyContent: 'flex-end' },
  bubbleWrapThem: { justifyContent: 'flex-start' },

  // Bubbles
  bubble: {
    maxWidth: '75%', paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20,
  },
  bubbleMe:   { backgroundColor: COLORS.bark, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: COLORS.white, borderBottomLeftRadius: 4 },

  bubbleText:      { fontSize: 14, lineHeight: 20 },
  bubbleTextMe:    { color: COLORS.white },
  bubbleTextThem:  { color: COLORS.ink },

  bubbleTime:     { fontSize: 10, marginTop: 4 },
  bubbleTimeMe:   { color: 'rgba(255,255,255,0.55)', textAlign: 'right' },
  bubbleTimeThem: { color: COLORS.muted },

  // Typing indicator
  typingRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 3 },
  typingBubble: {
    backgroundColor: COLORS.white, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  typingDots: { fontSize: 11, color: COLORS.muted, letterSpacing: 4 },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: COLORS.white,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 8, gap: 10,
  },
  input: {
    flex: 1, backgroundColor: COLORS.sand,
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: COLORS.ink, maxHeight: 120,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.bark,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: COLORS.border },
  sendIcon:   { fontSize: 16, color: COLORS.white, marginLeft: 2 },
});
