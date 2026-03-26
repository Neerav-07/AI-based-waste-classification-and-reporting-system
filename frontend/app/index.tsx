import { Redirect } from 'expo-router';

import { routes } from '@/constants/routes';
import { useAuth } from '@/providers/auth-provider';

export default function IndexRedirect() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect href={routes.login} />;
  }

  if (user.role === 'admin') {
    return <Redirect href={routes.admin} />;
  }

  return <Redirect href={routes.tabs} />;
}
