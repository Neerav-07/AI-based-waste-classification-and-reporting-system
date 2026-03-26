import { AppTheme, wasteAppearance } from '@/constants/app-theme';
import { routes } from '@/constants/routes';
import { EmptyState } from '@/components/app/empty-state';
import { ListItem } from '@/components/app/list-item';
import { NoticeBanner } from '@/components/app/notice-banner';
import { PrimaryButton } from '@/components/app/primary-button';
import { ReportCard } from '@/components/app/report-card';
import { ScreenLayout } from '@/components/app/screen-layout';
import { SectionCard } from '@/components/app/section-card';
import { useAppData } from '@/providers/app-data-provider';
import { useAuth } from '@/providers/auth-provider';
import { formatConfidence, formatDate } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const reportFilters = ['all', 'pending', 'resolved'] as const;

export default function UserHistoryScreen() {
  const { user } = useAuth();
  const { backendHealth, classificationHistory, getReportsForUser } = useAppData();
  const [activeFilter, setActiveFilter] = useState<(typeof reportFilters)[number]>('all');

  const reports = getReportsForUser(user?.email);
  const filteredReports = reports.filter((report) => {
    return activeFilter === 'all' || report.status === activeFilter;
  });
  const isProjectApiMissing = backendHealth?.ok && backendHealth.hasProjectApi === false;
  const availablePaths = (backendHealth?.availablePaths ?? ['/']).join(', ');

  return (
    <ScreenLayout>
      <View style={styles.hero}>
        <Text style={styles.title}>User History</Text>
        <Text style={styles.subtitle}>
          Track the reports you filed and the scan results generated during this session.
        </Text>
      </View>

      {isProjectApiMissing ? (
        <NoticeBanner
          message={`The backend currently exposes only ${availablePaths}, so report history and scan history are being shown from this app session rather than a server record.`}
          title="Session-based history"
          tone="info"
        />
      ) : null}

      <SectionCard subtitle="These are the complaints linked to your current login." title="My Reports">
        <View style={styles.filterRow}>
          {reportFilters.map((filter) => {
            const active = activeFilter === filter;

            return (
              <Pressable
                key={filter}
                onPress={() => setActiveFilter(filter)}
                style={[styles.filterPill, active && styles.filterPillActive]}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {filter === 'all' ? 'All' : filter === 'pending' ? 'Pending' : 'Resolved'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {filteredReports.length === 0 ? (
          <EmptyState
            icon="file-tray-outline"
            subtitle="Submit a garbage complaint from the report screen and it will show up here."
            title="No personal reports yet"
          />
        ) : (
          filteredReports.map((report) => <ReportCard key={report.id} report={report} />)
        )}

        <PrimaryButton
          icon={<Ionicons color={AppTheme.colors.white} name="add-outline" size={18} />}
          onPress={() => router.push(routes.report)}
          variant="danger">
          Create a New Report
        </PrimaryButton>
      </SectionCard>

      <SectionCard subtitle="Recent AI classifications captured during the active session." title="Recent Scans">
        {classificationHistory.length === 0 ? (
          <EmptyState
            icon="scan-outline"
            subtitle="Run a waste classification from the home tab to build your scan history."
            title="No scan history yet"
          />
        ) : (
          classificationHistory.map((result) => (
            <ListItem
              key={result.id}
              leading={
                <Ionicons
                  color={wasteAppearance[result.prediction].accent}
                  name={wasteAppearance[result.prediction].icon}
                  size={18}
                />
              }
              subtitle={`${formatDate(result.createdAt)} • ${formatConfidence(result.confidence)}`}
              title={result.data.title}
              trailing={<Ionicons color={AppTheme.colors.textMuted} name="checkmark-circle-outline" size={18} />}
            />
          ))
        )}
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 6,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: AppTheme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterPill: {
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterPillActive: {
    backgroundColor: AppTheme.colors.primary,
  },
  filterText: {
    color: AppTheme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  filterTextActive: {
    color: AppTheme.colors.white,
  },
});
