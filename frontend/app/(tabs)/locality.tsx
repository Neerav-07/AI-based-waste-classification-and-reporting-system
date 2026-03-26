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
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const statusFilters = ['all', 'pending', 'resolved'] as const;

export default function LocalityReportsScreen() {
  const { backendHealth, reports, refreshReports } = useAppData();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<(typeof statusFilters)[number]>('all');
  const isProjectApiMissing = backendHealth?.ok && backendHealth.hasProjectApi === false;
  const availablePaths = (backendHealth?.availablePaths ?? ['/']).join(', ');

  const filteredReports = reports.filter((report) => {
    const matchesStatus = activeFilter === 'all' || report.status === activeFilter;
    const needle = query.trim().toLowerCase();
    const haystack = `${report.locality} ${report.location} ${report.category} ${report.description}`.toLowerCase();

    return matchesStatus && (needle.length === 0 || haystack.includes(needle));
  });

  const localityRanking = filteredReports.reduce<Record<string, number>>((counts, report) => {
    counts[report.locality] = (counts[report.locality] ?? 0) + 1;
    return counts;
  }, {});

  const rankedLocalities = Object.entries(localityRanking).sort((left, right) => right[1] - left[1]);

  const pendingCount = filteredReports.filter((report) => report.status === 'pending').length;
  const resolvedCount = filteredReports.filter((report) => report.status === 'resolved').length;

  return (
    <ScreenLayout>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.title}>Locality Reports</Text>
          <Text style={styles.subtitle}>See how waste complaints are distributed across nearby areas.</Text>
        </View>
        <PrimaryButton
          icon={<Ionicons color={AppTheme.colors.secondary} name="refresh-outline" size={16} />}
          onPress={() => void refreshReports()}
          variant="secondary">
          Refresh
        </PrimaryButton>
      </View>

      {isProjectApiMissing ? (
        <NoticeBanner
          message={`The live backend currently exposes only ${availablePaths}, so this feed is showing sample and app-local report data for now.`}
          title="Using fallback report data"
          tone="info"
        />
      ) : null}

      <TextInput
        onChangeText={setQuery}
        placeholder="Search by locality, landmark, or issue type"
        placeholderTextColor={AppTheme.colors.textMuted}
        style={styles.searchInput}
        value={query}
      />

      <View style={styles.filterRow}>
        {statusFilters.map((filter) => {
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

      <View style={styles.statsRow}>
        <StatCard
          accentColor={AppTheme.colors.info}
          icon={<Ionicons color={AppTheme.colors.info} name="albums-outline" size={20} />}
          label="Visible reports"
          value={filteredReports.length}
        />
        <StatCard
          accentColor={AppTheme.colors.warning}
          icon={<Ionicons color={AppTheme.colors.warning} name="time-outline" size={20} />}
          label="Pending"
          value={pendingCount}
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          accentColor={AppTheme.colors.success}
          icon={<Ionicons color={AppTheme.colors.success} name="checkmark-done-outline" size={20} />}
          label="Resolved"
          value={resolvedCount}
        />
        <StatCard
          accentColor={AppTheme.colors.primary}
          icon={<Ionicons color={AppTheme.colors.primary} name="trending-up-outline" size={20} />}
          label="Top locality"
          value={rankedLocalities[0]?.[0] ?? 'N/A'}
        />
      </View>

      <SectionCard subtitle="The most frequently reported areas in the current view." title="Locality Ranking">
        {rankedLocalities.length === 0 ? (
          <EmptyState
            icon="map-outline"
            subtitle="Try changing the search text or filter to surface active localities."
            title="No localities found"
          />
        ) : (
          rankedLocalities.map(([locality, count]) => (
            <ListItem
              key={locality}
              leading={<Ionicons color={AppTheme.colors.secondary} name="pin-outline" size={18} />}
              subtitle={`${count} complaint${count > 1 ? 's' : ''}`}
              title={locality}
              trailing={<Text style={styles.rankValue}>#{count}</Text>}
            />
          ))
        )}
      </SectionCard>

      <SectionCard subtitle="Tap report to move into the reporting workflow with your own entry." title="Public Feed">
        <PrimaryButton
          icon={<Ionicons color={AppTheme.colors.white} name="add-circle-outline" size={18} />}
          onPress={() => router.push(routes.report)}
          variant="danger">
          Report New Issue
        </PrimaryButton>

        {filteredReports.length === 0 ? (
          <EmptyState
            icon="search-outline"
            subtitle="No complaint matches the current search or status filter."
            title="Nothing to show"
          />
        ) : (
          filteredReports.map((report) => <ReportCard key={report.id} report={report} />)
        )}
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 14,
  },
  heroText: {
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
  filterText: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  filterTextActive: {
    color: AppTheme.colors.white,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rankValue: {
    color: AppTheme.colors.secondary,
    fontSize: 14,
    fontWeight: '800',
  },
});
