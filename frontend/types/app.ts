export type UserRole = 'user' | 'admin';

export type WasteCategory = 'dry' | 'wet' | 'e_waste' | 'hazardous';

export type ReportStatus = 'pending' | 'resolved';

export interface AuthUser {
  name: string;
  email: string;
  role: UserRole;
}

export interface WasteInfo {
  title: string;
  description: string;
  binColor: string;
  disposal: string;
  tips: string[];
}

export interface ClassificationResult {
  id: string;
  prediction: WasteCategory;
  confidence: number;
  data: WasteInfo;
  imageUri: string;
  createdAt: string;
}

export interface ReportItem {
  id: string;
  category: string;
  description: string;
  location: string;
  locality: string;
  status: ReportStatus;
  createdAt: string;
  imageUri?: string;
  reporterName?: string;
  reporterEmail?: string;
  latitude?: number;
  longitude?: number;
}

export interface ReportDraft {
  category: string;
  description: string;
  location: string;
  locality: string;
  imageUri?: string;
  reporterName?: string;
  reporterEmail?: string;
  latitude?: number;
  longitude?: number;
}

export interface BackendHealth {
  ok: boolean;
  message: string;
  checkedAt: string;
  availablePaths?: string[];
  hasProjectApi?: boolean;
}
