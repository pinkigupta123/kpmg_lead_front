import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert, Linking, TouchableOpacity } from 'react-native';
import { Text, Avatar, Searchbar, useTheme, ActivityIndicator, Portal, Dialog, Divider } from 'react-native-paper';
import api from '../services/api';
import { User } from '../types';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = any;

export default function ExecutiveListScreen({ navigation }: Props) {
  const theme = useTheme();
  const [executives, setExecutives] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Password reset popup states
  const [resetSuccessVisible, setResetSuccessVisible] = useState(false);
  const [resetCredentials, setResetCredentials] = useState<{ employeeId: string; username: string; password: string } | null>(null);

  const fetchExecutives = useCallback(async () => {
    try {
      const params = search ? { search } : {};
      const response = await api.get('/executives', { params });
      const list = response.data?.data || response.data;
      setExecutives(Array.isArray(list) ? list : []);
    } catch (error) {
      console.log('Failed to fetch executives:', error);
      Alert.alert('Error', 'Failed to load sales executives.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    fetchExecutives();
  }, [fetchExecutives]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExecutives();
  };

  const handleToggleStatus = async (exec: User) => {
    const newStatus = exec.status === 'active' ? 'inactive' : 'active';
    const actionLabel = exec.status === 'active' ? 'Disable' : 'Enable';

    Alert.alert(
      `${actionLabel} Executive`,
      `Are you sure you want to ${actionLabel.toLowerCase()} ${exec.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel,
          onPress: async () => {
            try {
              await api.put(`/executives/${exec.id}`, {
                ...exec,
                status: newStatus,
              });
              Alert.alert('Success', `Executive ${actionLabel.toLowerCase()}d successfully.`);
              fetchExecutives();
            } catch (error) {
              console.log('Toggle status error:', error);
              Alert.alert('Error', `Failed to update status.`);
            }
          },
        },
      ]
    );
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to permanently delete executive ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/executives/${id}`);
              Alert.alert('Success', 'Executive deleted successfully.');
              fetchExecutives();
            } catch (error) {
              console.log('Delete executive error:', error);
              Alert.alert('Error', 'Failed to delete executive.');
            }
          },
        },
      ]
    );
  };

  const handleResetPassword = (exec: User) => {
    Alert.alert(
      'Reset Password',
      `Are you sure you want to reset password for ${exec.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            try {
              const response = await api.post('/executives/reset-password', {
                id: exec.id,
              });
              const { employee_id, username, password } = response.data;
              setResetCredentials({
                employeeId: employee_id,
                username,
                password,
              });
              setResetSuccessVisible(true);
              fetchExecutives();
            } catch (error) {
              console.log('Reset password error:', error);
              Alert.alert('Error', 'Failed to reset password.');
            }
          },
        },
      ]
    );
  };

  const handleShareResetCredentials = () => {
    if (!resetCredentials) return;
    const text = `Hello,\n\nYour Customer Lead Manager password has been reset.\n\nUsername:\n${resetCredentials.username}\n\nNew Temporary Password:\n${resetCredentials.password}\n\nPlease login and change your password.\n\nThank you.`;
    const encodedText = encodeURIComponent(text);
    const waUrl = `https://wa.me/91${resetCredentials.username}?text=${encodedText}`;
    setResetSuccessVisible(false);
    Linking.openURL(waUrl).catch(() => console.error('Failed to open WhatsApp'));
  };

  const handleShareCredentialsDirectly = (empId: string, mobile: string, tempPass: string) => {
    const text = `Hello,\n\nHere are your Customer Lead Manager credentials:\n\nEmployee ID:\n${empId}\n\nUsername (Mobile):\n${mobile}\n\nTemporary Password:\n${tempPass}\n\nPlease login and change your password.\n\nThank you.`;
    const encodedText = encodeURIComponent(text);
    const waUrl = `https://wa.me/91${mobile}?text=${encodedText}`;
    Linking.openURL(waUrl).catch(() => console.error('Failed to open WhatsApp'));
  };

  const renderItem = ({ item }: { item: User }) => {
    const isActive = item.status === 'active';
    const initials = item.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

    return (
      <View style={[styles.card, !isActive && styles.disabledCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.cardAccent} />

        <View style={styles.cardContent}>
          {/* Left Side: Initials Avatar + Name & Designation */}
          <View style={[styles.avatarCircle, { backgroundColor: '#EFF6FF' }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.nameRow}>
              <Text style={[styles.nameText, { color: theme.colors.onSurface }]}>{item.name}</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: isActive ? '#EFF6FF' : '#FEF2F2' }
              ]}>
                <Text style={[
                  styles.statusText,
                  { color: isActive ? '#1D4ED8' : '#B91C1C' }
                ]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={[styles.designationText, { color: theme.colors.onSurfaceVariant }]}>
              {item.designation || 'Sales Executive'}  ·  {item.employee_id}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="phone-outline" size={13} color={theme.colors.outline} />
                <Text style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}> {item.mobile}</Text>
              </View>
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="storefront-outline" size={13} color={theme.colors.outline} />
                <Text style={[styles.metaText, { color: theme.colors.onSurfaceVariant }]}> {item.branch || 'Main HQ'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Row at the bottom instead of cramped side layout */}
        <Divider style={styles.cardDivider} />
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AddEditExecutive', { executiveId: item.id })}
          >
            <MaterialCommunityIcons name="pencil-outline" size={16} color="" />
            <Text style={[styles.actionButtonText, { color: '' }]}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleResetPassword(item)}
          >
            <MaterialCommunityIcons name="lock-reset" size={16} color="" />
            <Text style={[styles.actionButtonText, { color: '' }]}>Reset Pwd</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleToggleStatus(item)}
          >
            <MaterialCommunityIcons
              name={isActive ? "account-off-outline" : "account-check-outline"}
              size={16}
              color={isActive ? '#B91C1C' : '#166534'}
            />
            <Text style={[styles.actionButtonText, { color: isActive ? '#B91C1C' : '#166534' }]}>
              {isActive ? 'Disable' : 'Enable'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Temp Password Banner */}
        {item.temp_password && (
          <View style={styles.tempPasswordBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <MaterialCommunityIcons name="key-variant" size={14} color="#B45309" />
              <Text style={styles.tempPasswordText} numberOfLines={1}>
                Temp Pwd: <Text style={{ fontWeight: 'bold' }}>{item.temp_password}</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.waShareBtn}
              onPress={() => handleShareCredentialsDirectly(item.employee_id, item.mobile, item.temp_password || '')}
            >
              <MaterialCommunityIcons name="whatsapp" size={14} color="#FFFFFF" />
              <Text style={styles.waShareBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: '#03307e' }]}>
        <Searchbar
          placeholder="Search staff members..."
          onChangeText={(query) => {
            setSearch(query);
          }}
          value={search}
          onSubmitEditing={fetchExecutives}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          iconColor="#FFFFFF"
          placeholderTextColor="rgba(255,255,255,0.55)"
        />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="" />
        </View>
      ) : (
        <FlatList
          data={executives}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#03307e']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-off-outline" size={48} color={theme.colors.outline} />
              <Text style={{ color: theme.colors.outline, marginTop: 8 }}>No staff members found.</Text>
            </View>
          }
        />
      )}

      {/* Reset Password Success Dialog */}
      <Portal>
        <Dialog visible={resetSuccessVisible} onDismiss={() => setResetSuccessVisible(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>Password Reset Successful</Dialog.Title>
          <Dialog.Content>
            {resetCredentials && (
              <View style={styles.credentialsBox}>
                <Text style={styles.credText}>Employee ID: {resetCredentials.employeeId}</Text>
                <Text style={styles.credText}>Username: {resetCredentials.username}</Text>
                <Text style={[styles.credText, { fontWeight: 'bold', color: '' }]}>
                  New Password: {resetCredentials.password}
                </Text>
              </View>
            )}
            <Text style={styles.dialogSubText}>
              Would you like to share these new credentials via WhatsApp?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => setResetSuccessVisible(false)}>
              <Text style={styles.dialogCancelBtnText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dialogShareBtn} onPress={handleShareResetCredentials}>
              <MaterialCommunityIcons name="whatsapp" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.dialogShareBtnText}>Share</Text>
            </TouchableOpacity>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 12,
  },
  searchbar: {
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
  listContainer: {
    padding: 14,
    paddingBottom: 90,
  },
  card: {
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardAccent: {
    height: 3,
    backgroundColor: '#03307e',
  },
  disabledCard: {
    opacity: 0.65,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 14,
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '',
    fontWeight: '700',
    fontSize: 15,
  },
  detailsContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
  },
  designationText: {
    fontSize: 12,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardDivider: {
    backgroundColor: '#F1F5F9',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    backgroundColor: '#FAFBFD',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  tempPasswordBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  tempPasswordText: {
    fontSize: 12,
    color: '#B45309',
    marginLeft: 6,
  },
  waShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  waShareBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  dialog: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  dialogSubText: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 12,
  },
  credentialsBox: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  credText: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
  },
  dialogCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dialogCancelBtnText: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  dialogShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dialogShareBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
