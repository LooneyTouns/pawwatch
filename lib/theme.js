// lib/theme.js — PawWatch design tokens

export const COLORS = {
  sand:       '#FAF8F4',  // fond principal (neutre chaud)
  warm:       '#FFF4E6',  // fond amber léger
  bark:       '#E8922A',  // amber primaire (le P du logo)
  moss:       '#4B8FCC',  // bleu secondaire (le W du logo)
  clay:       '#C4741A',  // amber foncé (pressé / accentué)
  cream:      '#FFFCF8',  // blanc cassé
  ink:        '#1A2756',  // navy (contours du logo)
  muted:      '#7A8FA0',  // bleu-gris neutre
  alert:      '#D95F3B',  // rouge-orange erreur
  border:     '#E8D9C4',  // bordure sable
  ok:         '#3E9B6A',  // vert succès
  okBg:       '#EDF7F0',
  okBorder:   '#A8D8BB',
  warnBg:     '#FFF4E6',  // fond amber warn
  warnBorder: '#F5C890',  // bordure amber
  infoBg:     '#EBF3FC',  // fond bleu info
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
    shadowColor: '#1A2756',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
};
