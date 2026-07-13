import React from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Switch, useTheme, Divider } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import api from '../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = any;

export default function ProfileScreen({ navigation }: Props) {
  const theme = useTheme();
  const { user, clearAuth } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/logout').catch(() => { });
            } finally {
              clearAuth();
            }
          },
        },
      ]
    );
  };

  const initials = (name?: string) =>
    (name ?? 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── Hero Header ─────────────────────────────────────────────────── */}
      <View style={styles.hero}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials(user?.name)}</Text>
        </View>
        <Text style={styles.heroName}>{user?.name}</Text>
        <Text style={styles.heroRole}>
          {user?.role === 'super_admin' ? 'System Administrator' : user?.designation || 'Sales Executive'}
        </Text>
        {user?.branch ? (
          <View style={styles.heroBranchPill}>
            <MaterialCommunityIcons name="store-outline" size={13} color="#93C5FD" />
            <Text style={styles.heroBranchText}>{user.branch}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        {/* ─── Info Card ───────────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>Account Information</Text>

          <InfoRow icon="badge-account" label="Employee ID" value={user?.employee_id ?? '—'} theme={theme} />
          <Divider style={styles.divider} />
          <InfoRow icon="phone-outline" label="Mobile Number" value={user?.mobile ?? '—'} theme={theme} />
          <Divider style={styles.divider} />
          <InfoRow icon="store-outline" label="Branch / Location" value={user?.branch || 'Main Headquarters'} theme={theme} />
        </View>

        {/* ─── Settings Card ───────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, marginTop: 14 }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>App Settings</Text>

          {/* Dark Mode toggle */}
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: '#F3F4F6' }]}>
              <MaterialCommunityIcons name="theme-light-dark" size={20} color="#374151" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.settingLabel, { color: theme.colors.onSurface }]}>Dark Mode</Text>
              <Text style={[styles.settingDesc, { color: theme.colors.onSurfaceVariant }]}>Toggle light / dark theme</Text>
            </View>
            <Switch value={isDarkMode} onValueChange={toggleDarkMode} color="#1A56DB" />
          </View>

          {/* Change password — super_admin only */}
          {user?.role === 'super_admin' && (
            <>
              <Divider style={styles.divider} />
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => navigation.navigate('ForceChangePassword', { forceChange: false })}
              >
                <View style={[styles.settingIcon, { backgroundColor: '#EFF6FF' }]}>
                  <MaterialCommunityIcons name="lock-reset" size={20} color="#1A56DB" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.settingLabel, { color: theme.colors.onSurface }]}>Change Password</Text>
                  <Text style={[styles.settingDesc, { color: theme.colors.onSurfaceVariant }]}>Update security credentials</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.outline} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ─── Sign Out ────────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="#FFFFFF" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>KPMG Lead Manager · v1.0</Text>
      </View>
    </ScrollView>
  );
}

function InfoRow({
  icon, label, value, theme,
}: { icon: string; label: string; value: string; theme: any }) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon as any} size={18} color={theme.colors.primary} style={{ marginRight: 10, marginTop: 1 }} />
      <View>
        <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Hero */
  hero: {
    backgroundColor: '#03307e',
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 36,
    paddingHorizontal: 24,
  },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FFFFFF22',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2, borderColor: '#FFFFFF44',
  },
  avatarText: { color: '#FFFFFF', fontSize: 28, fontWeight: '800' },
  heroName: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  heroRole: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4, textAlign: 'center' },
  heroBranchPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFFFF15', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, marginTop: 10,
  },
  heroBranchText: { color: '#93C5FD', fontSize: 12 },

  /* Body */
  body: { padding: 16 },

  /* Card */
  card: {
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14 },

  divider: { marginVertical: 2, marginHorizontal: 0 },

  /* Info rows */
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  infoLabel: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 1 },

  /* Settings rows */
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  settingIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingLabel: { fontSize: 14, fontWeight: '600' },
  settingDesc: { fontSize: 12, marginTop: 1 },

  /* Sign out */
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#B91C1C',
    borderRadius: 10, paddingVertical: 13,
    marginTop: 20, marginBottom: 8,
    shadowColor: '#B91C1C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4, elevation: 3,
  },
  signOutText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  footer: { textAlign: 'center', color: '#9CA3AF', fontSize: 11, marginBottom: 24, marginTop: 4 },
});
