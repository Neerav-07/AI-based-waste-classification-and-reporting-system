import { wasteAppearance } from '@/constants/app-theme';
import type { ClassificationResult, WasteCategory, WasteInfo } from '@/types/app';
import { createId } from '@/utils/format';

import { requestWithCandidates } from './api';

const defaultWasteInfo: Record<WasteCategory, WasteInfo> = {
  wet: {
    title: 'Wet Waste',
    description: 'Biodegradable organic waste',
    binColor: 'GREEN',
    disposal: 'Place this in the green bin and keep it separate from dry recyclables.',
    tips: ['Drain excess liquid before disposal.', 'Consider composting kitchen scraps at home.'],
  },
  dry: {
    title: 'Dry Waste',
    description: 'Recyclable paper, plastic, metal, or glass',
    binColor: 'BLUE',
    disposal: 'Keep the item clean and dry, then send it to the dry-waste or recycling stream.',
    tips: ['Rinse containers before disposal.', 'Flatten cardboard to save space.'],
  },
  e_waste: {
    title: 'E-Waste',
    description: 'Electronic devices and accessories',
    binColor: 'SPECIAL COLLECTION',
    disposal: 'Send this to an authorized e-waste collection center instead of household bins.',
    tips: ['Remove batteries if possible.', 'Wipe personal data from devices before drop-off.'],
  },
  hazardous: {
    title: 'Hazardous Waste',
    description: 'Dangerous or toxic household material',
    binColor: 'RED',
    disposal: 'Handle with care and dispose through a hazardous-waste channel only.',
    tips: ['Avoid mixing with general household waste.', 'Keep the item in a sealed container until disposal.'],
  },
};

export function normalizeWasteCategory(value: unknown): WasteCategory {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');

  if (normalized === 'wet' || normalized === 'dry' || normalized === 'hazardous') {
    return normalized;
  }

  if (normalized === 'e_waste' || normalized === 'ewaste') {
    return 'e_waste';
  }

  return 'dry';
}

function buildWasteInfo(category: WasteCategory, payload: any): WasteInfo {
  const fallback = defaultWasteInfo[category];
  const data = payload?.data ?? {};

  return {
    title: data.title ?? fallback.title,
    description: data.description ?? fallback.description,
    binColor: data.bin_color ?? data.binColor ?? fallback.binColor,
    disposal: data.disposal ?? fallback.disposal,
    tips: Array.isArray(data.tips) && data.tips.length ? data.tips : fallback.tips,
  };
}

export async function classifyWasteImage(imageUri: string) {
  const response = await requestWithCandidates<any>(
    ['/classify', '/predict', '/classification', '/analyze'],
    (path) => {
      const formData = new FormData();

      formData.append(
        'file',
        {
          uri: imageUri,
          name: `waste-${Date.now()}.jpg`,
          type: 'image/jpeg',
        } as any
      );

      return {
        method: 'POST',
        url: path,
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };
    }
  );

  const category = normalizeWasteCategory(response?.prediction ?? response?.category);
  const metadata = wasteAppearance[category];

  return {
    id: createId('classification'),
    prediction: category,
    confidence: Number(response?.confidence ?? 0),
    data: buildWasteInfo(category, response),
    imageUri,
    createdAt: new Date().toISOString(),
    accentColor: metadata.accent,
  } as ClassificationResult & { accentColor: string };
}
