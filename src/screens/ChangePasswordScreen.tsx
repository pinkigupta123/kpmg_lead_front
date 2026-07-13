import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Surface, HelperText, useTheme } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'ForceChangePassword'>;

interface ChangePasswordForm {
  current_password?: string;
  new_password: string;
  new_password_confirmation: string;
}

export default function ChangePasswordScreen({ route, navigation }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { forceChange } = route.params || {};
  const { user, updateUser, clearAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<ChangePasswordForm>({
    defaultValues: {
      current_password: '',
      new_password: '',
      new_password_confirmation: '',
    },
  });

  const newPassword = watch('new_password');

  const onSubmit = async (data: ChangePasswordForm) => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.post('/change-password', {
        current_password: data.current_password || '',
        new_password: data.new_password,
        new_password_confirmation: data.new_password_confirmation,
        is_force_reset: forceChange ? 1 : 0,
      });

      setSuccessMsg('Password changed successfully.');
      
      // Update local state
      updateUser({ is_temp_password: false });

      setTimeout(() => {
        if (forceChange) {
          // If it was forced, updating state triggers the RootNavigator to switch to MainTabs automatically.
        } else {
          navigation.goBack();
        }
      }, 1500);
    } catch (error: any) {
      console.log('Change password error:', error);
      if (error.response && error.response.data && error.response.data.message) {
        setErrorMsg(error.response.data.message);
      } else {
        setErrorMsg('Failed to change password. Please check your inputs.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: forceChange ? insets.top : 0, paddingBottom: forceChange ? insets.bottom : 0 }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {forceChange && (
          <Surface style={[styles.warningBanner, { backgroundColor: theme.colors.errorContainer }]} elevation={1}>
            <Text style={{ color: theme.colors.onErrorContainer, fontWeight: 'bold' }}>
              First-Time Sign In Security Notice:
            </Text>
            <Text style={{ color: theme.colors.onErrorContainer, marginTop: 4 }}>
              Your account has been created with a temporary password. You must set a new secure password before you can proceed.
            </Text>
          </Surface>
        )}

        <Surface style={styles.card} elevation={2}>
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Update Password</Text>

          {errorMsg && (
            <HelperText type="error" visible={true} style={styles.alertText}>
              {errorMsg}
            </HelperText>
          )}

          {successMsg && (
            <Text style={[styles.successText, { color: '#10B981' }]}>
              {successMsg}
            </Text>
          )}

          {/* Current Password - Optional / Required only if not forced */}
          {!forceChange && (
            <Controller
              control={control}
              name="current_password"
              rules={{ required: 'Current password is required' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <TextInput
                    label="Current Password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry={!showCurrentPassword}
                    mode="outlined"
                    error={!!errors.current_password}
                    left={<TextInput.Icon icon="lock-open-outline" />}
                    right={
                      <TextInput.Icon
                        icon={showCurrentPassword ? 'eye-off' : 'eye'}
                        onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                      />
                    }
                  />
                  {errors.current_password && (
                    <HelperText type="error" visible={true}>
                      {errors.current_password.message}
                    </HelperText>
                  )}
                </View>
              )}
            />
          )}

          <Controller
            control={control}
            name="new_password"
            rules={{
              required: 'New password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters long',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputContainer}>
                <TextInput
                  label="New Password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showNewPassword}
                  mode="outlined"
                  error={!!errors.new_password}
                  left={<TextInput.Icon icon="lock" />}
                  right={
                    <TextInput.Icon
                      icon={showNewPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                    />
                  }
                />
                {errors.new_password && (
                  <HelperText type="error" visible={true}>
                    {errors.new_password.message}
                  </HelperText>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="new_password_confirmation"
            rules={{
              required: 'Please confirm your new password',
              validate: (val) => val === newPassword || 'Passwords do not match',
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.inputContainer}>
                <TextInput
                  label="Confirm New Password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showConfirmPassword}
                  mode="outlined"
                  error={!!errors.new_password_confirmation}
                  left={<TextInput.Icon icon="lock-check" />}
                  right={
                    <TextInput.Icon
                      icon={showConfirmPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    />
                  }
                />
                {errors.new_password_confirmation && (
                  <HelperText type="error" visible={true}>
                    {errors.new_password_confirmation.message}
                  </HelperText>
                )}
              </View>
            )}
          />

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Change Password
          </Button>

          {forceChange && (
            <Button
              mode="outlined"
              onPress={handleLogout}
              style={[styles.button, styles.logoutBtn]}
              textColor={theme.colors.error}
            >
              Sign Out
            </Button>
          )}
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  warningBanner: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  card: {
    padding: 24,
    borderRadius: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  logoutBtn: {
    marginTop: 12,
    borderWidth: 1,
  },
  alertText: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
  successText: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 15,
    fontWeight: 'bold',
  },
});
