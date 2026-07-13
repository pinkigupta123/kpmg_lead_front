import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const customLightColors = {
  ...MD3LightTheme.colors,
  primary: '#2563EB',
  onPrimary: '#FFFFFF',
  primaryContainer: '#DBEAFE',
  onPrimaryContainer: '#1E40AF',
  secondary: '#475569',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E2E8F0',
  onSecondaryContainer: '#1E293B',
  background: '#F8FAFC',
  onBackground: '#0F172A',
  surface: '#FFFFFF',
  onSurface: '#1E293B',
  surfaceVariant: '#F1F5F9',
  onSurfaceVariant: '#475569',
  outline: '#94A3B8',
  error: '#DC2626',
  onError: '#FFFFFF',
  errorContainer: '#FEE2E2',
  onErrorContainer: '#991B1B',
  success: '#10B981',
  warning: '#F59E0B',
};

export const customDarkColors = {
  ...MD3DarkTheme.colors,
  primary: '#3B82F6',
  onPrimary: '#FFFFFF',
  primaryContainer: '#1E3A8A',
  onPrimaryContainer: '#DBEAFE',
  secondary: '#94A3B8',
  onSecondary: '#0F172A',
  secondaryContainer: '#334155',
  onSecondaryContainer: '#E2E8F0',
  background: '#0F172A',
  onBackground: '#F8FAFC',
  surface: '#1E293B',
  onSurface: '#F1F5F9',
  surfaceVariant: '#334155',
  onSurfaceVariant: '#CBD5E1',
  outline: '#64748B',
  error: '#EF4444',
  onError: '#FFFFFF',
  errorContainer: '#450A0A',
  onErrorContainer: '#FEE2E2',
  success: '#34D399',
  warning: '#FBBF24',
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: customLightColors,
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: customDarkColors,
};
