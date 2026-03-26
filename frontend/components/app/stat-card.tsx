import { AppTheme } from '@/constants/app-theme';
import { StyleSheet, Text, View } from 'react-native';

interface StatCardProps {
  label: string;
  value: string | number;
  accentColor: string;
  icon: React.ReactNode;
}

export function StatCard({ label, value, accentColor, icon }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${accentColor}18` }]}>{icon}</View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.md,
    borderWidth: 1,
    flex: 1,
    gap: 10,
    minHeight: 120,
    padding: 16,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  value: {
    color: AppTheme.colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  label: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
