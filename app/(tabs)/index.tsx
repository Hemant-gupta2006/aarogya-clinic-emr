import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../src/constants/theme';
import { getDatabase } from '../../src/db/client';
import { patients, visits } from '../../src/db/schema';
import { getAppSettings } from '../../src/db/repositories/metadata.repo';
import { getAbsolutePhotoUri } from '../../src/services/photo.service';
import { isNull, sql, desc, eq } from 'drizzle-orm';
import {
  UserPlus,
  Search,
  CalendarCheck,
  Users,
  Stethoscope,
  Clock,
  ArrowRight,
  ShieldCheck,
  Download,
  Activity,
  Plus,
} from 'lucide-react-native';

interface RecentConsultationItem {
  visitId: string;
  visitDate: string;
  visitTime: string;
  diagnosis: string | null;
  symptoms: string | null;
  patient: {
    id: string;
    patientNumber: string;
    name: string;
    gender: string;
    estimatedAge: number | null;
    phone: string;
    profilePhoto?: string | null;
  };
}

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [doctorName, setDoctorName] = useState('Dr. Ananya Sharma, MD');
  const [clinicName, setClinicName] = useState('Aarogya Clinic');
  const [clinicLogo, setClinicLogo] = useState<string | null>(null);
  const [todayVisitsCount, setTodayVisitsCount] = useState(0);
  const [totalPatientsCount, setTotalPatientsCount] = useState(0);
  const [totalVisitsCount, setTotalVisitsCount] = useState(0);
  const [recentVisits, setRecentVisits] = useState<RecentConsultationItem[]>([]);

  const loadDashboardData = useCallback(async () => {
    try {
      const { db } = await getDatabase();

      // 1. Settings & Doctor Info
      const settings = await getAppSettings();
      if (settings.doctor_name) setDoctorName(settings.doctor_name);
      if (settings.clinic_name) setClinicName(settings.clinic_name);
      if (settings.clinic_logo) setClinicLogo(settings.clinic_logo);

      // 2. Today's Visits Count
      const todayStr = new Date().toISOString().split('T')[0];
      const [todayStat] = await db
        .select({ count: sql<number>`count(*)` })
        .from(visits)
        .where(sql`${visits.visitDate} = ${todayStr} AND ${visits.deletedAt} IS NULL`);
      setTodayVisitsCount(todayStat?.count || 0);

      // 3. Total Patients Count
      const [patientStat] = await db
        .select({ count: sql<number>`count(*)` })
        .from(patients)
        .where(isNull(patients.deletedAt));
      setTotalPatientsCount(patientStat?.count || 0);

      // 4. Total Visits Count
      const [allVisitsStat] = await db
        .select({ count: sql<number>`count(*)` })
        .from(visits)
        .where(isNull(visits.deletedAt));
      setTotalVisitsCount(allVisitsStat?.count || 0);

      // 5. Recent Consultations with Patient Demographics
      const recentList = await db
        .select({
          visitId: visits.id,
          visitDate: visits.visitDate,
          visitTime: visits.visitTime,
          diagnosis: visits.diagnosis,
          symptoms: visits.symptoms,
          patientId: patients.id,
          patientNumber: patients.patientNumber,
          name: patients.name,
          gender: patients.gender,
          estimatedAge: patients.estimatedAge,
          phone: patients.phone,
        })
        .from(visits)
        .innerJoin(patients, eq(visits.patientId, patients.id))
        .where(andNullCheck())
        .orderBy(desc(visits.visitDate), desc(visits.visitTime), desc(visits.createdAt))
        .limit(6);

      setRecentVisits(
        recentList.map((r) => ({
          visitId: r.visitId,
          visitDate: r.visitDate,
          visitTime: r.visitTime,
          diagnosis: r.diagnosis,
          symptoms: r.symptoms,
          patient: {
            id: r.patientId,
            patientNumber: r.patientNumber,
            name: r.name,
            gender: r.gender,
            estimatedAge: r.estimatedAge,
            phone: r.phone,
          },
        }))
      );
    } catch {
      // Error loading dashboard
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  function andNullCheck() {
    return sql`${visits.deletedAt} IS NULL AND ${patients.deletedAt} IS NULL`;
  }

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 30, 80) }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Clinic Brand & Greeting */}
      <View style={styles.topBrandRow}>
        <TouchableOpacity
          style={styles.brandTitleWrap}
          onPress={() => router.push('/(tabs)/settings')}
          activeOpacity={0.7}
        >
          {clinicLogo ? (
            <Image
              source={{ uri: getAbsolutePhotoUri(clinicLogo) }}
              style={styles.brandLogoImage}
            />
          ) : (
            <View style={styles.brandLogoIcon}>
              <Activity size={18} color="#FFFFFF" />
            </View>
          )}
          <View>
            <Text style={styles.brandName} numberOfLines={1}>{clinicName}</Text>
            <Text style={styles.brandSub}>CLINICAL WORKSPACE</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.doctorBadge}
          onPress={() => router.push('/(tabs)/settings')}
          activeOpacity={0.8}
        >
          <View style={styles.doctorAvatar}>
            <Text style={styles.doctorInitial}>{doctorName.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.doctorNameText} numberOfLines={1}>
              {doctorName}
            </Text>
            <Text style={styles.doctorRoleText}>DOCTOR</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Hero Emerald Banner */}
      <View style={styles.heroBanner}>
        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Clinical Workspace Ready</Text>
        </View>

        <Text style={styles.heroGreeting}>Good day, {doctorName}</Text>
        <Text style={styles.heroSubtitle}>
          Record consultations, maintain patient histories, and manage prescriptions with precision.
        </Text>

        <View style={styles.heroActions}>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => router.push('/patients/new')}
            activeOpacity={0.85}
          >
            <UserPlus size={18} color={theme.colors.primaryDark} />
            <Text style={styles.primaryActionBtnText}>New Patient Registration</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => router.push('/(tabs)/patients')}
            activeOpacity={0.85}
          >
            <Search size={16} color="#FFFFFF" />
            <Text style={styles.secondaryActionBtnText}>Existing Patients & Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3 Metric Cards Section */}
      <View style={styles.metricsContainer}>
        {/* Metric 1: Today's Consultations */}
        <View style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricLabel}>TODAY'S CONSULTATIONS</Text>
            <View style={[styles.metricIconWrap, { backgroundColor: '#ECFDF5' }]}>
              <CalendarCheck size={18} color="#059669" />
            </View>
          </View>
          <Text style={styles.metricValue}>{todayVisitsCount}</Text>
          <Text style={styles.metricSubtext}>Consultations recorded today</Text>
        </View>

        {/* Metric 2: Total Patients */}
        <View style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricLabel}>TOTAL REGISTERED PATIENTS</Text>
            <View style={[styles.metricIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Users size={18} color="#2563EB" />
            </View>
          </View>
          <Text style={styles.metricValue}>{totalPatientsCount}</Text>
          <Text style={styles.metricSubtext}>Unique medical IDs assigned</Text>
        </View>

        {/* Metric 3: Total Clinical Visits */}
        <View style={styles.metricCard}>
          <View style={styles.metricCardHeader}>
            <Text style={styles.metricLabel}>TOTAL CLINICAL VISITS</Text>
            <View style={[styles.metricIconWrap, { backgroundColor: '#EEF2FF' }]}>
              <Stethoscope size={18} color="#4F46E5" />
            </View>
          </View>
          <Text style={styles.metricValue}>{totalVisitsCount}</Text>
          <Text style={styles.metricSubtext}>Cumulative historical records</Text>
        </View>
      </View>

      {/* Recent Consultations Queue */}
      <View style={styles.recentSection}>
        <View style={styles.recentSectionHeader}>
          <View style={styles.recentTitleWrap}>
            <Clock size={18} color={theme.colors.primary} />
            <Text style={styles.recentSectionTitle}>Recent Consultations & Visits</Text>
          </View>
        </View>

        {recentVisits.length === 0 && !loading ? (
          <View style={styles.emptyConsultations}>
            <Stethoscope size={36} color={theme.colors.textLight} />
            <Text style={styles.emptyTitle}>No consultations recorded yet</Text>
            <Text style={styles.emptySubtitle}>
              Start by registering a new patient or adding a consultation note.
            </Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => router.push('/patients/new')}
            >
              <Text style={styles.emptyCtaText}>+ Register First Patient</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.recentList}>
            {recentVisits.map((item) => (
              <View key={item.visitId} style={styles.consultationCard}>
                <TouchableOpacity
                  style={styles.consultationTop}
                  onPress={() => router.push(`/patients/${item.patient.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.patientAvatarBadge}>
                    <Text style={styles.avatarInitial}>
                      {item.patient.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.patientMeta}>
                    <View style={styles.nameBadgeRow}>
                      <Text style={styles.patientName}>{item.patient.name}</Text>
                      <View style={styles.medicalIdBadge}>
                        <Text style={styles.medicalIdText}>{item.patient.patientNumber}</Text>
                      </View>
                    </View>

                    <Text style={styles.demographicsText}>
                      {item.patient.estimatedAge ? `${item.patient.estimatedAge} yrs` : 'Age N/A'} • {item.patient.gender}
                    </Text>

                    {item.diagnosis ? (
                      <Text style={styles.diagnosisText} numberOfLines={2}>
                        <Text style={styles.diagnosisLabel}>Diagnosis: </Text>
                        {item.diagnosis}
                      </Text>
                    ) : item.symptoms ? (
                      <Text style={styles.diagnosisText} numberOfLines={2}>
                        <Text style={styles.diagnosisLabel}>Symptoms: </Text>
                        {item.symptoms}
                      </Text>
                    ) : null}

                    <View style={styles.visitMetaRow}>
                      <Text style={styles.visitIdText}>Visit ID: {item.visitId.substring(0, 14)}</Text>
                      <Text style={styles.dotSeparator}>•</Text>
                      <Text style={styles.visitDateText}>
                        {item.visitDate} {item.visitTime ? `(${item.visitTime})` : ''}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Consultation Card Actions */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.todayVisitBtn}
                    onPress={() => router.push(`/patients/${item.patient.id}/visit/new`)}
                    activeOpacity={0.8}
                  >
                    <Plus size={13} color={theme.colors.primaryDark} />
                    <Text style={styles.todayVisitBtnText}>Follow-up</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.viewNoteBtn}
                    onPress={() => router.push(`/patients/${item.patient.id}`)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.viewNoteBtnText}>View Profile</Text>
                    <ArrowRight size={13} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Quick Utilities Row */}
      <View style={styles.utilitiesRow}>
        <TouchableOpacity
          style={styles.utilityCard}
          onPress={() => router.push('/(tabs)/patients')}
          activeOpacity={0.8}
        >
          <View style={[styles.utilityIconWrap, { backgroundColor: '#F0FDF4' }]}>
            <Users size={18} color="#0D9488" />
          </View>
          <View style={styles.utilityTextWrap}>
            <Text style={styles.utilityTitle}>Patient Directory</Text>
            <Text style={styles.utilitySub}>Quick search & patient records</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.utilityCard}
          onPress={() => router.push('/(tabs)/settings')}
          activeOpacity={0.8}
        >
          <View style={[styles.utilityIconWrap, { backgroundColor: '#EFF6FF' }]}>
            <ShieldCheck size={18} color="#2563EB" />
          </View>
          <View style={styles.utilityTextWrap}>
            <Text style={styles.utilityTitle}>Encrypted Backup</Text>
            <Text style={styles.utilitySub}>Export & restore to phone storage</Text>
          </View>
        </TouchableOpacity>
      </View>
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
  topBrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingTop: theme.spacing.xs,
  },
  brandTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogoImage: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    letterSpacing: 0.8,
  },
  doctorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  doctorAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorInitial: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  doctorNameText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text,
    maxWidth: 120,
  },
  doctorRoleText: {
    fontSize: 8,
    fontWeight: '800',
    color: theme.colors.textMuted,
  },
  heroBanner: {
    backgroundColor: theme.colors.heroGradientStart,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    marginBottom: theme.spacing.sm,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D1FAE5',
  },
  heroGreeting: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.82)',
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  heroActions: {
    gap: 8,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  primaryActionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metricsContainer: {
    gap: 10,
    marginBottom: theme.spacing.md,
  },
  metricCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...theme.shadows.sm,
  },
  metricCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.text,
    fontFamily: 'monospace',
  },
  metricSubtext: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  recentSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  recentSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
  },
  recentTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  recentList: {
    padding: theme.spacing.sm,
    gap: 8,
  },
  consultationCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  consultationTop: {
    flexDirection: 'row',
    gap: 12,
  },
  patientAvatarBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorderHighlight,
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.primaryDark,
  },
  patientMeta: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  patientName: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  medicalIdBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  medicalIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
  },
  demographicsText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  diagnosisText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  diagnosisLabel: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  visitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  visitIdText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontFamily: 'monospace',
  },
  dotSeparator: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  visitDateText: {
    fontSize: 10,
    color: theme.colors.textMuted,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  todayVisitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorderHighlight,
  },
  todayVisitBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  viewNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  viewNoteBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  emptyConsultations: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.md,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  emptyCta: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    marginTop: 4,
  },
  emptyCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  utilitiesRow: {
    gap: 10,
  },
  utilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    ...theme.shadows.sm,
  },
  utilityIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  utilityTextWrap: {
    flex: 1,
  },
  utilityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text,
  },
  utilitySub: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
});
