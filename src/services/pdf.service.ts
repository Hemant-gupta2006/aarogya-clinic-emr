import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { VisitWithDetails, VitalsData } from '../db/repositories/visit.repo';
import { PatientWithMeta } from '../db/repositories/patient.repo';
import { getAppSettings } from '../db/repositories/metadata.repo';
import { getAbsolutePhotoUri } from './photo.service';

function escapePdfText(text: string): string {
  if (!text) return '';
  const safeText = String(text)
    .replace(/[₹]/g, 'Rs. ')
    .replace(/[°]/g, ' deg ')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '');
  return safeText.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function getUtf8ByteLength(str: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str).length;
  }
  return unescape(encodeURIComponent(str)).length;
}

function binaryStringToBase64(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let b64 = '';
  let i = 0;
  const len = str.length;
  while (i < len) {
    const b0 = str.charCodeAt(i++) & 0xff;
    const b1 = i < len ? str.charCodeAt(i++) & 0xff : NaN;
    const b2 = i < len ? str.charCodeAt(i++) & 0xff : NaN;

    const n = (b0 << 16) | (isNaN(b1) ? 0 : b1 << 8) | (isNaN(b2) ? 0 : b2);

    b64 += chars.charAt((n >> 18) & 63);
    b64 += chars.charAt((n >> 12) & 63);
    b64 += isNaN(b1) ? '=' : chars.charAt((n >> 6) & 63);
    b64 += isNaN(b2) ? '=' : chars.charAt(n & 63);
  }
  return b64;
}

function base64ToBinaryString(b64: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let str = '';
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < b64.length; i++) {
    const c = b64.charAt(i);
    if (c === '=') break;
    const val = chars.indexOf(c);
    if (val === -1) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      str += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return str;
}

function getJpegDimensions(bytes: string): { width: number; height: number } {
  let i = 0;
  while (i < bytes.length - 8) {
    if (bytes.charCodeAt(i) === 0xff && (bytes.charCodeAt(i + 1) === 0xc0 || bytes.charCodeAt(i + 1) === 0xc2)) {
      const height = (bytes.charCodeAt(i + 5) << 8) | bytes.charCodeAt(i + 6);
      const width = (bytes.charCodeAt(i + 7) << 8) | bytes.charCodeAt(i + 8);
      return { width: width || 120, height: height || 120 };
    }
    i++;
  }
  return { width: 120, height: 120 };
}

/**
 * Builds a pure standard PDF 1.4 binary string with optional patient photo XObject.
 */
function buildPrescriptionPdfString(data: {
  clinicName: string;
  doctorName: string;
  clinicAddress: string;
  clinicPhone: string;
  patientName: string;
  patientNumber: string;
  ageGender: string;
  phone: string;
  visitDate: string;
  visitId: string;
  symptoms?: string | null;
  diagnosis?: string | null;
  vitals?: string[];
  medications?: Array<{ name: string; dosage: string; freq: string; dur: string; inst: string }>;
  treatment?: string | null;
  report?: string | null;
  charges?: string | null;
  photo?: { binary: string; width: number; height: number } | null;
  signatureImage?: { binary: string; width: number; height: number } | null;
  signatureVector?: { width: number; height: number; paths: Array<Array<{ x: number; y: number }>> } | null;
}): string {
  const contentOps: string[] = [];

  // Top Teal Accent Bar (#0D9488)
  contentOps.push('0.051 0.580 0.533 rg 36 786 523 4 re f');

  // Clinic Header
  contentOps.push(`BT /F1 18 Tf 0.051 0.580 0.533 rg 36 760 Td (${escapePdfText(data.clinicName || 'AarogyaEMR')}) Tj ET`);
  contentOps.push(`BT /F1 12 Tf 0.059 0.090 0.165 rg 36 742 Td (${escapePdfText(data.doctorName)}) Tj ET`);
  contentOps.push(`BT /F2 9 Tf 0.392 0.455 0.545 rg 36 728 Td (${escapePdfText(data.clinicAddress || 'Consultant Physician & Surgeon')}) Tj ET`);
  if (data.clinicPhone) {
    contentOps.push(`BT /F2 9 Tf 0.392 0.455 0.545 rg 36 716 Td (Contact: ${escapePdfText(data.clinicPhone)}) Tj ET`);
  }

  // Right Side: Date & Rx Title
  contentOps.push('BT /F1 11 Tf 0.051 0.580 0.533 rg 420 760 Td (MEDICAL PRESCRIPTION) Tj ET');
  contentOps.push(`BT /F2 9 Tf 0.200 0.255 0.333 rg 420 744 Td (Date: ${escapePdfText(data.visitDate)}) Tj ET`);
  contentOps.push(`BT /F2 8 Tf 0.580 0.639 0.722 rg 420 730 Td (ID: ${escapePdfText(data.visitId.substring(0, 16))}) Tj ET`);

  // Divider
  contentOps.push('0.886 0.914 0.941 RG 1 w 36 702 m 559 702 l S');

  // Patient Info Box (#F0FDF4)
  contentOps.push('0.941 0.992 0.957 rg 36 638 523 54 re f');
  contentOps.push('0.800 0.984 0.945 RG 1 w 36 638 523 54 re S');

  if (data.photo) {
    // Small Patient Clinical Image Thumbnail
    contentOps.push('0.800 0.984 0.945 RG 1 w 44 643 44 44 re S');
    contentOps.push('q\n44 0 0 44 44 643 cm\n/Im1 Do\nQ');

    contentOps.push('BT /F1 8 Tf 0.059 0.463 0.431 rg 98 676 Td (PATIENT NAME) Tj ET');
    contentOps.push(`BT /F1 11 Tf 0.059 0.090 0.165 rg 98 660 Td (${escapePdfText(data.patientName)}) Tj ET`);

    contentOps.push('BT /F1 8 Tf 0.059 0.463 0.431 rg 240 676 Td (MEDICAL ID) Tj ET');
    contentOps.push(`BT /F1 11 Tf 0.051 0.580 0.533 rg 240 660 Td (${escapePdfText(data.patientNumber)}) Tj ET`);

    contentOps.push('BT /F1 8 Tf 0.059 0.463 0.431 rg 350 676 Td (AGE / GENDER) Tj ET');
    contentOps.push(`BT /F2 10 Tf 0.059 0.090 0.165 rg 350 660 Td (${escapePdfText(data.ageGender)}) Tj ET`);

    contentOps.push('BT /F1 8 Tf 0.059 0.463 0.431 rg 460 676 Td (PHONE) Tj ET');
    contentOps.push(`BT /F2 10 Tf 0.059 0.090 0.165 rg 460 660 Td (${escapePdfText(data.phone)}) Tj ET`);
  } else {
    contentOps.push('BT /F1 8 Tf 0.059 0.463 0.431 rg 48 676 Td (PATIENT NAME) Tj ET');
    contentOps.push(`BT /F1 12 Tf 0.059 0.090 0.165 rg 48 660 Td (${escapePdfText(data.patientName)}) Tj ET`);

    contentOps.push('BT /F1 8 Tf 0.059 0.463 0.431 rg 210 676 Td (MEDICAL ID) Tj ET');
    contentOps.push(`BT /F1 11 Tf 0.051 0.580 0.533 rg 210 660 Td (${escapePdfText(data.patientNumber)}) Tj ET`);

    contentOps.push('BT /F1 8 Tf 0.059 0.463 0.431 rg 340 676 Td (AGE / GENDER) Tj ET');
    contentOps.push(`BT /F2 10 Tf 0.059 0.090 0.165 rg 340 660 Td (${escapePdfText(data.ageGender)}) Tj ET`);

    contentOps.push('BT /F1 8 Tf 0.059 0.463 0.431 rg 450 676 Td (PHONE) Tj ET');
    contentOps.push(`BT /F2 10 Tf 0.059 0.090 0.165 rg 450 660 Td (${escapePdfText(data.phone)}) Tj ET`);
  }

  let currentY = 620;

  // Vitals Row
  if (data.vitals && data.vitals.length > 0) {
    contentOps.push(`0.973 0.980 0.988 rg 36 ${currentY - 18} 523 20 re f`);
    contentOps.push(`0.886 0.914 0.941 RG 1 w 36 ${currentY - 18} 523 20 re S`);
    const vitalsStr = data.vitals.join('   |   ');
    contentOps.push(`BT /F1 8.5 Tf 0.051 0.580 0.533 rg 46 ${currentY - 12} Td (Vitals: ) Tj /F2 8.5 Tf 0.059 0.090 0.165 rg (${escapePdfText(vitalsStr)}) Tj ET`);
    currentY -= 28;
  }

  // Symptoms
  if (data.symptoms) {
    contentOps.push(`BT /F1 9.5 Tf 0.051 0.580 0.533 rg 36 ${currentY} Td (CHIEF COMPLAINTS / SYMPTOMS:) Tj ET`);
    currentY -= 14;
    contentOps.push(`BT /F2 9.5 Tf 0.200 0.255 0.333 rg 36 ${currentY} Td (${escapePdfText(data.symptoms.substring(0, 100))}) Tj ET`);
    currentY -= 18;
  }

  // Diagnosis
  if (data.diagnosis) {
    contentOps.push(`BT /F1 9.5 Tf 0.051 0.580 0.533 rg 36 ${currentY} Td (CLINICAL DIAGNOSIS:) Tj ET`);
    currentY -= 14;
    contentOps.push(`0.941 0.992 0.957 rg 36 ${currentY - 4} 523 18 re f`);
    contentOps.push(`BT /F1 10 Tf 0.024 0.373 0.275 rg 42 ${currentY} Td (${escapePdfText(data.diagnosis)}) Tj ET`);
    currentY -= 24;
  }

  // Medications Table Header
  contentOps.push(`BT /F1 10 Tf 0.051 0.580 0.533 rg 36 ${currentY} Td (Rx - PRESCRIBED MEDICATIONS) Tj ET`);
  currentY -= 14;

  contentOps.push(`0.945 0.961 0.976 rg 36 ${currentY - 4} 523 18 re f`);
  contentOps.push(`BT /F1 8 Tf 0.200 0.255 0.333 rg 42 ${currentY} Td (MEDICINE) Tj ET`);
  contentOps.push(`BT /F1 8 Tf 0.200 0.255 0.333 rg 210 ${currentY} Td (DOSAGE) Tj ET`);
  contentOps.push(`BT /F1 8 Tf 0.200 0.255 0.333 rg 300 ${currentY} Td (FREQUENCY) Tj ET`);
  contentOps.push(`BT /F1 8 Tf 0.200 0.255 0.333 rg 400 ${currentY} Td (DURATION) Tj ET`);
  contentOps.push(`BT /F1 8 Tf 0.200 0.255 0.333 rg 470 ${currentY} Td (INSTRUCTIONS) Tj ET`);
  currentY -= 18;

  if (data.medications && data.medications.length > 0) {
    data.medications.forEach((m, idx) => {
      contentOps.push(`0.886 0.914 0.941 RG 0.5 w 36 ${currentY - 4} m 559 ${currentY - 4} l S`);
      contentOps.push(`BT /F1 9 Tf 0.059 0.090 0.165 rg 42 ${currentY} Td (${idx + 1}. ${escapePdfText(m.name)}) Tj ET`);
      contentOps.push(`BT /F2 9 Tf 0.200 0.255 0.333 rg 210 ${currentY} Td (${escapePdfText(m.dosage || '-')}) Tj ET`);
      contentOps.push(`BT /F1 9 Tf 0.051 0.580 0.533 rg 300 ${currentY} Td (${escapePdfText(m.freq || '-')}) Tj ET`);
      contentOps.push(`BT /F2 9 Tf 0.200 0.255 0.333 rg 400 ${currentY} Td (${escapePdfText(m.dur || '-')}) Tj ET`);
      contentOps.push(`BT /F3 8 Tf 0.392 0.455 0.545 rg 470 ${currentY} Td (${escapePdfText(m.inst || '-')}) Tj ET`);
      currentY -= 18;
    });
  } else {
    contentOps.push(`BT /F2 9 Tf 0.580 0.639 0.722 rg 42 ${currentY} Td (No medications prescribed.) Tj ET`);
    currentY -= 18;
  }

  // Treatment / Advice
  if (data.treatment) {
    currentY -= 8;
    contentOps.push(`BT /F1 9 Tf 0.051 0.580 0.533 rg 36 ${currentY} Td (TREATMENT & CLINICAL ADVICE:) Tj ET`);
    currentY -= 14;
    contentOps.push(`BT /F2 9 Tf 0.200 0.255 0.333 rg 36 ${currentY} Td (${escapePdfText(data.treatment)}) Tj ET`);
    currentY -= 18;
  }

  // Diagnostic Investigations & Reports
  if (data.report) {
    currentY -= 6;
    contentOps.push(`BT /F1 9 Tf 0.051 0.580 0.533 rg 36 ${currentY} Td (DIAGNOSTIC INVESTIGATIONS & REPORTS:) Tj ET`);
    currentY -= 14;
    contentOps.push(`BT /F2 9 Tf 0.200 0.255 0.333 rg 36 ${currentY} Td (${escapePdfText(data.report)}) Tj ET`);
    currentY -= 18;
  }

  // Consultation Fee
  if (data.charges) {
    currentY -= 8;
    contentOps.push(`BT /F1 9 Tf 0.051 0.580 0.533 rg 36 ${currentY} Td (CONSULTATION CHARGES:) Tj /F1 9.5 Tf 0.059 0.090 0.165 rg 180 ${currentY} Td (INR ${escapePdfText(data.charges)}) Tj ET`);
    currentY -= 18;
  }

  // Doctor Signature Block (above signature line at 400..540, y 90)
  if (data.signatureImage) {
    contentOps.push('q\n100 0 0 32 410 94 cm\n/ImSig Do\nQ');
  } else if (data.signatureVector && data.signatureVector.paths.length > 0) {
    const origW = data.signatureVector.width || 320;
    const origH = data.signatureVector.height || 160;
    const scaleX = 120 / origW;
    const scaleY = 32 / origH;
    contentOps.push('0.059 0.090 0.165 RG 1.5 w 1 J 1 j');
    for (const pList of data.signatureVector.paths) {
      if (pList.length > 0) {
        const p0X = (410 + pList[0].x * scaleX).toFixed(2);
        const p0Y = (126 - pList[0].y * scaleY).toFixed(2);
        contentOps.push(`${p0X} ${p0Y} m`);
        for (let k = 1; k < pList.length; k++) {
          const pkX = (410 + pList[k].x * scaleX).toFixed(2);
          const pkY = (126 - pList[k].y * scaleY).toFixed(2);
          contentOps.push(`${pkX} ${pkY} l`);
        }
        contentOps.push('S');
      }
    }
  }

  contentOps.push(`0.059 0.090 0.165 RG 1 w 400 90 m 540 90 l S`);
  contentOps.push(`BT /F1 9.5 Tf 0.059 0.090 0.165 rg 400 76 Td (${escapePdfText(data.doctorName)}) Tj ET`);
  contentOps.push('BT /F3 8 Tf 0.392 0.455 0.545 rg 400 64 Td (Signature & Clinic Stamp) Tj ET');

  // Bottom Notice
  contentOps.push('BT /F3 7.5 Tf 0.580 0.639 0.722 rg 36 36 Td (Generated via AarogyaEMR Mobile System. Valid without physical signature if verified.) Tj ET');

  const streamContent = contentOps.join('\n');
  const streamLength = getUtf8ByteLength(streamContent);

  const xObjectMap: string[] = [];
  let nextObjNum = 8;
  let photoObjNum = 0;
  let sigObjNum = 0;

  if (data.photo) {
    photoObjNum = nextObjNum++;
    xObjectMap.push(`/Im1 ${photoObjNum} 0 R`);
  }
  if (data.signatureImage) {
    sigObjNum = nextObjNum++;
    xObjectMap.push(`/ImSig ${sigObjNum} 0 R`);
  }

  const pageResources = xObjectMap.length > 0
    ? `/Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> /XObject << ${xObjectMap.join(' ')} >> >>`
    : `/Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >>`;

  const objects: string[] = [
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R ${pageResources} >>\nendobj\n`,
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`,
    `6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
    `7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>\nendobj\n`,
  ];

  if (data.photo) {
    const photoStreamLength = data.photo.binary.length;
    objects.push(
      `${photoObjNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${data.photo.width} /Height ${data.photo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${photoStreamLength} >>\nstream\n${data.photo.binary}\nendstream\nendobj\n`
    );
  }

  if (data.signatureImage) {
    const sigStreamLength = data.signatureImage.binary.length;
    objects.push(
      `${sigObjNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${data.signatureImage.width} /Height ${data.signatureImage.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${sigStreamLength} >>\nstream\n${data.signatureImage.binary}\nendstream\nendobj\n`
    );
  }

  let body = '%PDF-1.4\n';
  const offsets = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(getUtf8ByteLength(body));
    body += objects[i];
  }

  const startXref = getUtf8ByteLength(body);
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xref += offsets[i].toString().padStart(10, '0') + ' 00000 n \n';
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return body + xref + trailer;
}

/**
 * Builds a pure standard PDF 1.4 binary string for multi-visit patient history.
 */
function buildHistoryPdfString(data: {
  clinicName: string;
  doctorName: string;
  patientName: string;
  patientNumber: string;
  gender: string;
  age: string;
  phone: string;
  visits: VisitWithDetails[];
}): string {
  const contentOps: string[] = [];

  contentOps.push('0.051 0.580 0.533 rg 36 786 523 4 re f');
  contentOps.push(`BT /F1 18 Tf 0.051 0.580 0.533 rg 36 760 Td (${escapePdfText(data.clinicName || 'AarogyaEMR')}) Tj ET`);
  contentOps.push('BT /F1 12 Tf 0.059 0.090 0.165 rg 36 742 Td (PATIENT MEDICAL HISTORY REPORT) Tj ET');

  contentOps.push('0.886 0.914 0.941 RG 1 w 36 730 m 559 730 l S');

  // Patient Info Box (#F0FDF4)
  contentOps.push('0.941 0.992 0.957 rg 36 676 523 44 re f');
  contentOps.push('0.800 0.984 0.945 RG 1 w 36 676 523 44 re S');

  contentOps.push(`BT /F1 11 Tf 0.059 0.090 0.165 rg 48 700 Td (${escapePdfText(data.patientName)}) Tj /F1 10 Tf 0.051 0.580 0.533 rg ( (${escapePdfText(data.patientNumber)})) Tj ET`);
  contentOps.push(`BT /F2 9 Tf 0.200 0.255 0.333 rg 48 686 Td (${escapePdfText(data.age)} • ${escapePdfText(data.gender)} • Phone: ${escapePdfText(data.phone)}) Tj ET`);

  let currentY = 650;
  contentOps.push(`BT /F1 10 Tf 0.051 0.580 0.533 rg 36 ${currentY} Td (CONSULTATION RECORDS (${data.visits.length})) Tj ET`);
  currentY -= 18;

  data.visits.slice(0, 6).forEach((v, idx) => {
    contentOps.push(`0.973 0.980 0.988 rg 36 ${currentY - 48} 523 54 re f`);
    contentOps.push(`0.886 0.914 0.941 RG 0.8 w 36 ${currentY - 48} 523 54 re S`);

    contentOps.push(`BT /F1 9.5 Tf 0.051 0.580 0.533 rg 46 ${currentY - 12} Td (Visit #${data.visits.length - idx} - ${escapePdfText(v.visitDate)}) Tj ET`);
    if (v.charges) {
      contentOps.push(`BT /F1 9 Tf 0.059 0.090 0.165 rg 480 ${currentY - 12} Td (Fee: INR ${escapePdfText(v.charges)}) Tj ET`);
    }

    if (v.diagnosis) {
      contentOps.push(`BT /F1 8.5 Tf 0.059 0.090 0.165 rg 46 ${currentY - 26} Td (Diagnosis: ) Tj /F2 8.5 Tf 0.200 0.255 0.333 rg (${escapePdfText(v.diagnosis)}) Tj ET`);
    }
    if (v.treatment) {
      contentOps.push(`BT /F1 8.5 Tf 0.059 0.090 0.165 rg 46 ${currentY - 38} Td (Treatment: ) Tj /F2 8.5 Tf 0.200 0.255 0.333 rg (${escapePdfText(v.treatment)}) Tj ET`);
    }

    currentY -= 64;
  });

  const streamContent = contentOps.join('\n');
  const streamLength = getUtf8ByteLength(streamContent);

  const objects = [
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`,
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`,
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n`,
    `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`,
    `6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
  ];

  let body = '%PDF-1.4\n';
  const offsets = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(getUtf8ByteLength(body));
    body += objects[i];
  }

  const startXref = getUtf8ByteLength(body);
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xref += offsets[i].toString().padStart(10, '0') + ' 00000 n \n';
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  return body + xref + trailer;
}

/**
 * Generates and shares a standard prescription PDF document with embedded clinical/profile image.
 */
export async function generateAndSharePrescriptionPdf(
  patient: PatientWithMeta,
  visit: VisitWithDetails
): Promise<void> {
  const settings = await getAppSettings();
  const clinicName = settings.clinic_name || 'Aarogya Clinic';
  const doctorName = settings.doctor_name || 'Dr. Ananya Sharma, MD';
  const clinicAddress = settings.clinic_address || 'Consultant Physician & Surgeon';
  const clinicPhone = settings.clinic_phone || '';

  // Parse structured vitals
  let vitalsList: string[] = [];
  if (visit.vitals) {
    try {
      const v: VitalsData = typeof visit.vitals === 'string' ? JSON.parse(visit.vitals) : visit.vitals;
      if (v.bpSystolic && v.bpDiastolic) vitalsList.push(`BP: ${v.bpSystolic}/${v.bpDiastolic} mmHg`);
      if (v.temperature) vitalsList.push(`Temp: ${v.temperature} F`);
      if (v.pulse) vitalsList.push(`Pulse: ${v.pulse} bpm`);
      if (v.spo2) vitalsList.push(`SpO2: ${v.spo2}%`);
      if (v.weight) vitalsList.push(`Wt: ${v.weight} kg`);
    } catch {
      // Ignore
    }
  }

  // Parse structured medications
  const meds = visit.prescription?.items?.map((item) => ({
    name: item.medicineName,
    dosage: item.dosage || '-',
    freq: item.frequency || '-',
    dur: item.duration || '-',
    inst: item.instructions || '-',
  })) || [];

  // Load patient photo if present
  let photoData: { binary: string; width: number; height: number } | null = null;
  if (patient.profilePhoto) {
    try {
      const absUri = getAbsolutePhotoUri(patient.profilePhoto);
      const info = await FileSystem.getInfoAsync(absUri);
      if (info.exists) {
        const b64 = await FileSystem.readAsStringAsync(absUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const binary = base64ToBinaryString(b64);
        const dims = getJpegDimensions(binary);
        photoData = { binary, width: dims.width, height: dims.height };
      }
    } catch (photoErr) {
      console.warn('Patient photo could not be attached to PDF:', photoErr);
      photoData = null;
    }
  }
  // Load doctor signature if present
  let signatureImageData: { binary: string; width: number; height: number } | null = null;
  let signatureVectorData: { width: number; height: number; paths: Array<Array<{ x: number; y: number }>> } | null = null;

  if (settings.doctor_signature) {
    if (settings.doctor_signature.startsWith('draw:')) {
      try {
        const parsed = JSON.parse(settings.doctor_signature.substring(5));
        if (parsed.paths && parsed.paths.length > 0) {
          signatureVectorData = {
            width: parsed.width || 320,
            height: parsed.height || 160,
            paths: parsed.paths,
          };
        }
      } catch (err) {
        console.warn('Vector signature parse error for PDF:', err);
      }
    } else {
      try {
        const absUri = getAbsolutePhotoUri(settings.doctor_signature);
        const info = await FileSystem.getInfoAsync(absUri);
        if (info.exists) {
          const b64 = await FileSystem.readAsStringAsync(absUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const binary = base64ToBinaryString(b64);
          const dims = getJpegDimensions(binary);
          signatureImageData = { binary, width: dims.width, height: dims.height };
        }
      } catch (sigErr) {
        console.warn('Doctor signature image could not be attached to PDF:', sigErr);
      }
    }
  }

  // Direct Pure JS PDF 1.4 Generation
  const pdfBytes = buildPrescriptionPdfString({
    clinicName,
    doctorName,
    clinicAddress,
    clinicPhone,
    patientName: patient.name,
    patientNumber: patient.patientNumber,
    ageGender: `${patient.estimatedAge ? `${patient.estimatedAge} Yrs` : 'N/A'} • ${patient.gender}`,
    phone: patient.phone,
    visitDate: visit.visitDate,
    visitId: visit.id,
    symptoms: visit.symptoms,
    diagnosis: visit.diagnosis,
    vitals: vitalsList,
    medications: meds,
    treatment: visit.treatment,
    report: visit.report,
    charges: visit.charges,
    photo: photoData,
    signatureImage: signatureImageData,
    signatureVector: signatureVectorData,
  });

  const exportDir = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}prescriptions/`;
  const dirInfo = await FileSystem.getInfoAsync(exportDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });
  }

  const filePath = `${exportDir}Prescription_${patient.patientNumber}_${visit.visitDate}.pdf`;
  const base64Data = binaryStringToBase64(pdfBytes);
  await FileSystem.writeAsStringAsync(filePath, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const fileInfo = await FileSystem.getInfoAsync(filePath);
  if (!fileInfo.exists || !('size' in fileInfo) || fileInfo.size === 0) {
    throw new Error('Prescription PDF could not be saved to mobile storage.');
  }

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/pdf',
      dialogTitle: `Prescription - ${patient.name}`,
      UTI: 'com.adobe.pdf',
    });
  }
}

/**
 * Generates and shares a complete multi-visit patient history PDF report.
 */
export async function generateAndSharePatientHistoryPdf(
  patient: PatientWithMeta,
  visits: VisitWithDetails[]
): Promise<void> {
  const settings = await getAppSettings();
  const clinicName = settings.clinic_name || 'Aarogya Clinic';
  const doctorName = settings.doctor_name || 'Dr. Ananya Sharma, MD';

  // Direct Pure JS PDF 1.4 Generation
  const pdfBytes = buildHistoryPdfString({
    clinicName,
    doctorName,
    patientName: patient.name,
    patientNumber: patient.patientNumber,
    gender: patient.gender,
    age: patient.estimatedAge ? `${patient.estimatedAge} Yrs` : 'Age N/A',
    phone: patient.phone,
    visits,
  });

  const exportDir = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}history/`;
  const dirInfo = await FileSystem.getInfoAsync(exportDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });
  }

  const filePath = `${exportDir}History_${patient.patientNumber}.pdf`;
  const base64Data = binaryStringToBase64(pdfBytes);
  await FileSystem.writeAsStringAsync(filePath, base64Data, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const fileInfo = await FileSystem.getInfoAsync(filePath);
  if (!fileInfo.exists || !('size' in fileInfo) || fileInfo.size === 0) {
    throw new Error('Patient history PDF could not be saved to mobile storage.');
  }

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/pdf',
      dialogTitle: `Patient History - ${patient.name}`,
      UTI: 'com.adobe.pdf',
    });
  }
}
