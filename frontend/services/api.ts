import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store'; // Added for JWT storage
import { Platform } from 'react-native';

function extractHost(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/^[a-z]+:\/\//i, '');
  return normalized.split(':')[0] || null;
}

function resolveExpoHost() {
  const expoConfigHost = extractHost((Constants.expoConfig as { hostUri?: string } | null)?.hostUri);
  if (expoConfigHost) {
    return expoConfigHost;
  }

  const expoGoHost = extractHost((Constants as any)?.expoGoConfig?.debuggerHost);
  if (expoGoHost) {
    return expoGoHost;
  }

  const manifest2Host = extractHost((Constants as any)?.manifest2?.extra?.expoClient?.hostUri);
  if (manifest2Host) {
    return manifest2Host;
  }

  return extractHost(Constants.linkingUri);
}

function getFallbackBaseUrl() {
  const derivedHost = resolveExpoHost();

  if (derivedHost && Platform.OS !== 'web') {
    return `http://${derivedHost}:8000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }

  return 'http://localhost:8000';
}

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? getFallbackBaseUrl();

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

async function getStoredToken() {
  if (Platform.OS === 'web') {
    return localStorage.getItem('userToken');
  }

  return SecureStore.getItemAsync('userToken');
}

// --- ADDED: Axios Interceptor for JWT Auth ---
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getStoredToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error fetching token from secure store', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
// ---------------------------------------------

interface OpenApiDocument {
  paths?: Record<string, unknown>;
}

function isDiscoverableStatus(status?: number) {
  return status === 404 || status === 405;
}

export async function requestWithCandidates<TResponse>(
  paths: string[],
  buildConfig: (path: string) => AxiosRequestConfig
) {
  let lastError: unknown;
  let allWereNotFound = true;

  for (const path of paths) {
    try {
      const response = await api.request<TResponse>(buildConfig(path));
      return response.data;
    } catch (error) {
      lastError = error;

      if (axios.isAxiosError(error)) {
        allWereNotFound = allWereNotFound && isDiscoverableStatus(error.response?.status);
        if (!isDiscoverableStatus(error.response?.status)) {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  if (allWereNotFound) {
    throw new Error(`Backend is reachable, but these endpoints do not exist yet: ${paths.join(', ')}`);
  }

  throw lastError ?? new Error('No API endpoint responded successfully.');
}

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const responseMessage =
      typeof error.response?.data === 'object' && error.response?.data && 'detail' in error.response.data
        ? String(error.response.data.detail)
        : undefined;

    return responseMessage ?? error.message ?? 'API request failed.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while contacting the backend.';
}

export async function checkBackendHealth() {
  const response = await api.get<{ message?: string }>('/');

  let availablePaths: string[] = ['/'];
  let hasProjectApi = false;
  let message = response.data.message ?? 'Backend connected';

  try {
    const openApi = await api.get<OpenApiDocument>('/openapi.json');
    availablePaths = Object.keys(openApi.data.paths ?? {});
    hasProjectApi = availablePaths.some((path) => path !== '/');

    if (!hasProjectApi) {
      message = 'Backend is online, but only the root endpoint is implemented right now.';
    }
  } catch {
    // Keep the basic health result if OpenAPI is unavailable.
  }

  return {
    message,
    availablePaths,
    hasProjectApi,
    modelReady: (response.data as any)?.model_ready,
    modelStatus: (response.data as any)?.model_status,
  };
}

export function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}
