import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';
import { Activity, Heart, Thermometer, Gauge, Scale } from 'lucide-react-native';
import { VitalsData } from '../../db/repositories/visit.repo';

interface VitalsInputGroupProps {
  vitals: VitalsData;
  onChangeVitals: (field: keyof VitalsData, val: string) => void;
}

export const VitalsInputGroup: React.FC<VitalsInputGroupProps> = ({ vitals, onChangeVitals }) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Activity size={18} color={theme.colors.primary} />
        <Text style={styles.sectionTitle}>Patient Vitals & Measurements</Text>
      </View>

      <View style={styles.grid}>
        {/* Blood Pressure (Systolic / Diastolic) */}
        <View style={[styles.inputBox, styles.fullWidth]}>
          <View style={styles.labelRow}>
            <Gauge size={14} color={theme.colors.primary} />
            <Text style={styles.label}>Blood Pressure (BP)</Text>
            <Text style={styles.unitBadge}>mmHg</Text>
          </View>
          <View style={styles.bpRow}>
            <TextInput
              style={[styles.input, styles.bpInput]}
              placeholder="Systolic (e.g. 120)"
              placeholderTextColor={theme.colors.textLight}
              value={vitals.bpSystolic ? String(vitals.bpSystolic) : ''}
              onChangeText={(val) => onChangeVitals('bpSystolic', val)}
              keyboardType="numeric"
              maxLength={3}
            />
            <Text style={styles.slash}>/</Text>
            <TextInput
              style={[styles.input, styles.bpInput]}
              placeholder="Diastolic (e.g. 80)"
              placeholderTextColor={theme.colors.textLight}
              value={vitals.bpDiastolic ? String(vitals.bpDiastolic) : ''}
              onChangeText={(val) => onChangeVitals('bpDiastolic', val)}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>
        </View>

        {/* Temperature */}
        <View style={styles.inputBox}>
          <View style={styles.labelRow}>
            <Thermometer size={14} color={theme.colors.warning} />
            <Text style={styles.label}>Temperature</Text>
            <Text style={styles.unitBadge}>°F</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="e.g. 98.6"
            placeholderTextColor={theme.colors.textLight}
            value={vitals.temperature ? String(vitals.temperature) : ''}
            onChangeText={(val) => onChangeVitals('temperature', val)}
            keyboardType="decimal-pad"
            maxLength={5}
          />
        </View>

        {/* Pulse */}
        <View style={styles.inputBox}>
          <View style={styles.labelRow}>
            <Heart size={14} color={theme.colors.danger} />
            <Text style={styles.label}>Pulse Rate</Text>
            <Text style={styles.unitBadge}>bpm</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="e.g. 72"
            placeholderTextColor={theme.colors.textLight}
            value={vitals.pulse ? String(vitals.pulse) : ''}
            onChangeText={(val) => onChangeVitals('pulse', val)}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>

        {/* SpO2 */}
        <View style={styles.inputBox}>
          <View style={styles.labelRow}>
            <Activity size={14} color={theme.colors.info} />
            <Text style={styles.label}>Oxygen (SpO2)</Text>
            <Text style={styles.unitBadge}>%</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="e.g. 98"
            placeholderTextColor={theme.colors.textLight}
            value={vitals.spo2 ? String(vitals.spo2) : ''}
            onChangeText={(val) => onChangeVitals('spo2', val)}
            keyboardType="numeric"
            maxLength={3}
          />
        </View>

        {/* Weight */}
        <View style={styles.inputBox}>
          <View style={styles.labelRow}>
            <Scale size={14} color={theme.colors.textSecondary} />
            <Text style={styles.label}>Weight</Text>
            <Text style={styles.unitBadge}>kg</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="e.g. 68.5"
            placeholderTextColor={theme.colors.textLight}
            value={vitals.weight ? String(vitals.weight) : ''}
            onChangeText={(val) => onChangeVitals('weight', val)}
            keyboardType="decimal-pad"
            maxLength={5}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  inputBox: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  fullWidth: {
    flexBasis: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    flex: 1,
  },
  unitBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
    backgroundColor: theme.colors.cardBorder,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  bpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bpInput: {
    flex: 1,
  },
  slash: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    paddingHorizontal: 10,
    height: 44,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    paddingVertical: 0,
  },
});
