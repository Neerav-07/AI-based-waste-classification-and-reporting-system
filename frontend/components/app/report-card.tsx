import { AppTheme } from '@/constants/app-theme';
import type { ReportItem } from '@/types/app';
import { formatDate } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusPill } from './status-pill';

interface ReportCardProps {
  report: ReportItem;
  onPress?: () => void;
  footer?: React.ReactNode;
}

export function ReportCard({ report, onPress, footer }: ReportCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {report.imageUri ? <Image contentFit="cover" source={{ uri: report.imageUri }} style={styles.image} /> : null}

      <View style={styles.body}>
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.category}>{report.category}</Text>
            <Text style={styles.date}>{formatDate(report.createdAt)}</Text>
          </View>
          <StatusPill status={report.status} />
        </View>

        <View style={styles.metaRow}>
          <Ionicons color={AppTheme.colors.secondary} name="location-outline" size={16} />
          <Text style={styles.metaText}>{report.location}</Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons color={AppTheme.colors.primary} name="business-outline" size={16} />
          <Text style={styles.metaText}>{report.locality}</Text>
        </View>

        <Text numberOfLines={3} style={styles.description}>
          {report.description}
        </Text>

        {footer}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.9,
  },
  image: {
    height: 170,
    width: '100%',
  },
  body: {
    gap: 12,
    padding: 16,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleBlock: {
    flex: 1,
    gap: 3,
  },
  category: {
    color: AppTheme.colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  date: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  metaText: {
    color: AppTheme.colors.textMuted,
    flex: 1,
    fontSize: 13,
  },
  description: {
    color: AppTheme.colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
});
