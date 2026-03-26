import { AppTheme } from '@/constants/app-theme';
import { routes } from '@/constants/routes';
import { ScreenLayout } from '@/components/app/screen-layout';
import { PrimaryButton } from '@/components/app/primary-button';
import type { UserRole } from '@/types/app';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/providers/auth-provider';

const roleCards: {
  role: UserRole;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  {
    role: 'user',
    title: 'Field User',
    subtitle: 'Classify waste, report issues, and track personal submissions.',
    icon: 'person-outline',
    color: AppTheme.colors.secondary,
  },
  {
    role: 'admin',
    title: 'Admin',
    subtitle: 'Review reports, update issue status, and watch analytics.',
    icon: 'shield-checkmark-outline',
    color: AppTheme.colors.primary,
  },
];

export default function LoginScreen() {
  const { login } = useAuth();
  const [role, setRole] = useState<UserRole>('user');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const canContinue = name.trim().length > 0 && email.trim().length > 0;

  function handleContinue() {
    if (!canContinue) {
      return;
    }

    login(role, name, email);
    router.replace(role === 'admin' ? routes.admin : routes.tabs);
  }

  return (
    <ScreenLayout>
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <Ionicons color={AppTheme.colors.white} name="leaf-outline" size={28} />
        </View>
        <Text style={styles.heroTitle}>AI Waste Response System</Text>
        <Text style={styles.heroSubtitle}>
          A mobile workspace for AI waste classification, complaint reporting, and civic response.
        </Text>
      </View>

      <View style={styles.roleGrid}>
        {roleCards.map((card) => {
          const active = role === card.role;

          return (
            <Pressable
              key={card.role}
              onPress={() => setRole(card.role)}
              style={({ pressed }) => [
                styles.roleCard,
                active && {
                  borderColor: card.color,
                  backgroundColor: `${card.color}12`,
                },
                pressed && styles.rolePressed,
              ]}>
              <View style={[styles.roleIcon, { backgroundColor: `${card.color}18` }]}>
                <Ionicons color={card.color} name={card.icon} size={24} />
              </View>
              <Text style={styles.roleTitle}>{card.title}</Text>
              <Text style={styles.roleSubtitle}>{card.subtitle}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Continue as {role === 'admin' ? 'Admin' : 'Field User'}</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={AppTheme.colors.textMuted}
            style={styles.input}
            value={name}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="name@example.com"
            placeholderTextColor={AppTheme.colors.textMuted}
            style={styles.input}
            value={email}
          />
        </View>

        <PrimaryButton
          disabled={!canContinue}
          icon={<Ionicons color={AppTheme.colors.white} name="arrow-forward-outline" size={18} />}
          onPress={handleContinue}>
          Enter Dashboard
        </PrimaryButton>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    backgroundColor: '#123828',
    borderRadius: AppTheme.radius.lg,
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  heroBadge: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.primary,
    borderRadius: 999,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  heroTitle: {
    color: AppTheme.colors.white,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  roleGrid: {
    gap: 14,
  },
  roleCard: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1.5,
    gap: 10,
    padding: 18,
  },
  rolePressed: {
    opacity: 0.92,
  },
  roleIcon: {
    alignItems: 'center',
    borderRadius: 16,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  roleTitle: {
    color: AppTheme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  roleSubtitle: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  formCard: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  formTitle: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.md,
    color: AppTheme.colors.text,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
