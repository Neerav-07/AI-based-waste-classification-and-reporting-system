import { AppTheme } from '@/constants/app-theme';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type NoticeTone = 'info' | 'warning' | 'success';
type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface NoticeBannerProps {
  message: string;
  title?: string;
  tone?: NoticeTone;
  icon?: IoniconName;
}

const toneAppearance: Record<NoticeTone, { backgroundColor: string; color: string; icon: IoniconName }> = {
  info: {
    backgroundColor: AppTheme.colors.infoSoft,
    color: AppTheme.colors.info,
    icon: 'information-circle-outline',
  },
  warning: {
    backgroundColor: AppTheme.colors.warningSoft,
    color: AppTheme.colors.warning,
    icon: 'warning-outline',
  },
  success: {
    backgroundColor: AppTheme.colors.successSoft,
    color: AppTheme.colors.success,
    icon: 'checkmark-circle-outline',
  },
};

export function NoticeBanner({ message, title, tone = 'info', icon }: NoticeBannerProps) {
  const appearance = toneAppearance[tone];

  return (
    <View style={[styles.banner, { backgroundColor: appearance.backgroundColor }]}>
      <Ionicons color={appearance.color} name={icon ?? appearance.icon} size={20} />
      <View style={styles.copy}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'flex-start',
    borderRadius: AppTheme.radius.md,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  message: {
    color: AppTheme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
