import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Patients Table
 * Core demographic information. Uses deletedAt for soft-deletions / archiving.
 */
export const patients = sqliteTable('patients', {
  id: text('id').primaryKey(),
  patientNumber: text('patient_number').notNull().unique(), // e.g. PAT-000001
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  dateOfBirth: text('date_of_birth'), // YYYY-MM-DD
  estimatedAge: integer('estimated_age'), // Fallback if DOB unknown
  gender: text('gender').notNull(), // 'Male' | 'Female' | 'Other'
  address: text('address'),
  bloodGroup: text('blood_group'),
  allergies: text('allergies'),
  emergencyContact: text('emergency_contact'),
  notes: text('notes'),
  deletedAt: integer('deleted_at'), // Epoch timestamp in ms (null if active)
  createdAt: integer('created_at').notNull(), // Epoch timestamp in ms
  updatedAt: integer('updated_at').notNull(),
});

/**
 * Patient Photos Table
 * Stores metadata and relative local paths to private sandboxed images.
 */
export const patientPhotos = sqliteTable('patient_photos', {
  id: text('id').primaryKey(),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(), // Relative path in sandbox e.g. "photos/uuid.jpg"
  photoType: text('photo_type').notNull().default('PROFILE'), // 'PROFILE' | 'CLINICAL'
  mimeType: text('mime_type').notNull().default('image/jpeg'),
  fileSize: integer('file_size').notNull().default(0),
  sha256: text('sha256'),
  deletedAt: integer('deleted_at'),
  createdAt: integer('created_at').notNull(),
});

/**
 * Visits Table
 * Longitudinal clinical consultations.
 */
export const visits = sqliteTable('visits', {
  id: text('id').primaryKey(),
  patientId: text('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  visitDate: text('visit_date').notNull(), // YYYY-MM-DD
  visitTime: text('visit_time').notNull(), // HH:mm
  symptoms: text('symptoms'),
  diagnosis: text('diagnosis'),
  treatment: text('treatment'),
  vitals: text('vitals'), // JSON string: { bpSystolic, bpDiastolic, pulse, temperature, weight, spo2 }
  charges: text('charges'), // Consultation fee e.g. "500"
  report: text('report'), // Lab report remarks / references
  notes: text('notes'),
  deletedAt: integer('deleted_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

/**
 * Prescriptions Table
 * Associates a consultation visit with prescription header.
 */
export const prescriptions = sqliteTable('prescriptions', {
  id: text('id').primaryKey(),
  visitId: text('visit_id')
    .notNull()
    .references(() => visits.id, { onDelete: 'cascade' }),
  instructions: text('instructions'), // General prescription advice / dietary notes
  deletedAt: integer('deleted_at'),
  createdAt: integer('created_at').notNull(),
});

/**
 * Prescription Items Table
 * Structured medication lines.
 */
export const prescriptionItems = sqliteTable('prescription_items', {
  id: text('id').primaryKey(),
  prescriptionId: text('prescription_id')
    .notNull()
    .references(() => prescriptions.id, { onDelete: 'cascade' }),
  medicineName: text('medicine_name').notNull(),
  dosage: text('dosage'), // e.g. "500mg"
  frequency: text('frequency'), // e.g. "1-0-1 (After Food)" or "Twice daily"
  duration: text('duration'), // e.g. "5 Days"
  instructions: text('instructions'), // e.g. "Take with warm water"
});

/**
 * Append-Oriented Audit Logs Table
 * Tamper-evident trail with previous hash chaining.
 */
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  action: text('action').notNull(), // 'PATIENT_CREATED' | 'VISIT_CREATED' | 'BACKUP_CREATED' | etc.
  entityType: text('entity_type').notNull(), // 'PATIENT' | 'VISIT' | 'BACKUP' | 'AUTH'
  entityId: text('entity_id'),
  timestamp: integer('timestamp').notNull(),
  metadata: text('metadata'), // JSON string with changed fields or event context
  previousHash: text('previous_hash'), // Hash of previous log entry
  hash: text('hash').notNull(), // SHA-256 of (id + action + entityType + entityId + timestamp + metadata + previousHash)
});

/**
 * App Metadata Table
 * Tracks installation ID, schema version, last backup timestamp and backup hash.
 */
export const appMetadata = sqliteTable('app_metadata', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

/**
 * App Settings Table
 * Clinic Name, Doctor Name, Clinic Address, Contact, Auto-Lock timeout, etc.
 */
export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type PatientPhoto = typeof patientPhotos.$inferSelect;
export type NewPatientPhoto = typeof patientPhotos.$inferInsert;
export type Visit = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;
export type Prescription = typeof prescriptions.$inferSelect;
export type NewPrescription = typeof prescriptions.$inferInsert;
export type PrescriptionItem = typeof prescriptionItems.$inferSelect;
export type NewPrescriptionItem = typeof prescriptionItems.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type AppMetadata = typeof appMetadata.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
