// lib/theme.js — PawWatch design tokens

export const COLORS = {
  sand:       '#FDF6EE',
  warm:       '#F2E4D0',
  bark:       '#A0714F',
  moss:       '#6B8F5E',
  clay:       '#7A4F2E',
  cream:      '#FEFCF8',
  ink:        '#2C1A0E',
  muted:      '#8C7B6B',
  alert:      '#D95F3B',
  border:     '#E8D4BC',
  ok:         '#6B8F5E',
  okBg:       '#EDF7EF',
  okBorder:   '#B8DFC0',
  warnBg:     '#FEF0EA',
  warnBorder: '#F5C9B3',
  infoBg:     '#F5EDE0',
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
    shadowColor: '#A0714F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
};
