import type { Href } from 'expo-router';

export const routes = {
  login: '/login' as Href,
  signup: '/signup' as Href,
  tabs: '/(tabs)' as Href,
  admin: '/admin' as Href,
  adminReports: '/admin/reports' as Href,
  report: '/(tabs)/report' as Href,
  locality: '/(tabs)/locality' as Href,
  history: '/(tabs)/history' as Href,
};
