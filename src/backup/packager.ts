import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { getDatabase } from '../db/client';
import {
  patients,
  patientPhotos,
  visits,
  prescriptions,
  prescriptionItems,
  auditLogs,
  appMetadata,
  appSettings,
} from '../db/schema';
import { BackupManifest, BackupMediaItem, EncryptedBackupPackage } from './manifest';
import { encryptBackupPayload } from './crypto';
import { appendAuditLog } from '../db/repositories/audit.repo';
import { setMetadataValue } from '../db/repositories/metadata.repo';

export interface CreateBackupResult {
  filePath: string;
  fileName: string;
  manifest: BackupManifest;
  fileSizeBytes: number;
}

/**
 * Creates a consistent, logical, encrypted .clinicbackup archive.
 */
export async function createConsistentBackup(password: string): Promise<CreateBackupResult> {
  const { db } = await getDatabase();

  // 1. Fetch all table records
  const allPatients = await db.select().from(patients);
  const allPhotos = await db.select().from(patientPhotos);
  const allVisits = await db.select().from(visits);
  const allPrescriptions = await db.select().from(prescriptions);
  const allItems = await db.select().from(prescriptionItems);
  const allLogs = await db.select().from(auditLogs);
  const allMeta = await db.select().from(appMetadata);
  const allSettings = await db.select().from(appSettings);

  const clinicNameSetting = allSettings.find((s) => s.key === 'clinic_name')?.value || 'Aarogya Clinic';
  const doctorNameSetting = allSettings.find((s) => s.key === 'doctor_name')?.value || 'Doctor';

  // 2. Collect and hash patient photo media files
  const mediaItems: BackupMediaItem[] = [];
  const mediaPayload: { relativePath: string; base64: string; sha256: string }[] = [];
  let totalMediaBytes = 0;

  for (const photo of allPhotos) {
    if (photo.deletedAt !== null) continue; // Skip soft-deleted in media archive

    const photoAbsoluteUri = `${FileSystem.documentDirectory}${photo.filePath}`;
    const info = await FileSystem.getInfoAsync(photoAbsoluteUri);

    if (info.exists) {
      const base64 = await FileSystem.readAsStringAsync(photoAbsoluteUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const sha256 = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        base64
      );

      const size = 'size' in info ? info.size : 0;
      totalMediaBytes += size;

      const mediaItem: BackupMediaItem = {
        id: photo.id,
        patientId: photo.patientId,
        relativePath: photo.filePath,
        mimeType: photo.mimeType,
        fileSize: size,
        sha256,
      };

      mediaItems.push(mediaItem);
      mediaPayload.push({
        relativePath: photo.filePath,
        base64,
        sha256,
      });
    }
  }

  // 3. Compute Database consistency hash
  const tablesSnapshot = {
    patients: allPatients,
    patientPhotos: allPhotos,
    visits: allVisits,
    prescriptions: allPrescriptions,
    prescriptionItems: allItems,
    auditLogs: allLogs,
    appMetadata: allMeta,
    appSettings: allSettings,
  };

  const dbJson = JSON.stringify(tablesSnapshot);
  const databaseSha256 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    dbJson
  );

  // 4. Construct manifest
  const nowIso = new Date().toISOString();
  const manifest: BackupManifest = {
    format: 'clinicbackup',
    version: 1,
    appVersion: '1.0.0',
    schemaVersion: '1.0.0',
    createdAt: nowIso,
    clinicInfo: {
      clinicName: clinicNameSetting,
      doctorName: doctorNameSetting,
    },
    counts: {
      patients: allPatients.filter((p) => !p.deletedAt).length,
      visits: allVisits.filter((v) => !v.deletedAt).length,
      prescriptions: allPrescriptions.filter((p) => !p.deletedAt).length,
      photos: mediaItems.length,
      auditLogs: allLogs.length,
    },
    integrity: {
      databaseSha256,
      mediaCount: mediaItems.length,
      totalBytes: dbJson.length + totalMediaBytes,
    },
    media: mediaItems,
  };

  // 5. Build raw payload
  const fullBackupPayload = {
    manifest,
    tables: tablesSnapshot,
    media: mediaPayload,
  };

  const payloadString = JSON.stringify(fullBackupPayload);

  // 6. Encrypt payload with PBKDF2 KDF + AES-256
  const encrypted = await encryptBackupPayload(payloadString, password);

  const backupPackage: EncryptedBackupPackage = {
    header: {
      format: 'clinicbackup-sealed',
      version: 1,
      kdf: {
        algorithm: 'PBKDF2-HMAC-SHA256',
        iterations: encrypted.iterations,
        saltHex: encrypted.saltHex,
      },
      cipher: {
        algorithm: 'AES-256-GCM',
        ivHex: encrypted.ivHex,
        tagHex: encrypted.tagHex,
      },
    },
    ciphertext: encrypted.ciphertext,
  };

  // 7. Save to backups directory
  const backupsDir = `${FileSystem.documentDirectory}backups/`;
  const dirInfo = await FileSystem.getInfoAsync(backupsDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(backupsDir, { intermediates: true });
  }

  const dateStr = nowIso.split('T')[0];
  const fileName = `ClinicBackup_${dateStr}_${Date.now().toString().slice(-4)}.clinicbackup`;
  const filePath = `${backupsDir}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, JSON.stringify(backupPackage, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const fileInfo = await FileSystem.getInfoAsync(filePath);
  const fileSizeBytes = (fileInfo.exists && 'size' in fileInfo) ? fileInfo.size : 0;

  // 8. Record audit log and update metadata
  await appendAuditLog({
    action: 'BACKUP_CREATED',
    entityType: 'BACKUP',
    metadata: {
      fileName,
      counts: manifest.counts,
      databaseSha256,
    },
  });

  await setMetadataValue('last_backup_at', nowIso);
  await setMetadataValue('last_backup_hash', databaseSha256);

  return {
    filePath,
    fileName,
    manifest,
    fileSizeBytes,
  };
}
