/**
 * Search Engine Detector Utility
 * Identifies search engines and extracts query strings from URLs.
 */
export interface ExtractedSearchQuery {
  isSearch: boolean;
  searchEngine?: string;
  query?: string;
}

export function detectSearchQuery(urlStr: string | undefined): ExtractedSearchQuery {
  if (!urlStr) return { isSearch: false };

  try {
    const urlObj = new URL(urlStr);
    const host = urlObj.hostname.toLowerCase();
    const params = urlObj.searchParams;

    // Google Search
    if (host.includes('google.') && (urlObj.pathname.includes('/search') || params.has('q'))) {
      const q = params.get('q');
      if (q && q.trim().length > 0) {
        return { isSearch: true, searchEngine: 'Google', query: q.trim() };
      }
    }

    // Bing Search
    if (host.includes('bing.') && (urlObj.pathname.includes('/search') || params.has('q'))) {
      const q = params.get('q');
      if (q && q.trim().length > 0) {
        return { isSearch: true, searchEngine: 'Bing', query: q.trim() };
      }
    }

    // DuckDuckGo Search
    if (host.includes('duckduckgo.') && params.has('q')) {
      const q = params.get('q');
      if (q && q.trim().length > 0) {
        return { isSearch: true, searchEngine: 'DuckDuckGo', query: q.trim() };
      }
    }

    // Yahoo Search
    if (host.includes('yahoo.') && params.has('p')) {
      const p = params.get('p');
      if (p && p.trim().length > 0) {
        return { isSearch: true, searchEngine: 'Yahoo', query: p.trim() };
      }
    }

    // Baidu Search
    if (host.includes('baidu.') && params.has('wd')) {
      const wd = params.get('wd');
      if (wd && wd.trim().length > 0) {
        return { isSearch: true, searchEngine: 'Baidu', query: wd.trim() };
      }
    }

    // Generic fallback for ?q= or ?query= parameter
    const genericQ = params.get('q') || params.get('query') || params.get('search');
    if (genericQ && genericQ.trim().length > 0 && (host.includes('search') || urlObj.pathname.includes('/search'))) {
      return { isSearch: true, searchEngine: host, query: genericQ.trim() };
    }

    return { isSearch: false };
  } catch {
    return { isSearch: false };
  }
}
