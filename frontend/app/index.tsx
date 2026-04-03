import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { AppTheme } from '@/constants/app-theme';
import { routes } from '@/constants/routes';
import { useAuth } from '@/providers/auth-provider';

export default function IndexRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: AppTheme.colors.background,
          flex: 1,
          justifyContent: 'center',
        }}>
        <ActivityIndicator color={AppTheme.colors.primary} size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href={routes.login} />;
  }

  if (user.role === 'admin') {
    return <Redirect href={routes.admin} />;
  }

  return <Redirect href={routes.tabs} />;
}
