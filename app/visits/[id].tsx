import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../src/constants/theme';
import { getVisitById, VisitWithDetails, VitalsData } from '../../src/db/repositories/visit.repo';
import { getPatientById, PatientWithMeta } from '../../src/db/repositories/patient.repo';
import { getAppSettings } from '../../src/db/repositories/metadata.repo';
import { generateAndSharePrescriptionPdf } from '../../src/services/pdf.service';
import { PrescriptionPreviewModal } from '../../src/components/visits/PrescriptionPreviewModal';
import {
  Calendar,
  Clock,
  Pill,
  ChevronLeft,
  Activity,
  Printer,
  Edit,
} from 'lucide-react-native';

export default function VisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [visit, setVisit] = useState<VisitWithDetails | null>(null);
  const [patient, setPatient] = useState<PatientWithMeta | null>(null);
  const [clinicName, setClinicName] = useState('AarogyaEMR');
  const [doctorName, setDoctorName] = useState('Dr. Ananya Sharma, MD');
  const [clinicAddress, setClinicAddress] = useState('Consultant Physician & Surgeon');
  const [clinicPhone, setClinicPhone] = useState('');
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  useEffect(() => {
    async function load() {
      if (id) {
        const v = await getVisitById(id);
        setVisit(v);
        if (v?.patientId) {
          const p = await getPatientById(v.patientId);
          setPatient(p);
        }
        const settings = await getAppSettings();
        if (settings.clinic_name) setClinicName(settings.clinic_name);
        if (settings.doctor_name) setDoctorName(settings.doctor_name);
        if (settings.clinic_address) setClinicAddress(settings.clinic_address);
        if (settings.clinic_phone) setClinicPhone(settings.clinic_phone);
      }
    }
    load();
  }, [id]);

  const handlePrintOrSharePdf = () => {
    setPreviewModalVisible(true);
  };

  if (!visit) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Consultation not found.</Text>
      </View>
    );
  }

  const parsedVitals: VitalsData | null = visit.vitals
    ? typeof visit.vitals === 'string'
      ? JSON.parse(visit.vitals)
      : visit.vitals
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header Actions */}
      <View style={styles.topActions}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ChevronLeft size={20} color={theme.colors.text} />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.topActionsRight}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push(`/visits/${id}/edit`)}
            activeOpacity={0.85}
          >
            <Edit size={14} color={theme.colors.primaryDark} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareBtn} onPress={handlePrintOrSharePdf} activeOpacity={0.85}>
            <Printer size={14} color="#FFFFFF" />
            <Text style={styles.shareBtnText}>Print / Share PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Printable Prescription Slip Box */}
      <View style={styles.prescriptionSlip}>
        {/* Clinic Letterhead */}
        <View style={styles.clinicLetterhead}>
          <Text style={styles.letterheadClinic}>{clinicName}</Text>
          <Text style={styles.letterheadDoctor}>{doctorName}</Text>
          {clinicAddress ? <Text style={styles.letterheadAddress}>{clinicAddress}</Text> : null}
          {clinicPhone ? <Text style={styles.letterheadPhone}>Contact: {clinicPhone}</Text> : null}
        </View>

        <View style={styles.slipDivider} />

        {/* Patient Details Row */}
        <View style={styles.patientInfoRow}>
          <View>
            <Text style={styles.slipPatientName}>{patient?.name}</Text>
            <Text style={styles.slipPatientMeta}>
              {patient?.patientNumber} • {patient?.gender} • {patient?.estimatedAge ? `${patient.estimatedAge} yrs` : 'Age N/A'}
            </Text>
          </View>
          <View style={styles.slipDateBox}>
            <Text style={styles.slipDateText}>{visit.visitDate}</Text>
            <Text style={styles.slipTimeText}>{visit.visitTime}</Text>
          </View>
        </View>

        {/* Vitals Box if available */}
        {parsedVitals && (
          <View style={styles.vitalsBox}>
            <View style={styles.vitalsHeader}>
              <Activity size={14} color={theme.colors.primaryDark} />
              <Text style={styles.vitalsTitle}>Vitals Recorded:</Text>
            </View>
            <View style={styles.vitalsGrid}>
              {parsedVitals.bpSystolic && parsedVitals.bpDiastolic ? (
                <Text style={styles.vitalTag}>
                  BP: {parsedVitals.bpSystolic}/{parsedVitals.bpDiastolic} mmHg
                </Text>
              ) : null}
              {parsedVitals.temperature ? (
                <Text style={styles.vitalTag}>Temp: {parsedVitals.temperature}°F</Text>
              ) : null}
              {parsedVitals.pulse ? (
                <Text style={styles.vitalTag}>Pulse: {parsedVitals.pulse} bpm</Text>
              ) : null}
              {parsedVitals.spo2 ? (
                <Text style={styles.vitalTag}>SpO2: {parsedVitals.spo2}%</Text>
              ) : null}
              {parsedVitals.weight ? (
                <Text style={styles.vitalTag}>Weight: {parsedVitals.weight} kg</Text>
              ) : null}
            </View>
          </View>
        )}

        <View style={styles.slipDivider} />

        {/* Clinical Findings */}
        {visit.symptoms && (
          <View style={styles.slipField}>
            <Text style={styles.slipFieldLabel}>Symptoms / Chief Complaints:</Text>
            <Text style={styles.slipFieldValue}>{visit.symptoms}</Text>
          </View>
        )}

        {visit.diagnosis && (
          <View style={styles.slipField}>
            <Text style={styles.slipFieldLabel}>Clinical Diagnosis:</Text>
            <Text style={styles.slipFieldDiagnosis}>{visit.diagnosis}</Text>
          </View>
        )}

        {visit.treatment && (
          <View style={styles.slipField}>
            <Text style={styles.slipFieldLabel}>Treatment Plan & Advice:</Text>
            <Text style={styles.slipFieldValue}>{visit.treatment}</Text>
          </View>
        )}

        {/* Prescription Lines */}
        {visit.prescription && visit.prescription.items.length > 0 && (
          <View style={styles.rxSection}>
            <View style={styles.rxTitleRow}>
              <Pill size={16} color={theme.colors.primaryDark} />
              <Text style={styles.rxTitle}>Rx - Prescribed Medications</Text>
            </View>

            <View style={styles.rxList}>
              {visit.prescription.items.map((item, idx) => (
                <View key={item.id || idx} style={styles.rxCard}>
                  <View style={styles.rxMainLine}>
                    <Text style={styles.rxIndex}>{idx + 1}.</Text>
                    <Text style={styles.rxMedName}>{item.medicineName}</Text>
                    {item.dosage && <Text style={styles.rxMedDosage}>({item.dosage})</Text>}
                  </View>

                  <View style={styles.rxTimingRow}>
                    {item.frequency && (
                      <View style={styles.rxTag}>
                        <Clock size={11} color={theme.colors.textMuted} />
                        <Text style={styles.rxTagText}>{item.frequency}</Text>
                      </View>
                    )}
                    {item.duration && (
                      <View style={styles.rxTag}>
                        <Calendar size={11} color={theme.colors.textMuted} />
                        <Text style={styles.rxTagText}>{item.duration}</Text>
                      </View>
                    )}
                  </View>

                  {item.instructions && (
                    <Text style={styles.rxInstText}>Note: {item.instructions}</Text>
                  )}
                </View>
              ))}
            </View>

            {visit.prescription.instructions && (
              <View style={styles.adviceBox}>
                <Text style={styles.adviceTitle}>Advice / Diet:</Text>
                <Text style={styles.adviceText}>{visit.prescription.instructions}</Text>
              </View>
            )}
          </View>
        )}

        {/* Charges & Reports */}
        {(visit.charges || visit.report) && (
          <View style={styles.chargesReportBox}>
            {visit.charges ? (
              <View style={styles.chargeRow}>
                <Text style={styles.chargeLabel}>Consultation Charges:</Text>
                <Text style={styles.chargeValue}>₹{visit.charges}</Text>
              </View>
            ) : null}

            {visit.report ? (
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Lab Report Remark:</Text>
                <Text style={styles.reportValue}>{visit.report}</Text>
              </View>
            ) : null}
          </View>
        )}

        {visit.notes && (
          <View style={styles.doctorNotesBox}>
            <Text style={styles.doctorNotesTitle}>Doctor's Private Notes:</Text>
            <Text style={styles.doctorNotesText}>{visit.notes}</Text>
          </View>
        )}
      </View>

      {/* Prescription Preview Modal */}
      {patient && (
        <PrescriptionPreviewModal
          visible={previewModalVisible}
          onClose={() => setPreviewModalVisible(false)}
          patient={patient}
          visit={visit}
          clinicName={clinicName}
          doctorName={doctorName}
          clinicAddress={clinicAddress}
          clinicPhone={clinicPhone}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtnText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  topActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.primaryBg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorderHighlight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
  },
  editBtnText: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 9,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  prescriptionSlip: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...theme.shadows.sm,
  },
  clinicLetterhead: {
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  letterheadClinic: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.primaryDark,
    letterSpacing: 0.5,
  },
  letterheadDoctor: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 2,
  },
  letterheadAddress: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  letterheadPhone: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  slipDivider: {
    height: 1,
    backgroundColor: theme.colors.cardBorder,
    marginVertical: theme.spacing.md,
  },
  patientInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slipPatientName: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
  },
  slipPatientMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  slipDateBox: {
    alignItems: 'flex-end',
  },
  slipDateText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text,
  },
  slipTimeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  vitalsBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  vitalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  vitalsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  vitalTag: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  slipField: {
    marginBottom: 10,
  },
  slipFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  slipFieldValue: {
    fontSize: 13,
    color: theme.colors.text,
    marginTop: 2,
    lineHeight: 19,
  },
  slipFieldDiagnosis: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    backgroundColor: theme.colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  rxSection: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  rxTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.sm,
  },
  rxTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    textTransform: 'uppercase',
  },
  rxList: {
    gap: 8,
  },
  rxCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  rxMainLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rxIndex: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  rxMedName: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
  },
  rxMedDosage: {
    fontSize: 13,
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
  rxTimingRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  rxTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  rxTagText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  rxInstText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  adviceBox: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  adviceTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  adviceText: {
    fontSize: 12,
    color: theme.colors.text,
    marginTop: 2,
    fontStyle: 'italic',
  },
  chargesReportBox: {
    backgroundColor: theme.colors.background,
    padding: 10,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  chargeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chargeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  chargeValue: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  reportRow: {
    marginTop: 2,
  },
  reportLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  reportValue: {
    fontSize: 12,
    color: theme.colors.text,
    marginTop: 1,
  },
  doctorNotesBox: {
    marginTop: theme.spacing.md,
    backgroundColor: '#FFFBEB',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  doctorNotesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  doctorNotesText: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 2,
  },
});
