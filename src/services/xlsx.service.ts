import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getDatabase } from '../db/client';
import { patients, visits, prescriptions, prescriptionItems } from '../db/schema';
import { isNull, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { VitalsData } from '../db/repositories/visit.repo';

export interface XlsxExportOptions {
  dateRangeType: 'ALL' | 'TODAY' | 'MONTH' | 'CUSTOM';
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export interface ClinicalReportSummary {
  periodLabel: string;
  startDate: string;
  endDate: string;
  uniquePatients: number;
  totalConsultations: number;
  newPatients: number;
  followUpConsultations: number;
  totalFees: number;
  consultations: Array<{
    visitId: string;
    visitDate: string;
    visitTime: string;
    patientId: string;
    patientNumber: string;
    patientName: string;
    gender: string;
    estimatedAge: number | null;
    phone: string;
    isNewPatient: boolean;
    diagnosis: string | null;
    charges: string | null;
  }>;
}

/**
 * Calculates date-wise clinical metrics and consultation records for a selected timeframe.
 */
export async function getClinicalReport(options: {
  rangeType: 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM' | 'ALL';
  customDate?: string;
  customStartDate?: string;
  customEndDate?: string;
}): Promise<ClinicalReportSummary> {
  const { db } = await getDatabase();

  const now = new Date();
  let startDate = '';
  let endDate = '';
  let periodLabel = '';

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  switch (options.rangeType) {
    case 'TODAY': {
      startDate = formatDate(now);
      endDate = startDate;
      periodLabel = `Today (${startDate})`;
      break;
    }
    case 'YESTERDAY': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      startDate = formatDate(y);
      endDate = startDate;
      periodLabel = `Yesterday (${startDate})`;
      break;
    }
    case 'WEEK': {
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Monday
      startDate = formatDate(firstDay);
      endDate = formatDate(now);
      periodLabel = `This Week (${startDate} to ${endDate})`;
      break;
    }
    case 'MONTH': {
      startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      endDate = formatDate(now);
      const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
      periodLabel = `This Month (${monthName})`;
      break;
    }
    case 'CUSTOM': {
      if (options.customDate) {
        startDate = options.customDate;
        endDate = options.customDate;
        periodLabel = `Date: ${startDate}`;
      } else {
        startDate = options.customStartDate || '1970-01-01';
        endDate = options.customEndDate || formatDate(now);
        periodLabel = `${startDate} to ${endDate}`;
      }
      break;
    }
    case 'ALL':
    default: {
      startDate = '1970-01-01';
      endDate = '2099-12-31';
      periodLabel = 'All Time';
      break;
    }
  }

  // Query visits in range
  const visitConditions = [isNull(visits.deletedAt)];
  if (options.rangeType !== 'ALL') {
    visitConditions.push(gte(visits.visitDate, startDate));
    visitConditions.push(lte(visits.visitDate, endDate));
  }

  const periodVisits = await db
    .select()
    .from(visits)
    .where(and(...visitConditions))
    .orderBy(sql`${visits.visitDate} DESC, ${visits.visitTime} DESC, ${visits.createdAt} DESC`);

  const totalConsultations = periodVisits.length;

  if (totalConsultations === 0) {
    return {
      periodLabel,
      startDate,
      endDate,
      uniquePatients: 0,
      totalConsultations: 0,
      newPatients: 0,
      followUpConsultations: 0,
      totalFees: 0,
      consultations: [],
    };
  }

  // Distinct patient IDs
  const distinctPatientIds = Array.from(new Set(periodVisits.map((v) => v.patientId)));
  const uniquePatients = distinctPatientIds.length;

  // Batch query patient demographics
  const matchingPatients = await db
    .select()
    .from(patients)
    .where(and(inArray(patients.id, distinctPatientIds), isNull(patients.deletedAt)));

  const patientMap = new Map<string, typeof matchingPatients[0]>();
  for (const p of matchingPatients) {
    patientMap.set(p.id, p);
  }

  // Determine first visit date for each patient to accurately identify New vs Follow-up
  const patientFirstVisits = await db
    .select({
      patientId: visits.patientId,
      firstVisitDate: sql<string>`min(${visits.visitDate})`,
    })
    .from(visits)
    .where(and(inArray(visits.patientId, distinctPatientIds), isNull(visits.deletedAt)))
    .groupBy(visits.patientId);

  const firstVisitMap = new Map<string, string>();
  for (const fv of patientFirstVisits) {
    firstVisitMap.set(fv.patientId, fv.firstVisitDate);
  }

  let totalFees = 0;
  let newPatientsCount = 0;
  let followUpsCount = 0;

  const consultationList = periodVisits.map((v) => {
    const p = patientMap.get(v.patientId);
    const firstDate = firstVisitMap.get(v.patientId);

    // Is New Patient if this visit date is their earliest recorded visit date
    const isNew = firstDate === v.visitDate;
    if (isNew) {
      newPatientsCount++;
    } else {
      followUpsCount++;
    }

    if (v.charges) {
      const parsedFee = parseFloat(v.charges.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsedFee)) {
        totalFees += parsedFee;
      }
    }

    return {
      visitId: v.id,
      visitDate: v.visitDate,
      visitTime: v.visitTime,
      patientId: v.patientId,
      patientNumber: p?.patientNumber || 'PAT-000000',
      patientName: p?.name || 'Unknown Patient',
      gender: p?.gender || 'N/A',
      estimatedAge: p?.estimatedAge ?? null,
      phone: p?.phone || '',
      isNewPatient: isNew,
      diagnosis: v.diagnosis,
      charges: v.charges,
    };
  });

  return {
    periodLabel,
    startDate,
    endDate,
    uniquePatients,
    totalConsultations,
    newPatients: newPatientsCount,
    followUpConsultations: followUpsCount,
    totalFees,
    consultations: consultationList,
  };
}

/**
 * Builds a multi-sheet real .xlsx workbook (Summary, Patients, Consultations, Vitals, Prescriptions) and shares it.
 */
export async function generateAndShareMultiSheetXlsx(options: XlsxExportOptions): Promise<string> {
  const { db } = await getDatabase();

  // 1. Calculate Report Summary
  let rangeType: 'ALL' | 'TODAY' | 'MONTH' | 'CUSTOM' = options.dateRangeType;
  const report = await getClinicalReport({
    rangeType,
    customStartDate: options.startDate,
    customEndDate: options.endDate,
  });

  // 2. Query Data Entities
  const allPatients = await db
    .select()
    .from(patients)
    .where(isNull(patients.deletedAt))
    .orderBy(sql`${patients.createdAt} ASC`);

  const visitConditions = [isNull(visits.deletedAt)];
  if (options.dateRangeType !== 'ALL') {
    if (options.startDate) visitConditions.push(gte(visits.visitDate, options.startDate));
    if (options.endDate) visitConditions.push(lte(visits.visitDate, options.endDate));
  }

  const exportVisits = await db
    .select()
    .from(visits)
    .where(and(...visitConditions))
    .orderBy(sql`${visits.visitDate} DESC, ${visits.visitTime} DESC`);

  const visitIds = exportVisits.map((v) => v.id);

  // Batch query prescriptions & items
  const exportPrescriptions = visitIds.length > 0
    ? await db
        .select()
        .from(prescriptions)
        .where(and(inArray(prescriptions.visitId, visitIds), isNull(prescriptions.deletedAt)))
    : [];

  const rxIds = exportPrescriptions.map((rx) => rx.id);
  const exportItems = rxIds.length > 0
    ? await db
        .select()
        .from(prescriptionItems)
        .where(inArray(prescriptionItems.prescriptionId, rxIds))
    : [];

  const rxToVisitMap = new Map<string, string>();
  for (const rx of exportPrescriptions) {
    rxToVisitMap.set(rx.id, rx.visitId);
  }

  const patientMap = new Map<string, typeof allPatients[0]>();
  for (const p of allPatients) {
    patientMap.set(p.id, p);
  }

  const visitMap = new Map<string, typeof exportVisits[0]>();
  for (const v of exportVisits) {
    visitMap.set(v.id, v);
  }

  // -------------------------------------------------------------
  // Sheet 1: Summary
  // -------------------------------------------------------------
  const summaryData = [
    ['AAROGYA CLINICAL PRACTICE REPORT'],
    ['Generated Date', new Date().toLocaleString()],
    ['Report Period', report.periodLabel],
    [],
    ['KEY CLINICAL METRICS', 'COUNT / VALUE'],
    ['Unique Patients Consulted', report.uniquePatients],
    ['Total Consultations Recorded', report.totalConsultations],
    ['New Patient Registrations', report.newPatients],
    ['Follow-up Consultations', report.followUpConsultations],
    ['Total Consultation Fees Collected (INR)', `₹${report.totalFees.toLocaleString('en-IN')}`],
  ];

  // -------------------------------------------------------------
  // Sheet 2: Patients
  // -------------------------------------------------------------
  const patientsData = [
    [
      'Patient ID',
      'Full Name',
      'Date of Birth',
      'Age (Yrs)',
      'Gender',
      'Mobile Phone',
      'Blood Group',
      'Known Allergies',
      'Emergency Contact',
      'Residential Address',
      'Medical History Notes',
      'Registration Date',
    ],
    ...allPatients.map((p) => [
      p.patientNumber,
      p.name,
      p.dateOfBirth || '',
      p.estimatedAge || '',
      p.gender,
      p.phone,
      p.bloodGroup || '',
      p.allergies || '',
      p.emergencyContact || '',
      p.address || '',
      p.notes || '',
      new Date(p.createdAt).toLocaleDateString(),
    ]),
  ];

  // -------------------------------------------------------------
  // Sheet 3: Consultations
  // -------------------------------------------------------------
  const consultationsData = [
    [
      'Visit ID',
      'Patient ID',
      'Patient Name',
      'Visit Date',
      'Visit Time',
      'Visit Type',
      'Chief Complaints & Symptoms',
      'Clinical Diagnosis',
      'Treatment Plan & Advice',
      'Consultation Charges (₹)',
      'Lab / Report Reference',
      'Doctor Private Notes',
    ],
    ...exportVisits.map((v) => {
      const p = patientMap.get(v.patientId);
      const isNew = report.consultations.find((c) => c.visitId === v.id)?.isNewPatient;
      return [
        v.id,
        p?.patientNumber || '',
        p?.name || '',
        v.visitDate,
        v.visitTime,
        isNew ? 'New Patient' : 'Follow-up',
        v.symptoms || '',
        v.diagnosis || '',
        v.treatment || '',
        v.charges || '',
        v.report || '',
        v.notes || '',
      ];
    }),
  ];

  // -------------------------------------------------------------
  // Sheet 4: Vitals
  // -------------------------------------------------------------
  const vitalsRows: any[][] = [
    [
      'Visit ID',
      'Patient ID',
      'Patient Name',
      'Date',
      'BP Systolic (mmHg)',
      'BP Diastolic (mmHg)',
      'Pulse (bpm)',
      'Temperature (°F)',
      'Weight (kg)',
      'SpO2 (%)',
    ],
  ];

  for (const v of exportVisits) {
    if (v.vitals) {
      try {
        const vit: VitalsData = typeof v.vitals === 'string' ? JSON.parse(v.vitals) : v.vitals;
        const p = patientMap.get(v.patientId);
        vitalsRows.push([
          v.id,
          p?.patientNumber || '',
          p?.name || '',
          v.visitDate,
          vit.bpSystolic || '',
          vit.bpDiastolic || '',
          vit.pulse || '',
          vit.temperature || '',
          vit.weight || '',
          vit.spo2 || '',
        ]);
      } catch {
        // Skip corrupted JSON
      }
    }
  }

  // -------------------------------------------------------------
  // Sheet 5: Prescriptions
  // -------------------------------------------------------------
  const prescriptionsData = [
    [
      'Visit ID',
      'Patient ID',
      'Patient Name',
      'Medicine Name',
      'Dosage',
      'Frequency',
      'Duration',
      'Instructions',
    ],
    ...exportItems.map((item) => {
      const visitId = rxToVisitMap.get(item.prescriptionId) || '';
      const v = visitMap.get(visitId);
      const p = v ? patientMap.get(v.patientId) : null;
      return [
        visitId,
        p?.patientNumber || '',
        p?.name || '',
        item.medicineName,
        item.dosage || '',
        item.frequency || '',
        item.duration || '',
        item.instructions || '',
      ];
    }),
  ];

  // -------------------------------------------------------------
  // Assemble Real XLSX Workbook
  // -------------------------------------------------------------
  const wb = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  const wsPatients = XLSX.utils.aoa_to_sheet(patientsData);
  const wsConsultations = XLSX.utils.aoa_to_sheet(consultationsData);
  const wsVitals = XLSX.utils.aoa_to_sheet(vitalsRows);
  const wsPrescriptions = XLSX.utils.aoa_to_sheet(prescriptionsData);

  // Set explicit readable column widths
  wsSummary['!cols'] = [{ wch: 35 }, { wch: 25 }];
  wsPatients['!cols'] = [
    { wch: 14 }, // ID
    { wch: 22 }, // Name
    { wch: 14 }, // DOB
    { wch: 10 }, // Age
    { wch: 10 }, // Gender
    { wch: 15 }, // Phone
    { wch: 12 }, // Blood
    { wch: 20 }, // Allergies
    { wch: 18 }, // Emergency
    { wch: 28 }, // Address
    { wch: 28 }, // Notes
    { wch: 14 }, // Reg Date
  ];
  wsConsultations['!cols'] = [
    { wch: 24 }, // Visit ID
    { wch: 14 }, // Patient ID
    { wch: 22 }, // Name
    { wch: 12 }, // Date
    { wch: 10 }, // Time
    { wch: 14 }, // Type
    { wch: 30 }, // Symptoms
    { wch: 30 }, // Diagnosis
    { wch: 30 }, // Treatment
    { wch: 16 }, // Charges
    { wch: 22 }, // Lab Ref
    { wch: 26 }, // Notes
  ];
  wsVitals['!cols'] = [
    { wch: 24 },
    { wch: 14 },
    { wch: 22 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
  ];
  wsPrescriptions['!cols'] = [
    { wch: 24 },
    { wch: 14 },
    { wch: 22 },
    { wch: 26 },
    { wch: 14 },
    { wch: 20 },
    { wch: 14 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  XLSX.utils.book_append_sheet(wb, wsPatients, 'Patients');
  XLSX.utils.book_append_sheet(wb, wsConsultations, 'Consultations');
  XLSX.utils.book_append_sheet(wb, wsVitals, 'Vitals');
  XLSX.utils.book_append_sheet(wb, wsPrescriptions, 'Prescriptions');

  // Write genuine .xlsx binary Base64
  const xlsxBase64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  const exportDir = `${FileSystem.documentDirectory}exports/`;
  const dirInfo = await FileSystem.getInfoAsync(exportDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const filePath = `${exportDir}AarogyaEMR_Complete_Export_${dateStr}.xlsx`;

  await FileSystem.writeAsStringAsync(filePath, xlsxBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return filePath;
}

/**
 * Native Android Share for genuine XLSX files.
 */
export async function shareXlsxFile(filePath: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Export AarogyaEMR Clinical Excel Workbook (.xlsx)',
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
  } else {
    throw new Error('Sharing is not available on this device.');
  }
}
