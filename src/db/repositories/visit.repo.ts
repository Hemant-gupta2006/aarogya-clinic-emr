import { getDatabase } from '../client';
import { visits, prescriptions, prescriptionItems, Visit, Prescription, PrescriptionItem } from '../schema';
import { eq, isNull, and, desc, inArray } from 'drizzle-orm';
import { appendAuditLog } from './audit.repo';

export interface VitalsData {
  bpSystolic?: string | number | null;
  bpDiastolic?: string | number | null;
  pulse?: string | number | null;
  temperature?: string | number | null;
  weight?: string | number | null;
  spo2?: string | number | null;
}

export interface PrescriptionItemInput {
  medicineName: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

export interface CreateVisitInput {
  patientId: string;
  visitDate: string; // YYYY-MM-DD
  visitTime: string; // HH:mm
  symptoms?: string;
  diagnosis?: string;
  treatment?: string;
  vitals?: VitalsData | string | null;
  charges?: string | null;
  report?: string | null;
  notes?: string;
  prescription?: {
    instructions?: string;
    items: PrescriptionItemInput[];
  };
}

export interface UpdateVisitInput {
  visitDate?: string;
  visitTime?: string;
  symptoms?: string;
  diagnosis?: string;
  treatment?: string;
  vitals?: VitalsData | string | null;
  charges?: string | null;
  report?: string | null;
  notes?: string;
  prescription?: {
    instructions?: string;
    items: PrescriptionItemInput[];
  };
}

export interface VisitWithDetails extends Visit {
  prescription?: {
    id: string;
    instructions?: string | null;
    items: PrescriptionItem[];
  } | null;
}

/**
 * Creates a consultation visit with optional prescription and structured items.
 */
export async function createVisit(input: CreateVisitInput): Promise<VisitWithDetails> {
  const { db } = await getDatabase();
  const now = Date.now();
  const visitId = `vst_${now}_${Math.random().toString(36).substring(2, 9)}`;

  const vitalsStr =
    typeof input.vitals === 'object' && input.vitals !== null
      ? JSON.stringify(input.vitals)
      : typeof input.vitals === 'string'
      ? input.vitals
      : null;

  const newVisit: Visit = {
    id: visitId,
    patientId: input.patientId,
    visitDate: input.visitDate,
    visitTime: input.visitTime,
    symptoms: input.symptoms?.trim() || null,
    diagnosis: input.diagnosis?.trim() || null,
    treatment: input.treatment?.trim() || null,
    vitals: vitalsStr,
    charges: input.charges?.trim() || null,
    report: input.report?.trim() || null,
    notes: input.notes?.trim() || null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(visits).values(newVisit);

  let createdPrescription: VisitWithDetails['prescription'] = null;

  if (input.prescription && (input.prescription.items.length > 0 || input.prescription.instructions)) {
    const prescriptionId = `rx_${now}_${Math.random().toString(36).substring(2, 9)}`;
    const newRx: Prescription = {
      id: prescriptionId,
      visitId: visitId,
      instructions: input.prescription.instructions?.trim() || null,
      deletedAt: null,
      createdAt: now,
    };

    await db.insert(prescriptions).values(newRx);

    const insertedItems: PrescriptionItem[] = [];
    for (const item of input.prescription.items) {
      if (!item.medicineName?.trim()) continue;

      const itemId = `rxi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newItem: PrescriptionItem = {
        id: itemId,
        prescriptionId: prescriptionId,
        medicineName: item.medicineName.trim(),
        dosage: item.dosage?.trim() || null,
        frequency: item.frequency?.trim() || null,
        duration: item.duration?.trim() || null,
        instructions: item.instructions?.trim() || null,
      };

      await db.insert(prescriptionItems).values(newItem);
      insertedItems.push(newItem);
    }

    createdPrescription = {
      id: prescriptionId,
      instructions: newRx.instructions,
      items: insertedItems,
    };
  }

  await appendAuditLog({
    action: 'VISIT_CREATED',
    entityType: 'VISIT',
    entityId: visitId,
    metadata: {
      patientId: input.patientId,
      visitDate: input.visitDate,
      diagnosis: input.diagnosis,
      charges: input.charges,
      itemCount: input.prescription?.items.length || 0,
    },
  });

  return {
    ...newVisit,
    prescription: createdPrescription,
  };
}

/**
 * Updates an existing consultation visit.
 */
export async function updateVisit(visitId: string, input: UpdateVisitInput): Promise<void> {
  const { db } = await getDatabase();
  const now = Date.now();

  const vitalsStr =
    typeof input.vitals === 'object' && input.vitals !== null
      ? JSON.stringify(input.vitals)
      : typeof input.vitals === 'string'
      ? input.vitals
      : undefined;

  const updatePayload: Partial<Visit> = {
    updatedAt: now,
  };

  if (input.visitDate !== undefined) updatePayload.visitDate = input.visitDate;
  if (input.visitTime !== undefined) updatePayload.visitTime = input.visitTime;
  if (input.symptoms !== undefined) updatePayload.symptoms = input.symptoms?.trim() || null;
  if (input.diagnosis !== undefined) updatePayload.diagnosis = input.diagnosis?.trim() || null;
  if (input.treatment !== undefined) updatePayload.treatment = input.treatment?.trim() || null;
  if (vitalsStr !== undefined) updatePayload.vitals = vitalsStr;
  if (input.charges !== undefined) updatePayload.charges = input.charges?.trim() || null;
  if (input.report !== undefined) updatePayload.report = input.report?.trim() || null;
  if (input.notes !== undefined) updatePayload.notes = input.notes?.trim() || null;

  await db.update(visits).set(updatePayload).where(eq(visits.id, visitId));

  if (input.prescription) {
    const [existingRx] = await db
      .select()
      .from(prescriptions)
      .where(and(eq(prescriptions.visitId, visitId), isNull(prescriptions.deletedAt)))
      .limit(1);

    let rxId = existingRx?.id;
    if (!rxId) {
      rxId = `rx_${now}_${Math.random().toString(36).substring(2, 9)}`;
      await db.insert(prescriptions).values({
        id: rxId,
        visitId: visitId,
        instructions: input.prescription.instructions?.trim() || null,
        deletedAt: null,
        createdAt: now,
      });
    } else {
      await db
        .update(prescriptions)
        .set({ instructions: input.prescription.instructions?.trim() || null })
        .where(eq(prescriptions.id, rxId));

      // Remove previous items
      await db.delete(prescriptionItems).where(eq(prescriptionItems.prescriptionId, rxId));
    }

    for (const item of input.prescription.items) {
      if (!item.medicineName?.trim()) continue;
      const itemId = `rxi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await db.insert(prescriptionItems).values({
        id: itemId,
        prescriptionId: rxId,
        medicineName: item.medicineName.trim(),
        dosage: item.dosage?.trim() || null,
        frequency: item.frequency?.trim() || null,
        duration: item.duration?.trim() || null,
        instructions: item.instructions?.trim() || null,
      });
    }
  }

  await appendAuditLog({
    action: 'VISIT_UPDATED',
    entityType: 'VISIT',
    entityId: visitId,
    metadata: {
      diagnosis: input.diagnosis,
      charges: input.charges,
    },
  });
}

/**
 * Retrieves the longitudinal visit history for a specific patient.
 */
export async function getPatientVisits(patientId: string): Promise<VisitWithDetails[]> {
  const { db } = await getDatabase();
  const visitRecords = await db
    .select()
    .from(visits)
    .where(and(eq(visits.patientId, patientId), isNull(visits.deletedAt)))
    .orderBy(desc(visits.visitDate), desc(visits.visitTime), desc(visits.createdAt));

  if (visitRecords.length === 0) return [];

  const visitIds = visitRecords.map((v) => v.id);

  // Batch fetch all prescriptions for these visits
  const rxRecords = await db
    .select()
    .from(prescriptions)
    .where(and(inArray(prescriptions.visitId, visitIds), isNull(prescriptions.deletedAt)));

  const rxIds = rxRecords.map((r) => r.id);
  const items =
    rxIds.length > 0
      ? await db
          .select()
          .from(prescriptionItems)
          .where(inArray(prescriptionItems.prescriptionId, rxIds))
      : [];

  const itemsMap = new Map<string, PrescriptionItem[]>();
  for (const item of items) {
    const list = itemsMap.get(item.prescriptionId) || [];
    list.push(item);
    itemsMap.set(item.prescriptionId, list);
  }

  const rxMap = new Map<string, VisitWithDetails['prescription']>();
  for (const rx of rxRecords) {
    rxMap.set(rx.visitId, {
      id: rx.id,
      instructions: rx.instructions,
      items: itemsMap.get(rx.id) || [],
    });
  }

  return visitRecords.map((v) => ({
    ...v,
    prescription: rxMap.get(v.id) || null,
  }));
}

/**
 * Retrieves a single visit by ID.
 */
export async function getVisitById(visitId: string): Promise<VisitWithDetails | null> {
  const { db } = await getDatabase();
  const [visit] = await db
    .select()
    .from(visits)
    .where(and(eq(visits.id, visitId), isNull(visits.deletedAt)));

  if (!visit) return null;

  const [rx] = await db
    .select()
    .from(prescriptions)
    .where(and(eq(prescriptions.visitId, visit.id), isNull(prescriptions.deletedAt)))
    .limit(1);

  let prescriptionDetail: VisitWithDetails['prescription'] = null;
  if (rx) {
    const items = await db
      .select()
      .from(prescriptionItems)
      .where(eq(prescriptionItems.prescriptionId, rx.id));

    prescriptionDetail = {
      id: rx.id,
      instructions: rx.instructions,
      items,
    };
  }

  return {
    ...visit,
    prescription: prescriptionDetail,
  };
}

/**
 * Soft-deletes a visit.
 */
export async function softDeleteVisit(visitId: string): Promise<void> {
  const { db } = await getDatabase();
  const now = Date.now();
  await db
    .update(visits)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(visits.id, visitId));

  await appendAuditLog({
    action: 'VISIT_ARCHIVED',
    entityType: 'VISIT',
    entityId: visitId,
  });
}
