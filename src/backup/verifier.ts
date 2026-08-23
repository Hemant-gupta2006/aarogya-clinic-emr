import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { EncryptedBackupPackage, BackupManifest } from './manifest';
import { decryptBackupPayload } from './crypto';

export interface DecryptedBackupContent {
  manifest: BackupManifest;
  tables: {
    patients: any[];
    patientPhotos: any[];
    visits: any[];
    prescriptions: any[];
    prescriptionItems: any[];
    auditLogs: any[];
    appMetadata: any[];
    appSettings: any[];
  };
  media: {
    relativePath: string;
    base64: string;
    sha256: string;
  }[];
}

/**
 * Inspects, authenticates, decrypts and validates an encrypted backup archive.
 * Throws explicit error messages if file is corrupted, password is wrong, or hashes mismatch.
 */
export async function verifyAndDecryptBackup(
  backupFileUri: string,
  password: string
): Promise<DecryptedBackupContent> {
  const fileContent = await FileSystem.readAsStringAsync(backupFileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let parsedPackage: EncryptedBackupPackage;
  try {
    parsedPackage = JSON.parse(fileContent);
  } catch {
    throw new Error('CORRUPTED_FILE: The selected file is not a valid JSON backup package.');
  }

  if (
    !parsedPackage.header ||
    parsedPackage.header.format !== 'clinicbackup-sealed' ||
    !parsedPackage.ciphertext
  ) {
    throw new Error('INVALID_FORMAT: The selected file is not a recognized Aarogya Clinic backup archive.');
  }

  const { kdf, cipher } = parsedPackage.header;

  // Decrypt and authenticate payload using PBKDF2 + AES-256 HMAC
  const decryptedJson = await decryptBackupPayload(
    parsedPackage.ciphertext,
    password,
    kdf.saltHex,
    cipher.ivHex,
    cipher.tagHex,
    kdf.iterations
  );

  let payload: DecryptedBackupContent;
  try {
    payload = JSON.parse(decryptedJson);
  } catch {
    throw new Error('PAYLOAD_CORRUPT: Decrypted payload contains invalid data structure.');
  }

  if (!payload.manifest || !payload.tables) {
    throw new Error('MANIFEST_MISSING: Backup package is missing required manifest or table data.');
  }

  // Verify database consistency hash
  const tablesJson = JSON.stringify(payload.tables);
  const computedDbHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    tablesJson
  );

  if (computedDbHash !== payload.manifest.integrity.databaseSha256) {
    throw new Error('INTEGRITY_MISMATCH: Database snapshot hash does not match backup manifest.');
  }

  // Verify media files hashes
  if (Array.isArray(payload.media)) {
    for (const item of payload.media) {
      const computedMediaHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        item.base64
      );
      if (computedMediaHash !== item.sha256) {
        throw new Error(`MEDIA_CORRUPTED: Photo ${item.relativePath} failed checksum verification.`);
      }
    }
  }

  return payload;
}
