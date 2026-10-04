import { CaseRepository, EvidenceRepository } from './repositories';
import {
  BrowserHistoryRepository,
  BrowserDownloadRepository,
  BrowserSearchRepository,
} from './browserRepositories';
import { ImageArtifactRepository } from './imageArtifactRepository';
import { ImageOcrRepository } from './advancedImageRepositories';
import { TimelineService } from './timelineService';
import type { InvestigationSearchResult, SearchResultType } from '../types';

export class SearchService {
  /**
   * Deterministic search across all forensic repositories.
   * Priority matching: Hash -> Filename/Query -> Domain/Title -> Substring -> OCR text -> Timeline
   */
  static async search(
    queryStr: string,
    caseIdFilter: string = 'ALL',
    typeFilter: string = 'ALL'
  ): Promise<InvestigationSearchResult[]> {
    const q = queryStr.trim().toLowerCase();
    if (!q) return [];

    const results: InvestigationSearchResult[] = [];

    const matchesCase = (cId: string) => caseIdFilter === 'ALL' || cId === caseIdFilter;
    const matchesType = (t: SearchResultType) => typeFilter === 'ALL' || t === typeFilter;

    // 1. Cases Search
    if (matchesType('CASE')) {
      const cases = await CaseRepository.getAll();
      for (const c of cases) {
        if (c.caseId.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q))) {
          results.push({
            id: `sr-case-${c.id}`,
            type: 'CASE',
            title: `Case: ${c.name}`,
            description: c.description || `Status: ${c.status}`,
            matchedField: c.name.toLowerCase().includes(q) ? 'Name' : 'Case ID',
            matchedValue: c.name,
            caseId: c.caseId,
            artifactId: c.id,
            timestamp: c.createdAt,
          });
        }
      }
    }

    // 2. Evidence Files Search
    if (matchesType('EVIDENCE')) {
      const evidenceList = caseIdFilter === 'ALL' ? await EvidenceRepository.getAll() : await EvidenceRepository.getByCaseId(caseIdFilter);
      for (const ev of evidenceList) {
        const evSource = ev.source || '';
        if (ev.filename.toLowerCase().includes(q) || ev.type.toLowerCase().includes(q) || evSource.toLowerCase().includes(q)) {
          results.push({
            id: `sr-ev-${ev.id}`,
            type: 'EVIDENCE',
            title: `Evidence File: ${ev.filename}`,
            description: `Type: ${ev.type} | Size: ${ev.size} bytes`,
            matchedField: 'Filename',
            matchedValue: ev.filename,
            caseId: ev.caseId,
            artifactId: ev.id,
            sourceEvidenceId: ev.id,
            timestamp: ev.importedAt,
          });
        }
      }
    }

    // 3. Browser History Search
    if (matchesType('BROWSER_HISTORY')) {
      const historyItems = await BrowserHistoryRepository.getByCaseId(caseIdFilter);
      for (const h of historyItems) {
        if (matchesCase(h.caseId)) {
          if (h.url.toLowerCase().includes(q) || (h.title && h.title.toLowerCase().includes(q)) || (h.domain && h.domain.toLowerCase().includes(q))) {
            results.push({
              id: `sr-bh-${h.id}`,
              type: 'BROWSER_HISTORY',
              title: h.title || h.domain || 'Browser History Entry',
              description: h.url,
              matchedField: h.url.toLowerCase().includes(q) ? 'URL' : 'Title',
              matchedValue: h.url,
              caseId: h.caseId,
              artifactId: h.id,
              sourceEvidenceId: h.sourceEvidenceId,
              timestamp: h.visitTime,
              browser: h.browser,
            });
          }
        }
      }
    }

    // 4. Browser Downloads Search
    if (matchesType('BROWSER_DOWNLOAD')) {
      const downloadItems = await BrowserDownloadRepository.getByCaseId(caseIdFilter);
      for (const d of downloadItems) {
        if (matchesCase(d.caseId)) {
          if ((d.filename && d.filename.toLowerCase().includes(q)) || (d.downloadUrl && d.downloadUrl.toLowerCase().includes(q)) || (d.localPath && d.localPath.toLowerCase().includes(q))) {
            results.push({
              id: `sr-bd-${d.id}`,
              type: 'BROWSER_DOWNLOAD',
              title: `Download: ${d.filename || 'Unknown File'}`,
              description: d.downloadUrl || d.localPath,
              matchedField: d.filename?.toLowerCase().includes(q) ? 'Filename' : 'Download URL',
              matchedValue: d.filename || d.downloadUrl,
              caseId: d.caseId,
              artifactId: d.id,
              sourceEvidenceId: d.sourceEvidenceId,
              timestamp: d.downloadTime,
              browser: d.browser,
            });
          }
        }
      }
    }

    // 5. Browser Search Activity
    if (matchesType('BROWSER_SEARCH')) {
      const searches = await BrowserSearchRepository.getByCaseId(caseIdFilter);
      for (const s of searches) {
        if (matchesCase(s.caseId)) {
          if (s.query.toLowerCase().includes(q) || (s.searchEngine && s.searchEngine.toLowerCase().includes(q))) {
            results.push({
              id: `sr-bs-${s.id}`,
              type: 'BROWSER_SEARCH',
              title: `Search Query: "${s.query}"`,
              description: `Engine: ${s.searchEngine || 'Generic'} | Source: ${s.sourceUrl}`,
              matchedField: 'Query String',
              matchedValue: s.query,
              caseId: s.caseId,
              artifactId: s.id,
              sourceEvidenceId: s.sourceEvidenceId,
              timestamp: s.timestamp,
              browser: s.browser,
            });
          }
        }
      }
    }

    // 6. Image Artifacts & EXIF Search
    if (matchesType('IMAGE')) {
      const images = await ImageArtifactRepository.getByCaseId(caseIdFilter);
      for (const img of images) {
        if (matchesCase(img.caseId)) {
          const sha = img.sha256 || '';
          const matchSha = sha.toLowerCase().includes(q);
          const matchName = img.filename.toLowerCase().includes(q);
          const matchMake = img.exif?.make?.toLowerCase().includes(q);
          const matchModel = img.exif?.model?.toLowerCase().includes(q);

          if (matchSha || matchName || matchMake || matchModel) {
            results.push({
              id: `sr-img-${img.id}`,
              type: 'IMAGE',
              title: `Image Artifact: ${img.filename}`,
              description: `SHA-256: ${sha} | Dimensions: ${img.width || '?'}x${img.height || '?'}`,
              matchedField: matchSha ? 'SHA-256 Hash' : matchName ? 'Filename' : 'EXIF Metadata',
              matchedValue: matchSha ? sha : img.filename,
              caseId: img.caseId,
              artifactId: img.id,
              sourceEvidenceId: img.evidenceId,
              timestamp: img.createdAt,
            });
          }
        }
      }
    }

    // 7. Image OCR Text Search
    if (matchesType('OCR')) {
      const ocrList = await ImageOcrRepository.getByCaseId(caseIdFilter);
      for (const ocr of ocrList) {
        if (matchesCase(ocr.caseId)) {
          const text = ocr.text || '';
          if (text.toLowerCase().includes(q)) {
            results.push({
              id: `sr-ocr-${ocr.id}`,
              type: 'OCR',
              title: `OCR Text Match`,
              description: `Extracted: "${text.substring(0, 100)}..."`,
              matchedField: 'OCR Extracted Text',
              matchedValue: text,
              caseId: ocr.caseId,
              artifactId: ocr.imageArtifactId,
              timestamp: ocr.analyzedAt,
            });
          }
        }
      }
    }

    // 8. Timeline Events Search
    if (matchesType('TIMELINE') && caseIdFilter !== 'ALL') {
      const timelineEvents = await TimelineService.getEventsForCase(caseIdFilter);
      for (const te of timelineEvents) {
        if (te.title.toLowerCase().includes(q) || (te.description && te.description.toLowerCase().includes(q))) {
          results.push({
            id: `sr-tl-${te.id}`,
            type: 'TIMELINE',
            title: te.title,
            description: te.description,
            matchedField: 'Timeline Description',
            matchedValue: te.title,
            caseId: te.caseId,
            artifactId: te.sourceId,
            sourceEvidenceId: te.sourceEvidenceId,
            timestamp: te.timestamp,
            browser: te.browser,
          });
        }
      }
    }

    return results;
  }
}
