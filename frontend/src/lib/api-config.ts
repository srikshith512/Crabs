/**
 * Resolves the backend base URL from NEXT_PUBLIC_API_URL.
 * - Appends .onrender.com when only a single-label host is given (common Render typos).
 * - Strips trailing slashes so `${base}/api/...` never becomes `...//api/...`.
 */
const stripTrailingSlashes = (s: string): string => s.replace(/\/+$/, '');

/**
 * Resolves the backend base URL from NEXT_PUBLIC_API_URL.
 */
const getBaseUrl = (): string => {
  let raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return 'http://localhost:5000';
  if (!raw.startsWith('http')) raw = `https://${raw}`;

  try {
    const u = new URL(raw);
    const host = u.hostname;
    const isLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '[::1]' ||
      /^127\.\d+\.\d+\.\d+$/.test(host);
    if (!host.includes('.') && !isLocal) {
      u.hostname = `${host}.onrender.com`;
    }
    // Use origin only (ignore accidental path suffixes in the env var)
    return stripTrailingSlashes(u.origin);
  } catch {
    return stripTrailingSlashes(raw);
  }
};

export const API_URL = getBaseUrl();
export const API_BASE = `${API_URL}/api`;
