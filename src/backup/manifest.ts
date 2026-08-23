export interface BackupMediaItem {
  id: string;
  patientId: string;
  relativePath: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
}

export interface BackupManifest {
  format: 'clinicbackup';
  version: 1;
  appVersion: string;
  schemaVersion: string;
  createdAt: string; // ISO 8601 string
  clinicInfo: {
    clinicName: string;
    doctorName: string;
  };
  counts: {
    patients: number;
    visits: number;
    prescriptions: number;
    photos: number;
    auditLogs: number;
  };
  integrity: {
    databaseSha256: string;
    mediaCount: number;
    totalBytes: number;
  };
  media: BackupMediaItem[];
}

export interface EncryptedBackupPackage {
  header: {
    format: 'clinicbackup-sealed';
    version: 1;
    kdf: {
      algorithm: 'PBKDF2-HMAC-SHA256';
      iterations: number;
      saltHex: string;
    };
    cipher: {
      algorithm: 'AES-256-GCM';
      ivHex: string;
      tagHex: string;
    };
  };
  ciphertext: string; // Base64 or Hex encoded encrypted payload
}
