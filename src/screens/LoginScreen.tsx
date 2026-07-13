import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';

interface LoginForm {
  mobile: string;
  password: string;
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    defaultValues: { mobile: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await api.post('/login', {
        mobile: data.mobile,
        password: data.password,
      });
      const { token, user } = response.data;
      setAuth(token, user);
    } catch (error: any) {
      if (error.response?.data?.message) {
        setErrorMsg(error.response.data.message);
      } else {
        setErrorMsg('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo ── */}
        <View style={styles.logoBlock}>
          <Image
            source={require('../../assets/kpmg_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.dividerLine} />
          <Text style={styles.appName}>Lead Manager</Text>
          <Text style={styles.appSub}>Laptop Sales &amp; Services</Text>
        </View>

        {/* ── Card ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSub}>Enter your credentials to continue</Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Mobile */}
          <Controller
            control={control}
            name="mobile"
            rules={{
              required: 'Mobile number is required',
              pattern: { value: /^[0-9]{10}$/, message: 'Enter a valid 10-digit number' },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.fieldWrap}>
                <TextInput
                  label="Mobile Number"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  mode="outlined"
                  error={!!errors.mobile}
                  left={<TextInput.Icon icon="phone-outline" />}
                  outlineStyle={styles.outline}
                  outlineColor="#D1D5DB"
                  activeOutlineColor="#03307e"
                />
                {errors.mobile && (
                  <HelperText type="error" visible>{errors.mobile.message}</HelperText>
                )}
              </View>
            )}
          />

          {/* Password */}
          <Controller
            control={control}
            name="password"
            rules={{ required: 'Password is required' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.fieldWrap}>
                <TextInput
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  mode="outlined"
                  error={!!errors.password}
                  left={<TextInput.Icon icon="lock-outline" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  outlineStyle={styles.outline}
                  outlineColor="#D1D5DB"
                  activeOutlineColor="#03307e"
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
            style={styles.btn}
            contentStyle={styles.btnContent}
            labelStyle={styles.btnLabel}
            buttonColor="#03307e"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>

          <Text style={styles.footNote}>
            For account access, contact your system administrator.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F3F4F6' },

  scroll: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },

  /* Logo block */
  logoBlock: { alignItems: 'center', marginBottom: 20 },
  logo: { width: 200, height: 68 },
  dividerLine: {
    width: 40, height: 2, backgroundColor: '#03307e',
    borderRadius: 2, marginTop: 10, marginBottom: 8,
  },
  appName: { fontSize: 18, fontWeight: '700', color: '#111827', letterSpacing: 0.3 },
  appSub: { fontSize: 13, color: '#6B7280', marginTop: 3 },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 3 },
  cardSub: { fontSize: 13, color: '#6B7280', marginBottom: 18 },

  /* Error */
  errorBox: {
    backgroundColor: '#FEF2F2', borderRadius: 8,
    borderLeftWidth: 3, borderLeftColor: '#EF4444',
    padding: 10, marginBottom: 14,
  },
  errorText: { color: '#B91C1C', fontSize: 13 },

  /* Fields */
  fieldWrap: { marginBottom: 10 },
  outline: { borderRadius: 8 },

  /* Button */
  btn: { marginTop: 12, borderRadius: 8 },
  btnContent: { paddingVertical: 6 },
  btnLabel: { fontSize: 15, fontWeight: '700', letterSpacing: 0.4 },

  /* Footer */
  footNote: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 16 },
});
