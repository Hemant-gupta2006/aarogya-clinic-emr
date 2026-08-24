import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../src/constants/theme';
import { Lock, Fingerprint, Delete, ShieldCheck } from 'lucide-react-native';

export default function UnlockScreen() {
  const { unlockWithPin, unlockWithBiometrics, biometricActive } = useAuth();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Auto-trigger biometric prompt on screen mount if enabled
    if (biometricActive) {
      handleBiometricUnlock();
    }
  }, [biometricActive]);

  const handleBiometricUnlock = async () => {
    setErrorMsg('');
    const success = await unlockWithBiometrics();
    if (!success) {
      // User cancelled or biometric failed, fall back to PIN
    }
  };

  const handleKeyPress = async (digit: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    setErrorMsg('');

    if (newPin.length >= 4) {
      setLoading(true);
      const success = await unlockWithPin(newPin);
      setLoading(false);
      if (!success) {
        if (newPin.length === 6) {
          setErrorMsg('Incorrect PIN. Please try again.');
          setPin('');
        }
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setErrorMsg('');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, theme.spacing.xl), paddingBottom: Math.max(insets.bottom, theme.spacing.lg) }]}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <ShieldCheck size={38} color={theme.colors.primaryDark} />
        </View>
        <Text style={styles.title}>AarogyaEMR</Text>
        <Text style={styles.subtitle}>Enter your secure PIN to access clinic records</Text>
      </View>

      {/* PIN Dots Display */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index < pin.length && styles.dotFilled,
              errorMsg ? styles.dotError : null,
            ]}
          />
        ))}
      </View>

      {errorMsg ? (
        <Text style={styles.errorText}>{errorMsg}</Text>
      ) : (
        <View style={styles.placeholderSpace}>
          {loading && <ActivityIndicator size="small" color={theme.colors.primary} />}
        </View>
      )}

      {/* Numeric Keypad */}
      <View style={styles.keypad}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
        ].map((row, rIdx) => (
          <View key={rIdx} style={styles.keypadRow}>
            {row.map((digit) => (
              <TouchableOpacity
                key={digit}
                style={styles.keyButton}
                onPress={() => handleKeyPress(digit)}
                activeOpacity={0.7}
              >
                <Text style={styles.keyText}>{digit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={styles.keypadRow}>
          {biometricActive ? (
            <TouchableOpacity
              style={[styles.keyButton, styles.specialKey]}
              onPress={handleBiometricUnlock}
              activeOpacity={0.7}
            >
              <Fingerprint size={28} color={theme.colors.primaryDark} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.keyButton, styles.keyInvisible]} />
          )}

          <TouchableOpacity
            style={styles.keyButton}
            onPress={() => handleKeyPress('0')}
            activeOpacity={0.7}
          >
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.keyButton, styles.specialKey]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Delete size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.cardBorderHighlight,
    ...theme.shadows.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.primaryDark,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginVertical: theme.spacing.md,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.surface,
  },
  dotFilled: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dotError: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.danger,
  },
  placeholderSpace: {
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
    textAlign: 'center',
    height: 24,
    fontWeight: '600',
  },
  keypad: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 320,
    marginBottom: theme.spacing.lg,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  specialKey: {
    backgroundColor: theme.colors.background,
  },
  keyInvisible: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
});

