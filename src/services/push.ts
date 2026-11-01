import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const TOKEN_KEY = 'lead-push-token';

// Show reminders even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Ask for notification permission, get this phone's Expo push token and register it with the
 * backend, which sends the daily follow-up reminder to it. Safe to call on every login:
 * it silently does nothing on emulators, in Expo Go (no remote push on Android) or if permission is denied.
 */
export async function registerForPush(): Promise<void> {
  try {
    if (!Device.isDevice) return;

    if (Platform.OS === 'android') {
      // the channel must exist before the permission prompt on Android 13+
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Follow-up reminders',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

    await api.post('/lead/device-token', { token, platform: Platform.OS });
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.log('Push registration skipped:', e);
  }
}

/** Stop reminders on this phone. Call BEFORE clearing the auth token on logout. */
export async function unregisterPush(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return;
    await api.delete('/lead/device-token', { data: { token } });
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.log('Push unregister skipped:', e);
  }
}
