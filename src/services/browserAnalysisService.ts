import { BrowserParserRegistry } from './parsers/browserParserRegistry';
import { ChromiumHistoryParser, ChromiumBookmarkParser } from './parsers/chromiumParsers';
import { FirefoxHistoryParser } from './parsers/firefoxParser';
import {
  BrowserEvidenceRepository,
  BrowserHistoryRepository,
  BrowserDownloadRepository,
  BrowserBookmarkRepository,
  BrowserSearchRepository,
} from './browserRepositories';
import { EvidenceRepository, AuditLogRepository } from './repositories';
import type {
  BrowserEvidence,
  SupportedBrowser,
  BrowserArtifactType,
} from '../types';

// Register built-in parsers
BrowserParserRegistry.register(new ChromiumHistoryParser());
BrowserParserRegistry.register(new ChromiumBookmarkParser());
BrowserParserRegistry.register(new FirefoxHistoryParser());

export class BrowserAnalysisService {
  /**
   * Processes an imported browser evidence file.
   */
  static async processBrowserEvidence(
    file: File,
    caseId: string,
    preferredBrowser: SupportedBrowser = 'UNKNOWN',
    artifactType: BrowserArtifactType = 'AUTO_DETECT'
  ): Promise<BrowserEvidence> {
    const evidenceId = `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const browserEvidenceId = `be-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    // 1. Create base EvidenceItem
    await EvidenceRepository.create({
      id: evidenceId,
      caseId,
      filename: file.name,
      type: file.type || 'application/x-sqlite3',
      size: file.size,
      importedAt: nowIso,
      source: 'Local Browser Evidence Import',
      analysisStatus: 'ANALYZING',
      bookmarked: false,
    });

    // 2. Create BrowserEvidence shell
    const browserEvidence: BrowserEvidence = {
      id: browserEvidenceId,
      evidenceId,
      caseId,
      browser: preferredBrowser,
      artifactType,
      filename: file.name,
      fileSize: file.size,
      parserVersion: 'pending-detection',
      importedAt: nowIso,
      analysisStatus: 'ANALYZING',
    };

    await BrowserEvidenceRepository.create(browserEvidence);

    await AuditLogRepository.log({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      caseId,
      action: 'BROWSER_EVIDENCE_IMPORTED',
      description: `Browser evidence "${file.name}" imported into case ${caseId}.`,
      entityType: 'BROWSER_EVIDENCE',
      entityId: browserEvidenceId,
      timestamp: nowIso,
    });

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Find suitable parser
      const parser = await BrowserParserRegistry.findMatchingParser(file, preferredBrowser, arrayBuffer);
      if (!parser) {
        throw new Error(`No compatible browser parser found for file "${file.name}". Supported: Chrome, Edge, Firefox history/places databases or JSON bookmarks.`);
      }

      // Detect actual browser if unknown
      const detectedBrowser = preferredBrowser !== 'UNKNOWN' ? preferredBrowser : parser.supportedBrowser;

      const parseResult = await parser.parse(
        file,
        {
          caseId,
          browserEvidenceId,
          sourceEvidenceId: evidenceId,
          sourceFile: file.name,
          browser: detectedBrowser,
        },
        arrayBuffer
      );

      // Persist artifacts to IndexedDB
      await BrowserHistoryRepository.bulkAdd(parseResult.history);
      await BrowserDownloadRepository.bulkAdd(parseResult.downloads);
      await BrowserBookmarkRepository.bulkAdd(parseResult.bookmarks);
      await BrowserSearchRepository.bulkAdd(parseResult.searches);

      const totalRecords =
        parseResult.history.length +
        parseResult.downloads.length +
        parseResult.bookmarks.length +
        parseResult.searches.length;

      // Update BrowserEvidence record
      const updatedEvidence: BrowserEvidence = {
        ...browserEvidence,
        browser: detectedBrowser,
        parserVersion: parser.parserVersion,
        analyzedAt: new Date().toISOString(),
        analysisStatus: 'COMPLETED',
        recordCount: totalRecords,
      };

      await BrowserEvidenceRepository.update(browserEvidenceId, updatedEvidence);
      await EvidenceRepository.update(evidenceId, { analysisStatus: 'COMPLETED' });

      await AuditLogRepository.log({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        caseId,
        action: 'BROWSER_ANALYSIS_COMPLETED',
        description: `Completed browser analysis for "${file.name}" using ${parser.parserVersion}. Extracted ${totalRecords} items (${parseResult.history.length} history, ${parseResult.downloads.length} downloads, ${parseResult.bookmarks.length} bookmarks, ${parseResult.searches.length} searches).`,
        entityType: 'BROWSER_EVIDENCE',
        entityId: browserEvidenceId,
        timestamp: new Date().toISOString(),
      });

      return updatedEvidence;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Browser parsing failed';

      await BrowserEvidenceRepository.update(browserEvidenceId, { analysisStatus: 'FAILED' });
      await EvidenceRepository.update(evidenceId, { analysisStatus: 'FAILED' });

      await AuditLogRepository.log({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        caseId,
        action: 'BROWSER_ANALYSIS_FAILED',
        description: `Browser evidence analysis failed for "${file.name}": ${errMsg}`,
        entityType: 'BROWSER_EVIDENCE',
        entityId: browserEvidenceId,
        timestamp: new Date().toISOString(),
      });

      throw err;
    }
  }
}
