// components/CalendrierDispo.js
import React, { useState, useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOW } from '../lib/theme';

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MOIS  = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
               'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildGrid(year, month) {
  const first    = new Date(year, month, 1);
  const last     = new Date(year, month + 1, 0);
  const startDow = (first.getDay() + 6) % 7;
  const cells    = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function fillRange(startISO, endISO, todayISO) {
  const a = startISO < endISO ? startISO : endISO;
  const b = startISO < endISO ? endISO   : startISO;
  const dates = [];
  const cur = new Date(a + 'T12:00:00');
  const end = new Date(b + 'T12:00:00');
  while (cur <= end) {
    const iso = toISO(cur);
    if (iso >= todayISO) dates.push(iso);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export default function CalendrierDispo({ selected, onToggle, onAddMany, readonly }) {
  const today    = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => toISO(today), [today]);
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [rangeAnchor, setRangeAnchor] = useState(null);
  const slideX = useRef(new Animated.Value(0)).current;

  const changeMonth = (dir) => {
    Animated.timing(slideX, {
      toValue: dir > 0 ? -340 : 340,
      duration: 170,
      useNativeDriver: true,
    }).start(() => {
      let nm = month + dir;
      let ny = year;
      if (nm < 0)  { nm = 11; ny = year - 1; }
      if (nm > 11) { nm = 0;  ny = year + 1; }
      setMonth(nm);
      setYear(ny);
      slideX.setValue(dir > 0 ? 340 : -340);
      Animated.spring(slideX, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 220,
        mass: 0.8,
      }).start();
    });
  };

  const handleCellPress = (iso) => {
    if (readonly || iso < todayISO) return;
    const isSelected = selected?.has(iso);

    if (rangeAnchor && rangeAnchor !== iso) {
      if (!isSelected) {
        const dates = fillRange(rangeAnchor, iso, todayISO);
        onAddMany?.(dates);
      } else {
        onToggle?.(iso);
      }
      setRangeAnchor(null);
      return;
    }

    onToggle?.(iso);
    setRangeAnchor(!isSelected ? iso : null);
  };

  const cells = useMemo(() => buildGrid(year, month), [year, month]);
  const selectedCount = selected?.size ?? 0;

  return (
    <View style={s.wrap}>
      {/* Navigation mois */}
      <View style={s.nav}>
        <Pressable
          onPress={() => changeMonth(-1)}
          style={({ pressed }) => [s.navBtn, pressed && s.navBtnPressed]}
        >
          <Text style={s.navArrow}>‹</Text>
        </Pressable>
        <Text style={s.navTitle}>{MOIS[month]} {year}</Text>
        <Pressable
          onPress={() => changeMonth(1)}
          style={({ pressed }) => [s.navBtn, pressed && s.navBtnPressed]}
        >
          <Text style={s.navArrow}>›</Text>
        </Pressable>
      </View>

      {/* En-têtes jours */}
      <View style={s.row}>
        {JOURS.map((j, i) => (
          <View key={i} style={s.cell}>
            <Text style={[s.dayHeader, (i === 5 || i === 6) && s.dayHeaderWE]}>{j}</Text>
          </View>
        ))}
      </View>

      {/* Grille avec slide */}
      <Animated.View style={{ transform: [{ translateX: slideX }] }}>
        {Array.from({ length: cells.length / 7 }, (_, w) => (
          <View key={w} style={s.row}>
            {cells.slice(w * 7, w * 7 + 7).map((d, i) => {
              if (!d) return <View key={i} style={s.cell} />;
              const iso      = toISO(d);
              const isPast   = iso < todayISO;
              const isSel    = selected?.has(iso);
              const isToday  = iso === todayISO;
              const isAnchor = iso === rangeAnchor;
              const isWE     = i === 5 || i === 6;
              return (
                <View key={i} style={s.cell}>
                  <Pressable
                    onPress={() => handleCellPress(iso)}
                    disabled={readonly || isPast}
                    style={({ pressed }) => [
                      s.dayCircle,
                      isSel    && s.dayCircleSel,
                      isAnchor && s.dayCircleAnchor,
                      isToday  && !isSel && !isAnchor && s.dayCircleToday,
                      !readonly && !isPast && pressed && s.dayCirclePressed,
                    ]}
                  >
                    <Text style={[
                      s.dayNum,
                      isPast   && s.dayPast,
                      isWE     && !isSel && !isPast && s.dayNumWE,
                      isSel    && s.dayNumSel,
                      isAnchor && s.dayNumSel,
                      isToday  && !isSel && !isAnchor && s.dayNumToday,
                    ]}>
                      {d.getDate()}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </Animated.View>

      {/* Hint plage / légende */}
      {!readonly && (
        <View style={s.legend}>
          {rangeAnchor ? (
            <>
              <View style={[s.legendDot, { backgroundColor: COLORS.bark, opacity: 0.6 }]} />
              <Text style={[s.legendText, { color: COLORS.bark, fontStyle: 'italic' }]}>
                Sélectionne la date de fin de la plage
              </Text>
            </>
          ) : selectedCount > 0 ? (
            <>
              <View style={[s.legendDot, { backgroundColor: COLORS.bark }]} />
              <Text style={s.legendText}>
                {selectedCount} jour{selectedCount > 1 ? 's' : ''} · appuie sur un 2ᵉ jour pour faire une plage
              </Text>
            </>
          ) : null}
        </View>
      )}
    </View>
  );
}

const CELL = 44;

const s = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOW.card,
    overflow: 'hidden',
  },

  nav:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn:       { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: COLORS.sand },
  navBtnPressed:{ backgroundColor: COLORS.border, transform: [{ scale: 0.9 }] },
  navArrow:     { fontSize: 24, color: COLORS.ink, lineHeight: 28 },
  navTitle:     { fontSize: 16, ...FONTS.heavy, color: COLORS.ink },

  row:  { flexDirection: 'row', marginBottom: 2 },
  cell: { flex: 1, height: CELL, alignItems: 'center', justifyContent: 'center' },

  dayCircle:        { width: CELL - 6, height: CELL - 6, borderRadius: (CELL - 6) / 2, alignItems: 'center', justifyContent: 'center' },
  dayCircleSel:     { backgroundColor: COLORS.bark },
  dayCircleAnchor:  { backgroundColor: COLORS.bark, borderWidth: 2.5, borderColor: COLORS.clay },
  dayCircleToday:   { borderWidth: 1.5, borderColor: COLORS.bark },
  dayCirclePressed: { backgroundColor: COLORS.bark + '28', transform: [{ scale: 0.86 }] },

  dayHeader:    { fontSize: 11, ...FONTS.bold, color: COLORS.muted },
  dayHeaderWE:  { color: COLORS.clay },
  dayNum:       { fontSize: 14, ...FONTS.medium, color: COLORS.ink },
  dayPast:      { color: COLORS.border },
  dayNumWE:     { color: COLORS.clay },
  dayNumSel:    { color: COLORS.white, ...FONTS.bold },
  dayNumToday:  { color: COLORS.bark, ...FONTS.bold },

  legend:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: COLORS.muted },
});
