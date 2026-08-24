import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../src/constants/theme';
import { checkBiometricHardware } from '../../src/security/biometric';
import { setBiometricEnabled } from '../../src/security/pin';
import { ShieldCheck, Lock, Fingerprint } from 'lucide-react-native';

export default function PinSetupScreen() {
  const { setupPin } = useAuth();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [enableBio, setEnableBio] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioType, setBioType] = useState('Biometrics');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkBio() {
      const { hasHardware, isEnrolled, supportedTypes } = await checkBiometricHardware();
      if (hasHardware && isEnrolled) {
        setBioAvailable(true);
        if (supportedTypes.length > 0) {
          setBioType(supportedTypes[0]);
        }
        setEnableBio(true);
      }
    }
    checkBio();
  }, []);

  const handleSavePin = async () => {
    if (pin.length < 4) {
      Alert.alert('Invalid PIN', 'Please enter at least a 4-digit security PIN.');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('Mismatch', 'PINs do not match. Please re-enter.');
      return;
    }

    try {
      setLoading(true);
      await setupPin(pin);
      if (bioAvailable && enableBio) {
        await setBiometricEnabled(true);
      }
    } catch {
      Alert.alert('Error', 'Failed to initialize security credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: Math.max(insets.top, theme.spacing.lg), paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <ShieldCheck size={44} color={theme.colors.primaryLight} />
        </View>

        <Text style={styles.title}>Welcome, Doctor</Text>
        <Text style={styles.subtitle}>
          Create a private security PIN to protect patient medical records and the local encrypted database.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Enter Security PIN (4-6 digits)</Text>
          <View style={styles.inputWrapper}>
            <Lock size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••"
              placeholderTextColor={theme.colors.textMuted}
              value={pin}
              onChangeText={setPin}
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm Security PIN</Text>
          <View style={styles.inputWrapper}>
            <Lock size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••"
              placeholderTextColor={theme.colors.textMuted}
              value={confirmPin}
              onChangeText={setConfirmPin}
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
            />
          </View>
        </View>

        {bioAvailable && (
          <View style={styles.switchRow}>
            <View style={styles.switchLeft}>
              <Fingerprint size={22} color={theme.colors.primaryLight} />
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchTitle}>Enable {bioType}</Text>
                <Text style={styles.switchSubtitle}>Unlock quickly with fingerprint or face</Text>
              </View>
            </View>
            <Switch
              value={enableBio}
              onValueChange={setEnableBio}
              trackColor={{ false: theme.colors.cardBorder, true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={handleSavePin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Initializing Clinic Database...' : 'Set PIN & Get Started'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    color: theme.colors.text,
    fontSize: 18,
    letterSpacing: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginVertical: theme.spacing.md,
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  switchTextContainer: {
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  switchSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    height: 52,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
