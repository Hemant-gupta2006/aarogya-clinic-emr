import { getDatabase } from '../client';
import { patientPhotos, PatientPhoto, NewPatientPhoto } from '../schema';
import { eq, isNull, and, desc } from 'drizzle-orm';
import { appendAuditLog } from './audit.repo';

export async function addPatientPhoto(data: {
  patientId: string;
  filePath: string;
  photoType?: 'PROFILE' | 'CLINICAL';
  mimeType?: string;
  fileSize?: number;
  sha256?: string;
}): Promise<PatientPhoto> {
  const { db } = await getDatabase();
  const id = `pht_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = Date.now();
  const pType = data.photoType || 'PROFILE';

  // If adding a new PROFILE photo, soft-delete any existing PROFILE photo for this patient
  if (pType === 'PROFILE') {
    await db
      .update(patientPhotos)
      .set({ deletedAt: now })
      .where(and(eq(patientPhotos.patientId, data.patientId), eq(patientPhotos.photoType, 'PROFILE')));
  }

  const newPhoto: NewPatientPhoto = {
    id,
    patientId: data.patientId,
    filePath: data.filePath,
    photoType: pType,
    mimeType: data.mimeType || 'image/jpeg',
    fileSize: data.fileSize || 0,
    sha256: data.sha256 || null,
    deletedAt: null,
    createdAt: now,
  };

  await db.insert(patientPhotos).values(newPhoto);

  await appendAuditLog({
    action: 'PHOTO_ADDED',
    entityType: 'PHOTO',
    entityId: id,
    metadata: { patientId: data.patientId, photoType: newPhoto.photoType, filePath: data.filePath },
  });

  return newPhoto as PatientPhoto;
}

export async function getPatientPhotos(patientId: string): Promise<PatientPhoto[]> {
  const { db } = await getDatabase();
  return await db
    .select()
    .from(patientPhotos)
    .where(and(eq(patientPhotos.patientId, patientId), isNull(patientPhotos.deletedAt)))
    .orderBy(desc(patientPhotos.createdAt));
}

export async function softDeletePatientPhoto(photoId: string): Promise<void> {
  const { db } = await getDatabase();
  const now = Date.now();
  await db
    .update(patientPhotos)
    .set({ deletedAt: now })
    .where(eq(patientPhotos.id, photoId));

  await appendAuditLog({
    action: 'PHOTO_REMOVED',
    entityType: 'PHOTO',
    entityId: photoId,
  });
}
