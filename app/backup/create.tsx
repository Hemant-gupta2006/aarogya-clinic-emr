import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../src/constants/theme';
import { getDatabase } from '../../src/db/client';
import { patients, visits, prescriptions, patientPhotos } from '../../src/db/schema';
import { createConsistentBackup, CreateBackupResult } from '../../src/backup/packager';
import { shareExportFile } from '../../src/services/export.service';
import { formatBytes } from '../../src/services/storage.service';
import { isNull, sql } from 'drizzle-orm';
import {
  ShieldCheck,
  Lock,
  Database,
  Share2,
  CheckCircle,
  FileCheck,
  Users,
  Calendar,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react-native';

export default function CreateBackupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [counts, setCounts] = useState({
    patients: 0,
    visits: 0,
    prescriptions: 0,
    photos: 0,
  });
  const [loading, setLoading] = useState(false);
  const [backupResult, setBackupResult] = useState<CreateBackupResult | null>(null);

  useEffect(() => {
    async function loadCounts() {
      try {
        const { db } = await getDatabase();
        const [patStat] = await db
          .select({ count: sql<number>`count(*)` })
          .from(patients)
          .where(isNull(patients.deletedAt));

        const [visStat] = await db
          .select({ count: sql<number>`count(*)` })
          .from(visits)
          .where(isNull(visits.deletedAt));

        const [rxStat] = await db
          .select({ count: sql<number>`count(*)` })
          .from(prescriptions)
          .where(isNull(prescriptions.deletedAt));

        const [photoStat] = await db
          .select({ count: sql<number>`count(*)` })
          .from(patientPhotos)
          .where(isNull(patientPhotos.deletedAt));

        setCounts({
          patients: patStat?.count || 0,
          visits: visStat?.count || 0,
          prescriptions: rxStat?.count || 0,
          photos: photoStat?.count || 0,
        });
      } catch {
        // Error loading counts
      }
    }
    loadCounts();
  }, []);

  const handleGenerateBackup = async () => {
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Please enter a backup password with at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Backup passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const result = await createConsistentBackup(password);
      setBackupResult(result);
    } catch (err: any) {
      Alert.alert('Backup Error', err.message || 'Failed to generate backup.');
    } finally {
      setLoading(false);
    }
  };

  const handleShareBackup = async () => {
    if (!backupResult) return;
    try {
      await shareExportFile(backupResult.filePath, 'application/octet-stream');
    } catch (err: any) {
      Alert.alert('Share Error', err.message || 'Failed to open share sheet.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 60}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 40, theme.spacing.xxl) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {!backupResult ? (
          <>
            {/* Backup Summary Card */}
            <View style={styles.summaryCard}>
              <View style={styles.cardHeaderRow}>
                <Database size={22} color={theme.colors.primaryLight} />
                <Text style={styles.cardTitle}>Create Secure Portable Backup</Text>
              </View>

              <Text style={styles.containsHeading}>Package Contains:</Text>
              <View style={styles.checklist}>
                <View style={styles.checkItem}>
                  <CheckCircle size={15} color={theme.colors.success} />
                  <Text style={styles.checkText}>Patients ({counts.patients})</Text>
                </View>
                <View style={styles.checkItem}>
                  <CheckCircle size={15} color={theme.colors.success} />
                  <Text style={styles.checkText}>Consultations ({counts.visits})</Text>
                </View>
                <View style={styles.checkItem}>
                  <CheckCircle size={15} color={theme.colors.success} />
                  <Text style={styles.checkText}>Prescriptions ({counts.prescriptions})</Text>
                </View>
                <View style={styles.checkItem}>
                  <CheckCircle size={15} color={theme.colors.success} />
                  <Text style={styles.checkText}>Clinical Photos & Scans ({counts.photos})</Text>
                </View>
                <View style={styles.checkItem}>
                  <CheckCircle size={15} color={theme.colors.success} />
                  <Text style={styles.checkText}>Reports & Attachments</Text>
                </View>
                <View style={styles.checkItem}>
                  <CheckCircle size={15} color={theme.colors.success} />
                  <Text style={styles.checkText}>Clinic & Doctor Settings</Text>
                </View>
              </View>
            </View>

            {/* Encryption Security Notice */}
            <View style={styles.securityNotice}>
              <ShieldCheck size={20} color={theme.colors.success} />
              <View style={styles.noticeTextWrapper}>
                <Text style={styles.noticeTitle}>Portable AES-256-GCM Encryption</Text>
                <Text style={styles.noticeDesc}>
                  This archive is encrypted using PBKDF2 (100,000 rounds) + AES-256-GCM. It is fully portable to any other device running AarogyaEMR using your chosen password.
                </Text>
              </View>
            </View>

            {/* Password Input Form */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Set Backup Password</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Backup Password *</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter secure password"
                    placeholderTextColor={theme.colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password *</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm password"
                    placeholderTextColor={theme.colors.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.warningBox}>
                <AlertCircle size={16} color={theme.colors.warning} />
                <Text style={styles.warningText}>
                  Important: Do not forget this password. There is no backdoor to decrypt the backup without it.
                </Text>
              </View>
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.disabledBtn]}
              onPress={handleGenerateBackup}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <FileCheck size={20} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Generate Encrypted Backup</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.bottomSpacer} />
          </>
        ) : (
        /* Success Screen */
        <View style={styles.successContainer}>
          <View style={styles.successIconCircle}>
            <CheckCircle size={48} color={theme.colors.success} />
          </View>

          <Text style={styles.successTitle}>Backup Created Successfully</Text>
          <Text style={styles.successSubtitle}>
            Your entire clinic register, longitudinal consultations, and patient media have been encrypted.
          </Text>

          <View style={styles.fileDetailsCard}>
            <View style={styles.fileRow}>
              <Text style={styles.fileLabel}>Filename:</Text>
              <Text style={styles.fileValue}>{backupResult.fileName}</Text>
            </View>
            <View style={styles.fileRow}>
              <Text style={styles.fileLabel}>Package Size:</Text>
              <Text style={styles.fileValue}>{formatBytes(backupResult.fileSizeBytes)}</Text>
            </View>
            <View style={styles.fileRow}>
              <Text style={styles.fileLabel}>Patients Restorable:</Text>
              <Text style={styles.fileValue}>{backupResult.manifest.counts.patients}</Text>
            </View>
            <View style={styles.fileRow}>
              <Text style={styles.fileLabel}>Photos Packaged:</Text>
              <Text style={styles.fileValue}>{backupResult.manifest.counts.photos}</Text>
            </View>
            <View style={styles.fileRow}>
              <Text style={styles.fileLabel}>Database SHA-256:</Text>
              <Text style={[styles.fileValue, styles.hashValue]} numberOfLines={1}>
                {backupResult.manifest.integrity.databaseSha256}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShareBackup} activeOpacity={0.8}>
            <Share2 size={20} color="#FFFFFF" />
            <Text style={styles.shareBtnText}>Save / Share .clinicbackup File</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.replace('/(tabs)/settings')}
          >
            <Text style={styles.doneBtnText}>Return to Settings</Text>
          </TouchableOpacity>
        </View>
      )}
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
  summaryCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  containsHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  checklist: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    gap: 8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.md,
  },
  noticeTextWrapper: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  noticeDesc: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.md,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.warningBg,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginTop: 4,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: theme.colors.warning,
    lineHeight: 16,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    height: 52,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.xs,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
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
  fileDetailsCard: {
    width: '100%',
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.lg,
    gap: 8,
  },
  fileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  fileLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  fileValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  hashValue: {
    maxWidth: 200,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  shareBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    height: 52,
    borderRadius: theme.borderRadius.md,
    marginBottom: 12,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  doneBtn: {
    paddingVertical: 12,
  },
  doneBtnText: {
    color: theme.colors.primaryLight,
    fontSize: 14,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 180,
  },
});
