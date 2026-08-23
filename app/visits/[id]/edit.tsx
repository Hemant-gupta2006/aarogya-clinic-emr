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
import { theme } from '../../../src/constants/theme';
import { getVisitById, updateVisit, PrescriptionItemInput, VitalsData, VisitWithDetails } from '../../../src/db/repositories/visit.repo';
import { getPatientById, PatientWithMeta } from '../../../src/db/repositories/patient.repo';
import { savePatientImage } from '../../../src/services/photo.service';
import { VitalsInputGroup } from '../../../src/components/visits/VitalsInputGroup';
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
  FileSpreadsheet,
  Camera,
  Image as ImageIcon,
  ChevronLeft,
} from 'lucide-react-native';

const FREQUENCY_PRESETS = ['1-0-1 (After food)', '1-1-1', '1-0-0 (Morning)', '0-0-1 (Night)', 'SOS (As needed)', 'Twice daily'];

interface AttachedReportItem {
  uri: string;
  name: string;
}

export default function EditVisitScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [visit, setVisit] = useState<VisitWithDetails | null>(null);
  const [patient, setPatient] = useState<PatientWithMeta | null>(null);
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [charges, setCharges] = useState('');
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
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItemInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (id) {
        const v = await getVisitById(id);
        if (v) {
          setVisit(v);
          setVisitDate(v.visitDate);
          setVisitTime(v.visitTime);
          setSymptoms(v.symptoms || '');
          setDiagnosis(v.diagnosis || '');
          setTreatment(v.treatment || '');
          setCharges(v.charges || '');
          setReport(v.report || '');
          setNotes(v.notes || '');

          if (v.vitals) {
            try {
              const vit = typeof v.vitals === 'string' ? JSON.parse(v.vitals) : v.vitals;
              setVitals(vit);
            } catch {
              // Ignore
            }
          }

          if (v.prescription) {
            setPrescriptionAdvice(v.prescription.instructions || '');
            if (v.prescription.items && v.prescription.items.length > 0) {
              setPrescriptionItems(
                v.prescription.items.map((i) => ({
                  medicineName: i.medicineName,
                  dosage: i.dosage || '',
                  frequency: i.frequency || '1-0-1 (After food)',
                  duration: i.duration || '',
                  instructions: i.instructions || '',
                }))
              );
            }
          }

          if (v.patientId) {
            const p = await getPatientById(v.patientId);
            setPatient(p);
          }
        }
        setLoading(false);
      }
    }
    loadData();
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
          Alert.alert('Permission Denied', 'Camera access is required to capture photos.');
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
          Alert.alert('Permission Denied', 'Gallery access is required to attach reports.');
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

  const handleSaveUpdatedVisit = async () => {
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

      let finalReportText = report.trim();
      if (attachedReports.length > 0) {
        const attachedTitles = attachedReports.map((r) => r.name.trim()).filter(Boolean).join(', ');
        if (!finalReportText) {
          finalReportText = `Attached: ${attachedTitles}`;
        } else if (!finalReportText.includes(attachedTitles)) {
          finalReportText = `${finalReportText} (Attached: ${attachedTitles})`;
        }
      }

      await updateVisit(id, {
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

      // Save any newly attached reports
      if (attachedReports.length > 0 && patient?.id) {
        for (const item of attachedReports) {
          try {
            await savePatientImage(patient.id, item.uri, 'CLINICAL');
          } catch (photoErr) {
            console.warn('Failed to save attached report:', photoErr);
          }
        }
      }

      Alert.alert('Saved', 'Consultation record updated successfully.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update consultation.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading consultation...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 80}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Back & Title Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ChevronLeft size={20} color={theme.colors.text} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Consultation</Text>
        </View>

        {/* Patient Summary Header */}
        <View style={styles.patientBanner}>
          <View style={styles.patientBannerLeft}>
            <View style={styles.patientIconCircle}>
              <User size={20} color={theme.colors.primaryDark} />
            </View>
            <View style={styles.patientTextWrap}>
              <Text style={styles.bannerName}>{patient?.name || 'Patient'}</Text>
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
          onPress={handleSaveUpdatedVisit}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Check size={20} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>
            {saving ? 'Updating Record...' : 'Save & Update Consultation'}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
    marginRight: 12,
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
  mediaActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: theme.spacing.xs,
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
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
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
