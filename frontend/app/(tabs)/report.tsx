import { AppTheme } from '@/constants/app-theme';
import { routes } from '@/constants/routes';
import { EmptyState } from '@/components/app/empty-state';
import { ImagePickerField } from '@/components/app/image-picker-field';
import { NoticeBanner } from '@/components/app/notice-banner';
import { PrimaryButton } from '@/components/app/primary-button';
import { ScreenLayout } from '@/components/app/screen-layout';
import { SectionCard } from '@/components/app/section-card';
import { useAppData } from '@/providers/app-data-provider';
import { useAuth } from '@/providers/auth-provider';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const issueCategories = ['Overflowing Bin', 'Illegal Dumping', 'Street Litter', 'Drain Blockage', 'Hazardous Waste'];

export default function ReportIssueScreen() {
  const { user } = useAuth();
  const { backendHealth, classificationHistory, submitReport } = useAppData();
  const [imageUri, setImageUri] = useState<string>();
  const [locationValue, setLocationValue] = useState('');
  const [locality, setLocality] = useState('');
  const [category, setCategory] = useState(issueCategories[0]);
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState('');

  useEffect(() => {
    if (!imageUri && classificationHistory[0]?.imageUri) {
      setImageUri(classificationHistory[0].imageUri);
    }
  }, [classificationHistory, imageUri]);

  const canSubmit =
    Boolean(imageUri) &&
    locationValue.trim().length > 0 &&
    locality.trim().length > 0 &&
    description.trim().length > 0 &&
    category.trim().length > 0;
  const isProjectApiMissing = backendHealth?.ok && backendHealth.hasProjectApi === false;
  const availablePaths = (backendHealth?.availablePaths ?? ['/']).join(', ');

  async function handleFetchLocation() {
    setIsFetchingLocation(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Location permission needed', 'Please allow location access or enter the location manually.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
      setLocationValue(`${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);
      if (!locality) {
        setLocality('Current location');
      }
    } catch (error) {
      Alert.alert('Location unavailable', error instanceof Error ? error.message : 'Unable to fetch location.');
    } finally {
      setIsFetchingLocation(false);
    }
  }

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);

    try {
      const report = await submitReport({
        category,
        description,
        imageUri,
        locality,
        location: locationValue,
        reporterEmail: user?.email,
        reporterName: user?.name,
        latitude,
        longitude,
      });

      setSubmittedId(report.id);
      setDescription('');
      setLocationValue('');
      setLocality('');
      setLatitude(undefined);
      setLongitude(undefined);
      setImageUri(undefined);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedId) {
    return (
      <ScreenLayout>
        <SectionCard
          subtitle={
            isProjectApiMissing
              ? 'The UI captured your report, but the backend still needs real report endpoints.'
              : 'Your complaint has been sent through the API layer and added to the queue.'
          }
          title={isProjectApiMissing ? 'Report Saved Locally' : 'Report Submitted'}>
          <View style={styles.successWrap}>
            <View style={styles.successBadge}>
              <Ionicons color={AppTheme.colors.success} name="checkmark-done-outline" size={28} />
            </View>
            <Text style={styles.successTitle}>
              {isProjectApiMissing ? 'Issue saved in app state' : 'Issue reported successfully'}
            </Text>
            <Text style={styles.successText}>
              {isProjectApiMissing
                ? `Report ID "${submittedId}" is available inside the app for now. The connected backend only exposes ${availablePaths}, so this entry has not been persisted on the server yet.`
                : `Report ID "${submittedId}" is now available in your history and the admin dashboard queue.`}
            </Text>
            <PrimaryButton
              icon={<Ionicons color={AppTheme.colors.white} name="time-outline" size={18} />}
              onPress={() => router.replace(routes.history)}>
              View My History
            </PrimaryButton>
            <PrimaryButton
              icon={<Ionicons color={AppTheme.colors.secondary} name="add-outline" size={18} />}
              onPress={() => setSubmittedId('')}
              variant="secondary">
              Create Another Report
            </PrimaryButton>
          </View>
        </SectionCard>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <View style={styles.headerBlock}>
        <Text style={styles.screenTitle}>Report Issue</Text>
        <Text style={styles.screenSubtitle}>Capture the scene, tag the location, and send a structured complaint.</Text>
      </View>

      {isProjectApiMissing ? (
        <NoticeBanner
          message={`The server is connected, but only these paths exist right now: ${availablePaths}. Reports created here will stay inside app state until backend report routes are added.`}
          title="Backend route gap"
          tone="warning"
        />
      ) : null}

      <SectionCard subtitle="Attach a clear photo of the waste or civic issue." title="Image">
        <ImagePickerField imageUri={imageUri} onChange={setImageUri} />
      </SectionCard>

      <SectionCard subtitle="Use GPS or type the area manually." title="Location">
        <PrimaryButton
          icon={<Ionicons color={AppTheme.colors.secondary} name="navigate-outline" size={18} />}
          loading={isFetchingLocation}
          onPress={handleFetchLocation}
          variant="secondary">
          Use Current Coordinates
        </PrimaryButton>

        <TextInput
          onChangeText={setLocationValue}
          placeholder="Street, landmark, or coordinates"
          placeholderTextColor={AppTheme.colors.textMuted}
          style={styles.input}
          value={locationValue}
        />

        <TextInput
          onChangeText={setLocality}
          placeholder="Locality / ward / sector"
          placeholderTextColor={AppTheme.colors.textMuted}
          style={styles.input}
          value={locality}
        />
      </SectionCard>

      <SectionCard subtitle="Choose the closest issue type." title="Category">
        <View style={styles.categoryWrap}>
          {issueCategories.map((item) => {
            const active = category === item;

            return (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                style={[styles.categoryPill, active && styles.categoryPillActive]}>
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard subtitle="Describe what the response team should know before dispatch." title="Description">
        <TextInput
          multiline
          onChangeText={setDescription}
          placeholder="Add details about the waste pile, blockage, smell, safety risk, or urgency."
          placeholderTextColor={AppTheme.colors.textMuted}
          style={styles.textArea}
          textAlignVertical="top"
          value={description}
        />
      </SectionCard>

      <PrimaryButton
        disabled={!canSubmit}
        icon={<Ionicons color={AppTheme.colors.white} name="send-outline" size={18} />}
        loading={isSubmitting}
        onPress={handleSubmit}>
        Submit Report
      </PrimaryButton>

      {!imageUri ? (
        <EmptyState
          icon="camera-outline"
          subtitle="You can arrive here from the classification result card and the captured image will prefill automatically."
          title="Tip: classify first, then report"
        />
      ) : null}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    gap: 6,
  },
  screenTitle: {
    color: AppTheme.colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  screenSubtitle: {
    color: AppTheme.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.md,
    color: AppTheme.colors.text,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryPill: {
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  categoryPillActive: {
    backgroundColor: AppTheme.colors.primary,
  },
  categoryText: {
    color: AppTheme.colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  categoryTextActive: {
    color: AppTheme.colors.white,
  },
  textArea: {
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderRadius: AppTheme.radius.md,
    color: AppTheme.colors.text,
    fontSize: 15,
    minHeight: 130,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  successWrap: {
    alignItems: 'center',
    gap: 14,
  },
  successBadge: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.successSoft,
    borderRadius: 999,
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  successTitle: {
    color: AppTheme.colors.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  successText: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
});
