import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useThemeStore } from './src/store/themeStore';
import { useAuthStore } from './src/store/authStore';
import { lightTheme, darkTheme } from './src/theme/colors';
import RootNavigator from './src/navigation/RootNavigator';
import { registerForPush } from './src/services/push';

const navigationRef = createNavigationContainerRef<any>();

export default function App() {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const theme = isDarkMode ? darkTheme : lightTheme;

  // Register this phone for the daily follow-up reminder once the user is signed in.
  useEffect(() => {
    if (isAuthenticated) registerForPush();
  }, [isAuthenticated]);

  // Tapping a reminder opens the dashboard.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      if (navigationRef.isReady()) navigationRef.navigate('MainTabs', { screen: 'Dashboard' });
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer ref={navigationRef}>
          <RootNavigator />
          <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
