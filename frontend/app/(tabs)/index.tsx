import { AppTheme, wasteAppearance } from '@/constants/app-theme';
import { routes } from '@/constants/routes';
import { DisposalCard } from '@/components/app/disposal-card';
import { EmptyState } from '@/components/app/empty-state';
import { ImagePickerField } from '@/components/app/image-picker-field';
import { ListItem } from '@/components/app/list-item';
import { PrimaryButton } from '@/components/app/primary-button';
import { ResultCard } from '@/components/app/result-card';
import { ScreenLayout } from '@/components/app/screen-layout';
import { SectionCard } from '@/components/app/section-card';
import { TipsCard } from '@/components/app/tips-card';
import { useAppData } from '@/providers/app-data-provider';
import { useAuth } from '@/providers/auth-provider';
import { formatDate, formatConfidence } from '@/utils/format';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { backendHealth, classificationHistory, classifyWaste } = useAppData();
  const [imageUri, setImageUri] = useState<string>();
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [isClassifying, setIsClassifying] = useState(false);
  const [error, setError] = useState('');

  const activeResult = classificationHistory[selectedResultIndex];

  async function handleClassify() {
    if (!imageUri) {
      return;
    }

    setError('');
    setIsClassifying(true);

    try {
      await classifyWaste(imageUri);
      setSelectedResultIndex(0);
    } catch (classificationError) {
      setError(
        classificationError instanceof Error
          ? classificationError.message
          : 'Unable to classify the image. Please verify the backend route and try again.'
      );
    } finally {
      setIsClassifying(false);
    }
  }

  function handleLogout() {
    logout();
    router.replace(routes.login);
  }

  return (
    <ScreenLayout>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>HomeScreen</Text>
          <Text style={styles.title}>Waste Classification</Text>
          <Text style={styles.subtitle}>Welcome {user?.name ?? 'there'}, scan an item and get disposal guidance.</Text>
        </View>

        <View style={styles.headerActions}>
          {user?.role === 'admin' ? (
            <PrimaryButton
              icon={<Ionicons color={AppTheme.colors.secondary} name="grid-outline" size={16} />}
              onPress={() => router.push(routes.admin)}
              variant="secondary">
              Admin
            </PrimaryButton>
          ) : null}
          <PrimaryButton
            icon={<Ionicons color={AppTheme.colors.text} name="log-out-outline" size={16} />}
            onPress={handleLogout}
            variant="ghost">
            Exit
          </PrimaryButton>
        </View>
      </View>

      <View style={[styles.healthBanner, backendHealth?.ok ? styles.healthOnline : styles.healthOffline]}>
        <Ionicons
          color={backendHealth?.ok ? AppTheme.colors.success : AppTheme.colors.danger}
          name={backendHealth?.ok ? 'checkmark-circle-outline' : 'cloud-offline-outline'}
          size={20}
        />
        <Text style={styles.healthText}>{backendHealth?.message ?? 'Checking backend status...'}</Text>
      </View>

      {backendHealth?.ok && backendHealth.hasProjectApi === false ? (
        <View style={styles.warningBanner}>
          <Ionicons color={AppTheme.colors.warning} name="warning-outline" size={20} />
          <Text style={styles.warningText}>
            Connected server paths: {(backendHealth.availablePaths ?? ['/']).join(', ')}. Waste analysis will stay blocked
            until a real classification endpoint is added.
          </Text>
        </View>
      ) : null}

      <SectionCard subtitle="Upload one waste item photo and let the AI predict its type." title="Capture">
        <ImagePickerField imageUri={imageUri} onChange={setImageUri} />
        <PrimaryButton
          disabled={!imageUri}
          icon={<Ionicons color={AppTheme.colors.white} name="sparkles-outline" size={18} />}
          loading={isClassifying}
          onPress={handleClassify}>
          Analyze Waste
        </PrimaryButton>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </SectionCard>

      <SectionCard subtitle="Core segregation categories from the Figma design system." title="Category Guide">
        <View style={styles.categoryGrid}>
          {Object.entries(wasteAppearance).map(([key, appearance]) => (
            <View key={key} style={[styles.categoryChip, { backgroundColor: appearance.soft }]}>
              <Ionicons color={appearance.accent} name={appearance.icon} size={18} />
              <Text style={[styles.categoryLabel, { color: appearance.accent }]}>{appearance.title}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      {activeResult ? (
        <>
          <ResultCard result={activeResult} />
          <DisposalCard instructions={activeResult.data.disposal} />
          <TipsCard tips={activeResult.data.tips} />

          <PrimaryButton
            icon={<Ionicons color={AppTheme.colors.white} name="send-outline" size={18} />}
            onPress={() => router.push(routes.report)}
            variant="danger">
            Report Related Garbage Issue
          </PrimaryButton>
        </>
      ) : (
        <EmptyState
          icon="scan-outline"
          subtitle="Pick a waste image first. The classification result card, disposal card, and tips card will appear here."
          title="No scan result yet"
        />
      )}

      <SectionCard subtitle="Recent AI responses and quick navigation shortcuts." title="Workflow">
        <ListItem
          leading={<Ionicons color={AppTheme.colors.secondary} name="alert-circle-outline" size={18} />}
          onPress={() => router.push(routes.report)}
          subtitle="Create a garbage issue report with image, location, and description."
          title="Go to reporting"
        />
        <ListItem
          leading={<Ionicons color={AppTheme.colors.info} name="map-outline" size={18} />}
          onPress={() => router.push(routes.locality)}
          subtitle="Browse area-level complaints and hotspots."
          title="Open locality reports"
        />
        <ListItem
          leading={<Ionicons color={AppTheme.colors.primary} name="time-outline" size={18} />}
          onPress={() => router.push(routes.history)}
          subtitle="Review your report activity and recent scans."
          title="View history"
        />
      </SectionCard>

      <SectionCard subtitle="Most recent classification attempts in this session." title="Recent scans">
        {classificationHistory.length === 0 ? (
          <EmptyState
            icon="hourglass-outline"
            subtitle="Your last few AI classifications will appear here for quick review."
            title="No scan history yet"
          />
        ) : (
          classificationHistory.map((item, index) => (
            <ListItem
              key={item.id}
              leading={
                <Ionicons
                  color={wasteAppearance[item.prediction].accent}
                  name={wasteAppearance[item.prediction].icon}
                  size={18}
                />
              }
              onPress={() => setSelectedResultIndex(index)}
              subtitle={`${formatDate(item.createdAt)} • ${formatConfidence(item.confidence)}`}
              title={item.data.title}
              trailing={<Ionicons color={AppTheme.colors.textMuted} name="chevron-forward-outline" size={16} />}
            />
          ))
        )}
      </SectionCard>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    gap: 14,
  },
  headerText: {
    gap: 6,
  },
  eyebrow: {
    color: AppTheme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
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
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  healthBanner: {
    alignItems: 'center',
    borderRadius: AppTheme.radius.md,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  healthOnline: {
    backgroundColor: AppTheme.colors.successSoft,
  },
  healthOffline: {
    backgroundColor: AppTheme.colors.dangerSoft,
  },
  healthText: {
    color: AppTheme.colors.text,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  warningBanner: {
    alignItems: 'flex-start',
    backgroundColor: AppTheme.colors.warningSoft,
    borderRadius: AppTheme.radius.md,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  warningText: {
    color: AppTheme.colors.text,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: AppTheme.colors.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    alignItems: 'center',
    borderRadius: AppTheme.radius.md,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
});
