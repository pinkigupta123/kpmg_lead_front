import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Linking, Alert, Pressable } from 'react-native';
import { Text, Surface, Card, Button, Avatar, IconButton, Divider, Portal, Dialog, TextInput, useTheme, Chip, List, ActivityIndicator, HelperText } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useAuthStore } from '../store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import { Customer, CustomerStatus } from '../types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

type Props = NativeStackScreenProps<RootStackParamList, 'CustomerDetail'>;

export default function CustomerDetailScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { customerId } = route.params;
  const { user } = useAuthStore();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dialog states
  const [whatsappVisible, setWhatsappVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(1);
  const [whatsappMessage, setWhatsappMessage] = useState('');

  const [followupVisible, setFollowupVisible] = useState(false);
  const [nextFollowupDate, setNextFollowupDate] = useState('');
  const [followupRemarks, setFollowupRemarks] = useState('');
  const [followupStatus, setFollowupStatus] = useState<CustomerStatus>('follow-up');
  const [followupError, setFollowupError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchCustomerDetails = useCallback(async () => {
    try {
      const response = await api.get(`/customers/${customerId}`);
      setCustomer(response.data);
    } catch (error) {
      console.log('Failed to fetch customer details:', error);
      Alert.alert('Error', 'Failed to load customer details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchCustomerDetails();
  }, [fetchCustomerDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomerDetails();
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to permanently delete this customer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/customers/${customerId}`);
              Alert.alert('Success', 'Customer deleted successfully.');
              navigation.goBack();
            } catch (error) {
              console.log('Delete error:', error);
              Alert.alert('Error', 'Failed to delete customer.');
            }
          },
        },
      ]
    );
  };

  // WhatsApp template templates generator
  const getTemplateText = (templateId: number, cust: Customer) => {
    const productName = cust.interested_product || 'laptop service';
    switch (templateId) {
      case 1:
        return `Hello ${cust.name},\n\nThank you for visiting our store. We have registered your enquiry regarding ${productName}.\n\nPlease feel free to contact us if you have any questions.\n\nThank you.`;
      case 2:
        return `Hello ${cust.name},\n\nWe are following up regarding your enquiry.\n\nPlease let us know if you're interested.\n\nThank you.`;
      case 3:
        return `Hello ${cust.name},\n\nThank you for choosing us.\n\nIf you need any assistance, feel free to contact us anytime.\n\nRegards.`;
      default:
        return '';
    }
  };

  const handleOpenWhatsappDialog = () => {
    if (!customer) return;
    const msg = getTemplateText(1, customer);
    setSelectedTemplate(1);
    setWhatsappMessage(msg);
    setWhatsappVisible(true);
  };

  const handleSelectTemplate = (id: number) => {
    if (!customer) return;
    setSelectedTemplate(id);
    setWhatsappMessage(getTemplateText(id, customer));
  };

  const handleSendWhatsapp = async () => {
    if (!customer) return;
    // URL Encode message
    const encodedMsg = encodeURIComponent(whatsappMessage);
    // Standard format for wa.me link: wa.me/country_code+mobile_number
    // Assuming country code is +91 (India) if not prefixed, or we strip non-digits.
    const cleanNumber = customer.mobile.replace(/\D/g, '');
    const mobileWithCountry = cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber;
    const waUrl = `https://wa.me/${mobileWithCountry}?text=${encodedMsg}`;

    setWhatsappVisible(false);

    try {
      // Record action in timeline
      await api.post(`/customers/${customer.id}/timeline`, {
        action: 'WhatsApp Sent',
        remarks: `Sent WhatsApp Template ${selectedTemplate}`,
      });

      // Refresh details
      fetchCustomerDetails();

      // Launch URL
      await Linking.openURL(waUrl);
    } catch (error) {
      console.log('WhatsApp open error:', error);
      Alert.alert('Error', 'Could not open WhatsApp. Make sure it is installed.');
    }
  };

  const handleOpenFollowupDialog = () => {
    // Default follow-up date is tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD
    setNextFollowupDate(dateString);
    setFollowupRemarks('');
    setFollowupStatus('follow-up');
    setFollowupError('');
    setFollowupVisible(true);
  };

  const handleSaveFollowup = async () => {
    if (!customer) return;

    // Validate YYYY-MM-DD date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!nextFollowupDate.match(dateRegex)) {
      setFollowupError('Please enter follow-up date in YYYY-MM-DD format');
      return;
    }

    try {
      setFollowupVisible(false);
      // Update follow-up status and date
      await api.post(`/customers/${customer.id}/follow-up`, {
        followup_date: nextFollowupDate,
        remarks: followupRemarks || 'Scheduled next follow-up',
        status: followupStatus,
      });

      Alert.alert('Success', 'Follow-up updated successfully.');
      fetchCustomerDetails();
    } catch (error) {
      console.log('Follow-up error:', error);
      Alert.alert('Error', 'Failed to update follow-up.');
    }
  };

  if (loading || !customer) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const isAdmin = user?.role === 'super_admin';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContainer, { paddingBottom: 100 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        {/* Customer Header */}
        <Surface style={styles.headerCard} elevation={1}>
          <View style={styles.headerInfo}>
            <Avatar.Text size={56} label={customer.name.substring(0, 2).toUpperCase()} style={styles.avatar} />
            <View style={styles.headerText}>
              <Text style={[styles.nameText, { color: theme.colors.onSurface }]}>{customer.name}</Text>
              <Text style={[styles.mobileText, { color: theme.colors.onSurfaceVariant }]}>{customer.mobile}</Text>
              <View style={styles.badgeRow}>
                <Chip style={styles.statusChip} textStyle={{ fontSize: 11, fontWeight: 'bold' }}>
                  {customer.status.toUpperCase()}
                </Chip>
                {customer.city && <Chip style={styles.cityChip} icon="map-marker-outline">{customer.city}</Chip>}
              </View>
            </View>
          </View>
        </Surface>

        {/* Quick Actions Row */}
        <View style={styles.quickActions}>
          <Button
            mode="contained"
            icon="whatsapp"
            onPress={handleOpenWhatsappDialog}
            style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
            textColor="#FFFFFF"
          >
            WhatsApp
          </Button>
          <Button
            mode="outlined"
            icon="calendar-clock"
            onPress={handleOpenFollowupDialog}
            style={styles.actionBtn}
          >
            Follow-up
          </Button>
        </View>

        {/* Customer Details Section */}
        <Card style={styles.detailsCard}>
          <Card.Title title="Customer Details" titleStyle={styles.cardTitle} />
          <Card.Content>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>{customer.email || 'N/A'}</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Company</Text>
              <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>{customer.company || 'N/A'}</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Interested Product</Text>
              <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>{customer.interested_product || 'N/A'}</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Device Brand / Model</Text>
              <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                {customer.device_brand ? `${customer.device_brand} ${customer.device_model || ''}` : 'N/A'}
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Next Follow-up Date</Text>
              <Text style={[styles.detailValue, { color: theme.colors.onSurface, fontWeight: 'bold' }]}>
                {customer.followup_date ? new Date(customer.followup_date).toLocaleDateString() : 'No follow-up scheduled'}
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Notes</Text>
              <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>{customer.notes || 'No notes added'}</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created By</Text>
              <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                {customer.executive?.name || 'Unknown Executive'}
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Query / Enquiry Details</Text>
              <Text style={[styles.queryText, { color: theme.colors.onSurface }]}>{customer.customer_query || 'N/A'}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Managed / Created By Staff details for Admin */}
        {isAdmin && customer.executive && (
          <Card style={styles.detailsCard}>
            <Card.Title 
              title="Assigned Staff Member" 
              titleStyle={styles.cardTitle}
              left={(props) => <Avatar.Icon {...props} icon="account-tie" style={{ backgroundColor: theme.colors.secondaryContainer }} color={theme.colors.secondary} />}
            />
            <Card.Content>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Staff Name</Text>
                <Text style={[styles.detailValue, { color: theme.colors.onSurface, fontWeight: 'bold' }]}>
                  {customer.executive.name}
                </Text>
              </View>
              <Divider style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Employee ID</Text>
                <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                  {customer.executive.employee_id}
                </Text>
              </View>
              <Divider style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Mobile Number</Text>
                <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                  {customer.executive.mobile}
                </Text>
              </View>
              <Divider style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Store Branch</Text>
                <Text style={[styles.detailValue, { color: theme.colors.onSurface }]}>
                  {customer.executive.branch}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Timeline Section */}
        <Card style={styles.detailsCard}>
          <Card.Title title="Interaction Timeline" titleStyle={styles.cardTitle} />
          <Card.Content>
            {customer.timelines && customer.timelines.length > 0 ? (
              customer.timelines.map((timeline, index) => (
                <View key={timeline.id} style={styles.timelineItem}>
                  <View style={styles.timelineIndicator}>
                    <Avatar.Icon
                      size={24}
                      icon={
                        timeline.action === 'Customer Created'
                          ? 'plus-circle'
                          : timeline.action === 'WhatsApp Sent'
                          ? 'whatsapp'
                          : timeline.action === 'Status Updated'
                          ? 'sync'
                          : 'calendar-clock'
                      }
                      style={{ backgroundColor: theme.colors.primaryContainer }}
                      color={theme.colors.primary}
                    />
                    {index < customer.timelines!.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: theme.colors.outline }]} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineAction, { color: theme.colors.onSurface }]}>
                      {timeline.action}
                    </Text>
                    <Text style={[styles.timelineDate, { color: theme.colors.outline }]}>
                      {new Date(timeline.created_at).toLocaleString()}
                    </Text>
                    {timeline.remarks && (
                      <Text style={[styles.timelineRemarks, { color: theme.colors.onSurfaceVariant }]}>
                        {timeline.remarks}
                      </Text>
                    )}
                    <Text style={[styles.timelineAuthor, { color: theme.colors.outline }]}>
                      by {timeline.creator?.name || 'System'}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ color: theme.colors.outline }}>No timeline details available.</Text>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Footer Controls */}
      <Surface style={[styles.footerControls, { paddingBottom: 12 + insets.bottom }]} elevation={3}>
        <Button
          mode="contained"
          icon="pencil"
          style={styles.footerBtn}
          onPress={() => navigation.navigate('AddEditCustomer', { customerId: customer.id })}
        >
          Edit Lead
        </Button>
        {isAdmin && (
          <Button
            mode="outlined"
            icon="delete"
            style={[styles.footerBtn, { borderColor: theme.colors.error }]}
            textColor={theme.colors.error}
            onPress={handleDelete}
          >
            Delete Lead
          </Button>
        )}
      </Surface>

      {/* WhatsApp Modal */}
      <Portal>
        <Dialog visible={whatsappVisible} onDismiss={() => setWhatsappVisible(false)} style={styles.dialog}>
          <Dialog.Title>Send WhatsApp Message</Dialog.Title>
          <Dialog.Content style={{ maxHeight: 380 }}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.dialogSub}>Select a prefilled template:</Text>
              <View style={styles.templateSelection}>
                {[1, 2, 3].map((num) => (
                  <Chip
                    key={num}
                    selected={selectedTemplate === num}
                    onPress={() => handleSelectTemplate(num)}
                    style={styles.templateChip}
                  >
                    Template {num}
                  </Chip>
                ))}
              </View>
              <TextInput
                label="Edit Message"
                multiline
                numberOfLines={6}
                value={whatsappMessage}
                onChangeText={setWhatsappMessage}
                mode="outlined"
                style={styles.messageInput}
              />
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setWhatsappVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSendWhatsapp}>Open WhatsApp</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Follow-up Dialog */}
        <Dialog visible={followupVisible} onDismiss={() => setFollowupVisible(false)} style={styles.dialog}>
          <Dialog.Title>Add / Update Follow-up</Dialog.Title>
          <Dialog.Content>
            <ScrollView keyboardShouldPersistTaps="handled">
              {followupError ? <HelperText type="error" visible>{followupError}</HelperText> : null}
              
              {(() => {
                const handleFollowupDateChange = (event: any, selectedDate?: Date) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    const year = selectedDate.getFullYear();
                    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                    const day = String(selectedDate.getDate()).padStart(2, '0');
                    const formatted = `${year}-${month}-${day}`;
                    setNextFollowupDate(formatted);
                    setFollowupError('');
                  }
                };

                return (
                  <>
                    <Pressable onPress={() => setShowDatePicker(true)}>
                      <View pointerEvents="none">
                        <TextInput
                          label="Next Follow-up Date"
                          value={nextFollowupDate}
                          mode="outlined"
                          placeholder="Tap to select date"
                          style={styles.dialogInput}
                          left={<TextInput.Icon icon="calendar" />}
                          right={<TextInput.Icon icon="calendar-edit" />}
                        />
                      </View>
                    </Pressable>

                    {showDatePicker && (
                      <DateTimePicker
                        value={nextFollowupDate ? new Date(nextFollowupDate) : new Date()}
                        mode="date"
                        display="default"
                        minimumDate={new Date()}
                        onChange={handleFollowupDateChange}
                      />
                    )}
                  </>
                );
              })()}

              <TextInput
                label="Remarks"
                value={followupRemarks}
                onChangeText={setFollowupRemarks}
                mode="outlined"
                multiline
                numberOfLines={3}
                placeholder="Details of today's conversation..."
                style={styles.dialogInput}
              />

              <Text style={[styles.dialogSub, { marginTop: 8 }]}>Update Lead Status:</Text>
              <View style={styles.statusChipsContainer}>
                {(['follow-up', 'interested', 'purchased', 'closed'] as CustomerStatus[]).map((status) => (
                  <Chip
                    key={status}
                    selected={followupStatus === status}
                    onPress={() => setFollowupStatus(status)}
                    style={styles.statusChipSelect}
                  >
                    {status.toUpperCase()}
                  </Chip>
                ))}
              </View>
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setFollowupVisible(false)}>Cancel</Button>
            <Button mode="contained" onPress={handleSaveFollowup}>Save</Button>
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
  scrollContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  mobileText: {
    fontSize: 14,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  statusChip: {
    marginRight: 8,
    height: 28,
  },
  cityChip: {
    height: 28,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionBtn: {
    flex: 0.48,
    borderRadius: 8,
  },
  detailsCard: {
    marginBottom: 16,
    borderRadius: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748B',
    flex: 0.4,
  },
  detailValue: {
    fontSize: 14,
    flex: 0.6,
    textAlign: 'right',
  },
  queryText: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  divider: {
    marginVertical: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineIndicator: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    opacity: 0.2,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 8,
  },
  timelineAction: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  timelineDate: {
    fontSize: 11,
    marginTop: 2,
  },
  timelineRemarks: {
    fontSize: 13,
    marginTop: 4,
  },
  timelineAuthor: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  footerControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    backgroundColor: '#FFFFFF',
  },
  footerBtn: {
    flex: 0.45,
    borderRadius: 8,
  },
  dialog: {
    borderRadius: 16,
  },
  dialogSub: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  templateSelection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  templateChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  messageInput: {
    marginTop: 8,
  },
  dialogInput: {
    marginBottom: 12,
  },
  statusChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  statusChipSelect: {
    marginRight: 6,
    marginBottom: 6,
  },
});
