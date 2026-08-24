import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../../src/constants/theme';
import { getPatientById, PatientWithMeta } from '../../../../src/db/repositories/patient.repo';
import { createVisit, PrescriptionItemInput, VitalsData } from '../../../../src/db/repositories/visit.repo';
import { savePatientImage } from '../../../../src/services/photo.service';
import { VitalsInputGroup } from '../../../../src/components/visits/VitalsInputGroup';
import {
  Stethoscope,
  Plus,
  Trash2,
  Check,
  Calendar,
  Pill,
  User,
  FileCheck,
  FileText,
  Camera,
  Image as ImageIcon,
  FileSpreadsheet,
  X,
} from 'lucide-react-native';

const FREQUENCY_PRESETS = ['1-0-1 (After food)', '1-1-1', '1-0-0 (Morning)', '0-0-1 (Night)', 'SOS (As needed)', 'Twice daily'];
const DURATION_PRESETS = ['3 Days', '5 Days', '7 Days', '14 Days', '1 Month'];

interface AttachedReportItem {
  id: string;
  name: string;
  uri: string;
}

export default function NewVisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [patient, setPatient] = useState<PatientWithMeta | null>(null);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [visitTime, setVisitTime] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [charges, setCharges] = useState('200');
  const [report, setReport] = useState('');
  const [notes, setNotes] = useState('');
  const [attachedReports, setAttachedReports] = useState<AttachedReportItem[]>([]);
  const [vitals, setVitals] = useState<VitalsData>({
    bpSystolic: '',
    bpDiastolic: '',
    temperature: '',
    pulse: '',
    weight: '',
    spo2: '',
  });

  const [prescriptionAdvice, setPrescriptionAdvice] = useState('');
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItemInput[]>([
    { medicineName: '', dosage: '', frequency: '1-0-1 (After food)', duration: '5 Days', instructions: '' },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadPatient() {
      if (id) {
        const p = await getPatientById(id);
        setPatient(p);
      }
    }
    loadPatient();
  }, [id]);

  const handleVitalsChange = (field: keyof VitalsData, val: string) => {
    setVitals((prev) => ({ ...prev, [field]: val }));
  };

  const handleAddMedicineRow = () => {
    setPrescriptionItems((prev) => [
      ...prev,
      { medicineName: '', dosage: '', frequency: '1-0-1 (After food)', duration: '5 Days', instructions: '' },
    ]);
  };

  const handleRemoveMedicineRow = (index: number) => {
    setPrescriptionItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateMedicineRow = (
    index: number,
    field: keyof PrescriptionItemInput,
    value: string
  ) => {
    setPrescriptionItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handlePickReport = async (source: 'camera' | 'gallery') => {
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera access is required to capture diagnostic reports.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.85,
        });

        if (!result.canceled && result.assets && result.assets[0]?.uri) {
          const newDoc: AttachedReportItem = {
            uri: result.assets[0].uri,
            name: 'Chest X-Ray',
          };
          setAttachedReports((prev) => [...prev, newDoc]);
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery access is required to attach diagnostic reports.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.85,
          allowsMultipleSelection: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const defaultNames = ['Chest X-Ray', 'CBC Blood Report', 'ECG Strip', 'Ultrasound Scan', 'Prescription Slip'];
          const newDocs: AttachedReportItem[] = result.assets.map((a, idx) => ({
            uri: a.uri,
            name: defaultNames[idx % defaultNames.length] || `Report ${idx + 1}`,
          }));
          setAttachedReports((prev) => [...prev, ...newDocs]);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not pick report image.');
    }
  };

  const handleUpdateReportTitle = (index: number, newTitle: string) => {
    setAttachedReports((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, name: newTitle } : item))
    );
  };

  const handleRemoveReport = (index: number) => {
    setAttachedReports((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveVisit = async () => {
    if (!id) return;
    if (!diagnosis.trim() && !symptoms.trim()) {
      Alert.alert('Required Information', 'Please record either symptoms / chief complaints or a clinical diagnosis.');
      return;
    }

    try {
      setSaving(true);
      const validItems = prescriptionItems.filter((item) => item.medicineName.trim().length > 0);

      const hasVitals =
        vitals.bpSystolic ||
        vitals.bpDiastolic ||
        vitals.temperature ||
        vitals.pulse ||
        vitals.weight ||
        vitals.spo2;

      // Compile attached report names
      let finalReportText = report.trim();
      if (attachedReports.length > 0) {
        const attachedTitles = attachedReports.map((r) => r.name.trim()).filter(Boolean).join(', ');
        if (!finalReportText) {
          finalReportText = `Attached: ${attachedTitles}`;
        } else if (!finalReportText.includes(attachedTitles)) {
          finalReportText = `${finalReportText} (Attached: ${attachedTitles})`;
        }
      }

      await createVisit({
        patientId: id,
        visitDate,
        visitTime,
        symptoms: symptoms.trim() || undefined,
        diagnosis: diagnosis.trim() || undefined,
        treatment: treatment.trim() || undefined,
        vitals: hasVitals ? vitals : null,
        charges: charges.trim() || null,
        report: finalReportText || null,
        notes: notes.trim() || undefined,
        prescription: {
          instructions: prescriptionAdvice.trim() || undefined,
          items: validItems,
        },
      });

      // Persist any attached X-Rays / Diagnostic Reports
      if (attachedReports.length > 0) {
        for (const item of attachedReports) {
          try {
            await savePatientImage(id, item.uri, 'CLINICAL');
          } catch (photoErr) {
            console.warn('Failed to save attached report:', photoErr);
          }
        }
      }

      router.replace(`/patients/${id}`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save consultation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 80}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 80, 220) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Patient Summary Header */}
        <View style={styles.patientBanner}>
          <View style={styles.patientBannerLeft}>
            <View style={styles.patientIconCircle}>
              <User size={20} color={theme.colors.primaryDark} />
            </View>
            <View style={styles.patientTextWrap}>
              <Text style={styles.bannerName}>{patient?.name || 'Loading...'}</Text>
              <Text style={styles.bannerMeta}>
                {patient?.patientNumber} • {patient?.estimatedAge ? `${patient.estimatedAge} yrs` : 'Age N/A'} • {patient?.gender}
              </Text>
            </View>
          </View>
          <View style={styles.dateTimeBadge}>
            <Calendar size={12} color={theme.colors.primaryDark} />
            <Text style={styles.dateTimeText}>{visitDate}</Text>
          </View>
        </View>

        {/* Clinical Findings Form */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Stethoscope size={18} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Clinical Findings & Diagnosis</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Chief Complaints & Symptoms</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Fever with chills for 3 days, dry cough, bodyache..."
              placeholderTextColor={theme.colors.textLight}
              value={symptoms}
              onChangeText={setSymptoms}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Clinical Diagnosis *</Text>
            <TextInput
              style={[styles.input, styles.textArea, { fontWeight: '700', color: theme.colors.primaryDark }]}
              placeholder="e.g. Acute Viral Bronchitis / Suspected Dengue syndrome"
              placeholderTextColor={theme.colors.textLight}
              value={diagnosis}
              onChangeText={setDiagnosis}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Treatment Plan & General Advice</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Rest, hydration, steam inhalation, cold sponges..."
              placeholderTextColor={theme.colors.textLight}
              value={treatment}
              onChangeText={setTreatment}
              multiline
            />
          </View>
        </View>

        {/* Structured Prescription Builder */}
        <View style={styles.card}>
          <View style={styles.rxHeaderRow}>
            <View style={styles.rxHeaderLeft}>
              <Pill size={18} color={theme.colors.primary} />
              <Text style={styles.cardTitle}>Prescription & Medications</Text>
            </View>
            <TouchableOpacity style={styles.addMedBtn} onPress={handleAddMedicineRow} activeOpacity={0.85}>
              <Plus size={15} color="#FFFFFF" />
              <Text style={styles.addMedBtnText}>Add Medicine</Text>
            </TouchableOpacity>
          </View>

          {prescriptionItems.map((item, index) => (
            <View key={index} style={styles.rxItemCard}>
              <View style={styles.rxItemHeader}>
                <Text style={styles.rxItemIndex}>Medicine #{index + 1}</Text>
                {prescriptionItems.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveMedicineRow(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Trash2 size={16} color={theme.colors.danger} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.rowTwoCols}>
                <View style={[styles.inputGroup, { flex: 2 }]}>
                  <Text style={styles.subLabel}>Medicine Name *</Text>
                  <TextInput
                    style={styles.inputSmall}
                    placeholder="e.g. Paracetamol 650mg"
                    placeholderTextColor={theme.colors.textLight}
                    value={item.medicineName}
                    onChangeText={(val) => handleUpdateMedicineRow(index, 'medicineName', val)}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1.1 }]}>
                  <Text style={styles.subLabel}>Dosage</Text>
                  <TextInput
                    style={styles.inputSmall}
                    placeholder="e.g. 1 tab"
                    placeholderTextColor={theme.colors.textLight}
                    value={item.dosage || ''}
                    onChangeText={(val) => handleUpdateMedicineRow(index, 'dosage', val)}
                  />
                </View>
              </View>

              <View style={styles.rowTwoCols}>
                <View style={[styles.inputGroup, { flex: 1.2 }]}>
                  <Text style={styles.subLabel}>Frequency</Text>
                  <TextInput
                    style={styles.inputSmall}
                    placeholder="e.g. 1-0-1"
                    placeholderTextColor={theme.colors.textLight}
                    value={item.frequency || ''}
                    onChangeText={(val) => handleUpdateMedicineRow(index, 'frequency', val)}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.subLabel}>Duration</Text>
                  <TextInput
                    style={styles.inputSmall}
                    placeholder="e.g. 5 Days"
                    placeholderTextColor={theme.colors.textLight}
                    value={item.duration || ''}
                    onChangeText={(val) => handleUpdateMedicineRow(index, 'duration', val)}
                  />
                </View>
              </View>

              {/* Quick Frequency Preset Chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
                {FREQUENCY_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetChip, item.frequency === preset && styles.presetChipActive]}
                    onPress={() => handleUpdateMedicineRow(index, 'frequency', preset)}
                  >
                    <Text style={[styles.presetChipText, item.frequency === preset && styles.presetChipTextActive]}>
                      {preset}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={[styles.inputGroup, { marginTop: 6 }]}>
                <Text style={styles.subLabel}>Instructions / Remarks</Text>
                <TextInput
                  style={styles.inputSmall}
                  placeholder="e.g. Take after food with warm water"
                  placeholderTextColor={theme.colors.textLight}
                  value={item.instructions || ''}
                  onChangeText={(val) => handleUpdateMedicineRow(index, 'instructions', val)}
                />
              </View>
            </View>
          ))}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>General Dietary / Prescription Instructions</Text>
            <TextInput
              style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
              placeholder="e.g. Avoid oily/cold foods, review in 3 days if symptoms persist..."
              placeholderTextColor={theme.colors.textLight}
              value={prescriptionAdvice}
              onChangeText={setPrescriptionAdvice}
              multiline
            />
          </View>
        </View>

        {/* X-Rays & Diagnostic Reports Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <FileSpreadsheet size={18} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>X-Rays & Diagnostic Reports ({attachedReports.length})</Text>
          </View>

          <Text style={styles.reportsHelpText}>
            Attach X-rays, lab test slips, ECGs, or pathology records to save directly in the patient's medical history.
          </Text>

          <View style={styles.mediaActionRow}>
            <TouchableOpacity
              style={styles.mediaPickBtn}
              onPress={() => handlePickReport('camera')}
              activeOpacity={0.85}
            >
              <Camera size={16} color={theme.colors.primaryDark} />
              <Text style={styles.mediaPickBtnText}>Capture Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mediaPickBtn, styles.mediaPickBtnGallery]}
              onPress={() => handlePickReport('gallery')}
              activeOpacity={0.85}
            >
              <ImageIcon size={16} color="#4F46E5" />
              <Text style={[styles.mediaPickBtnText, { color: '#4F46E5' }]}>Upload from Gallery</Text>
            </TouchableOpacity>
          </View>

          {attachedReports.length > 0 && (
            <View style={styles.reportsList}>
              {attachedReports.map((item, idx) => (
                <View key={idx} style={styles.reportRowCard}>
                  <Image source={{ uri: item.uri }} style={styles.reportRowThumb} />
                  
                  <View style={styles.reportRowRight}>
                    <View style={styles.reportRowHeader}>
                      <Text style={styles.reportRowIndex}>Document #{idx + 1}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveReport(idx)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={15} color={theme.colors.danger} />
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={styles.reportRowInput}
                      placeholder="e.g. Chest X-Ray / CBC Blood Test"
                      placeholderTextColor={theme.colors.textLight}
                      value={item.name}
                      onChangeText={(val) => handleUpdateReportTitle(idx, val)}
                    />

                    {/* Quick Category Chips */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reportChipScroll}>
                      {['Chest X-Ray', 'CBC Lab Report', 'ECG Strip', 'Ultrasound', 'Prescription Slip'].map((preset) => (
                        <TouchableOpacity
                          key={preset}
                          style={[styles.reportPresetChip, item.name === preset && styles.reportPresetChipActive]}
                          onPress={() => handleUpdateReportTitle(idx, preset)}
                        >
                          <Text style={[styles.reportPresetText, item.name === preset && styles.reportPresetTextActive]}>
                            {preset}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Clinical Vitals Group */}
        <VitalsInputGroup vitals={vitals} onChangeVitals={handleVitalsChange} />

        {/* Reports & Consultation Fee */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <FileCheck size={18} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Reports & Charges</Text>
          </View>

          <View style={styles.rowTwoCols}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Consultation Charges (₹)</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.wrapperInput}
                  placeholder="200"
                  placeholderTextColor={theme.colors.textLight}
                  value={charges}
                  onChangeText={setCharges}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1.4 }]}>
              <Text style={styles.label}>Lab Report Reference</Text>
              <View style={styles.inputWrapper}>
                <FileText size={16} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.wrapperInput}
                  placeholder="e.g. CBC Normal"
                  placeholderTextColor={theme.colors.textLight}
                  value={report}
                  onChangeText={setReport}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Private Doctor Notes (Internal)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Internal doctor clinical notes, differential diagnosis observations..."
              placeholderTextColor={theme.colors.textLight}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          </View>
        </View>

        {/* Save CTA */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.disabledBtn]}
          onPress={handleSaveVisit}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Check size={20} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>
            {saving ? 'Saving Consultation...' : 'Save Consultation Record'}
          </Text>
        </TouchableOpacity>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.md,
    paddingBottom: 220,
  },
  patientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  patientBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  patientIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorderHighlight,
  },
  patientTextWrap: {
    flex: 1,
  },
  bannerName: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  bannerMeta: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  dateTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorderHighlight,
  },
  dateTimeText: {
    fontSize: 11,
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  reportsHelpText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 17,
  },
  mediaActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  mediaPickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primaryBg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorderHighlight,
    borderRadius: theme.borderRadius.md,
    height: 42,
  },
  mediaPickBtnGallery: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  mediaPickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  reportsThumbScroll: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 4,
  },
  reportThumbCard: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginRight: 10,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  reportThumbImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeReportBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportTypePill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  reportTypePillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primary,
    marginRight: 6,
  },
  wrapperInput: {
    flex: 1,
    height: 46,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  diagnosisInput: {
    backgroundColor: theme.colors.primaryBg,
    borderColor: theme.colors.cardBorderHighlight,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    height: 56,
    fontSize: 15,
    paddingVertical: 10,
  },
  textArea: {
    height: 84,
    textAlignVertical: 'top',
    paddingTop: 12,
    paddingBottom: 12,
  },
  inputSmall: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    paddingHorizontal: 10,
    height: 42,
    color: theme.colors.text,
    fontSize: 13,
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  rxHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  rxHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addMedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
  },
  addMedBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  rxItemCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  rxItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  rxItemIndex: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  presetScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  presetChip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  presetChipActive: {
    backgroundColor: theme.colors.primaryBg,
    borderColor: theme.colors.primary,
  },
  presetChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  presetChipTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  reportsList: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  reportRowCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    gap: 10,
    alignItems: 'center',
  },
  reportRowThumb: {
    width: 68,
    height: 68,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
  },
  reportRowRight: {
    flex: 1,
  },
  reportRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reportRowIndex: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  reportRowInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    paddingHorizontal: 8,
    height: 36,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  reportChipScroll: {
    flexDirection: 'row',
  },
  reportPresetChip: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 5,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  reportPresetChipActive: {
    backgroundColor: theme.colors.primaryBg,
    borderColor: theme.colors.primary,
  },
  reportPresetText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  reportPresetTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    height: 52,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  bottomSpacer: {
    height: 180,
  },
});
