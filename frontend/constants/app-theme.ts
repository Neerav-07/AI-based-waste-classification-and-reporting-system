import type { ReportStatus, WasteCategory } from '@/types/app';

export const AppTheme = {
  colors: {
    background: '#F4FBF6',
    backgroundAlt: '#EAF5FF',
    surface: '#FFFFFF',
    surfaceMuted: '#F1F7F3',
    text: '#15392D',
    textMuted: '#5E766D',
    border: '#D7E7DD',
    primary: '#1F8A5B',
    primarySoft: '#E0F4E8',
    secondary: '#0C7A8C',
    secondarySoft: '#DFF4F7',
    danger: '#C5493D',
    dangerSoft: '#FBE5E1',
    warning: '#D88D16',
    warningSoft: '#FFF3D8',
    success: '#238B53',
    successSoft: '#E4F5E9',
    info: '#2F6FDB',
    infoSoft: '#E6EFFF',
    white: '#FFFFFF',
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 24,
    pill: 999,
  },
};

export const wasteAppearance: Record<
  WasteCategory,
  { title: string; accent: string; soft: string; icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap }
> = {
  wet: {
    title: 'Wet Waste',
    accent: '#238B53',
    soft: '#E4F5E9',
    icon: 'water-outline',
  },
  dry: {
    title: 'Dry Waste',
    accent: '#2F6FDB',
    soft: '#E6EFFF',
    icon: 'leaf-outline',
  },
  e_waste: {
    title: 'E-Waste',
    accent: '#D88D16',
    soft: '#FFF3D8',
    icon: 'hardware-chip-outline',
  },
  hazardous: {
    title: 'Hazardous Waste',
    accent: '#C5493D',
    soft: '#FBE5E1',
    icon: 'warning-outline',
  },
};

export function getStatusAppearance(status: ReportStatus) {
  if (status === 'resolved') {
    return {
      backgroundColor: AppTheme.colors.successSoft,
      color: AppTheme.colors.success,
      label: 'Resolved',
    };
  }

  return {
    backgroundColor: AppTheme.colors.warningSoft,
    color: AppTheme.colors.warning,
    label: 'Pending',
  };
}
