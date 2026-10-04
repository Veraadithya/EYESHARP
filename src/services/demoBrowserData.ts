import {
  BrowserEvidenceRepository,
  BrowserHistoryRepository,
  BrowserDownloadRepository,
  BrowserBookmarkRepository,
  BrowserSearchRepository,
} from './browserRepositories';
import type {
  BrowserEvidence,
  BrowserHistoryArtifact,
  BrowserDownloadArtifact,
  BrowserBookmarkArtifact,
  BrowserSearchArtifact,
} from '../types';

export async function seedDemoBrowserData(caseId: string = 'CASE-2026-001'): Promise<void> {
  const existing = await BrowserEvidenceRepository.getByCaseId(caseId);
  if (existing.length > 0) return; // Already seeded

  const now = new Date();
  const t1 = new Date(now.getTime() - 3600000 * 2).toISOString();
  const t2 = new Date(now.getTime() - 3600000 * 1.5).toISOString();
  const t3 = new Date(now.getTime() - 3600000 * 1).toISOString();
  const t4 = new Date(now.getTime() - 3600000 * 0.5).toISOString();

  // 1. Chrome Evidence
  const chromeEvidence: BrowserEvidence = {
    id: 'be-demo-chrome-01',
    evidenceId: 'ev-demo-chrome-01',
    caseId,
    browser: 'CHROME',
    artifactType: 'AUTO_DETECT',
    filename: 'History (Chrome)',
    fileSize: 524288,
    parserVersion: 'chromium-history-v1',
    importedAt: now.toISOString(),
    analysisStatus: 'COMPLETED',
    recordCount: 12,
  };
  await BrowserEvidenceRepository.create(chromeEvidence);

  // 2. Firefox Evidence
  const firefoxEvidence: BrowserEvidence = {
    id: 'be-demo-firefox-01',
    evidenceId: 'ev-demo-firefox-01',
    caseId,
    browser: 'FIREFOX',
    artifactType: 'AUTO_DETECT',
    filename: 'places.sqlite (Firefox)',
    fileSize: 1048576,
    parserVersion: 'firefox-places-v1',
    importedAt: now.toISOString(),
    analysisStatus: 'COMPLETED',
    recordCount: 6,
  };
  await BrowserEvidenceRepository.create(firefoxEvidence);

  // History Items
  const historyItems: BrowserHistoryArtifact[] = [
    {
      id: 'hist-demo-01',
      caseId,
      browserEvidenceId: chromeEvidence.id,
      sourceEvidenceId: chromeEvidence.evidenceId,
      browser: 'CHROME',
      url: 'https://www.google.com/search?q=forensic+lens+documentation',
      title: 'forensic lens documentation - Google Search',
      visitTime: t1,
      visitCount: 3,
      domain: 'google.com',
      sourceFile: 'History (Chrome)',
      parserVersion: 'chromium-history-v1',
      createdAt: now.toISOString(),
    },
    {
      id: 'hist-demo-02',
      caseId,
      browserEvidenceId: chromeEvidence.id,
      sourceEvidenceId: chromeEvidence.evidenceId,
      browser: 'CHROME',
      url: 'https://github.com/sqlite/sqlite',
      title: 'GitHub - sqlite/sqlite: Official mirror of SQLite',
      visitTime: t2,
      visitCount: 5,
      domain: 'github.com',
      sourceFile: 'History (Chrome)',
      parserVersion: 'chromium-history-v1',
      createdAt: now.toISOString(),
    },
    {
      id: 'hist-demo-03',
      caseId,
      browserEvidenceId: firefoxEvidence.id,
      sourceEvidenceId: firefoxEvidence.evidenceId,
      browser: 'FIREFOX',
      url: 'https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API',
      title: 'IndexedDB API - Web APIs | MDN',
      visitTime: t3,
      visitCount: 2,
      domain: 'developer.mozilla.org',
      sourceFile: 'places.sqlite (Firefox)',
      parserVersion: 'firefox-places-v1',
      createdAt: now.toISOString(),
    },
    {
      id: 'hist-demo-04',
      caseId,
      browserEvidenceId: chromeEvidence.id,
      sourceEvidenceId: chromeEvidence.evidenceId,
      browser: 'CHROME',
      url: 'https://www.bing.com/search?q=digital+forensics+workstation+tools',
      title: 'digital forensics workstation tools - Bing Search',
      visitTime: t4,
      visitCount: 1,
      domain: 'bing.com',
      sourceFile: 'History (Chrome)',
      parserVersion: 'chromium-history-v1',
      createdAt: now.toISOString(),
    },
  ];
  await BrowserHistoryRepository.bulkAdd(historyItems);

  // Download Items
  const downloadItems: BrowserDownloadArtifact[] = [
    {
      id: 'dl-demo-01',
      caseId,
      browserEvidenceId: chromeEvidence.id,
      sourceEvidenceId: chromeEvidence.evidenceId,
      browser: 'CHROME',
      filename: 'evidence_audit_report.pdf',
      downloadUrl: 'https://example-forensic-server.internal/files/evidence_audit_report.pdf',
      sourceUrl: 'https://example-forensic-server.internal/reports',
      downloadTime: t2,
      fileSize: 1048576,
      localPath: 'C:\\Users\\Investigator\\Downloads\\evidence_audit_report.pdf',
      mimeType: 'application/pdf',
      sourceFile: 'History (Chrome)',
      parserVersion: 'chromium-history-v1',
      createdAt: now.toISOString(),
    },
  ];
  await BrowserDownloadRepository.bulkAdd(downloadItems);

  // Bookmark Items
  const bookmarkItems: BrowserBookmarkArtifact[] = [
    {
      id: 'bm-demo-01',
      caseId,
      browserEvidenceId: chromeEvidence.id,
      sourceEvidenceId: chromeEvidence.evidenceId,
      browser: 'CHROME',
      title: 'DFIR Training Portal',
      url: 'https://dfir.training/resources',
      folder: 'Forensic Resources',
      createdAtBrowser: t1,
      sourceFile: 'Bookmarks.json',
      parserVersion: 'chromium-bookmarks-v1',
      createdAt: now.toISOString(),
    },
  ];
  await BrowserBookmarkRepository.bulkAdd(bookmarkItems);

  // Search Items
  const searchItems: BrowserSearchArtifact[] = [
    {
      id: 'srch-demo-01',
      caseId,
      browserEvidenceId: chromeEvidence.id,
      sourceEvidenceId: chromeEvidence.evidenceId,
      browser: 'CHROME',
      searchEngine: 'Google',
      query: 'forensic lens documentation',
      timestamp: t1,
      sourceUrl: 'https://www.google.com/search?q=forensic+lens+documentation',
      sourceFile: 'History (Chrome)',
      parserVersion: 'chromium-history-v1',
      createdAt: now.toISOString(),
    },
    {
      id: 'srch-demo-02',
      caseId,
      browserEvidenceId: chromeEvidence.id,
      sourceEvidenceId: chromeEvidence.evidenceId,
      browser: 'CHROME',
      searchEngine: 'Bing',
      query: 'digital forensics workstation tools',
      timestamp: t4,
      sourceUrl: 'https://www.bing.com/search?q=digital+forensics+workstation+tools',
      sourceFile: 'History (Chrome)',
      parserVersion: 'chromium-history-v1',
      createdAt: now.toISOString(),
    },
  ];
  await BrowserSearchRepository.bulkAdd(searchItems);
}
