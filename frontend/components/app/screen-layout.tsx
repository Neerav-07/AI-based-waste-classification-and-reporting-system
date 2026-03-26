import { AppTheme } from '@/constants/app-theme';
import type { PropsWithChildren } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

interface ScreenLayoutProps extends PropsWithChildren {
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function ScreenLayout({ children, contentContainerStyle }: ScreenLayoutProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.background}>
        <View style={[styles.orb, styles.orbTop]} />
        <View style={[styles.orb, styles.orbBottom]} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.6,
  },
  orbTop: {
    backgroundColor: AppTheme.colors.secondarySoft,
    width: 260,
    height: 260,
    top: -90,
    right: -80,
  },
  orbBottom: {
    backgroundColor: AppTheme.colors.primarySoft,
    width: 240,
    height: 240,
    bottom: -70,
    left: -100,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 8,
    gap: 18,
  },
});
