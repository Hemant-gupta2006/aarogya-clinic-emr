import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const PIN_HASH_ALIAS = 'aarogya_clinic_pin_hash';
const PIN_SALT_ALIAS = 'aarogya_clinic_pin_salt';
const BIOMETRIC_ENABLED_ALIAS = 'aarogya_clinic_biometric_enabled';
const AUTO_LOCK_TIMEOUT_ALIAS = 'aarogya_clinic_autolock_minutes';

/**
 * Derives a secure SHA-256 hash from the PIN + Salt.
 */
async function hashPin(pin: string, salt: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `salt:${salt}:pin:${pin}:pepper:aarogya_v1`
  );
}

/**
 * Checks if the user has already configured an app PIN.
 */
export async function isPinConfigured(): Promise<boolean> {
  const pinHash = await SecureStore.getItemAsync(PIN_HASH_ALIAS);
  return Boolean(pinHash);
}

/**
 * Sets a new application PIN.
 */
export async function setAppPin(pin: string): Promise<void> {
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const salt = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const hash = await hashPin(pin, salt);

  await SecureStore.setItemAsync(PIN_SALT_ALIAS, salt, {
    keychainAccessible: SecureStore.ALWAYS_THIS_DEVICE_ONLY,
  });
  await SecureStore.setItemAsync(PIN_HASH_ALIAS, hash, {
    keychainAccessible: SecureStore.ALWAYS_THIS_DEVICE_ONLY,
  });
}

/**
 * Verifies if the entered PIN matches the stored hash.
 */
export async function verifyAppPin(enteredPin: string): Promise<boolean> {
  const storedHash = await SecureStore.getItemAsync(PIN_HASH_ALIAS);
  const storedSalt = await SecureStore.getItemAsync(PIN_SALT_ALIAS);

  if (!storedHash || !storedSalt) {
    return false;
  }

  const computedHash = await hashPin(enteredPin, storedSalt);
  return computedHash === storedHash;
}

/**
 * Sets biometric unlock enabled / disabled.
 */
export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_ALIAS, enabled ? 'true' : 'false');
}

/**
 * Checks if biometric unlock is enabled.
 */
export async function isBiometricEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_ALIAS);
  return value === 'true';
}

/**
 * Gets the auto-lock timeout in minutes (default 5 minutes).
 */
export async function getAutoLockTimeout(): Promise<number> {
  const value = await SecureStore.getItemAsync(AUTO_LOCK_TIMEOUT_ALIAS);
  return value ? parseInt(value, 10) : 5;
}

/**
 * Sets the auto-lock timeout in minutes (0 = immediately on background).
 */
export async function setAutoLockTimeout(minutes: number): Promise<void> {
  await SecureStore.setItemAsync(AUTO_LOCK_TIMEOUT_ALIAS, minutes.toString());
}
