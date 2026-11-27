// components/AddressAutocomplete.js
// Autocomplétion d'adresse via la Base Adresse Nationale (api-adresse.data.gouv.fr) —
// service public gratuit, sans clé API, optimisé pour les adresses françaises.
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS, RADIUS } from '../lib/theme';

const BAN_URL  = 'https://api-adresse.data.gouv.fr/search/';
const DEBOUNCE = 300;
const MIN_LEN  = 3;

// GeoJSON feature BAN → forme normalisée
function normalize(feature) {
  const p = feature.properties ?? {};
  const [lon, lat] = feature.geometry?.coordinates ?? [];
  return {
    id:         p.id,
    label:      p.label ?? '',                       // "8 Boulevard du Port 80000 Amiens"
    name:       p.name ?? p.label ?? '',             // "8 Boulevard du Port"
    postcode:   p.postcode ?? '',
    city:       p.city ?? '',
    context:    p.context ?? '',                     // "80, Somme, Hauts-de-France"
    latitude:   typeof lat === 'number' ? lat : null,
    longitude:  typeof lon === 'number' ? lon : null,
  };
}

export default function AddressAutocomplete({
  value,
  onChangeText,
  onSelect,
  placeholder = '12 rue des Lilas, Paris…',
  style,
  inputStyle,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [focused,     setFocused]     = useState(false);
  const timer  = useRef(null);
  const lastQ  = useRef('');

  const search = useCallback(async (q) => {
    const query = q.trim();
    if (query.length < MIN_LEN) { setSuggestions([]); return; }
    lastQ.current = query;
    setLoading(true);
    try {
      const url = `${BAN_URL}?q=${encodeURIComponent(query)}&limit=5&autocomplete=1`;
      const res  = await fetch(url);
      const data = await res.json();
      // Ignore les réponses obsolètes (l'utilisateur a continué à taper)
      if (lastQ.current !== query) return;
      setSuggestions(Array.isArray(data?.features) ? data.features.map(normalize) : []);
    } catch {
      setSuggestions([]);
    } finally {
      if (lastQ.current === query) setLoading(false);
    }
  }, []);

  const handleChange = useCallback((text) => {
    onChangeText(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(text), DEBOUNCE);
  }, [onChangeText, search]);

  const handleSelect = useCallback((item) => {
    onChangeText(item.label);
    setSuggestions([]);
    onSelect?.({
      adresse:    item.label,
      ville:      item.city,
      codePostal: item.postcode,
      latitude:   item.latitude,
      longitude:  item.longitude,
    });
  }, [onChangeText, onSelect]);

  const showList = focused && suggestions.length > 0;

  return (
    <View style={[s.container, style]}>
      <View style={[s.inputWrap, focused && s.inputWrapFocused]}>
        <TextInput
          style={[s.input, inputStyle]}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={COLORS.border}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          autoCorrect={false}
          autoComplete="street-address"
          autoCapitalize="none"
          returnKeyType="search"
        />
        {loading && <ActivityIndicator size="small" color={COLORS.bark} style={s.spinner} />}
      </View>

      {showList && (
        <View style={s.list}>
          {suggestions.map((item, i) => (
            <TouchableOpacity
              key={item.id ?? i}
              style={[s.item, i < suggestions.length - 1 && s.itemBorder]}
              onPress={() => handleSelect(item)}
              activeOpacity={0.75}
            >
              <Text style={s.itemMain} numberOfLines={1}>📍 {item.name}</Text>
              <Text style={s.itemSub} numberOfLines={1}>
                {[item.postcode, item.city].filter(Boolean).join(' ')}
                {item.context ? ` · ${item.context}` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:       { position: 'relative', zIndex: 100 },
  inputWrap:       { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md },
  inputWrapFocused:{ borderColor: COLORS.bark },
  input:           { flex: 1, padding: 12, fontSize: 15, color: COLORS.ink },
  spinner:         { marginRight: 12 },
  list: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5, borderColor: COLORS.bark,
    borderRadius: RADIUS.md,
    marginTop: 4,
    overflow: 'hidden',
  },
  item:       { paddingHorizontal: 14, paddingVertical: 12 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  itemMain:   { fontSize: 14, ...FONTS.medium, color: COLORS.ink },
  itemSub:    { fontSize: 12, color: COLORS.muted, marginTop: 2 },
});
