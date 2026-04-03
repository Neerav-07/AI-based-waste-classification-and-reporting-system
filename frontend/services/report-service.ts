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

// Add `role` parameter to fetch the right endpoints based on the logged-in user
export async function fetchReports(role: 'user' | 'admin' = 'user') {
  const targetPath = role === 'admin' ? '/admin/reports' : '/reports/my';
  
  const payload = await requestWithCandidates<any[] | { reports?: any[]; data?: any[] }>(
    [targetPath, '/reports'], // Prioritize the exact FastAPI route
    (path) => ({
      method: 'GET',
      url: path,
    })
  );

  const list = Array.isArray(payload) ? payload : payload?.reports ?? payload?.data ?? [];
  return list.map((item) => normalizeReport(item));
}

export async function createReport(payload: ReportDraft) {
  const response = await requestWithCandidates<any>(['/reports/', '/reports'], (path) => {
    const formData = new FormData();

    if (payload.imageUri) {
      formData.append(
        'file', // Changed from 'image' to 'file' to match standard FastAPI UploadFile
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
    [`/admin/reports/${id}/status`], // Exactly matches your FastAPI admin router
    (path) => ({
      method: 'PATCH',
      url: path,
      data: { status },
    })
  );
}

