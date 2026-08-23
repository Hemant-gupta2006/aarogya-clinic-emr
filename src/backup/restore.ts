import * as FileSystem from 'expo-file-system/legacy';
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
import { DecryptedBackupContent } from './verifier';
import { appendAuditLog } from '../db/repositories/audit.repo';

export interface RestoreResult {
  restoredPatients: number;
  restoredVisits: number;
  restoredPrescriptions: number;
  restoredPhotos: number;
  restoredLogs: number;
}

/**
 * Performs atomic restoration of verified backup tables and media files.
 */
export async function executeAtomicRestore(
  content: DecryptedBackupContent
): Promise<RestoreResult> {
  const { db, raw } = await getDatabase();

  // 1. Write media files to private document storage
  if (Array.isArray(content.media)) {
    for (const mediaItem of content.media) {
      const destinationUri = `${FileSystem.documentDirectory}${mediaItem.relativePath}`;
      // Ensure directory exists
      const parentDir = destinationUri.substring(0, destinationUri.lastIndexOf('/') + 1);
      const dirInfo = await FileSystem.getInfoAsync(parentDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
      }

      await FileSystem.writeAsStringAsync(destinationUri, mediaItem.base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
  }

  // 2. Perform atomic database swap within transaction
  await raw.withTransactionAsync(async () => {
    // Disable foreign key constraints temporarily during bulk replacement
    await raw.execAsync('PRAGMA foreign_keys = OFF;');

    // Clear existing tables
    await raw.execAsync(`
      DELETE FROM prescription_items;
      DELETE FROM prescriptions;
      DELETE FROM visits;
      DELETE FROM patient_photos;
      DELETE FROM patients;
      DELETE FROM audit_logs;
      DELETE FROM app_metadata;
      DELETE FROM app_settings;
    `);

    // Insert restored data
    const t = content.tables;

    if (t.patients?.length > 0) {
      for (const item of t.patients) {
        await db.insert(patients).values(item);
      }
    }

    if (t.patientPhotos?.length > 0) {
      for (const item of t.patientPhotos) {
        await db.insert(patientPhotos).values(item);
      }
    }

    if (t.visits?.length > 0) {
      for (const item of t.visits) {
        await db.insert(visits).values(item);
      }
    }

    if (t.prescriptions?.length > 0) {
      for (const item of t.prescriptions) {
        await db.insert(prescriptions).values(item);
      }
    }

    if (t.prescriptionItems?.length > 0) {
      for (const item of t.prescriptionItems) {
        await db.insert(prescriptionItems).values(item);
      }
    }

    if (t.auditLogs?.length > 0) {
      for (const item of t.auditLogs) {
        await db.insert(auditLogs).values(item);
      }
    }

    if (t.appMetadata?.length > 0) {
      for (const item of t.appMetadata) {
        await db.insert(appMetadata).values(item);
      }
    }

    if (t.appSettings?.length > 0) {
      for (const item of t.appSettings) {
        await db.insert(appSettings).values(item);
      }
    }

    await raw.execAsync('PRAGMA foreign_keys = ON;');
  });

  // 3. Record audit log entry for disaster recovery tracking
  await appendAuditLog({
    action: 'BACKUP_RESTORED',
    entityType: 'BACKUP',
    metadata: {
      manifestCreatedAt: content.manifest.createdAt,
      restoredCounts: content.manifest.counts,
      restoredAt: new Date().toISOString(),
    },
  });

  return {
    restoredPatients: content.tables.patients?.length || 0,
    restoredVisits: content.tables.visits?.length || 0,
    restoredPrescriptions: content.tables.prescriptions?.length || 0,
    restoredPhotos: content.media?.length || 0,
    restoredLogs: content.tables.auditLogs?.length || 0,
  };
}
