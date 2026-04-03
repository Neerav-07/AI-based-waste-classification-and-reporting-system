import { AppTheme } from '@/constants/app-theme';
import { routes } from '@/constants/routes';
import { EmptyState } from '@/components/app/empty-state';
import { ListItem } from '@/components/app/list-item';
import { NoticeBanner } from '@/components/app/notice-banner';
import { PrimaryButton } from '@/components/app/primary-button';
import { ReportCard } from '@/components/app/report-card';
import { ScreenLayout } from '@/components/app/screen-layout';
import { SectionCard } from '@/components/app/section-card';
import { StatCard } from '@/components/app/stat-card';
import { useAppData } from '@/providers/app-data-provider';
import { useAuth } from '@/providers/auth-provider';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function AdminDashboardScreen() {
  const { user, logout, isLoading } = useAuth();
  const { backendHealth, reports, updateReportStatus } = useAppData();

  if (isLoading) {
    return <ScreenLayout />;
  }

  if (!user || user.role !== 'admin') {
    return <Redirect href={routes.login} />;
  }

  const total = reports.length;
  const pending = reports.filter((report) => report.status === 'pending').length;
  const resolved = reports.filter((report) => report.status === 'resolved').length;

  const categoryCounts = reports.reduce<Record<string, number>>((counts, report) => {
    counts[report.category] = (counts[report.category] ?? 0) + 1;
    return counts;
  }, {});

  const localityCounts = reports.reduce<Record<string, number>>((counts, report) => {
    counts[report.locality] = (counts[report.locality] ?? 0) + 1;
    return counts;
  }, {});

  const rankedCategories = Object.entries(categoryCounts).sort((left, right) => right[1] - left[1]);
  const rankedLocalities = Object.entries(localityCounts).sort((left, right) => right[1] - left[1]);
  const isProjectApiMissing = backendHealth?.ok && backendHealth.hasProjectApi === false;
  const availablePaths = (backendHealth?.availablePaths ?? ['/']).join(', ');

  return (
    <ScreenLayout>
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroTitle}>Admin Dashboard</Text>
            <Text style={styles.heroSubtitle}>Welcome back, {user.name}. Monitor complaints and response flow.</Text>
          </View>
          <PrimaryButton
            icon={<Ionicons color={AppTheme.colors.text} name="log-out-outline" size={16} />}
            onPress={async () => {
              await logout();
              router.replace(routes.login);
            }}
            variant="ghost">
            Exit
          </PrimaryButton>
        </View>

        <PrimaryButton
          icon={<Ionicons color={AppTheme.colors.white} name="list-outline" size={18} />}
          onPress={() => router.push(routes.adminReports)}>
          Open Report Management
        </PrimaryButton>
      </View>

      {isProjectApiMissing ? (
        <NoticeBanner
          message={`The connected server only exposes ${availablePaths}, so analytics and status changes here are currently based on app-local and sample data.`}
          title="Admin view is in fallback mode"
          tone="warning"
        />
      ) : null}

      <View style={styles.statsRow}>
        <StatCard
          accentColor={AppTheme.colors.info}
          icon={<Ionicons color={AppTheme.colors.info} name="albums-outline" size={20} />}
          label="Total reports"
          value={total}
        />
        <StatCard
          accentColor={AppTheme.colors.warning}
          icon={<Ionicons color={AppTheme.colors.warning} name="time-outline" size={20} />}
          label="Pending"
          value={pending}
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          accentColor={AppTheme.colors.success}
          icon={<Ionicons color={AppTheme.colors.success} name="checkmark-done-outline" size={20} />}
          label="Resolved"
          value={resolved}
        />
        <StatCard
          accentColor={AppTheme.colors.primary}
          icon={<Ionicons color={AppTheme.colors.primary} name="trending-up-outline" size={20} />}
          label="Top category"
          value={rankedCategories[0]?.[0] ?? 'N/A'}
        />
      </View>

      <SectionCard subtitle="Where complaints are concentrating" title="Locality pressure">
        {rankedLocalities.length === 0 ? (
          <EmptyState
            icon="map-outline"
            subtitle="Once reports start coming in, the most affected localities will show up here."
            title="No locality data yet"
          />
        ) : (
          rankedLocalities.slice(0, 4).map(([locality, count]) => (
            <ListItem
              key={locality}
              leading={<Ionicons color={AppTheme.colors.secondary} name="location-outline" size={18} />}
              subtitle={`${count} active complaint${count > 1 ? 's' : ''}`}
              title={locality}
              trailing={<Text style={styles.rankingValue}>#{count}</Text>}
            />
          ))
        )}
      </SectionCard>

      <SectionCard subtitle="Category mix from all fetched reports" title="Issue analytics">
        {rankedCategories.length === 0 ? (
          <EmptyState
            icon="bar-chart-outline"
            subtitle="Analytics cards will populate after reports are loaded."
            title="No category analytics"
          />
        ) : (
          rankedCategories.map(([category, count]) => {
            const width = total === 0 ? '0%' : `${Math.max(8, (count / total) * 100)}%`;

            return (
              <View key={category} style={styles.metricRow}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricLabel}>{category}</Text>
                  <Text style={styles.metricCount}>{count}</Text>
                </View>
                <View style={styles.metricTrack}>
                  <View style={[styles.metricFill, { width: width as `${number}%` }]} />
                </View>
              </View>
            );
          })
        )}
      </SectionCard>

      <SectionCard subtitle="Quick actions from the most recent complaints" title="Recent reports">
        {reports.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            subtitle="Reports will appear here after the feed is loaded."
            title="No complaints available"
          />
        ) : (
          reports.slice(0, 3).map((report) => (
            <ReportCard
              key={report.id}
              footer={
                <View style={styles.cardActions}>
                  {report.status === 'pending' ? (
                    <PrimaryButton
                      icon={<Ionicons color={AppTheme.colors.white} name="checkmark-outline" size={16} />}
                      onPress={() => updateReportStatus(report.id, 'resolved')}>
                      Mark Resolved
                    </PrimaryButton>
                  ) : (
                    <PrimaryButton
                      icon={<Ionicons color={AppTheme.colors.secondary} name="refresh-outline" size={16} />}
                      onPress={() => updateReportStatus(report.id, 'pending')}
                      variant="secondary">
                      Reopen
                    </PrimaryButton>
                  )}
                </View>
              }
              report={report}
            />
          ))
        )}
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#103728',
    borderRadius: AppTheme.radius.lg,
    gap: 16,
    padding: 20,
  },
  heroHeader: {
    gap: 14,
  },
  heroTitle: {
    color: AppTheme.colors.white,
    fontSize: 28,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rankingValue: {
    color: AppTheme.colors.secondary,
    fontSize: 14,
    fontWeight: '800',
  },
  metricRow: {
    gap: 8,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  metricCount: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  metricTrack: {
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.pill,
    height: 10,
    overflow: 'hidden',
  },
  metricFill: {
    backgroundColor: AppTheme.colors.primary,
    borderRadius: AppTheme.radius.pill,
    height: '100%',
  },
  cardActions: {
    marginTop: 4,
  },
});
