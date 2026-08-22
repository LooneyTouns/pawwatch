// MapScreen.js — stub web (react-native-maps n'est pas disponible sur web)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../../lib/theme';

export default function MapScreen() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.icon}>🗺️</Text>
      <Text style={styles.title}>Carte disponible sur mobile uniquement</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.sand },
  icon:  { fontSize: 48, marginBottom: 14 },
  title: { fontSize: 15, color: COLORS.muted, ...FONTS.medium },
});
