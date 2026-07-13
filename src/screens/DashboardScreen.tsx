import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { DashboardStats, Customer } from '../types';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = any;

// Single accent palette — no rainbow, just navy + grays
const ADMIN_STATS = (s: DashboardStats | null) => [
  { label: 'Total Leads', value: s?.total_customers ?? 0, icon: 'account-multiple' },
  { label: 'Total Staff', value: s?.total_executives ?? 0, icon: 'account-tie' },
  { label: "Today's Leads", value: s?.added_today ?? 0, icon: 'calendar-today' },
  { label: 'This Month', value: s?.added_this_month ?? 0, icon: 'calendar-month' },
];
const EXEC_STATS = (s: DashboardStats | null) => [
  { label: "Today's Leads", value: s?.added_today ?? 0, icon: 'calendar-today' },
  { label: 'This Month', value: s?.added_this_month ?? 0, icon: 'calendar-month' },
  { label: 'Pending Followups', value: s?.pending_followups ?? 0, icon: 'clock-alert-outline' },
];

const STATUS_PILL: Record<string, { bg: string; tc: string }> = {
  new: { bg: '#EFF6FF', tc: '#1E40AF' },
  contacted: { bg: '#F0F9FF', tc: '#075985' },
  'follow-up': { bg: '#FFFBEB', tc: '#92400E' },
  interested: { bg: '#F5F3FF', tc: '#5B21B6' },
  purchased: { bg: '#F0FDF4', tc: '#166534' },
  closed: { bg: '#F8FAFC', tc: '#475569' },
};

export default function DashboardScreen({ navigation }: Props) {
  const theme = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const r = await api.get('/dashboard-stats');
      setStats(r.data);
    } catch (e) { console.log('Dashboard err:', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchStats(); }, [fetchStats]);

  const isAdmin = user?.role === 'super_admin';
  const statList = isAdmin ? ADMIN_STATS(stats) : EXEC_STATS(stats);
  const initials = (n?: string) => (n ?? 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  if (loading) return (
    <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color="" />
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#03307e']} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{initials(user?.name)}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerGreet}>Hello, {user?.name}</Text>
          <Text style={styles.headerRole}>
            {isAdmin ? 'System Administrator' : `${user?.designation || 'Sales Executive'}${user?.branch ? '  ·  ' + user.branch : ''}`}
          </Text>
        </View>
      </View>

      <View style={styles.body}>

        {/* ── Stats ── */}
        <Text style={[styles.section, { color: theme.colors.onSurface }]}>Overview</Text>
        <View style={styles.statsRow}>
          {statList.map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <MaterialCommunityIcons name={s.icon as any} size={22} color="" style={{ marginBottom: 8 }} />
              <Text style={[styles.statNum, { color: theme.colors.onSurface }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Quick Actions ── */}
        <Text style={[styles.section, { color: theme.colors.onSurface }]}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          {isAdmin ? (
            <>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => (navigation as any).navigate('AddEditExecutive', {})}>
                <MaterialCommunityIcons name="account-plus" size={18} color="#fff" />
                <Text style={styles.btnPrimaryText}>Add Staff</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnOutline} onPress={() => navigation.navigate('MainTabs', { screen: 'Customers' } as any)}>
                <MaterialCommunityIcons name="account-multiple" size={18} color="" />
                <Text style={styles.btnOutlineText}>View Leads</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={[styles.btnPrimary, { flex: 1 }]} onPress={() => (navigation as any).navigate('AddEditCustomer', {})}>
              <MaterialCommunityIcons name="account-plus" size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>Add Customer Lead</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Upcoming follow-ups (exec) ── */}
        {!isAdmin && (stats?.upcoming_followups ?? []).length > 0 && (
          <>
            <Text style={[styles.section, { color: theme.colors.onSurface }]}>Upcoming Follow-ups</Text>
            {(stats?.upcoming_followups ?? []).map(c => (
              <CustomerRow key={c.id} customer={c} theme={theme} onPress={() => navigation.navigate('CustomerDetail', { customerId: c.id })} />
            ))}
          </>
        )}

        {/* ── Recent Leads ── */}
        <Text style={[styles.section, { color: theme.colors.onSurface }]}>Recent Leads</Text>
        {(stats?.recent_customers ?? []).length > 0 ? (
          stats!.recent_customers.map(c => (
            <CustomerRow key={c.id} customer={c} theme={theme} onPress={() => navigation.navigate('CustomerDetail', { customerId: c.id })} />
          ))
        ) : (
          <View style={[styles.empty, { borderColor: theme.colors.outline + '30' }]}>
            <MaterialCommunityIcons name="inbox-outline" size={28} color={theme.colors.outline} />
            <Text style={{ color: theme.colors.outline, marginTop: 6, fontSize: 13 }}>No leads yet</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function CustomerRow({ customer, theme, onPress }: { customer: Customer; theme: any; onPress: () => void }) {
  const sc = STATUS_PILL[customer.status] ?? { bg: '#F8FAFC', tc: '#475569' };
  const initials = (customer.name ?? '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <TouchableOpacity style={[styles.row, { backgroundColor: theme.colors.surface }]} onPress={onPress} activeOpacity={0.72}>
      <View style={[styles.rowAvatar, { backgroundColor: '#EFF6FF' }]}>
        <Text style={styles.rowAvatarText}>{initials}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.rowName, { color: theme.colors.onSurface }]}>{customer.name}</Text>
        <Text style={[styles.rowMeta, { color: theme.colors.onSurfaceVariant }]}>
          {customer.mobile}  ·  {customer.interested_product || 'Laptop Service'}
        </Text>
      </View>
      <View style={[styles.pill, { backgroundColor: sc.bg }]}>
        <Text style={[styles.pillText, { color: sc.tc }]}>{customer.status.toUpperCase()}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.outline} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#03307e',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24,
  },
  headerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerAvatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  headerGreet: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerRole: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },

  /* Body */
  body: { padding: 16 },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 6 },

  /* Stats */
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: {
    borderRadius: 12, padding: 14, minWidth: '47%', flex: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  statNum: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 2 },
  statLabel: { fontSize: 12 },

  /* Actions */
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  btnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#03307e', borderRadius: 10, paddingVertical: 12,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 10, paddingVertical: 12,
    borderWidth: 1.5, borderColor: '#03307e', backgroundColor: '#fff',
  },
  btnOutlineText: { color: '#03307e', fontWeight: '700', fontSize: 14 },

  /* Rows */
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  rowAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  rowAvatarText: { color: '', fontWeight: '700', fontSize: 14 },
  rowName: { fontSize: 14, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  pill: { borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  pillText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  empty: {
    borderWidth: 1, borderStyle: 'dashed', borderRadius: 12,
    alignItems: 'center', paddingVertical: 28, marginBottom: 12,
  },
});
