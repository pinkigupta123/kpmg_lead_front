import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Linking, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Searchbar, Chip, Text, FAB, useTheme, ActivityIndicator, IconButton, Menu } from 'react-native-paper';
import { useAuthStore } from '../store/authStore';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import api from '../services/api';
import { Customer, CustomerStatus, User } from '../types';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = any;

const STATUSES: { label: string; value: CustomerStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Follow-up', value: 'follow-up' },
  { label: 'Interested', value: 'interested' },
  { label: 'Purchased', value: 'purchased' },
  { label: 'Closed', value: 'closed' },
];

export default function CustomerListScreen({ navigation }: Props) {
  const theme = useTheme();
  const { user, token } = useAuthStore();
  const isAdmin = user?.role === 'super_admin';
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<CustomerStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest'>('latest');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  // Executive Filter states
  const [executives, setExecutives] = useState<User[]>([]);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState<number | undefined>(undefined);
  const [executivesMenuVisible, setExecutivesMenuVisible] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchCustomers = useCallback(
    async (pageNum: number, isRefresh = false) => {
      try {
        if (pageNum === 1) {
          if (!isRefresh) setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const params: any = {
          page: pageNum,
          search: search || undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          sort: sortBy === 'latest' ? 'desc' : 'asc',
          executive_id: selectedExecutiveId || undefined,
        };

        const response = await api.get('/customers', { params });
        const { data, current_page, last_page } = response.data;

        if (isRefresh || pageNum === 1) {
          setCustomers(data);
        } else {
          setCustomers((prev) => [...prev, ...data]);
        }

        setPage(current_page);
        setHasMore(current_page < last_page);
      } catch (error) {
        console.log('Failed to fetch customers:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [search, selectedStatus, sortBy, selectedExecutiveId]
  );

  useEffect(() => {
    fetchCustomers(1);
  }, [fetchCustomers]);

  useEffect(() => {
    if (isAdmin) {
      const fetchExecutivesList = async () => {
        try {
          const response = await api.get('/executives');
          const list = response.data?.data || response.data;
          setExecutives(Array.isArray(list) ? list : []);
        } catch (error) {
          console.log('Failed to fetch executives list:', error);
        }
      };
      fetchExecutivesList();
    }
  }, [isAdmin]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomers(1, true);
  };

  const loadMore = () => {
    if (hasMore && !loadingMore && !loading) {
      fetchCustomers(page + 1);
    }
  };

  const handleExportCSV = () => {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000/api';
    const exportUrl = `${baseUrl}/customers/export?token=${token}&search=${search}&status=${selectedStatus !== 'all' ? selectedStatus : ''}&sort=${sortBy === 'latest' ? 'desc' : 'asc'}`;
    Linking.openURL(exportUrl).catch((err) => console.error('Failed to open export link:', err));
  };

  const handleWhatsApp = (item: Customer) => {
    const product = item.interested_product || 'laptop service';
    const msg = `Hello ${item.name},\n\nThank you for visiting KPMG Laptop Sales & Services! 🎉\n\nWe have successfully registered your enquiry regarding *${product}*.\n\nOur team will reach out to you shortly.\n\nFor any queries, feel free to contact us.\n\nThank you for choosing KPMG! 🙏`;
    const url = `whatsapp://send?phone=91${item.mobile}&text=${encodeURIComponent(msg)}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert('WhatsApp not installed', 'Please install WhatsApp on this device.');
      }
    });
  };

  const renderItem = ({ item }: { item: Customer }) => {
    const STATUS_COLORS: Record<string, { bg: string; tc: string }> = {
      new: { bg: '#DBEAFE', tc: '#1D4ED8' },
      contacted: { bg: '#E0F2FE', tc: '#0369A1' },
      'follow-up': { bg: '#FEF9C3', tc: '#A16207' },
      interested: { bg: '#F3E8FF', tc: '#7E22CE' },
      purchased: { bg: '#DCFCE7', tc: '#166534' },
      closed: { bg: '#F1F5F9', tc: '#475569' },
    };
    const sc = STATUS_COLORS[item.status] ?? { bg: '#F1F5F9', tc: '#475569' };
    const initials = item.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
        onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
        activeOpacity={0.75}
      >
        {/* Left accent bar */}
        <View style={[styles.cardAccent, { backgroundColor: sc.tc }]} />

        {/* Avatar */}
        <View style={[styles.cardAvatar, { backgroundColor: sc.bg }]}>
          <Text style={[styles.cardAvatarText, { color: sc.tc }]}>{initials}</Text>
        </View>

        {/* Content */}
        <View style={styles.cardInfo}>
          <Text style={[styles.customerName, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.customerMobile, { color: theme.colors.onSurfaceVariant }]}>
            {item.mobile}
          </Text>
          <Text style={[styles.customerProduct, { color: theme.colors.outline }]} numberOfLines={1}>
            {item.interested_product || 'Laptop Service / Repair'}
          </Text>
          {item.followup_date && (
            <View style={styles.followupRow}>
              <MaterialCommunityIcons name="clock-outline" size={12} color="#D97706" />
              <Text style={styles.followupText}>
                {new Date(item.followup_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Right — status + chevron */}
        <View style={styles.cardRight}>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.tc }]}>{item.status.toUpperCase()}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.outline} style={{ marginTop: 6 }} />
        </View>
      </TouchableOpacity>
    );
  };




  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* ─── Header ─── */}
      <View style={[styles.header, { backgroundColor: '#03307e' }]}>
        <View style={styles.searchRow}>
          <Searchbar
            placeholder="Search leads..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            onChangeText={(query) => {
              setSearch(query);
            }}
            value={search}
            onSubmitEditing={() => fetchCustomers(1)}
            style={styles.searchbar}
            inputStyle={styles.searchInput}
            iconColor="#FFFFFF"
          />
          <Menu
            visible={sortMenuVisible}
            onDismiss={() => setSortMenuVisible(false)}
            anchor={
              <IconButton
                icon="sort"
                iconColor="#FFFFFF"
                onPress={() => setSortMenuVisible(true)}
                style={styles.headerIcon}
              />
            }
          >
            <Menu.Item
              onPress={() => {
                setSortBy('latest');
                setSortMenuVisible(false);
              }}
              title="Latest First"
              leadingIcon={sortBy === 'latest' ? 'check' : undefined}
            />
            <Menu.Item
              onPress={() => {
                setSortBy('oldest');
                setSortMenuVisible(false);
              }}
              title="Oldest First"
              leadingIcon={sortBy === 'oldest' ? 'check' : undefined}
            />
          </Menu>

          {isAdmin && (
            <>
              <Menu
                visible={executivesMenuVisible}
                onDismiss={() => setExecutivesMenuVisible(false)}
                anchor={
                  <IconButton
                    icon="account-filter"
                    iconColor="#FFFFFF"
                    onPress={() => setExecutivesMenuVisible(true)}
                    style={styles.headerIcon}
                  />
                }
              >
                <Menu.Item
                  onPress={() => {
                    setSelectedExecutiveId(undefined);
                    setExecutivesMenuVisible(false);
                  }}
                  title="All Staff"
                  leadingIcon={!selectedExecutiveId ? 'check' : undefined}
                />
                {executives.map((exec) => (
                  <Menu.Item
                    key={exec.id}
                    onPress={() => {
                      setSelectedExecutiveId(exec.id);
                      setExecutivesMenuVisible(false);
                    }}
                    title={exec.name}
                    leadingIcon={selectedExecutiveId === exec.id ? 'check' : undefined}
                  />
                ))}
              </Menu>

              <IconButton
                icon="export"
                iconColor="#FFFFFF"
                onPress={handleExportCSV}
                style={styles.headerIcon}
              />
            </>
          )}
        </View>

        {/* Filter Scroll using custom touchables for perfect dark bg visibility */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {STATUSES.map((status) => {
            const active = selectedStatus === status.value;
            return (
              <TouchableOpacity
                key={status.value}
                onPress={() => {
                  setSelectedStatus(status.value);
                }}
                style={[
                  styles.filterPill,
                  active ? styles.filterPillActive : styles.filterPillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: active ? '#03307e' : '#FFFFFF' },
                  ]}
                >
                  {status.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isAdmin && selectedExecutiveId && (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 8, marginBottom: 4 }}>
          <Chip
            icon="account-tie"
            onClose={() => setSelectedExecutiveId(undefined)}
            style={{ backgroundColor: theme.colors.secondaryContainer }}
            textStyle={{ fontSize: 12, color: theme.colors.onSecondaryContainer }}
          >
            Staff: {executives.find(e => e.id === selectedExecutiveId)?.name || 'Filter'}
          </Chip>
        </View>
      )}

      {/* Leads List */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>Loading leads...</Text>
        </View>
      ) : (
        <FlatList
          data={customers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.2}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-search-outline" size={48} color={theme.colors.outline} />
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                No leads found matching criteria.
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={styles.footerLoader} size="small" color={theme.colors.primary} />
            ) : null
          }
        />
      )}

      {/* FAB to add customer - Sales Executives only */}
      {!isAdmin && (
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color="#FFFFFF"
          onPress={() => (navigation as any).navigate('AddEditCustomer', {})}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchbar: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    elevation: 0,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  searchInput: {
    minHeight: 44,
    color: '#FFFFFF',
    fontSize: 14,
  },
  headerIcon: {
    margin: 0,
    tintColor: '#FFFFFF',
  },
  filterScroll: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterPillActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  filterPillInactive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'transparent',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    padding: 14,
    paddingBottom: 90,
  },
  /* Card */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderRadius: 14,
    overflow: 'hidden',
    paddingVertical: 12,
    paddingRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  cardAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 10,
  },
  cardAvatar: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10,
  },
  cardAvatarText: { fontSize: 15, fontWeight: '700' },
  cardInfo: { flex: 1 },
  cardRight: { alignItems: 'flex-end', minWidth: 64 },
  customerName: { fontSize: 15, fontWeight: '700' },
  customerMobile: { fontSize: 12, marginTop: 2 },
  customerProduct: { fontSize: 11, marginTop: 3 },
  followupRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  followupText: { fontSize: 11, marginLeft: 3, color: '#D97706' },
  statusBadge: {
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 6, marginBottom: 2,
  },
  statusText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  cardActions: { flexDirection: 'row', alignItems: 'center' },
  waBtn: { backgroundColor: '#25D366', borderRadius: 20, margin: 0, marginRight: 2 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 12, fontSize: 14 },
  footerLoader: { marginVertical: 16 },
  fab: {
    position: 'absolute', margin: 16, right: 0, bottom: 0,
    borderRadius: 16, backgroundColor: '#1A56DB',
  },
});
