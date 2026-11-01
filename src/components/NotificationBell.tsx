import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, AppState } from 'react-native';
import { IconButton, Badge, Portal, Dialog, Text, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Followup } from '../types';
import { followupLabel } from '../utils/followup';
import CompleteFollowupDialog, { CompleteTarget } from './CompleteFollowupDialog';

interface Summary { overdue: number; due_today: number; upcoming: number }

/** Header bell: every overdue / due-today follow-up in one place. */
export default function NotificationBell({ tint = '#101820' }: { tint?: string }) {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const isAdmin = useAuthStore((s) => s.user?.role === 'super_admin');
  const [summary, setSummary] = useState<Summary>({ overdue: 0, due_today: 0, upcoming: 0 });
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Followup[]>([]);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState<CompleteTarget | null>(null);

  const loadSummary = useCallback(() => {
    api.get('/lead/followups/summary').then((r) => setSummary(r.data)).catch(() => {});
  }, []);

  const loadItems = useCallback(() => {
    setLoading(true);
    api.get('/lead/followups', { params: { state: 'due', per_page: 15 } })
      .then((r) => setItems(r.data.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  // refresh on mount, every minute, and whenever the app comes back to the foreground
  useEffect(() => {
    loadSummary();
    const t = setInterval(loadSummary, 60000);
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') loadSummary(); });
    return () => { clearInterval(t); sub.remove(); };
  }, [loadSummary]);

  const total = summary.overdue + summary.due_today;

  const show = () => { setOpen(true); loadItems(); loadSummary(); };
  const refresh = () => { loadSummary(); loadItems(); };

  return (
    <>
      <View>
        <IconButton icon={total ? 'bell' : 'bell-outline'} iconColor={tint} onPress={show} />
        {total > 0 && <Badge style={styles.badge} size={18}>{total > 99 ? '99+' : total}</Badge>}
      </View>

      <Portal>
        <Dialog visible={open} onDismiss={() => setOpen(false)} style={styles.dialog}>
          <Dialog.Title style={{ fontSize: 18 }}>Needs attention</Dialog.Title>
          <Dialog.Content style={{ paddingHorizontal: 0 }}>
            <View style={styles.chipsRow}>
              {summary.overdue > 0 && <Text style={[styles.pill, { backgroundColor: '#FDECEA', color: '#C0504D' }]}>{summary.overdue} overdue</Text>}
              {summary.due_today > 0 && <Text style={[styles.pill, { backgroundColor: '#FFF4DD', color: '#B07A12' }]}>{summary.due_today} today</Text>}
            </View>
            <ScrollView style={{ maxHeight: 380 }}>
              {loading && items.length === 0 && <ActivityIndicator style={{ margin: 24 }} />}
              {!loading && items.length === 0 && (
                <View style={{ alignItems: 'center', padding: 24 }}>
                  <MaterialCommunityIcons name="check-circle-outline" size={32} color={theme.colors.outline} />
                  <Text style={{ marginTop: 8, fontWeight: '700' }}>You're all caught up</Text>
                  <Text style={{ color: theme.colors.outline, fontSize: 12 }}>No follow-ups are due or overdue.</Text>
                </View>
              )}
              {items.map((f) => {
                const label = followupLabel(f);
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={styles.row}
                    activeOpacity={0.7}
                    onPress={() => { setOpen(false); navigation.navigate('CustomerDetail', { customerId: f.customer_id }); }}
                  >
                    <View style={[styles.bar, { backgroundColor: label.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontWeight: '700', color: theme.colors.onSurface }}>{f.customer?.name}</Text>
                      <Text numberOfLines={1} style={{ fontSize: 12, color: theme.colors.outline }}>
                        {f.customer?.mobile}{isAdmin && f.customer?.executive ? `  ·  ${f.customer.executive.name}` : ''}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: label.color }}>{label.text} · {f.scheduled_for}</Text>
                    </View>
                    <IconButton
                      icon="check"
                      iconColor="#1E8E5A"
                      size={20}
                      onPress={() => { setOpen(false); setComplete({ id: f.id, scheduled_for: f.scheduled_for, customerName: f.customer?.name }); }}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={styles.footer}>
              {summary.upcoming > 0 ? `${summary.upcoming} more scheduled in the next 7 days` : 'Nothing else scheduled this week'}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setOpen(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <CompleteFollowupDialog target={complete} onClose={() => setComplete(null)} onDone={refresh} />
    </>
  );
}

const styles = StyleSheet.create({
  badge: { position: 'absolute', top: 4, right: 4, backgroundColor: '#C0504D' },
  dialog: { maxHeight: '85%' },
  chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginBottom: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, fontSize: 12, fontWeight: '700', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  bar: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginRight: 12 },
  footer: { paddingHorizontal: 24, paddingTop: 10, fontSize: 11, color: '#8A98A6' },
});
