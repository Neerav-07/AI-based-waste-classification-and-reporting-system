import { AppTheme } from '@/constants/app-theme';
import { StyleSheet, Text, View } from 'react-native';

import { SectionCard } from './section-card';

interface TipsCardProps {
  tips: string[];
}

export function TipsCard({ tips }: TipsCardProps) {
  return (
    <SectionCard subtitle="Small actions that improve disposal quality" title="Tips Card">
      <View style={styles.list}>
        {tips.map((tip) => (
          <View key={tip} style={styles.row}>
            <View style={styles.dot} />
            <Text style={styles.tip}>{tip}</Text>
          </View>
        ))}
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    backgroundColor: AppTheme.colors.primary,
    borderRadius: 999,
    height: 8,
    marginTop: 7,
    width: 8,
  },
  tip: {
    color: AppTheme.colors.text,
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
});
