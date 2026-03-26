import { AppTheme } from '@/constants/app-theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { SectionCard } from './section-card';

interface DisposalCardProps {
  instructions: string;
}

export function DisposalCard({ instructions }: DisposalCardProps) {
  return (
    <SectionCard subtitle="Safe disposal guidance" title="Disposal Card">
      <View style={styles.panel}>
        <Ionicons color={AppTheme.colors.secondary} name="sparkles-outline" size={18} />
        <Text style={styles.text}>{instructions}</Text>
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: AppTheme.colors.secondarySoft,
    borderRadius: AppTheme.radius.md,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  text: {
    color: AppTheme.colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
  },
});
