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
import { getPatientById, updatePatient } from '../../../src/db/repositories/patient.repo';
import { savePatientImage, getAbsolutePhotoUri } from '../../../src/services/photo.service';
import {
  User,
  Phone,
  Calendar,
  MapPin,
  FileText,
  Check,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  ShieldAlert,
} from 'lucide-react-native';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export default function EditPatientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
  const [initialPhotoUri, setInitialPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (id) {
        const p = await getPatientById(id);
        if (p) {
          setName(p.name);
          setPhone(p.phone);
          setGender((p.gender as any) || 'Male');
          if (p.estimatedAge) setEstimatedAge(p.estimatedAge.toString());
          if (p.dateOfBirth) setDateOfBirth(p.dateOfBirth);
          if (p.bloodGroup) setBloodGroup(p.bloodGroup);
          if (p.allergies) setAllergies(p.allergies);
          if (p.emergencyContact) setEmergencyContact(p.emergencyContact);
          if (p.address) setAddress(p.address);
          if (p.notes) setNotes(p.notes);
          if (p.profilePhoto) {
            const absUri = getAbsolutePhotoUri(p.profilePhoto);
            setSelectedPhotoUri(absUri);
            setInitialPhotoUri(absUri);
          }
        }
      }
    }
    loadData();
  }, [id]);

  const handlePickImage = async (useCamera: boolean) => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera access is required to capture a patient profile photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery access is required to select a profile photo.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedPhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Could not process photo selection.');
    }
  };

  const handleUpdate = async () => {
    if (!id) return;
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Required Fields', 'Name and Phone number are required.');
      return;
    }

    try {
      setSaving(true);
      const parsedAge = estimatedAge ? parseInt(estimatedAge, 10) : null;

      await updatePatient(id, {
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

      // Save new profile photo if changed
      if (selectedPhotoUri && selectedPhotoUri !== initialPhotoUri) {
        await savePatientImage(id, selectedPhotoUri, 'PROFILE');
      }

      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update patient record.');
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
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photo Selection / Avatar Card */}
        <View style={styles.photoCard}>
          <View style={styles.avatarPreview}>
            {selectedPhotoUri ? (
              <Image source={{ uri: selectedPhotoUri }} style={styles.avatarImage} />
            ) : (
              <User size={44} color={theme.colors.primaryDark} />
            )}
          </View>

          <View style={styles.photoInfoWrap}>
            <Text style={styles.photoTitle}>Patient Profile Photo (DP)</Text>
            <Text style={styles.photoSubtitle}>This photo represents the patient face icon.</Text>
            <View style={styles.photoBtnRow}>
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={() => handlePickImage(true)}
                activeOpacity={0.8}
              >
                <Camera size={14} color={theme.colors.primaryDark} />
                <Text style={styles.photoBtnText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.photoBtn, styles.photoBtnGallery]}
                onPress={() => handlePickImage(false)}
                activeOpacity={0.8}
              >
                <ImageIcon size={14} color="#4F46E5" />
                <Text style={[styles.photoBtnText, { color: '#4F46E5' }]}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formSectionTitle}>Edit Demographics</Text>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <View style={styles.inputWrapper}>
              <User size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Patient Full Name"
                placeholderTextColor={theme.colors.textLight}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <View style={styles.inputWrapper}>
              <Phone size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Phone Number"
                placeholderTextColor={theme.colors.textLight}
              />
            </View>
          </View>

          {/* Gender */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              {(['Male', 'Female', 'Other'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.genderBtnText, gender === g && styles.genderBtnTextActive]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Age & DOB */}
          <View style={styles.rowTwoCols}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Estimated Age</Text>
              <View style={styles.inputWrapper}>
                <Calendar size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={estimatedAge}
                  onChangeText={setEstimatedAge}
                  keyboardType="numeric"
                  placeholder="e.g. 35"
                  placeholderTextColor={theme.colors.textLight}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Date of Birth</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.colors.textLight}
                />
              </View>
            </View>
          </View>

          {/* Blood Group */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Blood Group</Text>
            <View style={styles.bloodGroupRow}>
              {BLOOD_GROUPS.map((bg) => (
                <TouchableOpacity
                  key={bg}
                  style={[
                    styles.bloodGroupBtn,
                    bloodGroup === bg && styles.bloodGroupBtnActive,
                  ]}
                  onPress={() => setBloodGroup(bloodGroup === bg ? '' : bg)}
                >
                  <Text
                    style={[
                      styles.bloodGroupText,
                      bloodGroup === bg && styles.bloodGroupTextActive,
                    ]}
                  >
                    {bg}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Known Allergies */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Known Allergies</Text>
            <View style={[styles.inputWrapper, allergies.length > 0 && styles.allergyHighlight]}>
              <AlertCircle size={18} color={allergies ? theme.colors.danger : theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={allergies}
                onChangeText={setAllergies}
                placeholder="e.g. Penicillin, Sulfa, Peanuts..."
                placeholderTextColor={theme.colors.textLight}
              />
            </View>
          </View>

          {/* Emergency Contact */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Emergency Contact Number</Text>
            <View style={styles.inputWrapper}>
              <ShieldAlert size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={emergencyContact}
                onChangeText={setEmergencyContact}
                keyboardType="phone-pad"
                placeholder="e.g. Spouse / Relative mobile"
                placeholderTextColor={theme.colors.textLight}
              />
            </View>
          </View>

          {/* Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Residential Address / Area</Text>
            
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
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. Goregaon West / Flat 302, Green Avenue, Mumbai"
                placeholderTextColor={theme.colors.textLight}
              />
            </View>
          </View>

          {/* Clinical Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>General Medical Background / Notes</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <FileText size={18} color={theme.colors.textMuted} style={[styles.inputIcon, { marginTop: 8 }]} />
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Chronic history, diabetes, hypertension, family traits..."
                placeholderTextColor={theme.colors.textLight}
                multiline
              />
            </View>
          </View>
        </View>

        {/* Update CTA */}
        <TouchableOpacity
          style={[styles.updateBtn, saving && styles.disabledBtn]}
          onPress={handleUpdate}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Check size={20} color="#FFFFFF" />
          <Text style={styles.updateBtnText}>
            {saving ? 'Updating Record...' : 'Save & Update Patient Info'}
          </Text>
        </TouchableOpacity>

        {/* Bottom Scroll Spacing */}
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
    paddingBottom: 420, // Ultra-generous clearance so Medical Notes & Address stay 100% visible when keyboard is open
  },
  photoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    gap: theme.spacing.md,
    ...theme.shadows.sm,
  },
  avatarPreview: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoInfoWrap: {
    flex: 1,
  },
  photoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
  },
  photoSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  photoBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.primaryBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorderHighlight,
  },
  photoBtnGallery: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  photoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
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
  allergyHighlight: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.dangerBg,
  },
  textAreaWrapper: {
    height: 90,
    alignItems: 'flex-start',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderBtn: {
    flex: 1,
    height: 42,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.background,
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
  bloodGroupRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bloodGroupBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    backgroundColor: theme.colors.background,
  },
  bloodGroupBtnActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primaryDark,
  },
  bloodGroupText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  bloodGroupTextActive: {
    color: '#FFFFFF',
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
  updateBtn: {
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
  updateBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  bottomSpacer: {
    height: 180,
  },
});
