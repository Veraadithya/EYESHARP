import initSqlJs, { type Database } from 'sql.js';
import type {
  BrowserArtifactParser,
  BrowserParseResult,
  ParserOptions,
} from './browserParserRegistry';
import { normalizeFirefoxTimestamp } from '../../utils/browserTimestamp';
import { extractDomain } from '../../utils/domainExtractor';
import { detectSearchQuery } from '../../utils/searchEngineDetector';
import type {
  BrowserHistoryArtifact,
  BrowserDownloadArtifact,
  BrowserBookmarkArtifact,
  BrowserSearchArtifact,
} from '../../types';

export class FirefoxHistoryParser implements BrowserArtifactParser {
  id = 'firefox-history-parser';
  parserVersion = 'firefox-places-v1';
  supportedBrowser = 'FIREFOX' as const;

  async supports(file: File, arrayBuffer?: ArrayBuffer): Promise<boolean> {
    const name = file.name.toLowerCase();
    if (name === 'places.sqlite' || (name.endsWith('.sqlite') && name.includes('places'))) {
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
    const bookmarks: BrowserBookmarkArtifact[] = [];
    const searches: BrowserSearchArtifact[] = [];

    const nowIso = new Date().toISOString();

    // 1. Query Firefox History (moz_places + moz_historyvisits)
    try {
      const res = db.exec(`
        SELECT p.id, p.url, p.title, p.visit_count, v.visit_date
        FROM moz_places p
        LEFT JOIN moz_historyvisits v ON p.id = v.place_id
        ORDER BY v.visit_date DESC
      `);

      if (res.length > 0 && res[0] && res[0].values) {
        for (const row of res[0].values) {
          const urlStr = String(row[1] || '');
          if (!urlStr) continue;
          const titleStr = row[2] ? String(row[2]) : undefined;
          const visitCount = row[3] ? Number(row[3]) : 1;
          const rawTime = row[4] ? Number(row[4]) : undefined;
          const visitTimeIso = normalizeFirefoxTimestamp(rawTime);
          const domain = extractDomain(urlStr);

          const histId = `hist-ff-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          history.push({
            id: histId,
            caseId: options.caseId,
            browserEvidenceId: options.browserEvidenceId,
            sourceEvidenceId: options.sourceEvidenceId,
            browser: 'FIREFOX',
            url: urlStr,
            title: titleStr,
            visitTime: visitTimeIso,
            visitCount,
            domain,
            rawTimestamp: rawTime,
            sourceFile: options.sourceFile,
            parserVersion: this.parserVersion,
            createdAt: nowIso,
          });

          // Check for search query
          const sq = detectSearchQuery(urlStr);
          if (sq.isSearch && sq.query) {
            searches.push({
              id: `srch-ff-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              caseId: options.caseId,
              browserEvidenceId: options.browserEvidenceId,
              sourceEvidenceId: options.sourceEvidenceId,
              browser: 'FIREFOX',
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
      console.warn('Firefox history query warning:', e);
    }

    // 2. Query Firefox Bookmarks (moz_bookmarks + moz_places)
    try {
      const res = db.exec(`
        SELECT b.id, b.title, p.url, b.dateAdded, f.title as folder_title
        FROM moz_bookmarks b
        JOIN moz_places p ON b.fk = p.id
        LEFT JOIN moz_bookmarks f ON b.parent = f.id
        WHERE b.type = 1
      `);

      if (res.length > 0 && res[0] && res[0].values) {
        for (const row of res[0].values) {
          const titleStr = row[1] ? String(row[1]) : undefined;
          const urlStr = String(row[2] || '');
          if (!urlStr) continue;
          const rawTime = row[3] ? Number(row[3]) : undefined;
          const folderStr = row[4] ? String(row[4]) : 'Bookmarks Menu';

          bookmarks.push({
            id: `bm-ff-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            caseId: options.caseId,
            browserEvidenceId: options.browserEvidenceId,
            sourceEvidenceId: options.sourceEvidenceId,
            browser: 'FIREFOX',
            title: titleStr,
            url: urlStr,
            folder: folderStr,
            createdAtBrowser: normalizeFirefoxTimestamp(rawTime),
            sourceFile: options.sourceFile,
            parserVersion: this.parserVersion,
            createdAt: nowIso,
          });
        }
      }
    } catch (e) {
      console.warn('Firefox bookmarks query warning:', e);
    }

    // 3. Query Firefox Downloads (moz_annos / moz_items_annos)
    try {
      const res = db.exec(`
        SELECT a.id, p.url, a.content, a.dateAdded
        FROM moz_annos a
        JOIN moz_places p ON a.place_id = p.id
        WHERE a.anno_attribute_id IN (SELECT id FROM moz_anno_attributes WHERE name LIKE '%download%')
      `);

      if (res.length > 0 && res[0] && res[0].values) {
        for (const row of res[0].values) {
          const downloadUrl = String(row[1] || '');
          const localPath = row[2] ? String(row[2]) : undefined;
          const rawTime = row[3] ? Number(row[3]) : undefined;
          const filename = localPath ? localPath.split(/[/\\]/).pop() : downloadUrl ? downloadUrl.split('/').pop() : 'download';

          downloads.push({
            id: `dl-ff-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            caseId: options.caseId,
            browserEvidenceId: options.browserEvidenceId,
            sourceEvidenceId: options.sourceEvidenceId,
            browser: 'FIREFOX',
            filename,
            downloadUrl,
            downloadTime: normalizeFirefoxTimestamp(rawTime),
            localPath,
            sourceFile: options.sourceFile,
            parserVersion: this.parserVersion,
            createdAt: nowIso,
          });
        }
      }
    } catch (e) {
      console.warn('Firefox downloads query warning:', e);
    }

    db.close();

    return {
      browser: 'FIREFOX',
      artifactType: 'AUTO_DETECT',
      history,
      downloads,
      bookmarks,
      searches,
      parserVersion: this.parserVersion,
    };
  }
}
