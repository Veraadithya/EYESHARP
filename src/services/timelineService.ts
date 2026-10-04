import { BrowserHistoryRepository } from './browserRepositories';
import { BrowserDownloadRepository } from './browserRepositories';
import { BrowserBookmarkRepository } from './browserRepositories';
import { BrowserSearchRepository } from './browserRepositories';
import { ImageArtifactRepository } from './imageArtifactRepository';
import {
  ImageDuplicateRepository,
  ImageOcrRepository,
} from './advancedImageRepositories';
import { EvidenceRepository } from './repositories';
import type { InvestigationTimelineEvent } from '../types';

export class TimelineService {
  /**
   * Dynamically collects and normalizes timeline events across all evidence modules.
   * Option A (Derived): No persistent duplication; generated fresh from source artifacts.
   */
  static async getEventsForCase(caseId: string): Promise<InvestigationTimelineEvent[]> {
    const events: InvestigationTimelineEvent[] = [];

    // 1. Evidence Imports
    const allEvidence = await EvidenceRepository.getByCaseId(caseId);
    for (const ev of allEvidence) {
      if (ev.importedAt) {
        events.push({
          id: `tl-ev-${ev.id}`,
          caseId: ev.caseId,
          timestamp: ev.importedAt,
          type: 'EVIDENCE_IMPORTED',
          title: `Evidence File Imported: ${ev.filename}`,
          description: `Type: ${ev.type} | Size: ${ev.size} bytes | Source: ${ev.source}`,
          sourceType: 'EVIDENCE',
          sourceId: ev.id,
          sourceEvidenceId: ev.id,
          metadata: { filename: ev.filename, size: ev.size },
        });
      }
    }

    // 2. Browser History Visits
    const historyItems = await BrowserHistoryRepository.getByCaseId(caseId);
    for (const h of historyItems) {
      if (h.visitTime) {
        events.push({
          id: `tl-hist-${h.id}`,
          caseId: h.caseId,
          timestamp: h.visitTime,
          type: 'BROWSER_HISTORY',
          title: `Visited ${h.domain || 'URL'}: ${h.title || h.url}`,
          description: `URL: ${h.url} | Visits: ${h.visitCount || 1}`,
          sourceType: 'BROWSER',
          sourceId: h.id,
          sourceEvidenceId: h.sourceEvidenceId,
          browser: h.browser,
          metadata: { url: h.url, domain: h.domain, visitCount: h.visitCount },
        });
      }
    }

    // 3. Browser Downloads
    const downloadItems = await BrowserDownloadRepository.getByCaseId(caseId);
    for (const d of downloadItems) {
      if (d.downloadTime) {
        events.push({
          id: `tl-dl-${d.id}`,
          caseId: d.caseId,
          timestamp: d.downloadTime,
          type: 'BROWSER_DOWNLOAD',
          title: `Downloaded File: ${d.filename || 'Unknown File'}`,
          description: `URL: ${d.downloadUrl || 'N/A'} | Local Path: ${d.localPath || 'N/A'}`,
          sourceType: 'BROWSER',
          sourceId: d.id,
          sourceEvidenceId: d.sourceEvidenceId,
          browser: d.browser,
          metadata: { filename: d.filename, downloadUrl: d.downloadUrl, fileSize: d.fileSize },
        });
      }
    }

    // 4. Browser Search Activity
    const searchItems = await BrowserSearchRepository.getByCaseId(caseId);
    for (const s of searchItems) {
      if (s.timestamp) {
        events.push({
          id: `tl-srch-${s.id}`,
          caseId: s.caseId,
          timestamp: s.timestamp,
          type: 'BROWSER_SEARCH',
          title: `Search Query (${s.searchEngine || 'Search'}): "${s.query}"`,
          description: `Source URL: ${s.sourceUrl}`,
          sourceType: 'BROWSER',
          sourceId: s.id,
          sourceEvidenceId: s.sourceEvidenceId,
          browser: s.browser,
          metadata: { query: s.query, searchEngine: s.searchEngine },
        });
      }
    }

    // 5. Browser Bookmarks (where timestamp exists)
    const bookmarkItems = await BrowserBookmarkRepository.getByCaseId(caseId);
    for (const b of bookmarkItems) {
      if (b.createdAtBrowser) {
        events.push({
          id: `tl-bm-${b.id}`,
          caseId: b.caseId,
          timestamp: b.createdAtBrowser,
          type: 'BROWSER_BOOKMARK',
          title: `Bookmarked Page: ${b.title || b.url}`,
          description: `Folder: ${b.folder || 'Root'} | URL: ${b.url}`,
          sourceType: 'BROWSER',
          sourceId: b.id,
          sourceEvidenceId: b.sourceEvidenceId,
          browser: b.browser,
          metadata: { folder: b.folder, url: b.url },
        });
      }
    }

    // 6. Image Imports & EXIF Timestamps
    const imageArtifacts = await ImageArtifactRepository.getByCaseId(caseId);
    for (const img of imageArtifacts) {
      // EXIF DateTimeOriginal event if present
      if (img.exif?.dateTimeOriginal) {
        events.push({
          id: `tl-exif-${img.id}`,
          caseId: img.caseId,
          timestamp: img.exif.dateTimeOriginal,
          type: 'IMAGE_ANALYZED',
          title: `Image EXIF Capture Time: ${img.filename}`,
          description: `Camera: ${img.exif.make || ''} ${img.exif.model || ''} | SHA-256: ${(img.sha256 || '').substring(0, 12)}...`,
          sourceType: 'IMAGE',
          sourceId: img.id,
          sourceEvidenceId: img.evidenceId,
          metadata: { make: img.exif.make, model: img.exif.model, sha256: img.sha256 },
        });
      }

      // Image Analyzed Event
      if (img.createdAt) {
        events.push({
          id: `tl-img-${img.id}`,
          caseId: img.caseId,
          timestamp: img.createdAt,
          type: 'IMAGE_ANALYZED',
          title: `Image Artifact Analyzed: ${img.filename}`,
          description: `Dimensions: ${img.width || '?'}x${img.height || '?'} | MIME: ${img.mimeType}`,
          sourceType: 'IMAGE',
          sourceId: img.id,
          sourceEvidenceId: img.evidenceId,
          metadata: { width: img.width, height: img.height, sha256: img.sha256 },
        });
      }
    }

    // 7. Image OCR Text Analysis
    const ocrResults = await ImageOcrRepository.getByCaseId(caseId);
    for (const ocr of ocrResults) {
      if (ocr.analyzedAt) {
        const text = ocr.text || '';
        events.push({
          id: `tl-ocr-${ocr.id}`,
          caseId: ocr.caseId,
          timestamp: ocr.analyzedAt,
          type: 'IMAGE_OCR',
          title: `OCR Text Extracted from Image`,
          description: `Text Preview: "${text.substring(0, 80)}..."`,
          sourceType: 'IMAGE',
          sourceId: ocr.imageArtifactId,
          metadata: { textLength: text.length },
        });
      }
    }

    // 8. Image Duplicates Detected
    const dupGroups = await ImageDuplicateRepository.getByCaseId(caseId);
    for (const dup of dupGroups) {
      if (dup.detectedAt) {
        const count = dup.imageArtifactIds?.length || 0;
        events.push({
          id: `tl-dup-${dup.id}`,
          caseId: dup.caseId,
          timestamp: dup.detectedAt,
          type: 'IMAGE_DUPLICATE',
          title: `Exact Duplicate Image Group Identified (${count} files)`,
          description: `SHA-256 Hash: ${dup.hash}`,
          sourceType: 'IMAGE',
          sourceId: dup.id,
          metadata: { count, hash: dup.hash },
        });
      }
    }

    // Sort Newest -> Oldest by default
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}
