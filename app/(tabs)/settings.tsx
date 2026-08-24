import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import {
  isBiometricEnabled,
  setBiometricEnabled,
  getAutoLockTimeout,
  setAutoLockTimeout,
} from '../../src/security/pin';
import { calculateStorageBreakdown, StorageBreakdown, formatBytes } from '../../src/services/storage.service';
import { getAppSettings, setAppSetting, getMetadataValue } from '../../src/db/repositories/metadata.repo';
import { generateAndShareMultiSheetXlsx, shareXlsxFile } from '../../src/services/xlsx.service';
import { saveClinicLogo, saveDoctorSignature, getAbsolutePhotoUri } from '../../src/services/photo.service';
import Svg, { Path } from 'react-native-svg';
import { SignaturePadModal } from '../../src/components/common/SignaturePadModal';
import {
  Shield,
  Fingerprint,
  Clock,
  HardDrive,
  Database,
  FileSpreadsheet,
  Building,
  Lock,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  Save,
  Camera,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  PenTool,
} from 'lucide-react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const { lockApp } = useAuth();

  const [biometricOn, setBiometricOn] = useState(false);
  const [autoLockMin, setAutoLockMin] = useState(5);
  const [storage, setStorage] = useState<StorageBreakdown | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [lastBackupHash, setLastBackupHash] = useState<string | null>(null);

  // Clinic & App profile modal
  const [clinicModalVisible, setClinicModalVisible] = useState(false);
  const [clinicName, setClinicName] = useState('Aarogya Clinic');
  const [doctorName, setDoctorName] = useState('Dr. Sharma');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicLogo, setClinicLogo] = useState<string | null>(null);
  const [tempLogoUri, setTempLogoUri] = useState<string | null>(null);

  // Doctor Signature
  const [doctorSignature, setDoctorSignature] = useState<string | null>(null);
  const [tempSignatureUri, setTempSignatureUri] = useState<string | null>(null);
  const [signaturePadVisible, setSignaturePadVisible] = useState(false);

  const loadSettingsData = useCallback(async () => {
    try {
      const bio = await isBiometricEnabled();
      setBiometricOn(bio);

      const timeout = await getAutoLockTimeout();
      setAutoLockMin(timeout);

      const store = await calculateStorageBreakdown();
      setStorage(store);

      const backupAt = await getMetadataValue('last_backup_at');
      setLastBackup(backupAt);

      const backupHash = await getMetadataValue('last_backup_hash');
      setLastBackupHash(backupHash);

      const settings = await getAppSettings();
      if (settings.clinic_name) setClinicName(settings.clinic_name);
      if (settings.doctor_name) setDoctorName(settings.doctor_name);
      if (settings.clinic_phone) setClinicPhone(settings.clinic_phone);
      if (settings.clinic_address) setClinicAddress(settings.clinic_address);
      if (settings.clinic_logo) {
        setClinicLogo(settings.clinic_logo);
        setTempLogoUri(settings.clinic_logo);
      }
      if (settings.doctor_signature) {
        setDoctorSignature(settings.doctor_signature);
        setTempSignatureUri(settings.doctor_signature);
      }
    } catch {
      // Error loading settings
    }
  }, []);

  useEffect(() => {
    loadSettingsData();
  }, [loadSettingsData]);

  const handlePickSignature = async (useCamera: boolean) => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is required to capture signature.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [2, 1],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Gallery permission is required to select signature image.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [2, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setTempSignatureUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Signature Error', err?.message || 'Failed to select signature image');
    }
  };

  const handleRemoveSignature = () => {
    setTempSignatureUri(null);
  };

  const handleOpenDrawPad = () => {
    setClinicModalVisible(false);
    setTimeout(() => {
      setSignaturePadVisible(true);
    }, 150);
  };

  const handleSaveDrawnSignature = (data: string) => {
    setTempSignatureUri(data);
    setSignaturePadVisible(false);
    setTimeout(() => {
      setClinicModalVisible(true);
    }, 150);
  };

  const handleCloseDrawPad = () => {
    setSignaturePadVisible(false);
    setTimeout(() => {
      setClinicModalVisible(true);
    }, 150);
  };

  const handlePickLogo = async (useCamera: boolean) => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is required to take a logo picture.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Gallery permission is required to choose a logo.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setTempLogoUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Image Error', err?.message || 'Failed to select image');
    }
  };

  const handleRemoveLogo = () => {
    setTempLogoUri(null);
  };

  const handleToggleBio = async (val: boolean) => {
    setBiometricOn(val);
    await setBiometricEnabled(val);
  };

  const handleChangeAutoLock = async () => {
    const options = [0, 1, 5, 15, 30];
    const currentIndex = options.indexOf(autoLockMin);
    const nextIndex = (currentIndex + 1) % options.length;
    const nextVal = options[nextIndex];
    setAutoLockMin(nextVal);
    await setAutoLockTimeout(nextVal);
  };

  const handleSaveClinicProfile = async () => {
    try {
      let savedLogoPath = clinicLogo;
      if (tempLogoUri !== clinicLogo) {
        if (tempLogoUri) {
          // If tempLogoUri is a new local URI (e.g. starts with file:// or content://)
          if (!tempLogoUri.startsWith('media/')) {
            savedLogoPath = await saveClinicLogo(tempLogoUri);
          } else {
            savedLogoPath = tempLogoUri;
          }
        } else {
          savedLogoPath = '';
        }
      }

      let savedSigPath = doctorSignature;
      if (tempSignatureUri !== doctorSignature) {
        if (tempSignatureUri) {
          if (tempSignatureUri.startsWith('draw:')) {
            savedSigPath = tempSignatureUri;
          } else if (!tempSignatureUri.startsWith('media/')) {
            savedSigPath = await saveDoctorSignature(tempSignatureUri);
          } else {
            savedSigPath = tempSignatureUri;
          }
        } else {
          savedSigPath = '';
        }
      }

      await setAppSetting('clinic_name', clinicName);
      await setAppSetting('doctor_name', doctorName);
      await setAppSetting('clinic_phone', clinicPhone);
      await setAppSetting('clinic_address', clinicAddress);
      await setAppSetting('clinic_logo', savedLogoPath || '');
      await setAppSetting('doctor_signature', savedSigPath || '');
      setClinicLogo(savedLogoPath || null);
      setDoctorSignature(savedSigPath || null);
      setClinicModalVisible(false);
      Alert.alert('Saved', 'Clinic & doctor profile updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save clinic profile.');
    }
  };

  const handleExportExcel = async () => {
    try {
      const xlsxPath = await generateAndShareMultiSheetXlsx({ dateRangeType: 'ALL' });
      await shareXlsxFile(xlsxPath);
    } catch (err: any) {
      Alert.alert('Export Error', err.message || 'Failed to export XLSX workbook.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Clinic & Doctor Settings */}
      <Text style={styles.sectionHeader}>Clinic & Doctor Profile</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.rowItem}
          onPress={() => {
            setTempLogoUri(clinicLogo);
            setTempSignatureUri(doctorSignature);
            setClinicModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.rowLeft}>
            {clinicLogo ? (
              <Image source={{ uri: getAbsolutePhotoUri(clinicLogo) }} style={styles.logoThumbnail} />
            ) : (
              <View style={styles.iconCircle}>
                <Building size={18} color={theme.colors.primaryDark} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{clinicName}</Text>
              <Text style={styles.rowSubtitle}>
                {doctorName} • {doctorSignature ? 'Signature Configured' : 'Tap to edit clinic info & signature'}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={theme.colors.textLight} />
        </TouchableOpacity>
      </View>

      {/* Backup & Mobile Storage Section */}
      <Text style={styles.sectionHeader}>Mobile Storage & Data Backup</Text>
      <View style={styles.card}>
        <View style={styles.backupHeader}>
          <View style={styles.backupIconCircle}>
            <FolderArchive size={22} color={theme.colors.primaryDark} />
          </View>
          <View style={styles.backupStatusWrap}>
            <Text style={styles.backupStatusTitle}>
              {lastBackup ? 'Encrypted Mobile Backup Active' : 'No Local Backup Created'}
            </Text>
            <Text style={styles.backupStatusSub}>
              {lastBackup
                ? `Last saved: ${new Date(lastBackup).toLocaleString()}`
                : 'Backup complete patient database, prescriptions, and reports to mobile storage.'}
            </Text>
            {lastBackupHash && (
              <Text style={styles.hashText} numberOfLines={1}>
                SHA-256: {lastBackupHash}
              </Text>
            )}
          </View>
          {lastBackup ? (
            <CheckCircle2 size={22} color={theme.colors.success} />
          ) : (
            <AlertTriangle size={22} color={theme.colors.warning} />
          )}
        </View>

        <View style={styles.actionButtonRow}>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={() => router.push('/backup/create')}
            activeOpacity={0.85}
          >
            <Database size={16} color="#FFFFFF" />
            <Text style={styles.btnTextPrimary}>Backup to Storage</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary]}
            onPress={() => router.push('/backup/restore')}
            activeOpacity={0.85}
          >
            <RefreshCw size={16} color={theme.colors.text} />
            <Text style={styles.btnTextSecondary}>Restore Backup</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Storage Breakdown */}
      <Text style={styles.sectionHeader}>Storage Breakdown</Text>
      <View style={styles.card}>
        <View style={styles.storageRow}>
          <Text style={styles.storageLabel}>Encrypted SQLite Database</Text>
          <Text style={styles.storageValue}>{formatBytes(storage?.databaseBytes || 0)}</Text>
        </View>
        <View style={styles.storageRow}>
          <Text style={styles.storageLabel}>Patient Photos & Media</Text>
          <Text style={styles.storageValue}>{formatBytes(storage?.photosBytes || 0)}</Text>
        </View>
        <View style={styles.storageRow}>
          <Text style={styles.storageLabel}>Mobile Storage Backups</Text>
          <Text style={styles.storageValue}>{formatBytes(storage?.backupsBytes || 0)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.storageRow}>
          <Text style={[styles.storageLabel, { fontWeight: '800', color: theme.colors.text }]}>
            Total AarogyaEMR App Storage
          </Text>
          <Text style={[styles.storageValue, { fontWeight: '800', color: theme.colors.primaryDark }]}>
            {formatBytes(storage?.totalAppBytes || 0)}
          </Text>
        </View>
      </View>

      {/* Security & Access */}
      <Text style={styles.sectionHeader}>Security & App Lock</Text>
      <View style={styles.card}>
        <View style={styles.rowItem}>
          <View style={styles.rowLeft}>
            <View style={styles.iconCircle}>
              <Fingerprint size={18} color={theme.colors.primaryDark} />
            </View>
            <Text style={styles.rowTitle}>Biometric Unlock</Text>
          </View>
          <Switch
            value={biometricOn}
            onValueChange={handleToggleBio}
            trackColor={{ false: theme.colors.cardBorder, true: theme.colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.rowItem} onPress={handleChangeAutoLock} activeOpacity={0.7}>
          <View style={styles.rowLeft}>
            <View style={styles.iconCircle}>
              <Clock size={18} color={theme.colors.primaryDark} />
            </View>
            <View>
              <Text style={styles.rowTitle}>Auto-Lock Timeout</Text>
              <Text style={styles.rowSubtitle}>
                {autoLockMin === 0 ? 'Immediately when minimized' : `After ${autoLockMin} minutes`}
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={theme.colors.textLight} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.rowItem} onPress={() => router.push('/(auth)/pin-setup')} activeOpacity={0.7}>
          <View style={styles.rowLeft}>
            <View style={styles.iconCircle}>
              <Shield size={18} color={theme.colors.primaryDark} />
            </View>
            <Text style={styles.rowTitle}>Change Security PIN</Text>
          </View>
          <ChevronRight size={18} color={theme.colors.textLight} />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.rowItem} onPress={handleExportExcel} activeOpacity={0.7}>
          <View style={styles.rowLeft}>
            <View style={styles.iconCircle}>
              <FileSpreadsheet size={18} color={theme.colors.primaryDark} />
            </View>
            <View>
              <Text style={styles.rowTitle}>Export Patient Data (Excel Workbook)</Text>
              <Text style={styles.rowSubtitle}>Multi-sheet workbook with summary, vitals & Rx (.xlsx)</Text>
            </View>
          </View>
          <ChevronRight size={18} color={theme.colors.textLight} />
        </TouchableOpacity>
      </View>

      {/* Lock App Now CTA */}
      <TouchableOpacity style={styles.lockNowButton} onPress={lockApp} activeOpacity={0.85}>
        <Lock size={18} color={theme.colors.danger} />
        <Text style={styles.lockNowText}>Lock Application Now</Text>
      </TouchableOpacity>

      <View style={styles.versionBadgeContainer}>
        <View style={styles.versionPill}>
          <Sparkles size={12} color={theme.colors.primaryDark} />
          <Text style={styles.versionPillText}>Preview OTA Channel Active</Text>
        </View>
        <Text style={styles.footerText}>
          AarogyaEMR Mobile v1.0.1 • Offline-First Clinical Workspace
        </Text>
      </View>

      {/* Bottom Spacer */}
      <View style={styles.bottomSpacer} />

      {/* Clinic & Doctor Profile Modal */}
      <Modal visible={clinicModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <Text style={styles.modalTitle}>Edit Clinic & Doctor Profile</Text>

              {/* Logo Selection Section */}
              <View style={styles.logoPickerSection}>
                <View style={styles.logoPreviewWrapper}>
                  {tempLogoUri ? (
                    <Image
                      source={{ uri: getAbsolutePhotoUri(tempLogoUri) }}
                      style={styles.logoPreviewImage}
                    />
                  ) : (
                    <View style={styles.logoPlaceholder}>
                      <Building size={32} color={theme.colors.textMuted} />
                      <Text style={styles.logoPlaceholderText}>No Logo</Text>
                    </View>
                  )}
                </View>

                <View style={styles.logoActionButtons}>
                  <TouchableOpacity
                    style={styles.logoBtn}
                    onPress={() => handlePickLogo(false)}
                    activeOpacity={0.8}
                  >
                    <ImageIcon size={14} color={theme.colors.text} />
                    <Text style={styles.logoBtnText}>Gallery</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.logoBtn}
                    onPress={() => handlePickLogo(true)}
                    activeOpacity={0.8}
                  >
                    <Camera size={14} color={theme.colors.text} />
                    <Text style={styles.logoBtnText}>Camera</Text>
                  </TouchableOpacity>

                  {tempLogoUri && (
                    <TouchableOpacity
                      style={[styles.logoBtn, styles.logoBtnDanger]}
                      onPress={handleRemoveLogo}
                      activeOpacity={0.8}
                    >
                      <Trash2 size={14} color={theme.colors.danger} />
                      <Text style={[styles.logoBtnText, { color: theme.colors.danger }]}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Clinic / App Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={clinicName}
                  onChangeText={setClinicName}
                  placeholder="e.g. Aarogya Clinic"
                  placeholderTextColor={theme.colors.textLight}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Doctor Name & Qualifications</Text>
                <TextInput
                  style={styles.modalInput}
                  value={doctorName}
                  onChangeText={setDoctorName}
                  placeholder="e.g. Dr. Sharma, MBBS, MD (Physician)"
                  placeholderTextColor={theme.colors.textLight}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Clinic Contact Phone</Text>
                <TextInput
                  style={styles.modalInput}
                  value={clinicPhone}
                  onChangeText={setClinicPhone}
                  placeholder="e.g. +91 9876543210"
                  placeholderTextColor={theme.colors.textLight}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Clinic Address / Header Subtitle</Text>
                <TextInput
                  style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                  value={clinicAddress}
                  onChangeText={setClinicAddress}
                  placeholder="e.g. Sector 14, Main Road, City"
                  placeholderTextColor={theme.colors.textLight}
                  multiline
                />
              </View>

              {/* Doctor Digital Signature Section */}
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Doctor's Digital Signature (Prescription Slip)</Text>
                <View style={styles.signaturePickerSection}>
                  <View style={styles.signaturePreviewWrapper}>
                    {tempSignatureUri ? (
                      tempSignatureUri.startsWith('draw:') ? (
                        <View style={styles.signatureSvgWrapper}>
                          {(() => {
                            try {
                              const parsed = JSON.parse(tempSignatureUri.substring(5));
                              return (
                                <Svg
                                  width="100%"
                                  height="100%"
                                  viewBox={`0 0 ${parsed.width || 320} ${parsed.height || 160}`}
                                >
                                  <Path
                                    d={parsed.svg}
                                    stroke="#0F172A"
                                    strokeWidth={3}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="none"
                                  />
                                </Svg>
                              );
                            } catch {
                              return <Text style={styles.logoPlaceholderText}>Signature Error</Text>;
                            }
                          })()}
                        </View>
                      ) : (
                        <Image
                          source={{ uri: getAbsolutePhotoUri(tempSignatureUri) }}
                          style={styles.signaturePreviewImage}
                          resizeMode="contain"
                        />
                      )
                    ) : (
                      <View style={styles.signaturePlaceholder}>
                        <PenTool size={22} color={theme.colors.textMuted} />
                        <Text style={styles.logoPlaceholderText}>No Signature Added</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.signatureActionButtons}>
                    <TouchableOpacity
                      style={styles.logoBtn}
                      onPress={handleOpenDrawPad}
                      activeOpacity={0.8}
                    >
                      <PenTool size={13} color={theme.colors.primaryDark} />
                      <Text style={[styles.logoBtnText, { color: theme.colors.primaryDark, fontWeight: '700' }]}>
                        Draw
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.logoBtn}
                      onPress={() => handlePickSignature(false)}
                      activeOpacity={0.8}
                    >
                      <ImageIcon size={13} color={theme.colors.text} />
                      <Text style={styles.logoBtnText}>Gallery</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.logoBtn}
                      onPress={() => handlePickSignature(true)}
                      activeOpacity={0.8}
                    >
                      <Camera size={13} color={theme.colors.text} />
                      <Text style={styles.logoBtnText}>Camera</Text>
                    </TouchableOpacity>

                    {tempSignatureUri && (
                      <TouchableOpacity
                        style={[styles.logoBtn, styles.logoBtnDanger]}
                        onPress={handleRemoveSignature}
                        activeOpacity={0.8}
                      >
                        <Trash2 size={13} color={theme.colors.danger} />
                        <Text style={[styles.logoBtnText, { color: theme.colors.danger }]}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnCancel]}
                  onPress={() => setClinicModalVisible(false)}
                >
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnSave]}
                  onPress={handleSaveClinicProfile}
                >
                  <Text style={styles.modalBtnSaveText}>Save Profile</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Full-Screen Signature Pad Drawing Modal */}
      <SignaturePadModal
        visible={signaturePadVisible}
        onClose={handleCloseDrawPad}
        onSave={handleSaveDrawnSignature}
        initialSignature={tempSignatureUri}
      />
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
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorderHighlight,
  },
  logoThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  rowSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.cardBorder,
    marginVertical: 4,
  },
  backupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  backupIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorderHighlight,
  },
  backupStatusWrap: {
    flex: 1,
  },
  backupStatusTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  backupStatusSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  hashText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  actionButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: theme.borderRadius.md,
    gap: 6,
  },
  btnPrimary: {
    backgroundColor: theme.colors.primary,
  },
  btnSecondary: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  btnTextPrimary: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  btnTextSecondary: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  storageLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  storageValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  lockNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.dangerBg,
    borderWidth: 1,
    borderColor: theme.colors.dangerBorder,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    marginTop: theme.spacing.lg,
  },
  lockNowText: {
    color: theme.colors.danger,
    fontWeight: '800',
    fontSize: 14,
  },
  versionBadgeContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    gap: 6,
  },
  versionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.cardBorderHighlight,
  },
  versionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  footerText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: theme.spacing.md,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    maxHeight: '90%',
    ...theme.shadows.lg,
  },
  modalScroll: {
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  logoPickerSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingVertical: 10,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  logoPreviewWrapper: {
    marginBottom: 10,
  },
  logoPreviewImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  logoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  logoActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  logoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  logoBtnDanger: {
    borderColor: theme.colors.dangerBorder,
    backgroundColor: theme.colors.dangerBg,
  },
  logoBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  signaturePickerSection: {
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  signaturePreviewWrapper: {
    width: '90%',
    height: 70,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorderHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  signatureSvgWrapper: {
    width: '100%',
    height: '100%',
    padding: 4,
  },
  signaturePreviewImage: {
    width: '90%',
    height: 60,
  },
  signaturePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  signatureActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modalInputGroup: {
    marginBottom: theme.spacing.md,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 44,
    color: theme.colors.text,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: theme.spacing.sm,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  modalBtnCancelText: {
    color: theme.colors.textSecondary,
    fontWeight: '700',
  },
  modalBtnSave: {
    backgroundColor: theme.colors.primary,
  },
  modalBtnSaveText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  bottomSpacer: {
    height: 180,
  },
});


