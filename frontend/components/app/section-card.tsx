import { AppTheme } from '@/constants/app-theme';
import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

interface SectionCardProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  rightContent?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionCard({ children, title, subtitle, rightContent, style }: SectionCardProps) {
  return (
    <View style={[styles.card, style]}>
      {(title || subtitle || rightContent) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {rightContent}
        </View>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    gap: 14,
    padding: 18,
    shadowColor: '#133A2A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 2,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
  },
});
