import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { useThemeStore } from './src/store/themeStore';
import { lightTheme, darkTheme } from './src/theme/colors';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <RootNavigator />
          <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
