import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { theme } from '../../src/constants/theme';
import { verifyAndDecryptBackup, DecryptedBackupContent } from '../../src/backup/verifier';
import { executeAtomicRestore, RestoreResult } from '../../src/backup/restore';
import {
  UploadCloud,
  FileCheck,
  Lock,
  CheckCircle,
  AlertTriangle,
  Users,
  Calendar,
  Image as ImageIcon,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react-native';

export default function RestoreBackupScreen() {
  const router = useRouter();

  const [selectedFileUri, setSelectedFileUri] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [verifiedContent, setVerifiedContent] = useState<DecryptedBackupContent | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [restoreSuccessResult, setRestoreSuccessResult] = useState<RestoreResult | null>(null);

  const handlePickBackupFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFileUri(asset.uri);
        setSelectedFileName(asset.name);
        setVerifiedContent(null);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick backup file.');
    }
  };

  const handleVerifyBackup = async () => {
    if (!selectedFileUri) {
      Alert.alert('No File', 'Please select a .clinicbackup file first.');
      return;
    }
    if (!password) {
      Alert.alert('Password Required', 'Please enter the backup decryption password.');
      return;
    }

    try {
      setVerifying(true);
      const content = await verifyAndDecryptBackup(selectedFileUri, password);
      setVerifiedContent(content);
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Incorrect password or invalid backup archive.');
    } finally {
      setVerifying(false);
    }
  };

  const handlePerformRestore = async () => {
    if (!verifiedContent) return;

    try {
      setRestoring(true);
      setConfirmModalVisible(false);
      const result = await executeAtomicRestore(verifiedContent);
      setRestoreSuccessResult(result);
    } catch (err: any) {
      Alert.alert('Restore Failed', err.message || 'An error occurred during database restoration.');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 60}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {!restoreSuccessResult ? (
          <>
            {/* File Picker Section */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>1. Select Encrypted Backup</Text>

              <TouchableOpacity style={styles.filePickerBox} onPress={handlePickBackupFile}>
                <UploadCloud size={32} color={theme.colors.primaryLight} />
                <Text style={styles.filePickerText}>
                  {selectedFileName ? selectedFileName : 'Tap to select .clinicbackup file'}
                </Text>
                <Text style={styles.filePickerSubtext}>
                  {selectedFileName ? 'Tap to change file' : 'Select exported archive from device storage'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Password Entry */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>2. Enter Decryption Password</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Backup Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter backup password"
                    placeholderTextColor={theme.colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.verifyBtn, verifying && styles.disabledBtn]}
                onPress={handleVerifyBackup}
                disabled={verifying}
                activeOpacity={0.8}
              >
                {verifying ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <FileCheck size={18} color="#FFFFFF" />
                    <Text style={styles.verifyBtnText}>Verify & Inspect Archive</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Verified Content Preview */}
            {verifiedContent && (
              <View style={styles.previewCard}>
                <View style={styles.previewHeaderRow}>
                  <CheckCircle size={22} color={theme.colors.success} />
                  <Text style={styles.previewTitle}>Backup Verified & Authenticated</Text>
                </View>

                <View style={styles.metaBox}>
                  <Text style={styles.metaClinic}>{verifiedContent.manifest.clinicInfo.clinicName}</Text>
                  <Text style={styles.metaDoctor}>{verifiedContent.manifest.clinicInfo.doctorName}</Text>
                  <Text style={styles.metaDate}>
                    Created: {new Date(verifiedContent.manifest.createdAt).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.countsRow}>
                  <View style={styles.countBadge}>
                    <Users size={16} color={theme.colors.primaryLight} />
                    <Text style={styles.countBadgeNum}>
                      {verifiedContent.manifest.counts.patients} Patients
                    </Text>
                  </View>

                  <View style={styles.countBadge}>
                    <Calendar size={16} color={theme.colors.success} />
                    <Text style={styles.countBadgeNum}>
                      {verifiedContent.manifest.counts.visits} Consultations
                    </Text>
                  </View>

                  <View style={styles.countBadge}>
                    <ImageIcon size={16} color={theme.colors.warning} />
                    <Text style={styles.countBadgeNum}>
                      {verifiedContent.manifest.counts.photos} Photos
                    </Text>
                  </View>
                </View>

                <View style={styles.warningBox}>
                  <AlertTriangle size={16} color={theme.colors.warning} />
                  <Text style={styles.warningText}>
                    Restoration will replace the existing local database with this backup.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.restoreBtn}
                  onPress={() => setConfirmModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <RefreshCw size={18} color="#FFFFFF" />
                  <Text style={styles.restoreBtnText}>Restore & Replace Clinic Data</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.bottomSpacer} />
          </>
        ) : (
        /* Restore Success Screen */
        <View style={styles.successContainer}>
          <View style={styles.successIconCircle}>
            <CheckCircle size={48} color={theme.colors.success} />
          </View>

          <Text style={styles.successTitle}>Database Restored Successfully</Text>
          <Text style={styles.successSubtitle}>
            All medical records, consultations, and media files have been verified and swapped atomically into the encrypted database.
          </Text>

          <View style={styles.restoreStatsCard}>
            <View style={styles.statLine}>
              <Text style={styles.statLabel}>Patients Restored:</Text>
              <Text style={styles.statVal}>{restoreSuccessResult.restoredPatients}</Text>
            </View>
            <View style={styles.statLine}>
              <Text style={styles.statLabel}>Consultations Restored:</Text>
              <Text style={styles.statVal}>{restoreSuccessResult.restoredVisits}</Text>
            </View>
            <View style={styles.statLine}>
              <Text style={styles.statLabel}>Prescriptions Restored:</Text>
              <Text style={styles.statVal}>{restoreSuccessResult.restoredPrescriptions}</Text>
            </View>
            <View style={styles.statLine}>
              <Text style={styles.statLabel}>Patient Photos Restored:</Text>
              <Text style={styles.statVal}>{restoreSuccessResult.restoredPhotos}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.dashboardBtn}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.8}
          >
            <Text style={styles.dashboardBtnText}>Go to Clinic Dashboard</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Confirmation Modal */}
      <Modal visible={confirmModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ShieldAlert size={40} color={theme.colors.danger} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={styles.modalTitle}>Confirm Data Restoration</Text>
            <Text style={styles.modalDesc}>
              This action will atomically replace your current local database records with the contents of this verified backup. Are you sure you want to proceed?
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handlePerformRestore}
                disabled={restoring}
              >
                <Text style={styles.modalBtnConfirmText}>
                  {restoring ? 'Restoring...' : 'Yes, Restore'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: theme.spacing.xxl,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  filePickerBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.cardBorder,
    borderStyle: 'dashed',
  },
  filePickerText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  filePickerSubtext: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    paddingHorizontal: theme.spacing.md,
    height: 48,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    color: theme.colors.text,
    fontSize: 14,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    height: 48,
    borderRadius: theme.borderRadius.md,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  verifyBtnText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  previewCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.md,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.success,
  },
  metaBox: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.sm,
  },
  metaClinic: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  metaDoctor: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  metaDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  countsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: theme.spacing.md,
  },
  countBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: theme.colors.surface,
    paddingVertical: 8,
    borderRadius: 6,
  },
  countBadgeNum: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.warningBg,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.warning,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.danger,
    height: 52,
    borderRadius: theme.borderRadius.md,
  },
  restoreBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.successBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  restoreStatsCard: {
    width: '100%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.lg,
    gap: 8,
  },
  statLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  statVal: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  dashboardBtn: {
    width: '100%',
    height: 52,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: theme.spacing.lg,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: theme.colors.surface,
  },
  modalBtnCancelText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  modalBtnConfirm: {
    backgroundColor: theme.colors.danger,
  },
  modalBtnConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 180,
  },
});
