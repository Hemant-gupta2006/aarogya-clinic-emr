import * as FileSystem from 'expo-file-system/legacy';
import { DB_NAME } from '../db/client';

export interface StorageBreakdown {
  databaseBytes: number;
  photosBytes: number;
  backupsBytes: number;
  totalAppBytes: number;
  deviceFreeBytes: number;
  isLowStorage: boolean;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export async function calculateStorageBreakdown(): Promise<StorageBreakdown> {
  let databaseBytes = 0;
  let photosBytes = 0;
  let backupsBytes = 0;

  // 1. Database file size
  try {
    const dbPath = `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;
    const dbInfo = await FileSystem.getInfoAsync(dbPath);
    if (dbInfo.exists && 'size' in dbInfo) {
      databaseBytes = dbInfo.size;
    }
  } catch {
    // Ignore error
  }

  // 2. Photos media directory size
  try {
    const photosDir = `${FileSystem.documentDirectory}media/photos/`;
    const dirInfo = await FileSystem.getInfoAsync(photosDir);
    if (dirInfo.exists) {
      const files = await FileSystem.readDirectoryAsync(photosDir);
      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${photosDir}${file}`);
        if (fileInfo.exists && 'size' in fileInfo) {
          photosBytes += fileInfo.size;
        }
      }
    }
  } catch {
    // Ignore error
  }

  // 3. Backups directory size
  try {
    const backupsDir = `${FileSystem.documentDirectory}backups/`;
    const dirInfo = await FileSystem.getInfoAsync(backupsDir);
    if (dirInfo.exists) {
      const files = await FileSystem.readDirectoryAsync(backupsDir);
      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${backupsDir}${file}`);
        if (fileInfo.exists && 'size' in fileInfo) {
          backupsBytes += fileInfo.size;
        }
      }
    }
  } catch {
    // Ignore error
  }

  // 4. Device free disk storage
  let deviceFreeBytes = 0;
  try {
    deviceFreeBytes = await FileSystem.getFreeDiskStorageAsync();
  } catch {
    deviceFreeBytes = 10 * 1024 * 1024 * 1024; // Fallback 10GB
  }

  const totalAppBytes = databaseBytes + photosBytes + backupsBytes;
  const isLowStorage = deviceFreeBytes < 500 * 1024 * 1024; // Less than 500MB is low storage

  return {
    databaseBytes,
    photosBytes,
    backupsBytes,
    totalAppBytes,
    deviceFreeBytes,
    isLowStorage,
  };
}
