import type { ReportDraft, ReportItem, ReportStatus } from '@/types/app';
import { createId, normalizeLocality } from '@/utils/format';

import { requestWithCandidates } from './api';

function normalizeStatus(value: unknown): ReportStatus {
  const normalized = String(value ?? 'pending').toLowerCase();
  return normalized === 'resolved' || normalized === 'solved' || normalized === 'closed'
    ? 'resolved'
    : 'pending';
}

export function normalizeReport(raw: any, fallback?: Partial<ReportDraft>): ReportItem {
  return {
    id: String(raw?.id ?? createId('report')),
    category: String(raw?.category ?? fallback?.category ?? 'General Waste'),
    description: String(raw?.description ?? fallback?.description ?? ''),
    location: String(raw?.location ?? raw?.address ?? fallback?.location ?? 'Unknown location'),
    locality: normalizeLocality(String(raw?.locality ?? fallback?.locality ?? raw?.area ?? 'General Area')),
    status: normalizeStatus(raw?.status),
    createdAt: String(raw?.created_at ?? raw?.createdAt ?? new Date().toISOString()),
    imageUri: raw?.image_url ?? raw?.imageUrl ?? raw?.image ?? fallback?.imageUri,
    reporterName: raw?.reporter_name ?? raw?.reporterName ?? fallback?.reporterName,
    reporterEmail: raw?.reporter_email ?? raw?.reporterEmail ?? fallback?.reporterEmail,
    latitude: Number(raw?.latitude ?? fallback?.latitude ?? NaN) || undefined,
    longitude: Number(raw?.longitude ?? fallback?.longitude ?? NaN) || undefined,
  };
}

export async function fetchReports() {
  const payload = await requestWithCandidates<any[] | { reports?: any[]; data?: any[] }>(
    ['/reports', '/complaints', '/issues'],
    (path) => ({
      method: 'GET',
      url: path,
    })
  );

  const list = Array.isArray(payload) ? payload : payload?.reports ?? payload?.data ?? [];
  return list.map((item) => normalizeReport(item));
}

export async function createReport(payload: ReportDraft) {
  const response = await requestWithCandidates<any>(['/reports', '/complaints', '/report'], (path) => {
    const formData = new FormData();

    if (payload.imageUri) {
      formData.append(
        'image',
        {
          uri: payload.imageUri,
          name: `report-${Date.now()}.jpg`,
          type: 'image/jpeg',
        } as any
      );
    }

    formData.append('category', payload.category);
    formData.append('description', payload.description);
    formData.append('location', payload.location);
    formData.append('locality', payload.locality);

    if (payload.reporterName) {
      formData.append('reporter_name', payload.reporterName);
    }

    if (payload.reporterEmail) {
      formData.append('reporter_email', payload.reporterEmail);
    }

    if (typeof payload.latitude === 'number') {
      formData.append('latitude', String(payload.latitude));
    }

    if (typeof payload.longitude === 'number') {
      formData.append('longitude', String(payload.longitude));
    }

    return {
      method: 'POST',
      url: path,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };
  });

  return normalizeReport(response, payload);
}

export async function updateReportStatusRemote(id: string, status: ReportStatus) {
  await requestWithCandidates<any>(
    [`/reports/${id}`, `/complaints/${id}`, `/reports/${id}/status`, `/complaints/${id}/status`],
    (path) => ({
      method: 'PATCH',
      url: path,
      data: { status },
    })
  );
}
