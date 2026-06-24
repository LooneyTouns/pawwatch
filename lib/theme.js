// lib/theme.js — PawWatch design tokens

export const COLORS = {
  sand:   '#F2EDE4',
  warm:   '#EAE0D0',
  bark:   '#5C3D2E',
  moss:   '#4A7C59',
  clay:   '#C1714A',
  cream:  '#FDFAF5',
  ink:    '#1C1A17',
  muted:  '#8C7B6B',
  alert:  '#D95F3B',
  border: '#DDD5C8',
  ok:     '#4A7C59',
  okBg:   '#EDF7EF',
  okBorder:'#B8DFC0',
  warnBg: '#FEF0EA',
  warnBorder:'#F5C9B3',
  infoBg: '#E0EAF8',
  white:  '#FFFFFF',
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
    shadowColor: '#5C3D2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
};
