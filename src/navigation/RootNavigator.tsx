import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/authStore';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Import Screens
import LoginScreen from '../screens/LoginScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CustomerListScreen from '../screens/CustomerListScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import AddEditCustomerScreen from '../screens/AddEditCustomerScreen';
import ExecutiveListScreen from '../screens/ExecutiveListScreen';
import AddEditExecutiveScreen from '../screens/AddEditExecutiveScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Navigation Stack Types
export type RootStackParamList = {
  Login: undefined;
  ForceChangePassword: { forceChange: boolean };
  MainTabs: undefined;
  CustomerDetail: { customerId: number };
  AddEditCustomer: { customerId?: number };
  AddEditExecutive: { executiveId?: number };
};

export type TabParamList = {
  Dashboard: undefined;
  Customers: undefined;
  Executives: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Bottom Tab Navigator for Super Admin
function AdminTabNavigator() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof MaterialCommunityIcons.glyphMap = 'help';
          if (route.name === 'Dashboard') iconName = 'view-dashboard';
          else if (route.name === 'Customers') iconName = 'account-multiple';
          else if (route.name === 'Executives') iconName = 'account-tie';
          else if (route.name === 'Profile') iconName = 'account';

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.surfaceVariant,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Customers" component={CustomerListScreen} options={{ title: 'Leads' }} />
      <Tab.Screen name="Executives" component={ExecutiveListScreen} options={{ title: 'Staff' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Bottom Tab Navigator for Sales Executive
function ExecutiveTabNavigator() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof MaterialCommunityIcons.glyphMap = 'help';
          if (route.name === 'Dashboard') iconName = 'view-dashboard';
          else if (route.name === 'Customers') iconName = 'account-multiple';
          else if (route.name === 'Profile') iconName = 'account';

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.surfaceVariant,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Customers" component={CustomerListScreen} options={{ title: 'Leads' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, user } = useAuthStore();
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {!isAuthenticated ? (
        // Unauthenticated Flow
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        // Authenticated Flow
        <>
          <Stack.Screen
            name="MainTabs"
            component={user?.role === 'super_admin' ? AdminTabNavigator : ExecutiveTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ForceChangePassword"
            component={ChangePasswordScreen}
            initialParams={{ forceChange: false }}
            options={{
              headerShown: true,
              title: 'Change Password',
            }}
          />
          <Stack.Screen
            name="CustomerDetail"
            component={CustomerDetailScreen}
            options={{ title: 'Lead Details' }}
          />
          <Stack.Screen
            name="AddEditCustomer"
            component={AddEditCustomerScreen}
            options={({ route }) => ({
              title: route.params?.customerId ? 'Edit Customer' : 'Add Customer',
            })}
          />
          <Stack.Screen
            name="AddEditExecutive"
            component={AddEditExecutiveScreen}
            options={({ route }) => ({
              title: route.params?.executiveId ? 'Edit Executive' : 'Add Executive',
            })}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
