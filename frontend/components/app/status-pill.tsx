import { AppTheme, getStatusAppearance } from '@/constants/app-theme';
import type { ReportStatus } from '@/types/app';
import { StyleSheet, Text, View } from 'react-native';

interface StatusPillProps {
  status: ReportStatus;
}

export function StatusPill({ status }: StatusPillProps) {
  const appearance = getStatusAppearance(status);

  return (
    <View style={[styles.pill, { backgroundColor: appearance.backgroundColor }]}>
      <Text style={[styles.label, { color: appearance.color }]}>{appearance.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
