import { AppTheme } from '@/constants/app-theme';
import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface PrimaryButtonProps extends PropsWithChildren {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  variant?: ButtonVariant;
}

export function PrimaryButton({
  children,
  onPress,
  disabled,
  loading,
  icon,
  variant = 'primary',
}: PrimaryButtonProps) {
  const palette = variants[variant];

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          opacity: disabled ? 0.55 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.color} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.label, { color: palette.color }]}>{children}</Text>
        </View>
      )}
    </Pressable>
  );
}

const variants = {
  primary: {
    backgroundColor: AppTheme.colors.primary,
    borderColor: AppTheme.colors.primary,
    color: AppTheme.colors.white,
  },
  secondary: {
    backgroundColor: AppTheme.colors.secondarySoft,
    borderColor: AppTheme.colors.secondarySoft,
    color: AppTheme.colors.secondary,
  },
  danger: {
    backgroundColor: AppTheme.colors.danger,
    borderColor: AppTheme.colors.danger,
    color: AppTheme.colors.white,
  },
  ghost: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    color: AppTheme.colors.text,
  },
};

const styles = StyleSheet.create({
  button: {
    borderRadius: AppTheme.radius.md,
    borderWidth: 1,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
});
