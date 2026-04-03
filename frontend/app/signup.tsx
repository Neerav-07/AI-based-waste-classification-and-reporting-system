import { AppTheme } from '@/constants/app-theme';
import { routes } from '@/constants/routes';
import { PrimaryButton } from '@/components/app/primary-button';
import { ScreenLayout } from '@/components/app/screen-layout';
import { useAuth } from '@/providers/auth-provider';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native';

export default function SignupScreen() {
  const { signup, isLoading, user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const canContinue = name.trim().length > 1 && email.trim().length > 0 && password.trim().length > 0;

  async function handleSignup() {
    if (!canContinue) return;

    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const authenticatedUser = await signup({ name, email, password });
      router.replace(authenticatedUser.role === 'admin' ? routes.admin : routes.tabs);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unable to create your account right now.';
      setErrorMessage(message);
      Alert.alert('Signup Failed', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <ScreenLayout>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={AppTheme.colors.primary} />
          <Text style={styles.loadingText}>Preparing your account...</Text>
        </View>
      </ScreenLayout>
    );
  }

  if (user) {
    return <Redirect href={user.role === 'admin' ? routes.admin : routes.tabs} />;
  }

  return (
    <ScreenLayout>
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <Ionicons color={AppTheme.colors.white} name="person-add-outline" size={28} />
        </View>
        <Text style={styles.heroTitle}>Create Your Account</Text>
        <Text style={styles.heroSubtitle}>
          Sign up as a field user to classify waste, submit reports, and track your activity.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Get started</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full name</Text>
          <TextInput
            onChangeText={setName}
            placeholder="Your name"
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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            secureTextEntry
            onChangeText={setPassword}
            placeholder="Create a password"
            placeholderTextColor={AppTheme.colors.textMuted}
            style={styles.input}
            value={password}
          />
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {isSubmitting ? (
          <ActivityIndicator size="large" color={AppTheme.colors.primary} style={{ marginTop: 10 }} />
        ) : (
          <PrimaryButton
            disabled={!canContinue}
            icon={<Ionicons color={AppTheme.colors.white} name="checkmark-circle-outline" size={18} />}
            onPress={handleSignup}>
            Create Account
          </PrimaryButton>
        )}

        <Text onPress={() => router.replace(routes.login)} style={styles.helperText}>
          Already have an account? Sign in
        </Text>
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
  errorText: {
    color: AppTheme.colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  helperText: {
    color: AppTheme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  loadingState: {
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
    minHeight: 240,
  },
  loadingText: {
    color: AppTheme.colors.textMuted,
    fontSize: 15,
  },
});
