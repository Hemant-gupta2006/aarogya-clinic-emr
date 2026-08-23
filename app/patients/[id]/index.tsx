import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { theme } from '../../../src/constants/theme';
import { getPatientById, PatientWithMeta, softDeletePatient } from '../../../src/db/repositories/patient.repo';
import { getPatientVisits, VisitWithDetails } from '../../../src/db/repositories/visit.repo';
import { getPatientPhotos, getAbsolutePhotoUri, savePatientImage } from '../../../src/services/photo.service';
import { PatientPhoto } from '../../../src/db/schema';
import { PatientHistoryModal } from '../../../src/components/visits/PatientHistoryModal';
import { PrescriptionPreviewModal } from '../../../src/components/visits/PrescriptionPreviewModal';
import { generateAndSharePrescriptionPdf, generateAndSharePatientHistoryPdf } from '../../../src/services/pdf.service';
import * as ImagePicker from 'expo-image-picker';
import {
  User,
  Phone,
  Calendar,
  MapPin,
  FileText,
  PlusCircle,
  Edit,
  Camera,
  Pill,
  Clock,
  Trash2,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Share2,
  History,
  Activity,
  AlertCircle,
  HeartPulse,
  X,
} from 'lucide-react-native';

export default function PatientProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [patient, setPatient] = useState<PatientWithMeta | null>(null);
  const [visits, setVisits] = useState<VisitWithDetails[]>([]);
  const [photos, setPhotos] = useState<PatientPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedVisitIds, setExpandedVisitIds] = useState<Record<string, boolean>>({});
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [previewVisitForPdf, setPreviewVisitForPdf] = useState<VisitWithDetails | null>(null);
  const [previewPhotoUri, setPreviewPhotoUri] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const p = await getPatientById(id);
      setPatient(p);
      const v = await getPatientVisits(id);
      setVisits(v);
      const ph = await getPatientPhotos(id);
      setPhotos(ph);

      // Expand the first/most recent visit by default
      if (v.length > 0) {
        setExpandedVisitIds({ [v[0].id]: true });
      }
    } catch {
      // Error loading
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const toggleVisitExpand = (visitId: string) => {
    setExpandedVisitIds((prev) => ({
      ...prev,
      [visitId]: !prev[visitId],
    }));
  };

  const handleAddClinicalPhoto = () => {
    if (!id) return;
    Alert.alert(
      'Attach Photo or Report',
      'Choose source for clinical photograph, X-ray, or diagnostic report:',
      [
        {
          text: 'Take Photo (Camera)',
          onPress: () => capturePhoto('camera'),
        },
        {
          text: 'Upload from Gallery',
          onPress: () => capturePhoto('gallery'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const capturePhoto = async (source: 'camera' | 'gallery') => {
    if (!id) return;
    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.85,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery permission is required.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.85,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        await savePatientImage(id, result.assets[0].uri, 'CLINICAL');
        await loadData();
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to save clinical photograph: ' + (err.message || ''));
    }
  };

  const handleSharePrescriptionPdf = (v: VisitWithDetails) => {
    setPreviewVisitForPdf(v);
  };

  const handleShareHistoryPdf = async () => {
    if (!patient) return;
    try {
      await generateAndSharePatientHistoryPdf(patient, visits);
    } catch (err: any) {
      console.warn('PDF history export error:', err);
      Alert.alert('Error', err?.message || 'Could not export history PDF.');
    }
  };

  const handleArchivePatient = () => {
    if (!id || !patient) return;
    Alert.alert(
      'Archive Patient Record',
      `Are you sure you want to archive ${patient.name}? The record will be hidden from daily search but preserved in the audit database.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            await softDeletePatient(id);
            router.replace('/(tabs)/patients');
          },
        },
      ]
    );
  };

  if (!patient && !loading) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Patient record not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Patient Profile Demographics Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeaderRow}>
          <View style={styles.avatar}>
            {patient?.profilePhoto ? (
              <Image
                source={{ uri: getAbsolutePhotoUri(patient.profilePhoto) }}
                style={styles.avatarImg}
              />
            ) : (
              <User size={34} color={theme.colors.primaryDark} />
            )}
          </View>

          <View style={styles.profileHeaderInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.patientName}>{patient?.name}</Text>
              <View style={styles.patientNumberBadge}>
                <Text style={styles.patientNumberText}>{patient?.patientNumber}</Text>
              </View>
            </View>

            <Text style={styles.demographicText}>
              {patient?.estimatedAge ? `${patient.estimatedAge} Years` : 'Age N/A'} • {patient?.gender}
              {patient?.dateOfBirth ? ` (DOB: ${patient.dateOfBirth})` : ''}
            </Text>

            <View style={styles.phoneRow}>
              <Phone size={13} color={theme.colors.textMuted} />
              <Text style={styles.phoneText}>{patient?.phone}</Text>
            </View>
          </View>
        </View>

        {/* Blood Group & Allergies Row */}
        {(patient?.bloodGroup || patient?.allergies) && (
          <View style={styles.tagsRow}>
            {patient.bloodGroup ? (
              <View style={styles.bloodGroupBadge}>
                <HeartPulse size={12} color={theme.colors.primaryDark} />
                <Text style={styles.bloodGroupText}>{patient.bloodGroup}</Text>
              </View>
            ) : null}

            {patient.allergies ? (
              <View style={styles.allergyBadge}>
                <AlertCircle size={12} color={theme.colors.danger} />
                <Text style={styles.allergyText} numberOfLines={1}>
                  Allergy: {patient.allergies}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {patient?.address && (
          <View style={styles.detailItem}>
            <MapPin size={14} color={theme.colors.textMuted} />
            <Text style={styles.detailText}>{patient.address}</Text>
          </View>
        )}

        {patient?.notes && (
          <View style={styles.detailItem}>
            <FileText size={14} color={theme.colors.warning} />
            <Text style={[styles.detailText, { color: theme.colors.warning }]}>
              {patient.notes}
            </Text>
          </View>
        )}

        {/* Action Buttons Rows */}
        <View style={styles.profileActionRows}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary, { width: '100%' }]}
            onPress={() => router.push(`/patients/${id}/visit/new`)}
            activeOpacity={0.85}
          >
            <PlusCircle size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnTextPrimary}>+ New Follow-up Visit</Text>
          </TouchableOpacity>

          <View style={styles.actionRowSecondary}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() => router.push(`/patients/${id}/edit`)}
              activeOpacity={0.85}
            >
              <Edit size={14} color={theme.colors.textSecondary} />
              <Text style={styles.actionBtnTextSecondary}>Edit Info</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnDanger]}
              onPress={handleArchivePatient}
              activeOpacity={0.85}
            >
              <Trash2 size={14} color={theme.colors.danger} />
              <Text style={styles.actionBtnTextDanger}>Archive</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Clinical Photos & Attachments Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Photos & Attachments ({photos.length})</Text>
        <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddClinicalPhoto} activeOpacity={0.8}>
          <Camera size={14} color={theme.colors.primaryDark} />
          <Text style={styles.addPhotoBtnText}>+ Add Photo</Text>
        </TouchableOpacity>
      </View>

      {photos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
          {photos.map((ph) => (
            <TouchableOpacity
              key={ph.id}
              style={styles.photoThumbWrapper}
              onPress={() => setPreviewPhotoUri(getAbsolutePhotoUri(ph.filePath))}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: getAbsolutePhotoUri(ph.filePath) }}
                style={styles.photoThumb}
              />
              <Text style={styles.photoTypeBadge}>{ph.photoType}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyPhotosCard}>
          <Text style={styles.emptyPhotosText}>No clinical photos or documents attached.</Text>
        </View>
      )}

      {/* Longitudinal Consultation Timeline */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Consultation Timeline ({visits.length})</Text>
      </View>

      {visits.length === 0 ? (
        <View style={styles.emptyVisitsCard}>
          <Stethoscope size={40} color={theme.colors.textLight} />
          <Text style={styles.emptyVisitsTitle}>No consultations recorded yet</Text>
          <TouchableOpacity
            style={styles.firstVisitBtn}
            onPress={() => router.push(`/patients/${id}/visit/new`)}
            activeOpacity={0.85}
          >
            <Text style={styles.firstVisitBtnText}>Start First Consultation</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.timelineList}>
          {visits.map((v, index) => {
            const isExpanded = Boolean(expandedVisitIds[v.id]);
            const parsedVitals = v.vitals
              ? typeof v.vitals === 'string'
                ? JSON.parse(v.vitals)
                : v.vitals
              : null;

            return (
              <View key={v.id} style={styles.visitCard}>
                {/* Header Row */}
                <TouchableOpacity
                  style={styles.visitCardHeader}
                  onPress={() => toggleVisitExpand(v.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.visitHeaderLeft}>
                    <View style={styles.visitDateBadge}>
                      <Calendar size={13} color={theme.colors.primaryDark} />
                      <Text style={styles.visitDateText}>{v.visitDate}</Text>
                    </View>
                    <View style={styles.visitTimeBadge}>
                      <Clock size={11} color={theme.colors.textMuted} />
                      <Text style={styles.visitTimeText}>{v.visitTime}</Text>
                    </View>
                    {index === 0 && (
                      <View style={styles.latestBadge}>
                        <Text style={styles.latestBadgeText}>Latest</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.visitHeaderRight}>
                    {v.charges ? (
                      <Text style={styles.visitChargesBadge}>₹{v.charges}</Text>
                    ) : null}
                    {isExpanded ? (
                      <ChevronUp size={18} color={theme.colors.textMuted} />
                    ) : (
                      <ChevronDown size={18} color={theme.colors.textMuted} />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Consultation Summary */}
                <View style={styles.visitBody}>
                  {v.diagnosis && (
                    <View style={styles.clinicalField}>
                      <Text style={styles.fieldLabel}>Diagnosis</Text>
                      <Text style={styles.fieldValueBold}>{v.diagnosis}</Text>
                    </View>
                  )}

                  {/* Vitals Summary Pills */}
                  {parsedVitals && (
                    <View style={styles.vitalsRow}>
                      <Activity size={12} color={theme.colors.primary} />
                      {parsedVitals.bpSystolic && parsedVitals.bpDiastolic ? (
                        <View style={styles.vitalPill}>
                          <Text style={styles.vitalPillText}>
                            BP: {parsedVitals.bpSystolic}/{parsedVitals.bpDiastolic}
                          </Text>
                        </View>
                      ) : null}
                      {parsedVitals.temperature ? (
                        <View style={styles.vitalPill}>
                          <Text style={styles.vitalPillText}>Temp: {parsedVitals.temperature}°F</Text>
                        </View>
                      ) : null}
                      {parsedVitals.pulse ? (
                        <View style={styles.vitalPill}>
                          <Text style={styles.vitalPillText}>Pulse: {parsedVitals.pulse} bpm</Text>
                        </View>
                      ) : null}
                      {parsedVitals.spo2 ? (
                        <View style={styles.vitalPill}>
                          <Text style={styles.vitalPillText}>SpO2: {parsedVitals.spo2}%</Text>
                        </View>
                      ) : null}
                    </View>
                  )}

                  {isExpanded && (
                    <>
                      {v.symptoms && (
                        <View style={styles.clinicalField}>
                          <Text style={styles.fieldLabel}>Symptoms & Complaints</Text>
                          <Text style={styles.fieldValue}>{v.symptoms}</Text>
                        </View>
                      )}

                      {v.treatment && (
                        <View style={styles.clinicalField}>
                          <Text style={styles.fieldLabel}>Treatment / Advice</Text>
                          <Text style={styles.fieldValue}>{v.treatment}</Text>
                        </View>
                      )}

                      {/* Structured Prescription */}
                      {v.prescription && v.prescription.items.length > 0 && (
                        <View style={styles.prescriptionBlock}>
                          <View style={styles.prescriptionHeader}>
                            <Pill size={14} color={theme.colors.primaryDark} />
                            <Text style={styles.prescriptionTitle}>
                              Prescribed Medications ({v.prescription.items.length})
                            </Text>
                          </View>

                          <View style={styles.rxTable}>
                            {v.prescription.items.map((item, idx) => (
                              <View key={item.id || idx} style={styles.rxRow}>
                                <View style={styles.rxMain}>
                                  <Text style={styles.rxName}>{item.medicineName}</Text>
                                  {item.dosage && <Text style={styles.rxDosage}> • {item.dosage}</Text>}
                                </View>
                                <View style={styles.rxMeta}>
                                  {item.frequency && (
                                    <Text style={styles.rxBadge}>{item.frequency}</Text>
                                  )}
                                  {item.duration && (
                                    <Text style={styles.rxBadge}>{item.duration}</Text>
                                  )}
                                </View>
                                {item.instructions && (
                                  <Text style={styles.rxInst}>{item.instructions}</Text>
                                )}
                              </View>
                            ))}
                          </View>

                          {v.prescription.instructions && (
                            <Text style={styles.rxGenInst}>
                              Advice: {v.prescription.instructions}
                            </Text>
                          )}
                        </View>
                      )}

                      {v.report && (
                        <View style={styles.clinicalField}>
                          <Text style={styles.fieldLabel}>Lab Report Remark</Text>
                          <Text style={styles.fieldValue}>{v.report}</Text>
                        </View>
                      )}

                      {v.notes && (
                        <View style={styles.clinicalField}>
                          <Text style={styles.fieldLabel}>Doctor Notes (Private)</Text>
                          <Text style={styles.fieldValueMuted}>{v.notes}</Text>
                        </View>
                      )}
                    </>
                  )}

                  {/* Visit Card Bottom Actions */}
                  <View style={styles.visitBottomActions}>
                    <TouchableOpacity
                      style={styles.editVisitActionBtn}
                      onPress={() => router.push(`/visits/${v.id}/edit`)}
                      activeOpacity={0.8}
                    >
                      <Edit size={13} color={theme.colors.primaryDark} />
                      <Text style={styles.editVisitActionText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.pdfActionBtn}
                      onPress={() => handleSharePrescriptionPdf(v)}
                      activeOpacity={0.8}
                    >
                      <FileText size={13} color="#FFFFFF" />
                      <Text style={styles.pdfActionBtnText}>Share PDF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.viewNoteDetailBtn}
                      onPress={() => router.push(`/visits/${v.id}`)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.viewNoteDetailText}>Full Note</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Full-Screen Diagnostic Photo / X-Ray Viewer Modal */}
      <Modal
        visible={!!previewPhotoUri}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewPhotoUri(null)}
      >
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity
            style={styles.imageViewerCloseBtn}
            onPress={() => setPreviewPhotoUri(null)}
            activeOpacity={0.8}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {previewPhotoUri && (
            <Image
              source={{ uri: previewPhotoUri }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Prescription Preview Modal */}
      {previewVisitForPdf && patient && (
        <PrescriptionPreviewModal
          visible={!!previewVisitForPdf}
          onClose={() => setPreviewVisitForPdf(null)}
          patient={patient}
          visit={previewVisitForPdf}
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
    fontSize: 16,
  },
  profileCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: theme.colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.cardBorderHighlight,
  },
  avatarImg: {
    width: 58,
    height: 58,
  },
  profileHeaderInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  patientName: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  patientNumberBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  patientNumberText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  demographicText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  phoneText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  bloodGroupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.cardBorderHighlight,
  },
  bloodGroupText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  allergyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.dangerBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.dangerBorder,
  },
  allergyText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.danger,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
  },
  detailText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  profileActionRows: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    gap: 8,
  },
  actionRowMain: {
    flexDirection: 'row',
    gap: 8,
  },
  actionRowSecondary: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: 12,
    gap: 6,
  },
  actionBtnPrimary: {
    backgroundColor: theme.colors.primary,
  },
  actionBtnHistory: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  actionBtnSecondary: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  actionBtnDanger: {
    backgroundColor: theme.colors.dangerBg,
    borderWidth: 1,
    borderColor: theme.colors.dangerBorder,
  },
  actionBtnTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  actionBtnTextHistory: {
    color: '#4F46E5',
    fontWeight: '700',
    fontSize: 13,
  },
  actionBtnTextSecondary: {
    color: theme.colors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  actionBtnTextDanger: {
    color: theme.colors.danger,
    fontWeight: '700',
    fontSize: 13,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addPhotoBtnText: {
    fontSize: 12,
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  exportHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exportHistoryText: {
    fontSize: 12,
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  photosScroll: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  photoThumbWrapper: {
    marginRight: 10,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  photoThumb: {
    width: 84,
    height: 84,
  },
  photoTypeBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  emptyPhotosCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  emptyPhotosText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  emptyVisitsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  emptyVisitsTitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    marginVertical: theme.spacing.md,
  },
  firstVisitBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  firstVisitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  timelineList: {
    gap: 12,
  },
  visitCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  visitCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  visitHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visitDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  visitDateText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text,
  },
  visitTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  visitTimeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  latestBadge: {
    backgroundColor: theme.colors.primaryBg,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.cardBorderHighlight,
  },
  latestBadgeText: {
    color: theme.colors.primaryDark,
    fontSize: 10,
    fontWeight: '800',
  },
  visitHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  visitChargesBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    backgroundColor: theme.colors.primaryBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  visitBody: {
    padding: theme.spacing.md,
    gap: 8,
  },
  clinicalField: {
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  fieldValueBold: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    backgroundColor: theme.colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  fieldValue: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 19,
  },
  fieldValueMuted: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  vitalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    marginBottom: 4,
  },
  vitalPill: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  vitalPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  prescriptionBlock: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginTop: 4,
  },
  prescriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  prescriptionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  rxTable: {
    gap: 6,
  },
  rxRow: {
    backgroundColor: theme.colors.surface,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  rxMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rxName: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text,
  },
  rxDosage: {
    fontSize: 12,
    color: theme.colors.primaryDark,
    fontWeight: '600',
  },
  rxMeta: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  rxBadge: {
    fontSize: 11,
    backgroundColor: theme.colors.background,
    color: theme.colors.textSecondary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    fontWeight: '600',
  },
  rxInst: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  rxGenInst: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 6,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  visitBottomActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  editVisitActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryBg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorderHighlight,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.sm,
  },
  editVisitActionText: {
    color: theme.colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  pdfActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4F46E5', // Indigo / Purple matching reference
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.sm,
  },
  pdfActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  viewNoteDetailBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  viewNoteDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 24,
  },
  fullScreenImage: {
    width: '92%',
    height: '80%',
  },
});

