import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../../src/constants/theme';
import { createPatient } from '../../src/db/repositories/patient.repo';
import { savePatientImage } from '../../src/services/photo.service';
import {
  Camera,
  Image as ImageIcon,
  User,
  Phone,
  Calendar,
  MapPin,
  FileText,
  Check,
  HeartPulse,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react-native';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function NewPatientScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [estimatedAge, setEstimatedAge] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [allergies, setAllergies] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handlePickImage = async (useCamera: boolean) => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera access is required to capture a patient photo.');
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
          Alert.alert('Permission Denied', 'Gallery access is required to select a photo.');
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
        setSelectedPhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Could not process photo selection.');
    }
  };

  const handleSaveAndStartVisit = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter the patient full name.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Required Field', 'Please enter a valid patient phone number.');
      return;
    }

    try {
      setSaving(true);
      const parsedAge = estimatedAge ? parseInt(estimatedAge, 10) : null;

      const created = await createPatient({
        name: name.trim(),
        phone: phone.trim(),
        gender,
        estimatedAge: isNaN(parsedAge as any) ? null : parsedAge,
        dateOfBirth: dateOfBirth.trim() || null,
        bloodGroup: bloodGroup || null,
        allergies: allergies.trim() || null,
        emergencyContact: emergencyContact.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });

      // Save photo to private sandboxed storage if selected
      if (selectedPhotoUri) {
        await savePatientImage(created.id, selectedPhotoUri, 'PROFILE');
      }

      // Seamlessly navigate directly into Today's Consultation
      router.replace(`/patients/${created.id}/visit/new`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create patient record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 40}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Photo Selection Card */}
        <View style={styles.photoCard}>
          <View style={styles.avatarPreview}>
            {selectedPhotoUri ? (
              <Image source={{ uri: selectedPhotoUri }} style={styles.avatarImage} />
            ) : (
              <User size={44} color={theme.colors.primaryDark} />
            )}
          </View>

          <View style={styles.photoBtnRow}>
            <TouchableOpacity
              style={styles.photoBtn}
              onPress={() => handlePickImage(true)}
              activeOpacity={0.8}
            >
              <Camera size={15} color={theme.colors.primaryDark} />
              <Text style={styles.photoBtnText}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.photoBtn}
              onPress={() => handlePickImage(false)}
              activeOpacity={0.8}
            >
              <ImageIcon size={15} color={theme.colors.primaryDark} />
              <Text style={styles.photoBtnText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Basic Demographics Form */}
        <View style={styles.formCard}>
          <Text style={styles.formSectionTitle}>Primary Demographics</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Patient Full Name *</Text>
            <View style={styles.inputWrapper}>
              <User size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={theme.colors.textLight}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile / Phone Number *</Text>
            <View style={styles.inputWrapper}>
              <Phone size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. 9876543210"
                placeholderTextColor={theme.colors.textLight}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              {(['Male', 'Female', 'Other'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                  onPress={() => setGender(g)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.rowTwoCols}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Age (Years)</Text>
              <View style={styles.inputWrapper}>
                <Calendar size={16} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 35"
                  placeholderTextColor={theme.colors.textLight}
                  value={estimatedAge}
                  onChangeText={setEstimatedAge}
                  keyboardType="numeric"
                  maxLength={3}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1.2 }]}>
              <Text style={styles.label}>Date of Birth (Optional)</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textLight}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                />
              </View>
            </View>
          </View>

          {/* Blood Group Selector */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <HeartPulse size={14} color={theme.colors.primary} />
              <Text style={styles.label}>Blood Group</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bgScroll}>
              {BLOOD_GROUPS.map((bg) => (
                <TouchableOpacity
                  key={bg}
                  style={[styles.bgChip, bloodGroup === bg && styles.bgChipActive]}
                  onPress={() => setBloodGroup(bloodGroup === bg ? '' : bg)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.bgChipText, bloodGroup === bg && styles.bgChipTextActive]}>
                    {bg}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Known Allergies */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <ShieldAlert size={14} color={theme.colors.danger} />
              <Text style={styles.label}>Known Allergies (if any)</Text>
            </View>
            <View style={styles.inputWrapper}>
              <AlertCircle size={18} color={theme.colors.danger} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Penicillin, Sulfa drugs, Peanuts..."
                placeholderTextColor={theme.colors.textLight}
                value={allergies}
                onChangeText={setAllergies}
              />
            </View>
          </View>

          {/* Emergency Contact */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Emergency Contact (Relative / Friend)</Text>
            <View style={styles.inputWrapper}>
              <Phone size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. 9812345678 (Spouse)"
                placeholderTextColor={theme.colors.textLight}
                value={emergencyContact}
                onChangeText={setEmergencyContact}
              />
            </View>
          </View>

          {/* Address / Area */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <MapPin size={14} color={theme.colors.primaryDark} />
              <Text style={styles.label}>Address / Area</Text>
              <Text style={styles.optionalText}>(Tap quick area or type)</Text>
            </View>

            {/* Quick Area Preset Buttons - Multi-line Wrapped Grid */}
            <View style={styles.areaChipsContainer}>
              {['Goregaon West', 'Goregaon East', 'Malad West', 'Kandivali West', 'Andheri West', 'Mumbai'].map((preset) => {
                const isSelected = address === preset || address.includes(preset);
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.areaChip,
                      isSelected && styles.areaChipActive,
                    ]}
                    onPress={() => setAddress(preset)}
                    activeOpacity={0.75}
                  >
                    <MapPin size={12} color={isSelected ? theme.colors.primaryDark : theme.colors.textMuted} />
                    <Text
                      style={[
                        styles.areaChipText,
                        isSelected && styles.areaChipTextActive,
                      ]}
                    >
                      {preset}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.inputWrapper}>
              <MapPin size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Goregaon West / Flat No, Street..."
                placeholderTextColor={theme.colors.textLight}
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>

          {/* Medical Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Medical History Notes (Optional)</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <FileText size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.textAreaInput]}
                placeholder="Chronic conditions (Diabetes, Hypertension, Thyroid)..."
                placeholderTextColor={theme.colors.textLight}
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>
          </View>
        </View>

        {/* Save & Start Consultation CTA */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.disabledBtn]}
          onPress={handleSaveAndStartVisit}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Check size={20} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>
            {saving ? 'Creating Patient Record...' : 'Save & Start Consultation'}
          </Text>
        </TouchableOpacity>

        {/* Bottom Scroll Spacing matching consultation page */}
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
    paddingBottom: 60,
  },
  photoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  avatarPreview: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: theme.colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: theme.colors.cardBorderHighlight,
    marginBottom: theme.spacing.sm,
  },
  avatarImage: {
    width: 84,
    height: 84,
  },
  photoBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  photoBtnText: {
    color: theme.colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    paddingHorizontal: theme.spacing.md,
    height: 48,
  },
  textAreaWrapper: {
    height: 80,
    alignItems: 'flex-start',
    paddingTop: 10,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  textAreaInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    height: 42,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genderBtnActive: {
    backgroundColor: theme.colors.primaryBg,
    borderColor: theme.colors.primary,
  },
  genderBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  genderBtnTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: '800',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  bgScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  bgChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginRight: 6,
  },
  bgChipActive: {
    backgroundColor: theme.colors.primaryBg,
    borderColor: theme.colors.primary,
  },
  bgChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  bgChipTextActive: {
    color: theme.colors.primaryDark,
  },
  areaChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  areaChipActive: {
    backgroundColor: theme.colors.primaryBg,
    borderColor: theme.colors.primary,
  },
  areaChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  areaChipTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: '800',
  },
  optionalText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginLeft: 6,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    height: 52,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  bottomSpacer: {
    height: 180, // Generous scrolling space below save button matching consultation page
  },
});

