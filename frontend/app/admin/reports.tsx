import { AppTheme } from '@/constants/app-theme';
import { routes } from '@/constants/routes';
import { EmptyState } from '@/components/app/empty-state';
import { NoticeBanner } from '@/components/app/notice-banner';
import { PrimaryButton } from '@/components/app/primary-button';
import { ReportCard } from '@/components/app/report-card';
import { ScreenLayout } from '@/components/app/screen-layout';
import { useAppData } from '@/providers/app-data-provider';
import { useAuth } from '@/providers/auth-provider';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const filters = ['all', 'pending', 'resolved'] as const;

export default function AdminReportsScreen() {
  const { user } = useAuth();
  const { backendHealth, reports, refreshReports, updateReportStatus } = useAppData();
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>('all');
  const [query, setQuery] = useState('');

  if (!user || user.role !== 'admin') {
    return <Redirect href={routes.login} />;
  }

  const filteredReports = reports.filter((report) => {
    const matchesStatus = activeFilter === 'all' || report.status === activeFilter;
    const needle = query.trim().toLowerCase();
    const haystack = `${report.category} ${report.location} ${report.locality} ${report.description}`.toLowerCase();

    return matchesStatus && (needle.length === 0 || haystack.includes(needle));
  });
  const isProjectApiMissing = backendHealth?.ok && backendHealth.hasProjectApi === false;
  const availablePaths = (backendHealth?.availablePaths ?? ['/']).join(', ');

  return (
    <ScreenLayout>
      <View style={styles.headerRow}>
        <PrimaryButton
          icon={<Ionicons color={AppTheme.colors.text} name="arrow-back-outline" size={16} />}
          onPress={() => router.back()}
          variant="ghost">
          Back
        </PrimaryButton>
        <PrimaryButton
          icon={<Ionicons color={AppTheme.colors.secondary} name="refresh-outline" size={16} />}
          onPress={() => void refreshReports()}
          variant="secondary">
          Refresh
        </PrimaryButton>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Complaint Management</Text>
        <Text style={styles.heroSubtitle}>Filter, inspect, resolve, and reopen issues from one queue.</Text>
      </View>

      {isProjectApiMissing ? (
        <NoticeBanner
          message={`The server is reachable but only exposes ${availablePaths}. Refresh, resolve, and reopen actions here are staying inside app state until backend management routes exist.`}
          title="Queue is not backed by server endpoints yet"
          tone="warning"
        />
      ) : null}

      <TextInput
        onChangeText={setQuery}
        placeholder="Search by locality, location, or issue type"
        placeholderTextColor={AppTheme.colors.textMuted}
        style={styles.searchInput}
        value={query}
      />

      <View style={styles.filterRow}>
        {filters.map((filter) => {
          const active = activeFilter === filter;

          return (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[styles.filterPill, active && styles.filterPillActive]}>
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                {filter === 'all' ? 'All' : filter === 'pending' ? 'Pending' : 'Resolved'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filteredReports.length === 0 ? (
        <EmptyState
          icon="search-outline"
          subtitle="Try adjusting the search text or status filter."
          title="No reports match this view"
        />
      ) : (
        filteredReports.map((report) => (
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
                    Reopen Issue
                  </PrimaryButton>
                )}
              </View>
            }
            report={report}
          />
        ))
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hero: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  heroTitle: {
    color: AppTheme.colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  searchInput: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.md,
    borderWidth: 1,
    color: AppTheme.colors.text,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterPill: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterPillActive: {
    backgroundColor: AppTheme.colors.primary,
    borderColor: AppTheme.colors.primary,
  },
  filterLabel: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  filterLabelActive: {
    color: AppTheme.colors.white,
  },
  cardActions: {
    marginTop: 4,
  },
});
