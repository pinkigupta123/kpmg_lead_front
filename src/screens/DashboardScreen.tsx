import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator, Menu } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { Customer, User } from '../types';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = any;

const STATUSES = ['new', 'contacted', 'follow-up', 'interested', 'purchased', 'closed'] as const;

const STATUS_PILL: Record<string, { bg: string; tc: string }> = {
  new: { bg: '#E6F4FB', tc: '#00638F' },
  contacted: { bg: '#E6F4FB', tc: '#00638F' },
  'follow-up': { bg: '#FFFBEB', tc: '#92400E' },
  interested: { bg: '#F5F3FF', tc: '#5B21B6' },
  purchased: { bg: '#F0FDF4', tc: '#166534' },
  closed: { bg: '#F8FAFC', tc: '#475569' },
};
const STATUS_BAR: Record<string, string> = {
  new: '#0086C3', contacted: '#3B82A0', 'follow-up': '#D99A2B', interested: '#7C5CBF', purchased: '#1E8E5A', closed: '#8A98A6',
};

type Period = 'today' | '7d' | '30d' | 'month' | 'all';
const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
];

const DAY = 86400000;
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const closedStatus = (s: string) => s === 'purchased' || s === 'closed';

function periodStart(p: Period): Date | null {
  const today = startOfDay(new Date());
  if (p === 'today') return today;
  if (p === '7d') return addDays(today, -6);
  if (p === '30d') return addDays(today, -29);
  if (p === 'month') return new Date(today.getFullYear(), today.getMonth(), 1);
  return null;
}

/** The API paginates — fetch every page. */
async function fetchAllLeads(): Promise<Customer[]> {
  const all: Customer[] = [];
  let page = 1;
  let last = 1;
  do {
    const r = await api.get('/lead/customers', { params: { page, per_page: 500, sort: 'desc' } });
    all.push(...(r.data.data as Customer[]));
    last = r.data.last_page ?? r.data.meta?.last_page ?? 1;
    page += 1;
  } while (page <= last && page < 50);
  return all;
}

export default function DashboardScreen({ navigation }: Props) {
  const theme = useTheme();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'super_admin';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leads, setLeads] = useState<Customer[]>([]);
  const [execs, setExecs] = useState<User[]>([]);
  const [branchNames, setBranchNames] = useState<string[]>([]);

  const [branch, setBranch] = useState('all');
  const [exec, setExec] = useState('all');
  const [status, setStatus] = useState('all');
  const [period, setPeriod] = useState<Period>('30d');

  const load = useCallback(async () => {
    try {
      setLeads(await fetchAllLeads());
      if (isAdmin) {
        api.get('/lead/executives').then((r) => {
          const l = r.data?.data || r.data;
          setExecs(Array.isArray(l) ? l : []);
        }).catch(() => {});
        api.get('/branches').then((r) => {
          let l: any = r.data;
          while (l && !Array.isArray(l) && l.data) l = l.data;
          setBranchNames((Array.isArray(l) ? l : []).map((b: any) => b?.name).filter(Boolean));
        }).catch(() => {});
      }
    } catch (e) {
      console.log('Dashboard err:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const branchOf = (c: Customer) => c.executive?.branch || 'Unassigned';

  const branches = useMemo(() => {
    const set = new Set<string>(branchNames);
    execs.forEach((e) => e.branch && set.add(e.branch));
    leads.forEach((l) => set.add(branchOf(l)));
    return [...set].sort();
  }, [branchNames, execs, leads]);

  const execOptions = useMemo(() => {
    const map = new Map<number, User>();
    execs.forEach((e) => map.set(e.id, e));
    leads.forEach((l) => l.executive && !map.has(l.executive.id) && map.set(l.executive.id, l.executive));
    return [...map.values()].filter((e) => branch === 'all' || e.branch === branch).sort((a, b) => a.name.localeCompare(b.name));
  }, [execs, leads, branch]);

  // leads in scope (branch / executive / status) — ignoring the period
  const scoped = useMemo(
    () => leads.filter((l) =>
      (branch === 'all' || branchOf(l) === branch) &&
      (exec === 'all' || String(l.executive_id) === exec) &&
      (status === 'all' || l.status === status)),
    [leads, branch, exec, status],
  );

  const start = periodStart(period);
  const inPeriod = useMemo(() => (start ? scoped.filter((l) => new Date(l.created_at) >= start) : scoped), [scoped, start]);

  const stats = useMemo(() => {
    const today0 = startOfDay(new Date());
    const todayKey = dayKey(today0);
    const yesterdayKey = dayKey(addDays(today0, -1));

    const open = scoped.filter((l) => l.followup_date && !closedStatus(l.status));
    const due = open.filter((l) => String(l.followup_date).slice(0, 10) <= todayKey).length;
    const overdue = open.filter((l) => String(l.followup_date).slice(0, 10) < todayKey).length;
    const purchased = inPeriod.filter((l) => l.status === 'purchased').length;

    let delta: number | null = null;
    if (start) {
      const days = Math.round((today0.getTime() - start.getTime()) / DAY) + 1;
      const prevStart = addDays(start, -days);
      const prev = scoped.filter((l) => { const t = new Date(l.created_at); return t >= prevStart && t < start; }).length;
      delta = prev ? Math.round(((inPeriod.length - prev) / prev) * 100) : null;
    }
    const pipeline = scoped.filter((l) => !closedStatus(l.status));
    return {
      total: inPeriod.length,
      delta,
      today: scoped.filter((l) => dayKey(new Date(l.created_at)) === todayKey).length,
      yesterday: scoped.filter((l) => dayKey(new Date(l.created_at)) === yesterdayKey).length,
      pipeline: pipeline.length,
      interestedOpen: pipeline.filter((l) => l.status === 'interested').length,
      purchased,
      conversion: inPeriod.length ? Math.round((purchased / inPeriod.length) * 100) : 0,
      due,
      overdue,
      untouched: scoped.filter((l) => l.status === 'new' && Date.now() - new Date(l.created_at).getTime() > 2 * DAY).length,
      open,
    };
  }, [inPeriod, scoped, start]);

  const trend = useMemo(() => {
    const today = startOfDay(new Date());
    let from = start ?? addDays(today, -29);
    if (period === 'today') from = addDays(today, -6);
    // keep the bar chart readable on a phone: at most the last 14 days
    if (today.getTime() - from.getTime() > 13 * DAY) from = addDays(today, -13);
    const days: { day: string; label: string; n: number }[] = [];
    for (let d = from; d <= today; d = addDays(d, 1)) days.push({ day: dayKey(d), label: String(d.getDate()), n: 0 });
    const idx = new Map(days.map((d, i) => [d.day, i]));
    scoped.forEach((l) => {
      const i = idx.get(dayKey(new Date(l.created_at)));
      if (i !== undefined) days[i].n += 1;
    });
    return days;
  }, [scoped, period, start]);

  const byStatus = useMemo(
    () => STATUSES.map((s) => ({ label: s, value: inPeriod.filter((l) => l.status === s).length, color: STATUS_BAR[s] })).filter((x) => x.value > 0),
    [inPeriod],
  );

  const countBy = (key: (l: Customer) => string) => {
    const m = new Map<string, number>();
    inPeriod.forEach((l) => m.set(key(l), (m.get(key(l)) ?? 0) + 1));
    return [...m.entries()].map(([label, value]) => ({ label, value, color: '#0086C3' })).sort((a, b) => b.value - a.value);
  };
  const byBranch = useMemo(() => countBy(branchOf), [inPeriod]);
  const byProduct = useMemo(() => countBy((l) => (l.interested_product || 'Not specified').trim()).slice(0, 6), [inPeriod]);

  const byExec = useMemo(() => {
    const todayKey = dayKey(new Date());
    const m = new Map<number, { id: number; name: string; branch: string; leads: number; purchased: number; due: number }>();
    inPeriod.forEach((l) => {
      const row = m.get(l.executive_id) ?? { id: l.executive_id, name: l.executive?.name ?? `#${l.executive_id}`, branch: l.executive?.branch ?? '—', leads: 0, purchased: 0, due: 0 };
      row.leads += 1;
      if (l.status === 'purchased') row.purchased += 1;
      if (l.followup_date && !closedStatus(l.status) && String(l.followup_date).slice(0, 10) <= todayKey) row.due += 1;
      m.set(l.executive_id, row);
    });
    return [...m.values()].sort((a, b) => b.leads - a.leads);
  }, [inPeriod]);

  const followups = useMemo(() => {
    const todayKey = dayKey(new Date());
    const weekKey = dayKey(addDays(new Date(), 7));
    return stats.open
      .filter((l) => String(l.followup_date).slice(0, 10) <= weekKey)
      .sort((a, b) => String(a.followup_date).localeCompare(String(b.followup_date)))
      .slice(0, 8)
      .map((l) => {
        const d = String(l.followup_date).slice(0, 10);
        return { lead: l, tag: d < todayKey ? 'Overdue' : d === todayKey ? 'Today' : d, urgent: d <= todayKey };
      });
  }, [stats.open]);

  const recent = useMemo(() => scoped.slice(0, 6), [scoped]);

  const initials = (n?: string) => (n ?? 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? '';
  const filtersActive = branch !== 'all' || exec !== 'all' || status !== 'all' || period !== '30d';

  if (loading) return (
    <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color="#0086C3" />
    </View>
  );

  const kpis = [
    { label: 'Total leads', value: stats.total, icon: 'account-multiple', caption: periodLabel, delta: stats.delta },
    { label: 'New today', value: stats.today, icon: 'calendar-today', caption: `${stats.yesterday} yesterday` },
    { label: 'Open pipeline', value: stats.pipeline, icon: 'timer-sand', caption: `${stats.interestedOpen} interested` },
    { label: 'Conversion', value: `${stats.conversion}%`, icon: 'trending-up', caption: `${stats.purchased} purchased` },
    { label: 'Follow-ups due', value: stats.due, icon: 'clock-alert-outline', caption: `${stats.overdue} overdue`, danger: stats.overdue > 0 },
    { label: 'Not contacted', value: stats.untouched, icon: 'phone-missed', caption: 'new for 2+ days' },
  ] as { label: string; value: number | string; icon: string; caption: string; delta?: number | null; danger?: boolean }[];

  const maxTrend = Math.max(1, ...trend.map((d) => d.n));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0086C3']} />}
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
        {/* ── Filters ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {isAdmin && (
            <>
              <FilterMenu
                icon="store"
                label="Branch"
                value={branch}
                options={[{ value: 'all', label: 'All branches' }, ...branches.map((b) => ({ value: b, label: b }))]}
                onSelect={(v) => { setBranch(v); setExec('all'); }}
              />
              <FilterMenu
                icon="account-tie"
                label="Staff"
                value={exec}
                options={[{ value: 'all', label: 'All staff' }, ...execOptions.map((e) => ({ value: String(e.id), label: e.name }))]}
                onSelect={setExec}
              />
            </>
          )}
          <FilterMenu
            icon="filter-variant"
            label="Status"
            value={status}
            options={[{ value: 'all', label: 'All statuses' }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
            onSelect={setStatus}
          />
          <FilterMenu
            icon="calendar-range"
            label="Period"
            value={period}
            options={PERIODS}
            onSelect={(v) => setPeriod(v as Period)}
          />
          {filtersActive && (
            <TouchableOpacity style={styles.resetPill} onPress={() => { setBranch('all'); setExec('all'); setStatus('all'); setPeriod('30d'); }}>
              <MaterialCommunityIcons name="filter-off-outline" size={15} color="#C0504D" />
              <Text style={{ color: '#C0504D', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>Reset</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* ── KPIs ── */}
        <View style={styles.statsRow}>
          {kpis.map((k) => (
            <View key={k.label} style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.statTop}>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>{k.label}</Text>
                <MaterialCommunityIcons name={k.icon as any} size={18} color={k.danger ? '#C0504D' : '#0086C3'} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={[styles.statNum, { color: k.danger ? '#C0504D' : theme.colors.onSurface }]}>{k.value}</Text>
                {k.delta !== null && k.delta !== undefined && (
                  <Text style={{ marginLeft: 6, fontSize: 11, fontWeight: '700', color: k.delta >= 0 ? '#1E8E5A' : '#C0504D' }}>
                    {k.delta >= 0 ? '▲' : '▼'} {Math.abs(k.delta)}%
                  </Text>
                )}
              </View>
              <Text style={[styles.statCaption, { color: theme.colors.onSurfaceVariant }]}>{k.caption}</Text>
            </View>
          ))}
        </View>

        {/* ── Quick actions ── */}
        <View style={styles.actionsRow}>
          {isAdmin ? (
            <>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => (navigation as any).navigate('AddEditExecutive', {})}>
                <MaterialCommunityIcons name="account-plus" size={18} color="#fff" />
                <Text style={styles.btnPrimaryText}>Add Staff</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnOutline} onPress={() => navigation.navigate('MainTabs', { screen: 'Customers' } as any)}>
                <MaterialCommunityIcons name="account-multiple" size={18} color="#0086C3" />
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

        {/* ── Trend ── */}
        <Panel title="Leads over time" theme={theme}>
          <View style={styles.trendRow}>
            {trend.map((d) => (
              <View key={d.day} style={styles.trendCol}>
                <Text style={styles.trendVal}>{d.n > 0 ? d.n : ''}</Text>
                <View style={[styles.trendBar, { height: Math.max(3, (d.n / maxTrend) * 80), opacity: d.n ? 1 : 0.25 }]} />
                <Text style={styles.trendLbl}>{d.label}</Text>
              </View>
            ))}
          </View>
        </Panel>

        {/* ── Status breakdown ── */}
        <Panel title="Status breakdown" theme={theme}>
          <BarList rows={byStatus} theme={theme} />
        </Panel>

        {isAdmin && (
          <Panel title="Leads by branch" theme={theme}>
            <BarList rows={byBranch} theme={theme} />
          </Panel>
        )}

        <Panel title="Top interested products" theme={theme}>
          <BarList rows={byProduct} theme={theme} />
        </Panel>

        {/* ── Executive performance (admin) ── */}
        {isAdmin && (
          <Panel title="Staff performance" theme={theme}>
            {byExec.length === 0 && <Text style={styles.noData}>No data for this selection</Text>}
            {byExec.map((r) => (
              <View key={r.id} style={styles.perfRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowName, { color: theme.colors.onSurface }]}>{r.name}</Text>
                  <Text style={[styles.rowMeta, { color: theme.colors.onSurfaceVariant }]}>{r.branch}</Text>
                </View>
                <PerfCell label="Leads" value={r.leads} />
                <PerfCell label="Won" value={r.purchased} />
                <PerfCell label="Conv." value={`${r.leads ? Math.round((r.purchased / r.leads) * 100) : 0}%`} />
                <PerfCell label="Due" value={r.due} danger={r.due > 0} />
              </View>
            ))}
          </Panel>
        )}

        {/* ── Follow-ups ── */}
        <Text style={[styles.section, { color: theme.colors.onSurface }]}>Follow-ups — overdue & next 7 days</Text>
        {followups.length > 0 ? (
          followups.map(({ lead, tag, urgent }) => (
            <CustomerRow key={lead.id} customer={lead} theme={theme} badge={tag} badgeUrgent={urgent}
              onPress={() => navigation.navigate('CustomerDetail', { customerId: lead.id })} />
          ))
        ) : (
          <View style={[styles.empty, { borderColor: theme.colors.outline + '30' }]}>
            <MaterialCommunityIcons name="check-circle-outline" size={28} color={theme.colors.outline} />
            <Text style={{ color: theme.colors.outline, marginTop: 6, fontSize: 13 }}>Nothing due</Text>
          </View>
        )}

        {/* ── Recent leads ── */}
        <Text style={[styles.section, { color: theme.colors.onSurface }]}>Recent Leads</Text>
        {recent.length > 0 ? (
          recent.map((c) => (
            <CustomerRow key={c.id} customer={c} theme={theme} onPress={() => navigation.navigate('CustomerDetail', { customerId: c.id })} />
          ))
        ) : (
          <View style={[styles.empty, { borderColor: theme.colors.outline + '30' }]}>
            <MaterialCommunityIcons name="inbox-outline" size={28} color={theme.colors.outline} />
            <Text style={{ color: theme.colors.outline, marginTop: 6, fontSize: 13 }}>No leads for this selection</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/* ───────── small building blocks ───────── */

function FilterMenu({ icon, label, value, options, onSelect }: {
  icon: string; label: string; value: string; options: { value: string; label: string }[]; onSelect: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? value;
  const active = value !== 'all' && !(label === 'Period' && value === '30d');
  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <TouchableOpacity style={[styles.filterPill, active && styles.filterPillActive]} onPress={() => setVisible(true)} activeOpacity={0.75}>
          <MaterialCommunityIcons name={icon as any} size={15} color={active ? '#fff' : '#0086C3'} />
          <Text numberOfLines={1} style={[styles.filterText, active && { color: '#fff' }]}>{label}: {current}</Text>
          <MaterialCommunityIcons name="menu-down" size={16} color={active ? '#fff' : '#5B6B7A'} />
        </TouchableOpacity>
      }
    >
      {options.map((o) => (
        <Menu.Item
          key={o.value}
          title={o.label}
          leadingIcon={value === o.value ? 'check' : undefined}
          onPress={() => { onSelect(o.value); setVisible(false); }}
        />
      ))}
    </Menu>
  );
}

function Panel({ title, children, theme }: { title: string; children: React.ReactNode; theme: any }) {
  return (
    <View style={[styles.panel, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.panelTitle, { color: theme.colors.onSurface }]}>{title}</Text>
      {children}
    </View>
  );
}

function BarList({ rows, theme }: { rows: { label: string; value: number; color: string }[]; theme: any }) {
  if (rows.length === 0) return <Text style={styles.noData}>No data for this selection</Text>;
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <View>
      {rows.map((r) => (
        <View key={r.label} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: theme.colors.onSurface, textTransform: 'capitalize' }}>{r.label}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.onSurface }}>{r.value}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.max(4, (r.value / max) * 100)}%`, backgroundColor: r.color }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function PerfCell({ label, value, danger }: { label: string; value: number | string; danger?: boolean }) {
  return (
    <View style={{ width: 44, alignItems: 'center' }}>
      <Text style={{ fontSize: 14, fontWeight: '700', color: danger ? '#C0504D' : '#101820' }}>{value}</Text>
      <Text style={{ fontSize: 9, color: '#8A98A6', marginTop: 1 }}>{label}</Text>
    </View>
  );
}

function CustomerRow({ customer, theme, onPress, badge, badgeUrgent }: { customer: Customer; theme: any; onPress: () => void; badge?: string; badgeUrgent?: boolean }) {
  const sc = STATUS_PILL[customer.status] ?? { bg: '#F8FAFC', tc: '#475569' };
  const initials = (customer.name ?? '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <TouchableOpacity style={[styles.row, { backgroundColor: theme.colors.surface }]} onPress={onPress} activeOpacity={0.72}>
      <View style={[styles.rowAvatar, { backgroundColor: '#E6F4FB' }]}>
        <Text style={styles.rowAvatarText}>{initials}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.rowName, { color: theme.colors.onSurface }]}>{customer.name}</Text>
        <Text style={[styles.rowMeta, { color: theme.colors.onSurfaceVariant }]}>
          {customer.mobile}  ·  {customer.interested_product || 'Laptop Service'}
        </Text>
      </View>
      {badge ? (
        <View style={[styles.pill, { backgroundColor: badgeUrgent ? '#FDECEA' : '#EEF2F6' }]}>
          <Text style={[styles.pillText, { color: badgeUrgent ? '#C0504D' : '#475569' }]}>{badge.toUpperCase()}</Text>
        </View>
      ) : (
        <View style={[styles.pill, { backgroundColor: sc.bg }]}>
          <Text style={[styles.pillText, { color: sc.tc }]}>{customer.status.toUpperCase()}</Text>
        </View>
      )}
      <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.outline} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#101820',
    borderBottomWidth: 3, borderBottomColor: '#0086C3',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 22,
  },
  headerAvatar: {
    width: 44, height: 44, borderRadius: 8,
    backgroundColor: '#0086C3',
    justifyContent: 'center', alignItems: 'center',
  },
  headerAvatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  headerGreet: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerRole: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },

  /* Body */
  body: { padding: 16 },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 10 },

  /* Filters */
  filterRow: { gap: 8, paddingBottom: 14, paddingRight: 8 },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, borderWidth: 1, borderColor: '#D3DAE2', backgroundColor: '#fff',
    paddingHorizontal: 12, paddingVertical: 7, maxWidth: 230,
  },
  filterPillActive: { backgroundColor: '#0086C3', borderColor: '#0086C3' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#1B2733', flexShrink: 1, textTransform: 'capitalize' },
  resetPill: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: '#F3C4C1',
    backgroundColor: '#FDECEA', paddingHorizontal: 12, paddingVertical: 7,
  },

  /* Stats */
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    borderRadius: 8, padding: 14, minWidth: '47%', flex: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    borderWidth: 1, borderColor: '#E3E8EE',
  },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statNum: { fontSize: 26, fontWeight: '700', color: '#101820', marginBottom: 2 },
  statLabel: { fontSize: 12, fontWeight: '600' },
  statCaption: { fontSize: 11 },

  /* Actions */
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  btnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#0086C3', borderRadius: 6, paddingVertical: 12,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 6, paddingVertical: 12,
    borderWidth: 1.5, borderColor: '#0086C3', backgroundColor: '#fff',
  },
  btnOutlineText: { color: '#0086C3', fontWeight: '700', fontSize: 14 },

  /* Panels & charts */
  panel: { borderRadius: 8, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E3E8EE' },
  panelTitle: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  noData: { fontSize: 12, color: '#8A98A6', textAlign: 'center', paddingVertical: 12 },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: '#EEF2F6', overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  trendRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120 },
  trendCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  trendBar: { width: 10, borderRadius: 3, backgroundColor: '#0086C3' },
  trendVal: { fontSize: 9, color: '#5B6B7A', marginBottom: 2, height: 12 },
  trendLbl: { fontSize: 9, color: '#8A98A6', marginTop: 4 },
  perfRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },

  /* Rows */
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 8, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#E3E8EE',
  },
  rowAvatar: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  rowAvatarText: { color: '#0086C3', fontWeight: '700', fontSize: 14 },
  rowName: { fontSize: 14, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  pill: { borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3 },
  pillText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  empty: {
    borderWidth: 1, borderStyle: 'dashed', borderRadius: 12,
    alignItems: 'center', paddingVertical: 28, marginBottom: 12,
  },
});
