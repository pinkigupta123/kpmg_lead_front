import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, Linking, Pressable } from 'react-native';
import { TextInput, Button, Text, Surface, HelperText, useTheme, Portal, Dialog, Menu } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import api from '../services/api';
import { User } from '../types';
import SelectField from '../components/SelectField';
import { useLeadOptions } from '../hooks/useLeadOptions';

type Props = NativeStackScreenProps<RootStackParamList, 'AddEditExecutive'>;

interface ExecutiveForm {
  name: string;
  mobile: string;
  email: string;
  branch: string;
  designation: string;
  permissions: string[];
  password?: string;
}

export default function AddEditExecutiveScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const { executiveId } = route.params || {};
  const isEditMode = !!executiveId;
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);
  const [showPassword, setShowPassword] = useState(false);
  const { options: leadOptions, permissions: permissionCatalog } = useLeadOptions();

  // Branch options come from the branches table (same list as the web app)
  const [branches, setBranches] = useState<string[]>([]);
  const [branchMenuVisible, setBranchMenuVisible] = useState(false);
  useEffect(() => {
    api.get('/branches')
      .then((r) => {
        let list: any = r.data;
        while (list && !Array.isArray(list) && list.data) list = list.data;
        setBranches((Array.isArray(list) ? list : []).map((b: any) => b?.name).filter(Boolean));
      })
      .catch((e) => console.log('Failed to load branches:', e));
  }, []);

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
      permissions: [],
      password: '',
    },
  });

  useEffect(() => {
    if (isEditMode) {
      const getExecutiveData = async () => {
        try {
          const response = await api.get(`/lead/executives/${executiveId}`);
          const data: User = response.data;
          
          reset({
            name: data.name,
            mobile: data.mobile,
            email: data.email || '',
            branch: data.branch,
            designation: data.designation || '',
            permissions: data.permissions || [],
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
        await api.put(`/lead/executives/${executiveId}`, payload);
        Alert.alert('Success', 'Executive details updated successfully.');
        navigation.goBack();
      } else {
        const response = await api.post('/lead/executives', payload);
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
            render={({ field: { onChange, value } }) => {
              // keep a legacy value selectable if it is no longer in the branch table
              const options = value && !branches.includes(value) ? [value, ...branches] : branches;
              return (
                <View style={styles.inputContainer}>
                  <Menu
                    visible={branchMenuVisible}
                    onDismiss={() => setBranchMenuVisible(false)}
                    anchor={
                      <Pressable onPress={() => setBranchMenuVisible(true)}>
                        <View pointerEvents="none">
                          <TextInput
                            label="Store / Branch *"
                            value={value}
                            mode="outlined"
                            editable={false}
                            error={!!errors.branch}
                            placeholder="Select branch"
                            left={<TextInput.Icon icon="store" />}
                            right={<TextInput.Icon icon="menu-down" />}
                          />
                        </View>
                      </Pressable>
                    }
                  >
                    {options.length === 0 && <Menu.Item title="No branches found" disabled />}
                    {options.map((b) => (
                      <Menu.Item
                        key={b}
                        title={b}
                        leadingIcon={value === b ? 'check' : undefined}
                        onPress={() => { onChange(b); setBranchMenuVisible(false); }}
                      />
                    ))}
                  </Menu>
                  {errors.branch && (
                    <HelperText type="error" visible>{errors.branch.message}</HelperText>
                  )}
                </View>
              );
            }}
          />

          <Controller
            control={control}
            name="designation"
            render={({ field: { onChange, value } }) => {
              const labels = leadOptions.designation.map((o) => o.label);
              const items = (value && !labels.includes(value) ? [value, ...labels] : labels)
                .map((l) => ({ value: l, label: l }));
              return (
                <View style={styles.inputContainer}>
                  <SelectField
                    label="Designation (Optional)"
                    icon="briefcase"
                    items={items}
                    value={value}
                    onChange={onChange}
                    emptyText="No designations yet - add some in Manage Dropdowns"
                  />
                </View>
              );
            }}
          />

          <Controller
            control={control}
            name="permissions"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputContainer}>
                <SelectField
                  label="Permissions (Optional)"
                  icon="shield-key"
                  multiple
                  items={permissionCatalog.map((p) => ({ value: p.key, label: p.label }))}
                  values={value}
                  onChangeMultiple={onChange}
                  emptyText="No permissions available"
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
