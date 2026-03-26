import { checkBackendHealth, getApiErrorMessage } from '@/services/api';
import { createReport, fetchReports, updateReportStatusRemote } from '@/services/report-service';
import { classifyWasteImage } from '@/services/waste-service';
import type { BackendHealth, ClassificationResult, ReportDraft, ReportItem, ReportStatus } from '@/types/app';
import { createId } from '@/utils/format';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

interface AppDataContextValue {
  backendHealth: BackendHealth | null;
  reports: ReportItem[];
  classificationHistory: ClassificationResult[];
  loadingReports: boolean;
  refreshReports: () => Promise<void>;
  submitReport: (payload: ReportDraft) => Promise<ReportItem>;
  updateReportStatus: (id: string, status: ReportStatus) => Promise<void>;
  classifyWaste: (imageUri: string) => Promise<ClassificationResult>;
  getReportsForUser: (email?: string) => ReportItem[];
}

const sampleReports: ReportItem[] = [
  {
    id: 'sample-1',
    category: 'Overflowing Bin',
    description: 'The roadside bin has been overflowing since yesterday evening.',
    location: 'MG Road Bus Stop',
    locality: 'Sector 4',
    status: 'pending',
    createdAt: '2026-03-24T09:10:00.000Z',
    reporterName: 'Community Volunteer',
    reporterEmail: 'community@example.com',
    imageUri: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'sample-2',
    category: 'Illegal Dumping',
    description: 'Construction rubble has been dumped beside the lane entrance.',
    location: 'Park Street Corner',
    locality: 'Sector 2',
    status: 'resolved',
    createdAt: '2026-03-22T12:45:00.000Z',
    reporterName: 'Resident Association',
    reporterEmail: 'ra@example.com',
    imageUri: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'sample-3',
    category: 'Street Litter',
    description: 'Plastic packaging is scattered near the vegetable market.',
    location: 'Central Market',
    locality: 'Market Area',
    status: 'pending',
    createdAt: '2026-03-20T07:25:00.000Z',
    reporterName: 'Market Watch',
    reporterEmail: 'market@example.com',
    imageUri: 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=900&q=80',
  },
];

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

function mergeReports(incoming: ReportItem[], existing: ReportItem[]) {
  const map = new Map<string, ReportItem>();

  [...incoming, ...existing].forEach((report) => {
    map.set(report.id, report);
  });

  return Array.from(map.values()).sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export function AppDataProvider({ children }: PropsWithChildren) {
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);
  const [reports, setReports] = useState<ReportItem[]>(sampleReports);
  const [classificationHistory, setClassificationHistory] = useState<ClassificationResult[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  async function refreshReports() {
    setLoadingReports(true);

    try {
      const remoteReports = await fetchReports();

      if (remoteReports.length > 0) {
        setReports((current) => mergeReports(remoteReports, current));
      }
    } catch {
      setReports((current) => mergeReports(current, sampleReports));
    } finally {
      setLoadingReports(false);
    }
  }

  async function submitReport(payload: ReportDraft) {
    const fallbackReport: ReportItem = {
      id: createId('report'),
      category: payload.category,
      description: payload.description,
      location: payload.location,
      locality: payload.locality,
      status: 'pending',
      createdAt: new Date().toISOString(),
      imageUri: payload.imageUri,
      reporterName: payload.reporterName,
      reporterEmail: payload.reporterEmail,
      latitude: payload.latitude,
      longitude: payload.longitude,
    };

    try {
      const remoteReport = await createReport(payload);
      const nextReport = {
        ...fallbackReport,
        ...remoteReport,
      };

      setReports((current) => [nextReport, ...current.filter((report) => report.id !== nextReport.id)]);
      return nextReport;
    } catch {
      setReports((current) => [fallbackReport, ...current]);
      return fallbackReport;
    }
  }

  async function updateReportStatus(id: string, status: ReportStatus) {
    setReports((current) =>
      current.map((report) => (report.id === id ? { ...report, status } : report))
    );

    try {
      await updateReportStatusRemote(id, status);
    } catch {
      // Keep the optimistic update so the dashboard stays usable even if the backend path differs.
    }
  }

  async function classifyWaste(imageUri: string) {
    const result = await classifyWasteImage(imageUri);
    setClassificationHistory((current) => [result, ...current].slice(0, 12));
    return result;
  }

  function getReportsForUser(email?: string) {
    if (!email) {
      return [];
    }

    return reports.filter((report) => report.reporterEmail?.toLowerCase() === email.toLowerCase());
  }

  useEffect(() => {
    void refreshReports();

    void (async () => {
      try {
        const response = await checkBackendHealth();
        setBackendHealth({
          ok: true,
          message: response.message ?? 'Backend connected',
          checkedAt: new Date().toISOString(),
          availablePaths: response.availablePaths,
          hasProjectApi: response.hasProjectApi,
        });
      } catch (error) {
        setBackendHealth({
          ok: false,
          message: getApiErrorMessage(error),
          checkedAt: new Date().toISOString(),
        });
      }
    })();
  }, []);

  const value: AppDataContextValue = {
    backendHealth,
    reports,
    classificationHistory,
    loadingReports,
    refreshReports,
    submitReport,
    updateReportStatus,
    classifyWaste,
    getReportsForUser,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error('useAppData must be used inside AppDataProvider.');
  }

  return context;
}
