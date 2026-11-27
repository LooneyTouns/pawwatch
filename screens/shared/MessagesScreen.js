// screens/shared/MessagesScreen.js
import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
} from 'react-native';
import { COLORS, FONTS, RADIUS } from '../../lib/theme';
import { Avatar } from '../../components/UI';

export default function MessagesScreen({ conversations = [], onOpenChat }) {
  const totalUnread = conversations.reduce((s, c) => s + (c.unread || 0), 0);

  const formatTime = (ts) => {
    const d = new Date(ts);
    const diffH = (Date.now() - d) / 3_600_000;
    if (diffH < 24) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diffH < 48) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  if (conversations.length === 0) {
    return (
      <View style={ms.wrapper}>
        <View style={ms.empty}>
          <Text style={ms.emptyEmoji}>💬</Text>
          <Text style={ms.emptyTitle}>Aucune conversation</Text>
          <Text style={ms.emptySub}>
            Propose une garde à un pawsitter pour démarrer une conversation.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={ms.wrapper}>
      {totalUnread > 0 && (
        <View style={ms.countBar}>
          <Text style={ms.countText}>{totalUnread} message{totalUnread > 1 ? 's' : ''} non lu{totalUnread > 1 ? 's' : ''}</Text>
        </View>
      )}

      <FlatList
        data={conversations}
        keyExtractor={c => c.id}
        contentContainerStyle={ms.list}
        renderItem={({ item }) => {
          const last = item.messages[item.messages.length - 1];
          const preview = last
            ? (last.from === 'me' ? 'Vous : ' : '') + last.text
            : '• Nouvelle conversation';
          const hasUnread = item.unread > 0;
          return (
            <TouchableOpacity
              style={[ms.row, hasUnread && ms.rowUnread]}
              onPress={() => onOpenChat(item)}
              activeOpacity={0.72}
            >
              <View style={ms.avatarWrap}>
                <Avatar
                  initials={(item.partnerName || 'XX').slice(0, 2).toUpperCase()}
                  size={52}
                />
                {hasUnread && <View style={ms.dot} />}
              </View>
              <View style={ms.rowInfo}>
                <View style={ms.rowTop}>
                  <Text style={[ms.rowName, hasUnread && ms.rowNameBold]}>{item.partnerName}</Text>
                  {last && <Text style={ms.rowTime}>{formatTime(last.timestamp)}</Text>}
                </View>
                {item.partnerSpecialite && (
                  <Text style={ms.rowSpec} numberOfLines={1}>{item.partnerSpecialite}</Text>
                )}
                <View style={ms.rowBottom}>
                  <Text
                    style={[ms.rowPreview, hasUnread && ms.rowPreviewBold]}
                    numberOfLines={1}
                  >
                    {preview}
                  </Text>
                  {hasUnread && (
                    <View style={ms.unreadBadge}>
                      <Text style={ms.unreadText}>{item.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={ms.sep} />}
      />
    </View>
  );
}

const ms = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: COLORS.sand },

  countBar: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: COLORS.warm, borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  countText: { fontSize: 12, ...FONTS.bold, color: COLORS.bark },

  list: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 100 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, ...FONTS.heavy, color: COLORS.ink, marginBottom: 8 },
  emptySub:   { fontSize: 14, color: COLORS.muted, textAlign: 'center', lineHeight: 22 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 14, paddingVertical: 14, gap: 14,
    borderRadius: RADIUS.lg, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  rowUnread: {
    borderColor: COLORS.bark,
    backgroundColor: COLORS.cream,
  },
  avatarWrap: { position: 'relative' },
  dot: {
    position: 'absolute', top: 0, right: 0,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: COLORS.bark, borderWidth: 2, borderColor: COLORS.white,
  },
  rowInfo:        { flex: 1 },
  rowTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowName:        { fontSize: 15, ...FONTS.bold, color: COLORS.ink },
  rowNameBold:    { ...FONTS.heavy },
  rowTime:        { fontSize: 11, color: COLORS.muted },
  rowSpec:        { fontSize: 11, color: COLORS.bark, ...FONTS.medium, marginTop: 2 },
  rowBottom:      { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  rowPreview:     { flex: 1, fontSize: 13, color: COLORS.muted, ...FONTS.medium },
  rowPreviewBold: { ...FONTS.bold, color: COLORS.ink },
  unreadBadge: {
    backgroundColor: COLORS.bark, borderRadius: RADIUS.full,
    minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5, marginLeft: 8,
  },
  unreadText: { fontSize: 11, ...FONTS.bold, color: COLORS.white },
  sep: { height: 0 },
});
