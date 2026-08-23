import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const DB_MASTER_KEY_ALIAS = 'aarogya_clinic_db_master_key_v1';
const APP_INSTALLATION_ID_ALIAS = 'aarogya_clinic_installation_id';

/**
 * Retrieves the persistent 256-bit SQLCipher database master key from SecureStore.
 * If not present (first launch), generates a cryptographically secure 256-bit hex key.
 */
export async function getOrCreateDatabaseMasterKey(): Promise<string> {
  let masterKey = await SecureStore.getItemAsync(DB_MASTER_KEY_ALIAS);
  if (!masterKey) {
    // Generate 32 cryptographically secure random bytes (256-bit key)
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    masterKey = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    await SecureStore.setItemAsync(DB_MASTER_KEY_ALIAS, masterKey, {
      keychainAccessible: SecureStore.ALWAYS_THIS_DEVICE_ONLY,
    });
  }
  return masterKey;
}

/**
 * Checks if the database master key already exists in SecureStore.
 */
export async function hasDatabaseMasterKey(): Promise<boolean> {
  const key = await SecureStore.getItemAsync(DB_MASTER_KEY_ALIAS);
  return Boolean(key);
}

/**
 * Sets a new master key (used when restoring a backup into a fresh installation).
 */
export async function setDatabaseMasterKey(newKey: string): Promise<void> {
  await SecureStore.setItemAsync(DB_MASTER_KEY_ALIAS, newKey, {
    keychainAccessible: SecureStore.ALWAYS_THIS_DEVICE_ONLY,
  });
}

/**
 * Gets or creates a persistent installation ID.
 */
export async function getOrCreateInstallationId(): Promise<string> {
  let id = await SecureStore.getItemAsync(APP_INSTALLATION_ID_ALIAS);
  if (!id) {
    const bytes = await Crypto.getRandomBytesAsync(16);
    id = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    await SecureStore.setItemAsync(APP_INSTALLATION_ID_ALIAS, id);
  }
  return id;
}
