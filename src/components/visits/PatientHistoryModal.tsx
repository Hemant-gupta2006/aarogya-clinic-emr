import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { theme } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PatientWithMeta } from '../../db/repositories/patient.repo';
import { VisitWithDetails } from '../../db/repositories/visit.repo';
import { generateAndSharePrescriptionPdf } from '../../services/pdf.service';
import { FileText, Edit2, Plus, X, Calendar, Activity } from 'lucide-react-native';

interface PatientHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  patient: PatientWithMeta;
  visits: VisitWithDetails[];
  onEditVisit: (visit: VisitWithDetails) => void;
  onNewFollowup: () => void;
}

export const PatientHistoryModal: React.FC<PatientHistoryModalProps> = ({
  visible,
  onClose,
  patient,
  visits,
  onEditVisit,
  onNewFollowup,
}) => {
  const insets = useSafeAreaInsets();
  const handlePdf = async (visit: VisitWithDetails) => {
    try {
      await generateAndSharePrescriptionPdf(patient, visit);
    } catch (err: any) {
      console.warn('PDF export error:', err);
      Alert.alert('Error', err?.message || 'Could not export prescription PDF.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>History of {patient.name}</Text>
                  <Text style={styles.modalSubtitle}>
                    {patient.patientNumber} • Total Consultations: {visits.length}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={20} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Follow-up Top Button */}
              <TouchableOpacity
                style={styles.newFollowupBtn}
                onPress={() => {
                  onClose();
                  onNewFollowup();
                }}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.newFollowupBtnText}>New Follow-up</Text>
              </TouchableOpacity>

              {/* Visit Cards List */}
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {visits.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Calendar size={32} color={theme.colors.textLight} />
                    <Text style={styles.emptyText}>No previous consultations recorded.</Text>
                  </View>
                ) : (
                  visits.map((v, index) => {
                    const parsedVitals = v.vitals
                      ? typeof v.vitals === 'string'
                        ? JSON.parse(v.vitals)
                        : v.vitals
                      : null;

                    return (
                      <View key={v.id || index} style={styles.historyCard}>
                        {/* Action Buttons Row on Top of Card */}
                        <View style={styles.cardActionBar}>
                          <View style={styles.actionButtons}>
                            <TouchableOpacity
                              style={styles.pdfBtn}
                              onPress={() => handlePdf(v)}
                              activeOpacity={0.8}
                            >
                              <FileText size={14} color="#FFFFFF" />
                              <Text style={styles.actionBtnText}>PDF</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.editBtn}
                              onPress={() => {
                                onClose();
                                onEditVisit(v);
                              }}
                              activeOpacity={0.8}
                            >
                              <Edit2 size={14} color="#FFFFFF" />
                              <Text style={styles.actionBtnText}>Edit</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Clinical Details Body */}
                        <View style={styles.fieldsContainer}>
                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Date:</Text>
                            <Text style={styles.fieldValueBold}>
                              {v.visitDate} {v.visitTime ? `(${v.visitTime})` : ''}
                            </Text>
                          </View>

                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Age:</Text>
                            <Text style={styles.fieldValue}>
                              {patient.estimatedAge ? `${patient.estimatedAge} yrs` : 'N/A'}
                            </Text>
                          </View>

                          <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>Mobile:</Text>
                            <Text style={styles.fieldValue}>{patient.phone}</Text>
                          </View>

                          {v.symptoms ? (
                            <View style={styles.fieldRowStacked}>
                              <Text style={styles.fieldLabel}>Symptoms:</Text>
                              <Text style={styles.fieldValueBlock}>{v.symptoms}</Text>
                            </View>
                          ) : null}

                          {v.diagnosis ? (
                            <View style={styles.fieldRowStacked}>
                              <Text style={styles.fieldLabel}>Diagnosis:</Text>
                              <Text style={[styles.fieldValueBlock, styles.diagnosisHighlight]}>
                                {v.diagnosis}
                              </Text>
                            </View>
                          ) : null}

                          {parsedVitals ? (
                            <View style={styles.vitalsPillRow}>
                              <Activity size={12} color={theme.colors.primary} />
                              {parsedVitals.bpSystolic && parsedVitals.bpDiastolic ? (
                                <Text style={styles.vitalsPill}>
                                  BP: {parsedVitals.bpSystolic}/{parsedVitals.bpDiastolic}
                                </Text>
                              ) : null}
                              {parsedVitals.temperature ? (
                                <Text style={styles.vitalsPill}>
                                  Temp: {parsedVitals.temperature}°F
                                </Text>
                              ) : null}
                              {parsedVitals.pulse ? (
                                <Text style={styles.vitalsPill}>
                                  Pulse: {parsedVitals.pulse}
                                </Text>
                              ) : null}
                            </View>
                          ) : null}

                          {v.treatment ? (
                            <View style={styles.fieldRowStacked}>
                              <Text style={styles.fieldLabel}>Treatment:</Text>
                              <Text style={styles.fieldValueBlock}>{v.treatment}</Text>
                            </View>
                          ) : null}

                          {v.prescription?.items && v.prescription.items.length > 0 ? (
                            <View style={styles.fieldRowStacked}>
                              <Text style={styles.fieldLabel}>Medicines:</Text>
                              <View style={styles.medList}>
                                {v.prescription.items.map((med, mIdx) => (
                                  <Text key={mIdx} style={styles.medItemText}>
                                    • {med.medicineName} ({med.dosage || ''}) {med.frequency || ''}
                                  </Text>
                                ))}
                              </View>
                            </View>
                          ) : null}

                          {v.charges ? (
                            <View style={styles.fieldRow}>
                              <Text style={styles.fieldLabel}>Charges:</Text>
                              <Text style={styles.chargesValue}>₹{v.charges}</Text>
                            </View>
                          ) : null}

                          {v.notes ? (
                            <View style={styles.fieldRowStacked}>
                              <Text style={styles.fieldLabel}>Notes:</Text>
                              <Text style={styles.notesValue}>{v.notes}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...theme.shadows.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  newFollowupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    marginVertical: theme.spacing.sm,
  },
  newFollowupBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollView: {
    marginTop: 4,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: theme.spacing.md,
  },
  historyCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  cardActionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#6366F1', // Indigo / Purple
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F59E0B', // Amber / Orange
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  fieldsContainer: {
    gap: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldRowStacked: {
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  fieldValue: {
    fontSize: 13,
    color: theme.colors.text,
  },
  fieldValueBold: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  fieldValueBlock: {
    fontSize: 13,
    color: theme.colors.text,
    marginTop: 2,
    lineHeight: 18,
  },
  diagnosisHighlight: {
    fontWeight: '700',
    color: theme.colors.primaryDark,
    backgroundColor: theme.colors.primaryBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  vitalsPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  vitalsPill: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  medList: {
    marginTop: 2,
    gap: 2,
  },
  medItemText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  chargesValue: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  notesValue: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
});
