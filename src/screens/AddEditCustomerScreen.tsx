import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, Pressable, Linking, Modal, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Surface, HelperText, useTheme, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import api from '../services/api';
import { Customer, CustomerStatus } from '../types';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

type Props = NativeStackScreenProps<RootStackParamList, 'AddEditCustomer'>;

interface CustomerForm {
  name: string;
  mobile: string;
  email: string;
  city: string;
  company: string;
  interested_product: string;
  device_brand: string;
  device_model: string;
  customer_query: string;
  status: CustomerStatus;
  followup_date: string;
  notes: string;
}

const STATUS_OPTIONS: CustomerStatus[] = [
  'new',
  'contacted',
  'follow-up',
  'interested',
  'purchased',
  'closed',
];

export default function AddEditCustomerScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { customerId } = route.params || {};
  const isEditMode = !!customerId;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Success modal state
  const [successModal, setSuccessModal] = useState(false);
  const [savedCustomerName, setSavedCustomerName] = useState('');
  const [savedCustomerMobile, setSavedCustomerMobile] = useState('');
  const [savedProduct, setSavedProduct] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm<CustomerForm>({
    defaultValues: {
      name: '',
      mobile: '',
      email: '',
      city: '',
      company: '',
      interested_product: '',
      device_brand: '',
      device_model: '',
      customer_query: '',
      status: 'new',
      followup_date: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (isEditMode) {
      const getCustomerData = async () => {
        try {
          const response = await api.get(`/customers/${customerId}`);
          const data: Customer = response.data;
          
          // Populate fields
          reset({
            name: data.name,
            mobile: data.mobile,
            email: data.email || '',
            city: data.city || '',
            company: data.company || '',
            interested_product: data.interested_product || '',
            device_brand: data.device_brand || '',
            device_model: data.device_model || '',
            customer_query: data.customer_query || '',
            status: data.status,
            followup_date: data.followup_date || '',
            notes: data.notes || '',
          });
        } catch (error) {
          console.log('Error fetching customer for editing:', error);
          Alert.alert('Error', 'Failed to load customer information.');
          navigation.goBack();
        } finally {
          setFetching(false);
        }
      };

      getCustomerData();
    }
  }, [customerId, isEditMode, reset, navigation]);

  const onSubmit = async (data: CustomerForm) => {
    setLoading(true);
    try {
      // Validate followup_date format if entered
      if (data.followup_date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!data.followup_date.match(dateRegex)) {
          Alert.alert('Validation Error', 'Follow-up date must be in YYYY-MM-DD format');
          setLoading(false);
          return;
        }
      }

      if (isEditMode) {
        await api.put(`/customers/${customerId}`, data);
        Alert.alert('Success', 'Customer lead updated successfully.');
        navigation.goBack();
      } else {
        const response = await api.post('/customers', data);
        
        // Check if duplicate existed and backend returned existing record
        if (response.data.duplicate) {
          // customer is wrapped in a Laravel resource: { data: { id, name, ... } }
          const dupCustomer = response.data.customer?.data || response.data.customer;
          Alert.alert(
            'Mobile Number Already Registered',
            `Lead matches existing customer: ${dupCustomer?.name}. Redirecting to profile.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.replace('CustomerDetail', { customerId: dupCustomer?.id });
                },
              },
            ]
          );
        } else {
          // New customer created — customer is also wrapped: { data: { id, name, ... } }
          const newCustomer = response.data.customer?.data || response.data.customer || response.data;
          const name = newCustomer?.name || data.name;
          const mobile = newCustomer?.mobile || data.mobile;
          const product = data.interested_product || 'Laptop Service';

          const welcomeMsg = `Hello ${name},\n\nThank you for visiting KPMG Laptop Sales & Services! 🎉\n\nWe have successfully registered your enquiry regarding *${product}*.\n\nOur team will reach out to you shortly.\n\nFor any queries, feel free to contact us.\n\nThank you for choosing KPMG! 🙏`;
          const waUrl = `whatsapp://send?phone=91${mobile}&text=${encodeURIComponent(welcomeMsg)}`;

          // Show premium custom success modal
          setSavedCustomerName(name);
          setSavedCustomerMobile(mobile);
          setSavedProduct(product);
          setWhatsappUrl(waUrl);
          setSuccessModal(true);
        }
      }
    } catch (error: any) {
      console.log('Customer save error:', error);
      if (error.response && error.response.status === 422) {
        const errors = error.response.data.errors;
        let errMsg = 'Please verify your inputs.';
        if (errors && Object.keys(errors).length > 0) {
          errMsg = Object.values(errors)[0] as string;
        }
        Alert.alert('Validation Failed', errMsg);
      } else {
        Alert.alert('Error', 'Failed to save customer details.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <HelperText type="info" visible>Loading customer details...</HelperText>
      </View>
    );
  }

  return (
    <>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Surface style={styles.card} elevation={1}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>
            {isEditMode ? 'Edit Customer Lead' : 'Add New Customer Lead'}
          </Text>

          <Controller
            control={control}
            name="name"
            rules={{ required: 'Customer name is required' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputContainer}>
                <TextInput
                  label="Customer Name *"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  mode="outlined"
                  error={!!errors.name}
                  left={<TextInput.Icon icon="account" />}
                />
                {errors.name && (
                  <HelperText type="error" visible>{errors.name.message}</HelperText>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="mobile"
            rules={{
              required: 'Mobile number is required',
              pattern: {
                value: /^[0-9]{10}$/,
                message: 'Enter a valid 10-digit mobile number',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputContainer}>
                <TextInput
                  label="Mobile Number *"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="phone-pad"
                  mode="outlined"
                  disabled={isEditMode} // Mobile should not be editable for safety
                  error={!!errors.mobile}
                  left={<TextInput.Icon icon="phone" />}
                />
                {errors.mobile && (
                  <HelperText type="error" visible>{errors.mobile.message}</HelperText>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="email"
            rules={{
              pattern: {
                value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                message: 'Enter a valid email address',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputContainer}>
                <TextInput
                  label="Email (Optional)"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  mode="outlined"
                  error={!!errors.email}
                  left={<TextInput.Icon icon="email" />}
                />
                {errors.email && (
                  <HelperText type="error" visible>{errors.email.message}</HelperText>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="city"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputContainer}>
                <TextInput
                  label="City"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  mode="outlined"
                  left={<TextInput.Icon icon="map-marker" />}
                />
              </View>
            )}
          />

          <Controller
            control={control}
            name="interested_product"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputContainer}>
                <TextInput
                  label="Interested Product (e.g. Dell XPS 15)"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  mode="outlined"
                  left={<TextInput.Icon icon="laptop" />}
                />
              </View>
            )}
          />

          <View style={styles.row}>
            <Controller
              control={control}
              name="device_brand"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Device Brand"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  mode="outlined"
                  placeholder="e.g. HP"
                  style={[styles.inputContainer, { flex: 0.48 }]}
                />
              )}
            />
            <Controller
              control={control}
              name="device_model"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Device Model"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  mode="outlined"
                  placeholder="e.g. Pavilion 14"
                  style={[styles.inputContainer, { flex: 0.48 }]}
                />
              )}
            />
          </View>

          <Controller
            control={control}
            name="customer_query"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputContainer}>
                <TextInput
                  label="Customer Query / Enquiry Details"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  mode="outlined"
                  multiline
                  numberOfLines={4}
                  placeholder="Describe laptop issue or specs requested..."
                />
              </View>
            )}
          />

          <Controller
            control={control}
            name="followup_date"
            render={({ field: { onChange, value } }) => {
              const handleDateChange = (event: any, selectedDate?: Date) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  // Format selected date local to YYYY-MM-DD
                  const year = selectedDate.getFullYear();
                  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                  const day = String(selectedDate.getDate()).padStart(2, '0');
                  const formatted = `${year}-${month}-${day}`;
                  onChange(formatted);
                }
              };

              return (
                <View style={styles.inputContainer}>
                  <Pressable onPress={() => setShowDatePicker(true)}>
                    <View pointerEvents="none">
                      <TextInput
                        label="Next Follow-up Date"
                        value={value}
                        mode="outlined"
                        placeholder="Tap to select date"
                        left={<TextInput.Icon icon="calendar" />}
                        right={<TextInput.Icon icon="calendar-edit" />}
                      />
                    </View>
                  </Pressable>

                  {showDatePicker && (
                    <DateTimePicker
                      value={value ? new Date(value) : new Date()}
                      mode="date"
                      display="default"
                      minimumDate={new Date()}
                      onChange={handleDateChange}
                    />
                  )}
                </View>
              );
            }}
          />

          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputContainer}>
                <TextInput
                  label="Notes / Remarks"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  mode="outlined"
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}
          />

          {/* Status Selection (only visible, or defaults to new) */}
          <Text style={styles.statusLabel}>Lead Status</Text>
          <Controller
            control={control}
            name="status"
            render={({ field: { value } }) => (
              <View style={styles.statusGroup}>
                {STATUS_OPTIONS.map((status) => (
                  <Chip
                    key={status}
                    selected={value === status}
                    onPress={() => setValue('status', status)}
                    style={styles.statusChip}
                  >
                    {status.toUpperCase()}
                  </Chip>
                ))}
              </View>
            )}
          />

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            disabled={loading}
            style={styles.saveBtn}
          >
            {isEditMode ? 'Update Lead' : 'Create Lead'}
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.cancelBtn}
          >
            Cancel
          </Button>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>

    {/* ─── Lead Created Success Modal ─── */}
    <Modal
      visible={successModal}
      transparent
      animationType="fade"
      onRequestClose={() => { setSuccessModal(false); navigation.goBack(); }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Green circle check */}
          <View style={styles.successIconWrap}>
            <MaterialCommunityIcons name="check-circle" size={64} color="#10B981" />
          </View>

          <Text style={styles.modalTitle}>Lead Added! 🎉</Text>
          <Text style={styles.modalCustomer}>{savedCustomerName}</Text>
          <Text style={styles.modalProduct}>{savedProduct}</Text>
          <Text style={styles.modalSubText}>Send a welcome message on WhatsApp?</Text>

          {/* WhatsApp Button */}
          <TouchableOpacity
            style={styles.waButton}
            onPress={async () => {
              setSuccessModal(false);
              navigation.goBack();
              try {
                const supported = await Linking.canOpenURL(whatsappUrl);
                if (supported) {
                  await Linking.openURL(whatsappUrl);
                } else {
                  Alert.alert('WhatsApp not found', 'Please install WhatsApp.');
                }
              } catch (e) {
                console.log('WA error:', e);
              }
            }}
          >
            <MaterialCommunityIcons name="whatsapp" size={22} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.waButtonText}>Send Welcome Message</Text>
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => { setSuccessModal(false); navigation.goBack(); }}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 8,
  },
  statusGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  statusChip: {
    marginRight: 6,
    marginBottom: 8,
  },
  saveBtn: {
    borderRadius: 8,
    paddingVertical: 4,
  },
  cancelBtn: {
    marginTop: 12,
    borderRadius: 8,
    paddingVertical: 4,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  successIconWrap: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalCustomer: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A56DB',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalProduct: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSubText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 22,
    textAlign: 'center',
  },
  waButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 12,
  },
  waButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 8,
  },
  skipText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
});
