import initSqlJs, { type Database } from 'sql.js';
import type {
  BrowserArtifactParser,
  BrowserParseResult,
  ParserOptions,
} from './browserParserRegistry';
import { normalizeChromiumTimestamp } from '../../utils/browserTimestamp';
import { extractDomain } from '../../utils/domainExtractor';
import { detectSearchQuery } from '../../utils/searchEngineDetector';
import type {
  BrowserHistoryArtifact,
  BrowserDownloadArtifact,
  BrowserBookmarkArtifact,
  BrowserSearchArtifact,
} from '../../types';

export class ChromiumHistoryParser implements BrowserArtifactParser {
  id = 'chromium-history-parser';
  parserVersion = 'chromium-history-v1';
  supportedBrowser = 'CHROME' as const;

  async supports(file: File, arrayBuffer?: ArrayBuffer): Promise<boolean> {
    const name = file.name.toLowerCase();
    if (name === 'history' || name.endsWith('.sqlite') || name.includes('history')) {
      // Basic magic header check for SQLite (first 16 bytes: "SQLite format 3\0")
      try {
        const buf = arrayBuffer || (await file.slice(0, 16).arrayBuffer());
        const str = String.fromCharCode(...new Uint8Array(buf));
        return str.startsWith('SQLite format 3');
      } catch {
        return false;
      }
    }
    return false;
  }

  async parse(
    file: File,
    options: ParserOptions,
    arrayBuffer?: ArrayBuffer
  ): Promise<BrowserParseResult> {
    const SQL = await initSqlJs();
    const buf = arrayBuffer || (await file.arrayBuffer());
    const db: Database = new SQL.Database(new Uint8Array(buf));

    const history: BrowserHistoryArtifact[] = [];
    const downloads: BrowserDownloadArtifact[] = [];
    const searches: BrowserSearchArtifact[] = [];

    const nowIso = new Date().toISOString();

    // 1. Query Chromium History (urls + visits)
    try {
      const res = db.exec(`
        SELECT u.id, u.url, u.title, u.visit_count, v.visit_time
        FROM urls u
        LEFT JOIN visits v ON u.id = v.url
        ORDER BY v.visit_time DESC
      `);

      if (res.length > 0 && res[0] && res[0].values) {
        for (const row of res[0].values) {
          const urlStr = String(row[1] || '');
          if (!urlStr) continue;
          const titleStr = row[2] ? String(row[2]) : undefined;
          const visitCount = row[3] ? Number(row[3]) : 1;
          const rawTime = row[4] ? Number(row[4]) : undefined;
          const visitTimeIso = normalizeChromiumTimestamp(rawTime);
          const domain = extractDomain(urlStr);

          const histId = `hist-ch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const historyItem: BrowserHistoryArtifact = {
            id: histId,
            caseId: options.caseId,
            browserEvidenceId: options.browserEvidenceId,
            sourceEvidenceId: options.sourceEvidenceId,
            browser: options.browser,
            url: urlStr,
            title: titleStr,
            visitTime: visitTimeIso,
            visitCount,
            domain,
            rawTimestamp: rawTime,
            sourceFile: options.sourceFile,
            parserVersion: this.parserVersion,
            createdAt: nowIso,
          };
          history.push(historyItem);

          // Check if this URL is a search engine query
          const sq = detectSearchQuery(urlStr);
          if (sq.isSearch && sq.query) {
            searches.push({
              id: `srch-ch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              caseId: options.caseId,
              browserEvidenceId: options.browserEvidenceId,
              sourceEvidenceId: options.sourceEvidenceId,
              browser: options.browser,
              searchEngine: sq.searchEngine,
              query: sq.query,
              timestamp: visitTimeIso,
              sourceUrl: urlStr,
              sourceFile: options.sourceFile,
              parserVersion: this.parserVersion,
              createdAt: nowIso,
            });
          }
        }
      }
    } catch (e) {
      console.warn('Chromium history query warning:', e);
    }

    // 2. Query Chromium Downloads (downloads + downloads_url_chains)
    try {
      const res = db.exec(`
        SELECT d.id, d.target_path, d.start_time, d.total_bytes, d.mime_type, c.url
        FROM downloads d
        LEFT JOIN downloads_url_chains c ON d.id = c.id
      `);

      if (res.length > 0 && res[0] && res[0].values) {
        for (const row of res[0].values) {
          const localPath = row[1] ? String(row[1]) : undefined;
          const rawTime = row[2] ? Number(row[2]) : undefined;
          const totalBytes = row[3] ? Number(row[3]) : undefined;
          const mimeType = row[4] ? String(row[4]) : undefined;
          const downloadUrl = row[5] ? String(row[5]) : undefined;
          const filename = localPath ? localPath.split(/[/\\]/).pop() : downloadUrl ? downloadUrl.split('/').pop() : 'download';

          downloads.push({
            id: `dl-ch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            caseId: options.caseId,
            browserEvidenceId: options.browserEvidenceId,
            sourceEvidenceId: options.sourceEvidenceId,
            browser: options.browser,
            filename,
            downloadUrl,
            downloadTime: normalizeChromiumTimestamp(rawTime),
            fileSize: totalBytes,
            localPath,
            mimeType,
            sourceFile: options.sourceFile,
            parserVersion: this.parserVersion,
            createdAt: nowIso,
          });
        }
      }
    } catch (e) {
      console.warn('Chromium downloads query warning:', e);
    }

    db.close();

    return {
      browser: options.browser,
      artifactType: 'AUTO_DETECT',
      history,
      downloads,
      bookmarks: [],
      searches,
      parserVersion: this.parserVersion,
    };
  }
}

export class ChromiumBookmarkParser implements BrowserArtifactParser {
  id = 'chromium-bookmark-parser';
  parserVersion = 'chromium-bookmarks-v1';
  supportedBrowser = 'CHROME' as const;

  async supports(file: File): Promise<boolean> {
    const name = file.name.toLowerCase();
    return name.includes('bookmark') || name.endsWith('.json');
  }

  async parse(file: File, options: ParserOptions): Promise<BrowserParseResult> {
    const text = await file.text();
    const json = JSON.parse(text);
    const bookmarks: BrowserBookmarkArtifact[] = [];
    const nowIso = new Date().toISOString();

    function traverse(node: Record<string, unknown>, currentFolder: string) {
      if (!node) return;
      if (node.type === 'url' && typeof node.url === 'string') {
        const dateAdded = node.date_added ? normalizeChromiumTimestamp(Number(node.date_added)) : undefined;
        bookmarks.push({
          id: `bm-ch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          caseId: options.caseId,
          browserEvidenceId: options.browserEvidenceId,
          sourceEvidenceId: options.sourceEvidenceId,
          browser: options.browser,
          title: typeof node.name === 'string' ? node.name : undefined,
          url: node.url,
          folder: currentFolder || 'Bookmarks Bar',
          createdAtBrowser: dateAdded,
          sourceFile: options.sourceFile,
          parserVersion: 'chromium-bookmarks-v1',
          createdAt: nowIso,
        });
      } else if (node.children && Array.isArray(node.children)) {
        const folderName = typeof node.name === 'string' ? node.name : currentFolder;
        for (const child of node.children) {
          traverse(child as Record<string, unknown>, folderName);
        }
      }
    }

    if (json.roots) {
      for (const rootKey of Object.keys(json.roots)) {
        traverse(json.roots[rootKey], rootKey);
      }
    }

    return {
      browser: options.browser,
      artifactType: 'BOOKMARKS',
      history: [],
      downloads: [],
      bookmarks,
      searches: [],
      parserVersion: this.parserVersion,
    };
  }
}
