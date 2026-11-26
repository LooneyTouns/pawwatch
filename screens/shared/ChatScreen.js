// screens/shared/ChatScreen.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { COLORS, FONTS, RADIUS } from '../../lib/theme';
import { Avatar } from '../../components/UI';
import { supabase, subscribeToMessages, subscribeToReadReceipts, sendMessage as sbSendMessage, markMessagesRead } from '../../lib/supabase';

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const formatDateLabel = (ts) => {
  const d = new Date(ts);
  const diffDays = Math.floor((Date.now() - d) / 86_400_000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};

export default function ChatScreen({ conversation, onBack, onSend, userId }) {
  const [messages,  setMessages]  = useState(
    (conversation?.messages ?? []).map(m => ({ read: false, read_at: null, ...m }))
  );
  const [text,      setText]      = useState('');
  const [connected, setConnected] = useState(false);
  const listRef      = useRef(null);
  const channelRef   = useRef(null);
  const receiptRef   = useRef(null);

  const convId     = conversation?.id;
  const isRealConv = convId && !String(convId).startsWith('conv_');

  // Sync messages when conversation prop changes (e.g. navigating between chats)
  useEffect(() => {
    setMessages((conversation?.messages ?? []).map(m => ({ read: false, read_at: null, ...m })));
  }, [convId]);

  // Supabase Realtime : nouveaux messages
  useEffect(() => {
    if (!isRealConv) return;

    const channel = subscribeToMessages(convId, (newMsg) => {
      const mapped = {
        id:        newMsg.id,
        text:      newMsg.text,
        from:      newMsg.from_id === userId ? 'me' : 'them',
        timestamp: new Date(newMsg.created_at),
        read:      newMsg.read ?? false,
        read_at:   newMsg.read_at ?? null,
      };
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, mapped];
      });
      // Marquer comme lu si c'est un message de l'autre
      if (newMsg.from_id !== userId) {
        markMessagesRead(convId, userId).catch(() => {});
        onSend?.(convId, newMsg.text, 'them');
      }
    });

    channelRef.current = channel;
    setConnected(true);

    return () => {
      supabase.removeChannel(channel);
      setConnected(false);
    };
  }, [convId, isRealConv, userId]);

  // Supabase Realtime : accusés de lecture (UPDATE sur mes messages)
  useEffect(() => {
    if (!isRealConv) return;

    const receipt = subscribeToReadReceipts(convId, (updated) => {
      setMessages(prev => prev.map(m =>
        m.id === updated.id
          ? { ...m, read: true, read_at: updated.read_at }
          : m
      ));
    });

    receiptRef.current = receipt;

    return () => { supabase.removeChannel(receipt); };
  }, [convId, isRealConv]);

  // Marquer les messages reçus comme lus à l'ouverture du chat
  useEffect(() => {
    if (!isRealConv || !userId) return;
    markMessagesRead(convId, userId).catch(() => {});
  }, [convId, isRealConv, userId]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');

    // Optimistic message (temporary id)
    const tmpId = `tmp_${Date.now()}`;
    const optimistic = { id: tmpId, text: trimmed, from: 'me', timestamp: new Date() };
    setMessages(prev => [...prev, optimistic]);

    if (isRealConv && userId) {
      try {
        const saved = await sbSendMessage(convId, userId, trimmed);
        // Swap tmp id for real id to avoid Realtime duplicate
        setMessages(prev => prev.map(m => m.id === tmpId ? { ...m, id: saved.id } : m));
        onSend?.(convId, trimmed, 'me');
      } catch {
        onSend?.(convId, trimmed, 'me');
      }
    } else {
      // Local-only conversation (no Supabase yet)
      onSend?.(convId, trimmed, 'me');
    }
  }, [text, convId, isRealConv, userId]);

  // Trouver l'id du dernier message envoyé par moi (pour la pastille lu/envoyé)
  const lastMyMsgId = [...messages].reverse().find(m => m.from === 'me')?.id ?? null;

  // Build display list with date separators
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

  const initials = (conversation?.partnerName || 'XX').slice(0, 2).toUpperCase();

  return (
    <KeyboardAvoidingView
      style={cs.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={cs.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={cs.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={cs.headerAvatarRing}>
          <Avatar initials={initials} size={34} />
        </View>
        <View style={cs.headerInfo}>
          <Text style={cs.headerName}>{conversation?.partnerName}</Text>
          <Text style={cs.headerSub} numberOfLines={1}>
            {conversation?.partnerSpecialite || 'Pawsitter'}
          </Text>
        </View>
        <View style={cs.headerOnline}>
          <View style={[cs.onlineDot, connected && cs.onlineDotLive]} />
          <Text style={cs.onlineText}>{connected ? 'En ligne' : '…'}</Text>
        </View>
      </View>

      {/* Message list */}
      <FlatList
        ref={listRef}
        data={displayItems}
        keyExtractor={item => item.key || item.id}
        contentContainerStyle={{ padding: 14, paddingBottom: 6 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          if (item.type === 'date') {
            return (
              <View style={cs.dateSep}>
                <Text style={cs.dateLabel}>{item.label}</Text>
              </View>
            );
          }
          const isMe = item.from === 'me';
          const isLast = isMe && item.id === lastMyMsgId;
          const readAt = item.read_at ? formatTime(item.read_at) : null;
          return (
            <View style={[cs.bubbleWrap, isMe ? cs.bubbleWrapMe : cs.bubbleWrapThem]}>
              {!isMe && <Avatar initials={initials} size={26} style={{ marginTop: 2 }} />}
              <View style={cs.bubbleCol}>
                <View style={[cs.bubble, isMe ? cs.bubbleMe : cs.bubbleThem]}>
                  <Text style={[cs.bubbleText, isMe ? cs.bubbleTextMe : cs.bubbleTextThem]}>
                    {item.text}
                  </Text>
                  <Text style={[cs.bubbleTime, isMe ? cs.bubbleTimeMe : cs.bubbleTimeThem]}>
                    {formatTime(item.timestamp)}
                  </Text>
                </View>
                {isLast && (
                  <Text style={cs.receipt}>
                    {readAt ? `✓✓ Lu à ${readAt}` : '✓ Envoyé'}
                  </Text>
                )}
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
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
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

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11, gap: 12,
    backgroundColor: COLORS.ink,
  },
  backIcon:         { fontSize: 22, color: COLORS.white, ...FONTS.bold, marginRight: 2 },
  headerAvatarRing: { borderRadius: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', overflow: 'hidden' },
  headerInfo:       { flex: 1 },
  headerName:       { fontSize: 15, ...FONTS.heavy, color: COLORS.white },
  headerSub:        { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  headerOnline:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: '#94A3B8' },
  onlineDotLive:    { backgroundColor: '#4ADE80' },
  onlineText:       { fontSize: 11, color: 'rgba(255,255,255,0.8)', ...FONTS.medium },

  dateSep:  { alignItems: 'center', marginVertical: 14 },
  dateLabel: {
    fontSize: 11, color: COLORS.muted,
    backgroundColor: 'rgba(0,0,0,0.07)',
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: RADIUS.full,
  },

  bubbleWrap:     { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginVertical: 3 },
  bubbleWrapMe:   { justifyContent: 'flex-end' },
  bubbleWrapThem: { justifyContent: 'flex-start' },

  bubbleCol: { alignItems: 'flex-end', maxWidth: '75%' },

  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  bubbleMe:   { backgroundColor: COLORS.bark, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: COLORS.white, borderBottomLeftRadius: 4 },

  bubbleText:      { fontSize: 14, lineHeight: 20 },
  bubbleTextMe:    { color: COLORS.white },
  bubbleTextThem:  { color: COLORS.ink },

  bubbleTime:     { fontSize: 10, marginTop: 4 },
  bubbleTimeMe:   { color: 'rgba(255,255,255,0.55)', textAlign: 'right' },
  bubbleTimeThem: { color: COLORS.muted },

  receipt: { fontSize: 10, color: COLORS.muted, marginTop: 3, marginRight: 2 },

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
  sendBtn:    { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.bark, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: COLORS.border },
  sendIcon:   { fontSize: 16, color: COLORS.white, marginLeft: 2 },
});
