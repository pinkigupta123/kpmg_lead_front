import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

/** HP-inspired brand tokens: signature HP blue on cool neutrals with charcoal chrome. */
export const brand = {
  primary: '#0086C3',     // HP blue (buttons, links, active states)
  primaryDark: '#00638F', // pressed / text on tint
  primaryTint: '#E6F4FB', // soft backgrounds
  charcoal: '#101820',    // headers / chrome
  ink: '#1B2733',
  muted: '#5B6B7A',
  line: '#E3E8EE',
  canvas: '#F4F6F8',
};

export const customLightColors = {
  ...MD3LightTheme.colors,
  primary: brand.primary,
  onPrimary: '#FFFFFF',
  primaryContainer: brand.primaryTint,
  onPrimaryContainer: brand.primaryDark,
  secondary: brand.muted,
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E8EDF2',
  onSecondaryContainer: brand.ink,
  background: brand.canvas,
  onBackground: brand.charcoal,
  surface: '#FFFFFF',
  onSurface: brand.ink,
  surfaceVariant: '#EEF2F6',
  onSurfaceVariant: brand.muted,
  outline: '#8A98A6',
  outlineVariant: brand.line,
  error: '#D32F2F',
  onError: '#FFFFFF',
  errorContainer: '#FDECEA',
  onErrorContainer: '#8E1B1B',
  success: '#1E8E5A',
  warning: '#E08A00',
};

export const customDarkColors = {
  ...MD3DarkTheme.colors,
  primary: '#33A9DD',
  onPrimary: '#06222F',
  primaryContainer: '#00496B',
  onPrimaryContainer: '#CDEBF8',
  secondary: '#9AA9B8',
  onSecondary: '#101820',
  secondaryContainer: '#2A3745',
  onSecondaryContainer: '#E3E8EE',
  background: '#0B1218',
  onBackground: '#F1F4F7',
  surface: '#141E27',
  onSurface: '#E8EDF2',
  surfaceVariant: '#223040',
  onSurfaceVariant: '#B4C0CC',
  outline: '#6B7C8C',
  outlineVariant: '#2A3745',
  error: '#EF5350',
  onError: '#FFFFFF',
  errorContainer: '#3F1414',
  onErrorContainer: '#FDECEA',
  success: '#43C28A',
  warning: '#F2B13A',
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: customLightColors,
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: customDarkColors,
};
