import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';
import { getOrCreateDatabaseMasterKey } from '../security/keys';

export const DB_NAME = 'aarogya_clinic.db';

let sqliteInstance: SQLite.SQLiteDatabase | null = null;
let drizzleInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Initializes and opens the local SQLite database.
 * If SQLCipher is active, applies encryption key.
 */
export async function getDatabase(): Promise<{
  db: ReturnType<typeof drizzle<typeof schema>>;
  raw: SQLite.SQLiteDatabase;
}> {
  if (drizzleInstance && sqliteInstance) {
    return { db: drizzleInstance, raw: sqliteInstance };
  }

  // Retrieve or generate 256-bit DB encryption key
  const encryptionKey = await getOrCreateDatabaseMasterKey();

  // Open database via expo-sqlite
  sqliteInstance = await SQLite.openDatabaseAsync(DB_NAME);

  // Set SQLCipher encryption key pragma if supported
  try {
    await sqliteInstance.execAsync(`PRAGMA key = '${encryptionKey}';`);
    await sqliteInstance.execAsync(`PRAGMA cipher_compatibility = 4;`);
  } catch {
    // If running in development without native cipher plugin, continues with standard SQLite
  }

  // Enable WAL mode & foreign keys for high performance & relational integrity
  await sqliteInstance.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  // Ensure tables and indexes exist
  await initializeTables(sqliteInstance);

  drizzleInstance = drizzle(sqliteInstance, { schema });
  return { db: drizzleInstance, raw: sqliteInstance };
}

/**
 * Creates database tables and optimized indexes if they do not already exist.
 */
async function initializeTables(raw: SQLite.SQLiteDatabase): Promise<void> {
  await raw.execAsync(`
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY NOT NULL,
      patient_number TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      date_of_birth TEXT,
      estimated_age INTEGER,
      gender TEXT NOT NULL,
      address TEXT,
      notes TEXT,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
    CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
    CREATE INDEX IF NOT EXISTS idx_patients_number ON patients(patient_number);
    CREATE INDEX IF NOT EXISTS idx_patients_deleted_at ON patients(deleted_at);

    CREATE TABLE IF NOT EXISTS patient_photos (
      id TEXT PRIMARY KEY NOT NULL,
      patient_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      photo_type TEXT NOT NULL DEFAULT 'PROFILE',
      mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
      file_size INTEGER NOT NULL DEFAULT 0,
      sha256 TEXT,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_photos_patient ON patient_photos(patient_id);
    CREATE INDEX IF NOT EXISTS idx_photos_deleted ON patient_photos(deleted_at);

    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY NOT NULL,
      patient_id TEXT NOT NULL,
      visit_date TEXT NOT NULL,
      visit_time TEXT NOT NULL,
      symptoms TEXT,
      diagnosis TEXT,
      treatment TEXT,
      notes TEXT,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);
    CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);
    CREATE INDEX IF NOT EXISTS idx_visits_deleted ON visits(deleted_at);

    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY NOT NULL,
      visit_id TEXT NOT NULL,
      instructions TEXT,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_prescriptions_visit ON prescriptions(visit_id);

    CREATE TABLE IF NOT EXISTS prescription_items (
      id TEXT PRIMARY KEY NOT NULL,
      prescription_id TEXT NOT NULL,
      medicine_name TEXT NOT NULL,
      dosage TEXT,
      frequency TEXT,
      duration TEXT,
      instructions TEXT,
      FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_items_prescription ON prescription_items(prescription_id);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      timestamp INTEGER NOT NULL,
      metadata TEXT,
      previous_hash TEXT,
      hash TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);

    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // Safe migrations for newly added columns
  try {
    await raw.execAsync(`ALTER TABLE visits ADD COLUMN vitals TEXT;`);
  } catch {}
  try {
    await raw.execAsync(`ALTER TABLE visits ADD COLUMN charges TEXT;`);
  } catch {}
  try {
    await raw.execAsync(`ALTER TABLE visits ADD COLUMN report TEXT;`);
  } catch {}
  try {
    await raw.execAsync(`ALTER TABLE patients ADD COLUMN blood_group TEXT;`);
  } catch {}
  try {
    await raw.execAsync(`ALTER TABLE patients ADD COLUMN allergies TEXT;`);
  } catch {}
  try {
    await raw.execAsync(`ALTER TABLE patients ADD COLUMN emergency_contact TEXT;`);
  } catch {}

  // Initialize standard metadata if not present
  const now = Date.now();
  await raw.execAsync(`
    INSERT OR IGNORE INTO app_metadata (key, value, updated_at) VALUES
      ('schema_version', '1.1.0', ${now}),
      ('app_version', '1.1.0', ${now});
    
    INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES
      ('clinic_name', 'Aarogya Clinic', ${now}),
      ('doctor_name', 'Dr. Sharma', ${now}),
      ('clinic_phone', '', ${now}),
      ('clinic_address', '', ${now});
  `);
}

/**
 * Closes the database connection.
 */
export async function closeDatabase(): Promise<void> {
  if (sqliteInstance) {
    await sqliteInstance.closeAsync();
    sqliteInstance = null;
    drizzleInstance = null;
  }
}
