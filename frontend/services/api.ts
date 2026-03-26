import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

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
  };
}

export function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}
