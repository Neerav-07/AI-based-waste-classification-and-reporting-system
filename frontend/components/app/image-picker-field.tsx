import { AppTheme } from '@/constants/app-theme';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

interface ImagePickerFieldProps {
  imageUri?: string;
  onChange: (uri: string) => void;
}

async function pickFromLibrary() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
    return result.assets[0]?.uri;
  }

  return undefined;
}

async function pickFromCamera() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    Alert.alert('Camera permission needed', 'Please allow camera access to capture a waste photo.');
    return undefined;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.8,
  });

  if (!result.canceled) {
    return result.assets[0]?.uri;
  }

  return undefined;
}

export function ImagePickerField({ imageUri, onChange }: ImagePickerFieldProps) {
  async function handleChoose() {
    if (Platform.OS === 'web') {
      const uri = await pickFromLibrary();
      if (uri) {
        onChange(uri);
      }
      return;
    }

    Alert.alert('Upload image', 'Choose how you want to add the waste photo.', [
      {
        text: 'Camera',
        onPress: async () => {
          const uri = await pickFromCamera();
          if (uri) {
            onChange(uri);
          }
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          const uri = await pickFromLibrary();
          if (uri) {
            onChange(uri);
          }
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  }

  return (
    <Pressable onPress={handleChoose} style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}>
      {imageUri ? (
        <Image contentFit="cover" source={{ uri: imageUri }} style={styles.preview} />
      ) : (
        <View style={styles.placeholder}>
          <View style={styles.iconWrap}>
            <Ionicons color={AppTheme.colors.primary} name="camera-outline" size={26} />
          </View>
          <Text style={styles.title}>Add waste image</Text>
          <Text style={styles.subtitle}>Tap to open your gallery or camera</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: AppTheme.colors.surfaceMuted,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.lg,
    borderStyle: 'dashed',
    borderWidth: 1,
    minHeight: 220,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.92,
  },
  preview: {
    height: 220,
    width: '100%',
  },
  placeholder: {
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    minHeight: 220,
    paddingHorizontal: 20,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.primarySoft,
    borderRadius: 999,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  title: {
    color: AppTheme.colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});
