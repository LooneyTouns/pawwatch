// lib/theme.js — PawWatch design tokens

export const COLORS = {
  sand:       '#EEF6FC',
  warm:       '#DAEEF9',
  bark:       '#0EA5E9',
  moss:       '#4A7C59',
  clay:       '#0284C7',
  cream:      '#F7FBFE',
  ink:        '#0C1A2E',
  muted:      '#64748B',
  alert:      '#D95F3B',
  border:     '#BAE0F5',
  ok:         '#4A7C59',
  okBg:       '#EDF7EF',
  okBorder:   '#B8DFC0',
  warnBg:     '#FEF0EA',
  warnBorder: '#F5C9B3',
  infoBg:     '#E0EAF8',
  white:      '#FFFFFF',
};

export const FONTS = {
  regular: { fontFamily: 'System', fontWeight: '400' },
  medium:  { fontFamily: 'System', fontWeight: '600' },
  bold:    { fontFamily: 'System', fontWeight: '700' },
  heavy:   { fontFamily: 'System', fontWeight: '800' },
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const SHADOW = {
  card: {
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
};
