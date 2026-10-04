/**
 * Domain Extractor Utility
 * Parses valid web domains from raw URLs.
 */
export function extractDomain(rawUrl: string | undefined): string {
  if (!rawUrl) return 'Unknown Domain';
  try {
    const urlObj = new URL(rawUrl);
    let hostname = urlObj.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    return hostname || 'Unknown Domain';
  } catch {
    // If raw string doesn't include protocol, attempt prepending http://
    try {
      const urlObj = new URL(`http://${rawUrl}`);
      let hostname = urlObj.hostname.toLowerCase();
      if (hostname.startsWith('www.')) {
        hostname = hostname.substring(4);
      }
      return hostname || 'Unknown Domain';
    } catch {
      return 'Invalid URL';
    }
  }
}
