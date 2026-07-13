import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, Linking } from 'react-native';
import { TextInput, Button, Text, Surface, HelperText, useTheme, Portal, Dialog } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import api from '../services/api';
import { User } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddEditExecutive'>;

interface ExecutiveForm {
  name: string;
  mobile: string;
  email: string;
  branch: string;
  designation: string;
  password?: string;
}

export default function AddEditExecutiveScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { executiveId } = route.params || {};
  const isEditMode = !!executiveId;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [showPassword, setShowPassword] = useState(false);

  // Success dialog for new executives
  const [successVisible, setSuccessVisible] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    employeeId: string;
    username: string;
    password: String;
  } | null>(null);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ExecutiveForm>({
    defaultValues: {
      name: '',
      mobile: '',
      email: '',
      branch: '',
      designation: '',
      password: '',
    },
  });

  useEffect(() => {
    if (isEditMode) {
      const getExecutiveData = async () => {
        try {
          const response = await api.get(`/executives/${executiveId}`);
          const data: User = response.data;
          
          reset({
            name: data.name,
            mobile: data.mobile,
            email: data.email || '',
            branch: data.branch,
            designation: data.designation || '',
            password: '',
          });
        } catch (error) {
          console.log('Error fetching executive for editing:', error);
          Alert.alert('Error', 'Failed to load executive info.');
          navigation.goBack();
        } finally {
          setFetching(false);
        }
      };

      getExecutiveData();
    }
  }, [executiveId, isEditMode, reset, navigation]);

  const onSubmit = async (data: ExecutiveForm) => {
    setLoading(true);
    try {
      const payload = {
        ...data,
        password: data.password && data.password.trim() !== '' ? data.password : undefined,
      };

      if (isEditMode) {
        await api.put(`/executives/${executiveId}`, payload);
        Alert.alert('Success', 'Executive details updated successfully.');
        navigation.goBack();
      } else {
        const response = await api.post('/executives', payload);
        const { employee_id, username, password } = response.data;
        
        setCreatedCredentials({
          name: data.name,
          employeeId: employee_id,
          username,
          password,
        });
        
        setSuccessVisible(true);
      }
    } catch (error: any) {
      console.log('Executive save error:', error);
      if (error.response && error.response.status === 422) {
        const errors = error.response.data.errors;
        let errMsg = 'Please verify your inputs.';
        if (errors && Object.keys(errors).length > 0) {
          errMsg = Object.values(errors)[0] as string;
        }
        Alert.alert('Validation Failed', errMsg);
      } else {
        Alert.alert('Error', 'Failed to save executive.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleShareCredentials = () => {
    if (!createdCredentials) return;

    const text = `Hello ${createdCredentials.name},\n\nYour Customer Lead Manager account has been created.\n\nUsername:\n${createdCredentials.username}\n\nTemporary Password:\n${createdCredentials.password}\n\nPlease login and change your password.\n\nThank you.`;
    const encodedText = encodeURIComponent(text);
    const waUrl = `https://wa.me/91${createdCredentials.username}?text=${encodedText}`;

    setSuccessVisible(false);

    Linking.openURL(waUrl)
      .then(() => {
        navigation.goBack();
      })
      .catch((err) => {
        console.error('Failed to open WhatsApp:', err);
        navigation.goBack();
      });
  };

  const handleCloseSuccess = () => {
    setSuccessVisible(false);
    navigation.goBack();
  };

  if (fetching) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <HelperText type="info" visible>Loading executive details...</HelperText>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Surface style={styles.card} elevation={1}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>
            {isEditMode ? 'Edit Executive Profile' : 'Add New Sales Executive'}
          </Text>

          <Controller
            control={control}
            name="name"
            rules={{ required: 'Full name is required' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputContainer}>
                <TextInput
                  label="Full Name *"
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
                  disabled={isEditMode}
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
            name="branch"
            rules={{ required: 'Store / Branch is required' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputContainer}>
                <TextInput
                  label="Store / Branch *"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  mode="outlined"
                  error={!!errors.branch}
                  left={<TextInput.Icon icon="store" />}
                />
                {errors.branch && (
                  <HelperText type="error" visible>{errors.branch.message}</HelperText>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="designation"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputContainer}>
                <TextInput
                  label="Designation (Optional)"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  mode="outlined"
                  placeholder="e.g. Sales Consultant"
                  left={<TextInput.Icon icon="briefcase" />}
                />
              </View>
            )}
          />

          <Controller
            control={control}
            name="password"
            rules={{
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters long',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputContainer}>
                <TextInput
                  label={isEditMode ? "New Password (Optional)" : "Password (Optional)"}
                  placeholder={isEditMode ? "Leave blank to keep current" : "Leave blank to auto-generate"}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  mode="outlined"
                  error={!!errors.password}
                  left={<TextInput.Icon icon="lock" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                />
                {errors.password && (
                  <HelperText type="error" visible>{errors.password.message}</HelperText>
                )}
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
            {isEditMode ? 'Update Executive' : 'Create Executive'}
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

      {/* Success Dialog with credentials sharing */}
      <Portal>
        <Dialog visible={successVisible} onDismiss={handleCloseSuccess} style={styles.dialog} dismissable={false}>
          <Dialog.Title>Executive Created Successfully</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogLabel}>Here are the system-generated login credentials:</Text>
            {createdCredentials && (
              <Surface style={styles.credentialsBox} elevation={1}>
                <Text style={styles.credText}>Employee ID: {createdCredentials.employeeId}</Text>
                <Text style={styles.credText}>Username: {createdCredentials.username}</Text>
                <Text style={[styles.credText, { fontWeight: 'bold' }]}>
                  Temporary Password: {createdCredentials.password}
                </Text>
              </Surface>
            )}
            <Text style={{ marginTop: 12 }}>
              Click "Share Credentials" below to send these details to the executive via WhatsApp.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCloseSuccess}>Close</Button>
            <Button mode="contained" onPress={handleShareCredentials} icon="whatsapp">
              Share Credentials
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
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
  dialog: {
    borderRadius: 16,
  },
  dialogLabel: {
    marginBottom: 8,
  },
  credentialsBox: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginTop: 8,
  },
  credText: {
    fontSize: 14,
    marginBottom: 4,
  },
});
