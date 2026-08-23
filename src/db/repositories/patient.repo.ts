import { getDatabase } from '../client';
import { patients, patientPhotos, visits, Patient, NewPatient } from '../schema';
import { eq, isNull, and, or, like, desc, sql, inArray } from 'drizzle-orm';
import { appendAuditLog } from './audit.repo';

export interface PatientWithMeta extends Patient {
  profilePhoto?: string | null;
  visitCount: number;
  lastVisitDate?: string | null;
}

/**
 * Generates the next sequential unique patient number (e.g. PAT-000001).
 */
export async function generateNextPatientNumber(): Promise<string> {
  const { db } = await getDatabase();
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(patients);

  const nextIndex = (result?.count ?? 0) + 1;
  return `PAT-${nextIndex.toString().padStart(6, '0')}`;
}

/**
 * Creates a new patient record.
 */
export async function createPatient(data: {
  name: string;
  phone: string;
  dateOfBirth?: string | null;
  estimatedAge?: number | null;
  gender: string;
  address?: string | null;
  bloodGroup?: string | null;
  allergies?: string | null;
  emergencyContact?: string | null;
  notes?: string | null;
}): Promise<Patient> {
  const { db } = await getDatabase();
  const id = `pat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const patientNumber = await generateNextPatientNumber();
  const now = Date.now();

  const newPatient: NewPatient = {
    id,
    patientNumber,
    name: data.name.trim(),
    phone: data.phone.trim(),
    dateOfBirth: data.dateOfBirth || null,
    estimatedAge: data.estimatedAge || null,
    gender: data.gender,
    address: data.address?.trim() || null,
    bloodGroup: data.bloodGroup?.trim() || null,
    allergies: data.allergies?.trim() || null,
    emergencyContact: data.emergencyContact?.trim() || null,
    notes: data.notes?.trim() || null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(patients).values(newPatient);

  await appendAuditLog({
    action: 'PATIENT_CREATED',
    entityType: 'PATIENT',
    entityId: id,
    metadata: { patientNumber, name: newPatient.name, phone: newPatient.phone },
  });

  return newPatient as Patient;
}

/**
 * Searches active patients by Name, Phone, or Patient ID.
 */
export async function searchPatients(query: string = '', limit = 60): Promise<PatientWithMeta[]> {
  const { db } = await getDatabase();
  const trimmed = query.trim();

  let condition = isNull(patients.deletedAt);
  if (trimmed.length > 0) {
    const searchPattern = `%${trimmed}%`;
    condition = and(
      isNull(patients.deletedAt),
      or(
        like(patients.name, searchPattern),
        like(patients.phone, searchPattern),
        like(patients.patientNumber, searchPattern)
      )
    )!;
  }

  const patientRecords = await db
    .select()
    .from(patients)
    .where(condition)
    .orderBy(desc(patients.updatedAt))
    .limit(limit);

  if (patientRecords.length === 0) {
    return [];
  }

  const patientIds = patientRecords.map((p) => p.id);

  // Batch query for latest profile photos
  const photos = await db
    .select()
    .from(patientPhotos)
    .where(
      and(
        inArray(patientPhotos.patientId, patientIds),
        eq(patientPhotos.photoType, 'PROFILE'),
        isNull(patientPhotos.deletedAt)
      )
    )
    .orderBy(desc(patientPhotos.createdAt));

  const photoMap = new Map<string, string>();
  for (const ph of photos) {
    if (!photoMap.has(ph.patientId)) {
      photoMap.set(ph.patientId, ph.filePath);
    }
  }

  // Batch query for visit statistics
  const visitStats = await db
    .select({
      patientId: visits.patientId,
      count: sql<number>`count(*)`,
      lastVisit: sql<string>`max(${visits.visitDate})`,
    })
    .from(visits)
    .where(and(inArray(visits.patientId, patientIds), isNull(visits.deletedAt)))
    .groupBy(visits.patientId);

  const visitStatMap = new Map<string, { count: number; lastVisit: string | null }>();
  for (const vs of visitStats) {
    visitStatMap.set(vs.patientId, { count: vs.count, lastVisit: vs.lastVisit });
  }

  return patientRecords.map((pat) => {
    const stat = visitStatMap.get(pat.id);
    return {
      ...pat,
      profilePhoto: photoMap.get(pat.id) || null,
      visitCount: stat?.count || 0,
      lastVisitDate: stat?.lastVisit || null,
    };
  });
}

/**
 * Retrieves a single patient by ID.
 */
export async function getPatientById(id: string): Promise<PatientWithMeta | null> {
  const { db } = await getDatabase();
  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, id), isNull(patients.deletedAt)));

  if (!patient) return null;

  const [photo] = await db
    .select()
    .from(patientPhotos)
    .where(
      and(
        eq(patientPhotos.patientId, patient.id),
        eq(patientPhotos.photoType, 'PROFILE'),
        isNull(patientPhotos.deletedAt)
      )
    )
    .orderBy(desc(patientPhotos.createdAt))
    .limit(1);

  const [visitStat] = await db
    .select({
      count: sql<number>`count(*)`,
      lastVisit: sql<string>`max(${visits.visitDate})`,
    })
    .from(visits)
    .where(and(eq(visits.patientId, patient.id), isNull(visits.deletedAt)));

  return {
    ...patient,
    profilePhoto: photo?.filePath || null,
    visitCount: visitStat?.count || 0,
    lastVisitDate: visitStat?.lastVisit || null,
  };
}

/**
 * Updates a patient record.
 */
export async function updatePatient(
  id: string,
  data: Partial<Omit<NewPatient, 'id' | 'patientNumber' | 'createdAt'>>
): Promise<void> {
  const { db } = await getDatabase();
  const now = Date.now();

  await db
    .update(patients)
    .set({
      ...data,
      updatedAt: now,
    })
    .where(eq(patients.id, id));

  await appendAuditLog({
    action: 'PATIENT_UPDATED',
    entityType: 'PATIENT',
    entityId: id,
    metadata: data,
  });
}

/**
 * Soft deletes a patient.
 */
export async function softDeletePatient(id: string): Promise<void> {
  const { db } = await getDatabase();
  const now = Date.now();

  await db
    .update(patients)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(patients.id, id));

  await appendAuditLog({
    action: 'PATIENT_ARCHIVED',
    entityType: 'PATIENT',
    entityId: id,
  });
}
