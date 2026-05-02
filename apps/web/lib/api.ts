/**
 * Get the API base URL for the frontend
 * Defaults to localhost:4000 for local development
 */
export function getApiBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl && envUrl.length > 0) {
    return envUrl;
  }
  // Fallback for local development
  return 'http://localhost:4000';
}
