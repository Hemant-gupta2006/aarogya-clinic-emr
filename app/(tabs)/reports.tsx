import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../src/constants/theme';
import {
  getClinicalReport,
  ClinicalReportSummary,
  generateAndShareMultiSheetXlsx,
  shareXlsxFile,
} from '../../src/services/xlsx.service';
import {
  Calendar,
  Users,
  Stethoscope,
  UserPlus,
  RotateCcw,
  IndianRupee,
  FileSpreadsheet,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
} from 'lucide-react-native';

type DateFilterType = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM' | 'ALL';

export default function ReportsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filterType, setFilterType] = useState<DateFilterType>('TODAY');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<ClinicalReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getClinicalReport({
        rangeType: filterType,
        customDate: filterType === 'CUSTOM' ? customDate : undefined,
      });
      setReport(res);
    } catch (err) {
      console.warn('Error loading clinical report:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterType, customDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReport();
  };

  const handleExportXlsx = async () => {
    try {
      setExporting(true);
      let rangeOption: 'ALL' | 'TODAY' | 'MONTH' | 'CUSTOM' = 'ALL';
      if (filterType === 'TODAY') rangeOption = 'TODAY';
      else if (filterType === 'MONTH') rangeOption = 'MONTH';
      else if (filterType === 'CUSTOM' || filterType === 'YESTERDAY' || filterType === 'WEEK') {
        rangeOption = 'CUSTOM';
      }

      const filePath = await generateAndShareMultiSheetXlsx({
        dateRangeType: rangeOption,
        startDate: report?.startDate,
        endDate: report?.endDate,
      });
      await shareXlsxFile(filePath);
    } catch (err) {
      console.warn('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const FILTER_PILLS: Array<{ id: DateFilterType; label: string }> = [
    { id: 'TODAY', label: 'Today' },
    { id: 'YESTERDAY', label: 'Yesterday' },
    { id: 'WEEK', label: 'This Week' },
    { id: 'MONTH', label: 'This Month' },
    { id: 'CUSTOM', label: 'Custom Date' },
    { id: 'ALL', label: 'All Time' },
  ];

  return (
    <View style={styles.container}>
      {/* Top Filter Bar */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_PILLS.map((p) => {
            const isActive = filterType === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setFilterType(p.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filterType === 'CUSTOM' && (
          <View style={styles.customDateRow}>
            <Calendar size={16} color={theme.colors.primaryDark} />
            <Text style={styles.customDateLabel}>Select Date (YYYY-MM-DD):</Text>
            <TextInput
              style={styles.customDateInput}
              value={customDate}
              onChangeText={setCustomDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.colors.textLight}
            />
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 30, 80) }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Summary Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerTopRow}>
            <View>
              <Text style={styles.bannerTitle}>Clinical Practice Report</Text>
              <Text style={styles.bannerPeriod}>{report?.periodLabel || 'Loading...'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.exportXlsxBtn, exporting && styles.disabledBtn]}
              onPress={handleExportXlsx}
              disabled={exporting}
              activeOpacity={0.85}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <FileSpreadsheet size={15} color="#FFFFFF" />
                  <Text style={styles.exportXlsxBtnText}>Export XLSX</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Primary Metric Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: '#CCFBF1' }]}>
                <Users size={18} color="#0F766E" />
              </View>
              <Text style={styles.metricValue}>{report?.uniquePatients ?? '-'}</Text>
              <Text style={styles.metricLabel}>Unique Patients</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={[styles.metricIconWrap, { backgroundColor: '#E0E7FF' }]}>
                <Stethoscope size={18} color="#4338CA" />
              </View>
              <Text style={styles.metricValue}>{report?.totalConsultations ?? '-'}</Text>
              <Text style={styles.metricLabel}>Total Visits</Text>
            </View>
          </View>

          {/* Secondary Metric Strip */}
          <View style={styles.secondaryMetricsRow}>
            <View style={styles.secondaryMetricItem}>
              <UserPlus size={14} color="#0D9488" />
              <Text style={styles.secMetricText}>
                New: <Text style={styles.secMetricBold}>{report?.newPatients ?? 0}</Text>
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.secondaryMetricItem}>
              <RotateCcw size={14} color="#0284C7" />
              <Text style={styles.secMetricText}>
                Follow-ups: <Text style={styles.secMetricBold}>{report?.followUpConsultations ?? 0}</Text>
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.secondaryMetricItem}>
              <IndianRupee size={14} color="#16A34A" />
              <Text style={styles.secMetricText}>
                Fees: <Text style={styles.secMetricBold}>₹{report?.totalFees?.toLocaleString('en-IN') ?? 0}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Consultations List */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listTitle}>
            Consultations ({report?.consultations.length ?? 0})
          </Text>
          <Text style={styles.listSubtitle}>
            {report?.uniquePatients ?? 0} distinct patients
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Calculating clinical statistics...</Text>
          </View>
        ) : report?.consultations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Calendar size={44} color={theme.colors.textLight} />
            <Text style={styles.emptyTitle}>No consultations found</Text>
            <Text style={styles.emptySubtitle}>
              No patient visits were recorded during the selected period.
            </Text>
          </View>
        ) : (
          report?.consultations.map((v) => (
            <TouchableOpacity
              key={v.visitId}
              style={styles.visitCard}
              onPress={() => router.push(`/patients/${v.patientId}`)}
              activeOpacity={0.75}
            >
              <View style={styles.visitHeaderRow}>
                <View style={styles.patientMeta}>
                  <Text style={styles.patientName}>{v.patientName}</Text>
                  <Text style={styles.patientIdText}>
                    {v.patientNumber} • {v.estimatedAge ? `${v.estimatedAge} yrs` : 'Age N/A'} • {v.gender}
                  </Text>
                </View>

                <View style={[styles.typeBadge, v.isNewPatient ? styles.newBadge : styles.followUpBadge]}>
                  <Text style={[styles.typeBadgeText, v.isNewPatient ? styles.newBadgeText : styles.followUpBadgeText]}>
                    {v.isNewPatient ? 'New Patient' : 'Follow-up'}
                  </Text>
                </View>
              </View>

              {v.diagnosis ? (
                <View style={styles.diagnosisBox}>
                  <Text style={styles.diagnosisLabel}>Diagnosis: </Text>
                  <Text style={styles.diagnosisText} numberOfLines={1}>
                    {v.diagnosis}
                  </Text>
                </View>
              ) : null}

              <View style={styles.visitFooterRow}>
                <View style={styles.timeTag}>
                  <Clock size={12} color={theme.colors.textMuted} />
                  <Text style={styles.timeText}>
                    {v.visitDate} {v.visitTime ? `at ${v.visitTime}` : ''}
                  </Text>
                </View>

                <View style={styles.feeTag}>
                  <Text style={styles.feeLabel}>Fee: </Text>
                  <Text style={styles.feeValue}>
                    {v.charges ? `₹${v.charges}` : '₹0'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  filterSection: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
    paddingVertical: 10,
  },
  filterScroll: {
    paddingHorizontal: theme.spacing.md,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  filterPillActive: {
    backgroundColor: theme.colors.primaryBg,
    borderColor: theme.colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  filterPillTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: '800',
  },
  customDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginTop: 10,
    gap: 8,
  },
  customDateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  customDateInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    width: 120,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  bannerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  bannerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  bannerPeriod: {
    fontSize: 12,
    color: theme.colors.primaryDark,
    fontWeight: '600',
    marginTop: 2,
  },
  exportXlsxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669', // Emerald Excel Green
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  exportXlsxBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    alignItems: 'center',
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.colors.text,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  secondaryMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryBg,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  secondaryMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  secMetricText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  secMetricBold: {
    fontWeight: '800',
    color: theme.colors.text,
  },
  metricDivider: {
    width: 1,
    height: 16,
    backgroundColor: theme.colors.cardBorderHighlight,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  listSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  visitCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: 10,
    ...theme.shadows.sm,
  },
  visitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  patientMeta: {
    flex: 1,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  patientIdText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  newBadge: {
    backgroundColor: '#DCFCE7',
  },
  newBadgeText: {
    color: '#15803D',
  },
  followUpBadge: {
    backgroundColor: '#E0F2FE',
  },
  followUpBadgeText: {
    color: '#0369A1',
  },
  diagnosisBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 8,
  },
  diagnosisLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  diagnosisText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  visitFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    paddingTop: 8,
    marginTop: 2,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  feeTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  feeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
});
