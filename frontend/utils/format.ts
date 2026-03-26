import type { WasteCategory } from '@/types/app';

export function formatConfidence(confidence: number) {
  const percentage = confidence <= 1 ? confidence * 100 : confidence;
  return `${Math.round(percentage)}%`;
}

export function confidenceToProgress(confidence: number) {
  const percentage = confidence <= 1 ? confidence * 100 : confidence;
  return Math.min(100, Math.max(0, percentage));
}

export function formatDate(value?: string) {
  if (!value) {
    return 'Just now';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function normalizeLocality(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function labelizeCategory(value: WasteCategory | string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
