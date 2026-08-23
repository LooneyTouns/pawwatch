// lib/theme.js — PawWatch design tokens

export const COLORS = {
  sand:       '#FAF7F3',
  warm:       '#F5E8DC',
  bark:       '#D4703A',
  moss:       '#6B8F5E',
  clay:       '#A84F22',
  cream:      '#FEFCFA',
  ink:        '#1F1209',
  muted:      '#9B7B6A',
  alert:      '#D95F3B',
  border:     '#EDD5C5',
  ok:         '#6B8F5E',
  okBg:       '#EDF7EF',
  okBorder:   '#B8DFC0',
  warnBg:     '#FEF0EA',
  warnBorder: '#F5C9B3',
  infoBg:     '#FDF0E6',
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
    shadowColor: '#D4703A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
};
