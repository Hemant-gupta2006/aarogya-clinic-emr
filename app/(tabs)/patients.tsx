import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../src/constants/theme';
import { searchPatients, PatientWithMeta } from '../../src/db/repositories/patient.repo';
import { getAbsolutePhotoUri } from '../../src/services/photo.service';
import { Search, UserPlus, X, ChevronRight, Users, Clock, Phone, AlertCircle } from 'lucide-react-native';

export default function PatientsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [patientList, setPatientList] = useState<PatientWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPatients = useCallback(async (query: string = '') => {
    try {
      const results = await searchPatients(query, 100);
      setPatientList(results);
    } catch {
      // Error fetching patients
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchPatients]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPatients(searchQuery);
  };

  const renderPatientItem = ({ item }: { item: PatientWithMeta }) => (
    <TouchableOpacity
      style={styles.patientCard}
      onPress={() => router.push(`/patients/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        {item.profilePhoto ? (
          <Image
            source={{ uri: getAbsolutePhotoUri(item.profilePhoto) }}
            style={styles.avatarImg}
          />
        ) : (
          <Text style={styles.avatarInitial}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        )}
      </View>

      <View style={styles.patientInfo}>
        <View style={styles.patientHeaderRow}>
          <Text style={styles.patientName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.patientNumberBadge}>
            <Text style={styles.patientNumberText}>{item.patientNumber}</Text>
          </View>
        </View>

        <Text style={styles.patientDetails}>
          {item.estimatedAge ? `${item.estimatedAge} yrs` : 'Age N/A'} • {item.gender}
          {item.bloodGroup ? ` • ${item.bloodGroup}` : ''}
        </Text>

        <View style={styles.phoneRow}>
          <Phone size={12} color={theme.colors.textMuted} />
          <Text style={styles.phoneText}>{item.phone}</Text>
        </View>

        {item.allergies ? (
          <View style={styles.allergyRow}>
            <AlertCircle size={11} color={theme.colors.danger} />
            <Text style={styles.allergyText} numberOfLines={1}>
              Allergies: {item.allergies}
            </Text>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.metaBadge}>
            <Clock size={11} color={theme.colors.textMuted} />
            <Text style={styles.metaText}>
              {item.lastVisitDate ? `Last: ${item.lastVisitDate}` : 'No visits yet'}
            </Text>
          </View>
          <View style={[styles.metaBadge, styles.visitCountBadge]}>
            <Text style={styles.visitCountText}>{item.visitCount} visits</Text>
          </View>
        </View>
      </View>

      <ChevronRight size={18} color={theme.colors.textLight} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Header Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={18} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patient name, phone, or PAT ID..."
            placeholderTextColor={theme.colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/patients/new')}
          activeOpacity={0.85}
        >
          <UserPlus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Directory Count Bar */}
      <View style={styles.directoryCountBar}>
        <Text style={styles.directoryCountText}>
          {searchQuery ? `Search Results (${patientList.length})` : `Registered Patients (${patientList.length})`}
        </Text>
      </View>

      {/* Patient List */}
      <FlatList
        data={patientList}
        keyExtractor={(item) => item.id}
        renderItem={renderPatientItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom + 30, theme.spacing.xxl) }]}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Users size={44} color={theme.colors.textLight} />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No matching patients found' : 'No patients registered yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Try searching with another keyword or phone number.'
                  : 'Tap the + button above to register your first patient.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => router.push('/patients/new')}
              >
                <Text style={styles.emptyAddBtnText}>+ Register Patient</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 46,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 46,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  directoryCountBar: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    backgroundColor: theme.colors.background,
  },
  directoryCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    padding: theme.spacing.md,
    paddingTop: 4,
    gap: 10,
    paddingBottom: theme.spacing.xxl,
  },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...theme.shadows.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.cardBorderHighlight,
  },
  avatarImg: {
    width: 48,
    height: 48,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  patientInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
    marginRight: theme.spacing.xs,
  },
  patientHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    flex: 1,
  },
  patientNumberBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  patientNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
  },
  patientDetails: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  phoneText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  allergyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    backgroundColor: theme.colors.dangerBg,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  allergyText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.danger,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  visitCountBadge: {
    backgroundColor: theme.colors.primaryBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.cardBorderHighlight,
  },
  visitCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  emptyAddBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    marginTop: 8,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

