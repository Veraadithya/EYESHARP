/**
 * Browser Timestamp Normalizer
 * Converts various browser-specific epoch timestamp formats into ISO 8601 strings.
 */

// Chromium / Edge Epoch: Microseconds since January 1, 1601 UTC
const CHROMIUM_EPOCH_OFFSET = 11644473600000000;

// Firefox PRTime Epoch: Microseconds since January 1, 1970 UTC
export function normalizeChromiumTimestamp(val: number | string | undefined): string | undefined {
  if (!val) return undefined;
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num) || num <= 0) return undefined;

  // Convert Chromium microseconds to Unix milliseconds
  const unixMs = Math.floor((num - CHROMIUM_EPOCH_OFFSET) / 1000);
  if (unixMs <= 0 || unixMs > 253402300799000) return undefined;

  return new Date(unixMs).toISOString();
}

export function normalizeFirefoxTimestamp(val: number | string | undefined): string | undefined {
  if (!val) return undefined;
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num) || num <= 0) return undefined;

  // Firefox PRTime is microseconds since 1970-01-01
  const unixMs = Math.floor(num / 1000);
  if (unixMs <= 0 || unixMs > 253402300799000) return undefined;

  return new Date(unixMs).toISOString();
}

export function normalizeUnixTimestamp(val: number | string | undefined): string | undefined {
  if (!val) return undefined;
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num) || num <= 0) return undefined;

  // Check if milliseconds vs seconds
  const unixMs = num > 1e11 ? num : num * 1000;
  return new Date(unixMs).toISOString();
}
