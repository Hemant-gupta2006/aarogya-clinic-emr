import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { theme } from '../../constants/theme';
import { VisitWithDetails, VitalsData } from '../../db/repositories/visit.repo';
import { PatientWithMeta } from '../../db/repositories/patient.repo';
import { generateAndSharePrescriptionPdf } from '../../services/pdf.service';
import {
  X,
  Share2,
  Printer,
  Calendar,
  Clock,
  User,
  HeartPulse,
  Activity,
  Pill,
  FileCheck,
  Stethoscope,
} from 'lucide-react-native';

interface PrescriptionPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  patient: PatientWithMeta;
  visit: VisitWithDetails;
  clinicName?: string;
  doctorName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
}

export const PrescriptionPreviewModal: React.FC<PrescriptionPreviewModalProps> = ({
  visible,
  onClose,
  patient,
  visit,
  clinicName = 'Aarogya Clinic',
  doctorName = 'Dr. Ananya Sharma, MD',
  clinicAddress = 'Consultant Physician & Surgeon',
  clinicPhone = '+91 98765 43210',
}) => {
  const [sharing, setSharing] = useState(false);

  if (!visit || !patient) return null;

  let vitals: VitalsData | null = null;
  if (visit.vitals) {
    try {
      vitals = typeof visit.vitals === 'string' ? JSON.parse(visit.vitals) : visit.vitals;
    } catch {
      vitals = null;
    }
  }

  const handleSharePdf = async () => {
    try {
      setSharing(true);
      await generateAndSharePrescriptionPdf(patient, visit);
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Could not export prescription PDF.');
    } finally {
      setSharing(false);
    }
  };

  const rxItems = visit.prescription?.items || [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Top Modal Header */}
          <View style={styles.topHeader}>
            <View>
              <Text style={styles.modalTitle}>Prescription Preview</Text>
              <Text style={styles.modalSubtitle}>Verify clinical details before sharing with patient</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Prescription Document Sheet */}
          <ScrollView style={styles.slipScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.prescriptionPaper}>
              {/* Emerald Accent Bar */}
              <View style={styles.topAccentBar} />

              {/* Clinic Letterhead */}
              <View style={styles.letterhead}>
                <Text style={styles.clinicNameText}>{clinicName}</Text>
                <Text style={styles.doctorNameText}>{doctorName}</Text>
                <Text style={styles.clinicSubText}>{clinicAddress}</Text>
                {clinicPhone ? <Text style={styles.clinicSubText}>Contact: {clinicPhone}</Text> : null}
              </View>

              <View style={styles.divider} />

              {/* Patient Identity Header Box */}
              <View style={styles.patientInfoBox}>
                <View style={styles.patientRowItem}>
                  <Text style={styles.metaLabel}>PATIENT NAME</Text>
                  <Text style={styles.patientNameVal}>{patient.name}</Text>
                </View>
                <View style={styles.patientRowItem}>
                  <Text style={styles.metaLabel}>MEDICAL ID</Text>
                  <Text style={styles.patientIdVal}>{patient.patientNumber}</Text>
                </View>
                <View style={styles.patientRowItem}>
                  <Text style={styles.metaLabel}>AGE / GENDER</Text>
                  <Text style={styles.metaValue}>
                    {patient.estimatedAge ? `${patient.estimatedAge} Yrs` : 'N/A'} • {patient.gender}
                  </Text>
                </View>
                <View style={styles.patientRowItem}>
                  <Text style={styles.metaLabel}>DATE</Text>
                  <Text style={styles.metaValue}>{visit.visitDate}</Text>
                </View>
              </View>

              {/* Vitals Summary Strip */}
              {vitals && (vitals.bpSystolic || vitals.temperature || vitals.pulse || vitals.spo2 || vitals.weight) && (
                <View style={styles.vitalsStrip}>
                  <Text style={styles.vitalsTitle}>Vitals:</Text>
                  {vitals.bpSystolic && vitals.bpDiastolic ? (
                    <Text style={styles.vitalItem}>BP: {vitals.bpSystolic}/{vitals.bpDiastolic} mmHg</Text>
                  ) : null}
                  {vitals.temperature ? <Text style={styles.vitalItem}>Temp: {vitals.temperature}°F</Text> : null}
                  {vitals.pulse ? <Text style={styles.vitalItem}>Pulse: {vitals.pulse} bpm</Text> : null}
                  {vitals.spo2 ? <Text style={styles.vitalItem}>SpO2: {vitals.spo2}%</Text> : null}
                  {vitals.weight ? <Text style={styles.vitalItem}>Weight: {vitals.weight} kg</Text> : null}
                </View>
              )}

              {/* Symptoms / Complaints */}
              {visit.symptoms && (
                <View style={styles.clinicalSection}>
                  <Text style={styles.sectionHeading}>CHIEF COMPLAINTS & SYMPTOMS</Text>
                  <Text style={styles.sectionBody}>{visit.symptoms}</Text>
                </View>
              )}

              {/* Diagnosis */}
              {visit.diagnosis && (
                <View style={styles.clinicalSection}>
                  <Text style={styles.sectionHeading}>CLINICAL DIAGNOSIS</Text>
                  <View style={styles.diagnosisBadge}>
                    <Text style={styles.diagnosisText}>{visit.diagnosis}</Text>
                  </View>
                </View>
              )}

              {/* Rx Medications */}
              <View style={styles.clinicalSection}>
                <View style={styles.rxTitleRow}>
                  <Text style={styles.rxSymbol}>℞</Text>
                  <Text style={styles.sectionHeading}>PRESCRIBED MEDICATIONS</Text>
                </View>

                {rxItems.length > 0 ? (
                  <View style={styles.medsTable}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.thCell, { flex: 2 }]}>Medicine</Text>
                      <Text style={[styles.thCell, { flex: 1 }]}>Dosage</Text>
                      <Text style={[styles.thCell, { flex: 1.2 }]}>Frequency</Text>
                      <Text style={[styles.thCell, { flex: 1 }]}>Duration</Text>
                    </View>
                    {rxItems.map((item, idx) => (
                      <View key={idx} style={styles.tableRow}>
                        <View style={{ flex: 2 }}>
                          <Text style={styles.medName}>
                            {idx + 1}. {item.medicineName}
                          </Text>
                          {item.instructions ? (
                            <Text style={styles.medInst}>{item.instructions}</Text>
                          ) : null}
                        </View>
                        <Text style={[styles.tdCell, { flex: 1 }]}>{item.dosage || '-'}</Text>
                        <Text style={[styles.tdCell, { flex: 1.2, color: theme.colors.primary, fontWeight: '700' }]}>
                          {item.frequency || '-'}
                        </Text>
                        <Text style={[styles.tdCell, { flex: 1 }]}>{item.duration || '-'}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noMedsText}>No medications prescribed.</Text>
                )}
              </View>

              {/* Dietary / Advice Instructions */}
              {(visit.treatment || visit.prescription?.instructions) && (
                <View style={styles.clinicalSection}>
                  <Text style={styles.sectionHeading}>TREATMENT & GENERAL ADVICE</Text>
                  <Text style={styles.sectionBody}>
                    {visit.treatment || visit.prescription?.instructions}
                  </Text>
                </View>
              )}

              {/* Lab Reports & Charges */}
              {(visit.charges || visit.report) && (
                <View style={styles.feeSection}>
                  {visit.report ? (
                    <Text style={styles.reportRefText}>Lab Reports: {visit.report}</Text>
                  ) : null}
                  {visit.charges ? (
                    <Text style={styles.chargesText}>Consultation Fee: ₹{visit.charges}</Text>
                  ) : null}
                </View>
              )}

              {/* Signature Block */}
              <View style={styles.signatureBlock}>
                <View style={styles.signatureLine} />
                <Text style={styles.signDoctorName}>{doctorName}</Text>
                <Text style={styles.signSubtitle}>Signature & Clinic Seal</Text>
              </View>

              <Text style={styles.paperFooter}>
                Generated via AarogyaEMR Mobile System • Valid Medical Consultation Slip
              </Text>
            </View>
          </ScrollView>

          {/* Bottom Action CTAs */}
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Close Preview</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sharePdfBtn, sharing && styles.disabledBtn]}
              onPress={handleSharePdf}
              disabled={sharing}
              activeOpacity={0.85}
            >
              {sharing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Share2 size={16} color="#FFFFFF" />
                  <Text style={styles.sharePdfBtnText}>Share / Export PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    height: '92%',
    paddingTop: theme.spacing.md,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: theme.colors.text,
  },
  modalSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.cardBorder,
  },
  slipScroll: {
    flex: 1,
    padding: theme.spacing.md,
  },
  prescriptionPaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.md,
    marginBottom: theme.spacing.xl,
  },
  topAccentBar: {
    height: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
    marginBottom: theme.spacing.sm,
  },
  letterhead: {
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  clinicNameText: {
    fontSize: 19,
    fontWeight: '900',
    color: theme.colors.primaryDark,
  },
  doctorNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 2,
  },
  clinicSubText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  patientInfoBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: theme.borderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  patientRowItem: {
    flexBasis: '47%',
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  patientNameVal: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text,
    marginTop: 1,
  },
  patientIdVal: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primary,
    marginTop: 1,
  },
  metaValue: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  vitalsStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    alignItems: 'center',
  },
  vitalsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  vitalItem: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
  },
  clinicalSection: {
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionBody: {
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 18,
  },
  diagnosisBadge: {
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: theme.borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  diagnosisText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  rxTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  rxSymbol: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  medsTable: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thCell: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  medName: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
  },
  medInst: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  tdCell: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  noMedsText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  feeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 4,
  },
  reportRefText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  chargesText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  signatureBlock: {
    alignItems: 'flex-end',
    marginTop: 20,
    marginBottom: 8,
  },
  signatureLine: {
    width: 140,
    height: 1,
    backgroundColor: '#0F172A',
    marginBottom: 4,
  },
  signDoctorName: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.text,
  },
  signSubtitle: {
    fontSize: 9,
    color: theme.colors.textMuted,
  },
  paperFooter: {
    fontSize: 8.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 10,
  },
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.surface,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  sharePdfBtn: {
    flex: 1.6,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    ...theme.shadows.sm,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  sharePdfBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
