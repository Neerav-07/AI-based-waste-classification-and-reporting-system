import { AppTheme, wasteAppearance } from '@/constants/app-theme';
import type { ClassificationResult } from '@/types/app';
import { confidenceToProgress, formatConfidence } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { SectionCard } from './section-card';

interface ResultCardProps {
  result: ClassificationResult;
}

export function ResultCard({ result }: ResultCardProps) {
  const appearance = wasteAppearance[result.prediction];
  const progress = confidenceToProgress(result.confidence);

  return (
    <SectionCard
      rightContent={
        <View style={[styles.binPill, { backgroundColor: appearance.soft }]}>
          <Text style={[styles.binLabel, { color: appearance.accent }]}>{result.data.binColor}</Text>
        </View>
      }
      subtitle="AI waste classification"
      title="Result Card">
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: appearance.soft }]}>
          <Ionicons color={appearance.accent} name={appearance.icon} size={24} />
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.resultTitle}>{result.data.title}</Text>
          <Text style={styles.resultDescription}>{result.data.description}</Text>
        </View>
      </View>

      <View style={styles.confidenceHeader}>
        <Text style={styles.confidenceLabel}>Confidence</Text>
        <Text style={[styles.confidenceValue, { color: appearance.accent }]}>{formatConfidence(result.confidence)}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: appearance.accent,
              width: `${progress}%`,
            },
          ]}
        />
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 18,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  resultTitle: {
    color: AppTheme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  resultDescription: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  binPill: {
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  binLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  confidenceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confidenceLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  confidenceValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  progressTrack: {
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.pill,
    height: 12,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: AppTheme.radius.pill,
    height: '100%',
  },
});
