import { v4 as uuidv4 } from 'uuid';
import type { AuditLog } from '../types';
import {
  REPORT_VERSION,
  GENERATOR_VERSION,
  type InvestigationReport,
  type EvidenceReportEntry,
  type ImageReportEntry,
  type ReportAuditEntry,
  type ReportSections,
} from '../types';
import { CaseRepository, EvidenceRepository, AuditLogRepository } from './repositories';
import {
  BrowserHistoryRepository,
  BrowserDownloadRepository,
  BrowserBookmarkRepository,
  BrowserSearchRepository,
} from './browserRepositories';
import { ImageArtifactRepository } from './imageArtifactRepository';
import { ImageOcrRepository, ImageIndicatorRepository } from './advancedImageRepositories';
import { TimelineService } from './timelineService';
import { RelationshipService } from './relationshipService';

export type ReportProgress =
  | 'IDLE'
  | 'COLLECTING_CASE'
  | 'COLLECTING_EVIDENCE'
  | 'COLLECTING_IMAGES'
  | 'COLLECTING_BROWSER'
  | 'BUILDING_TIMELINE'
  | 'COLLECTING_RELATIONSHIPS'
  | 'COLLECTING_AUDIT'
  | 'VALIDATING'
  | 'COMPLETE';

export class ReportService {
  /**
   * Generates a deterministic InvestigationReport snapshot for a given case.
   * No data is fabricated — all sections come from the actual IndexedDB repositories.
   */
  static async generate(
    caseId: string,
    sections: ReportSections,
    onProgress?: (step: ReportProgress) => void
  ): Promise<InvestigationReport> {
    const reportId = uuidv4();
    const generatedAt = new Date().toISOString();
    const warnings: string[] = [];

    // 1. Case
    onProgress?.('COLLECTING_CASE');
    const allCases = await CaseRepository.getAll();
    const foundCase = allCases.find((c) => c.caseId === caseId);
    if (!foundCase) throw new Error(`Case ${caseId} not found`);

    const caseSummary = {
      caseId: foundCase.caseId,
      name: foundCase.name,
      description: foundCase.description,
      investigator: foundCase.investigator,
      status: foundCase.status,
      createdAt: foundCase.createdAt,
      updatedAt: foundCase.updatedAt,
      evidenceCount: foundCase.evidenceCount || 0,
      artifactCount: foundCase.artifactCount || 0,
    };

    // 2. Evidence
    onProgress?.('COLLECTING_EVIDENCE');
    const evidenceItems = await EvidenceRepository.getByCaseId(caseId);
    const imageArtifacts = await ImageArtifactRepository.getByCaseId(caseId);
    const imageEvidenceIds = new Set(imageArtifacts.map((img) => img.evidenceId));

    const evidence: EvidenceReportEntry[] = evidenceItems.map((ev) => {
      const imgArt = imageArtifacts.find((img) => img.evidenceId === ev.id);
      return {
        id: ev.id,
        filename: ev.filename,
        type: ev.type,
        size: ev.size,
        hash: ev.hash,
        importedAt: ev.importedAt,
        source: ev.source,
        analysisStatus: ev.analysisStatus,
        bookmarked: ev.bookmarked,
        imageStatus: imgArt?.analysisStatus,
      };
    });

    if (evidence.length === 0) {
      warnings.push('No evidence items found for this case.');
    }

    // 3. Images
    onProgress?.('COLLECTING_IMAGES');
    const images: ImageReportEntry[] = [];
    for (const img of imageArtifacts) {
      const ocr = await ImageOcrRepository.getByImageId(img.id);
      const indicators = await ImageIndicatorRepository.getByImageId(img.id);
      const linkedEvidence = evidenceItems.find((ev) => ev.id === img.evidenceId);
      if (!linkedEvidence) {
        warnings.push(`ImageArtifact ${img.id} (${img.filename}) references missing evidence ${img.evidenceId}`);
      }
      images.push({
        id: img.id,
        filename: img.filename,
        evidenceId: img.evidenceId,
        width: img.width,
        height: img.height,
        mimeType: img.mimeType,
        size: img.fileSize,
        sha256: img.sha256,
        hasExif: !!img.exif,
        hasGps: !!img.gps,
        hasOcr: !!ocr,
        ocrText: ocr?.text,
        analysisStatus: img.analysisStatus,
        indicators: indicators.map((i) => i.description || i.title),
        exif: img.exif as Record<string, unknown> | undefined,
        gps: img.gps as Record<string, unknown> | undefined,
      });
    }

    // 4. Browser
    onProgress?.('COLLECTING_BROWSER');
    const history = await BrowserHistoryRepository.getByCaseId(caseId);
    const downloads = await BrowserDownloadRepository.getByCaseId(caseId);
    const bookmarks = await BrowserBookmarkRepository.getByCaseId(caseId);
    const searches = await BrowserSearchRepository.getByCaseId(caseId);

    // Validate browser artifacts link back to existing evidence
    const browserEvidenceIds = new Set([
      ...history.map((h) => h.sourceEvidenceId),
      ...downloads.map((d) => d.sourceEvidenceId),
      ...bookmarks.map((b) => b.sourceEvidenceId),
      ...searches.map((s) => s.sourceEvidenceId),
    ]);
    for (const bId of browserEvidenceIds) {
      if (!evidenceItems.find((ev) => ev.id === bId)) {
        warnings.push(`Browser artifact references missing evidence ID: ${bId}`);
      }
    }

    const browser = {
      totalHistory: history.length,
      totalDownloads: downloads.length,
      totalBookmarks: bookmarks.length,
      totalSearches: searches.length,
      history,
      downloads,
      bookmarks,
      searches,
    };

    // 5. Timeline
    onProgress?.('BUILDING_TIMELINE');
    const timeline = sections.timeline
      ? await TimelineService.getEventsForCase(caseId)
      : [];

    // 6. Relationships
    onProgress?.('COLLECTING_RELATIONSHIPS');
    const relationships = sections.relationships
      ? await RelationshipService.getRelationshipsForCase(caseId)
      : [];

    // 7. Audit Log
    onProgress?.('COLLECTING_AUDIT');
    const auditRaw = await AuditLogRepository.getByCaseId(caseId, 500);
    const auditLog: ReportAuditEntry[] = auditRaw.map((a: AuditLog) => ({
      action: a.action,
      description: a.description,
      timestamp: a.timestamp,
      entityType: a.entityType,
      entityId: a.entityId,
    }));

    // 8. Validation
    onProgress?.('VALIDATING');
    if (images.length > 0 && !imageEvidenceIds.size) {
      warnings.push('Image artifacts found but no corresponding evidence items exist.');
    }

    const report: InvestigationReport = {
      id: reportId,
      reportVersion: REPORT_VERSION,
      generatorVersion: GENERATOR_VERSION,
      generatedAt,
      caseId,
      caseSummary,
      evidence,
      images,
      browser,
      timeline,
      relationships,
      auditLog,
      sections,
      validationWarnings: warnings,
    };

    onProgress?.('COMPLETE');
    return report;
  }

  /** Export serialized JSON */
  static toJSON(report: InvestigationReport): string {
    return JSON.stringify(
      {
        reportVersion: report.reportVersion,
        generator: 'EYESHARP',
        generatorVersion: report.generatorVersion,
        generatedAt: report.generatedAt,
        case: report.caseSummary,
        evidence: report.evidence,
        images: report.images,
        browser: {
          summary: {
            history: report.browser.totalHistory,
            downloads: report.browser.totalDownloads,
            bookmarks: report.browser.totalBookmarks,
            searches: report.browser.totalSearches,
          },
          history: report.browser.history,
          downloads: report.browser.downloads,
          bookmarks: report.browser.bookmarks,
          searches: report.browser.searches,
        },
        timeline: report.timeline,
        relationships: report.relationships,
        auditLog: report.auditLog,
        validationWarnings: report.validationWarnings,
      },
      null,
      2
    );
  }

  /** Generate self-contained HTML report */
  static toHTML(report: InvestigationReport): string {
    const fmt = (iso?: string) => {
      if (!iso) return 'N/A';
      try {
        return new Date(iso).toLocaleString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
      } catch { return iso; }
    };
    const fmtDate = (iso?: string) => {
      if (!iso) return 'N/A';
      try {
        return new Date(iso).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'long', year: 'numeric',
        });
      } catch { return iso; }
    };
    const esc = (s?: string | null) =>
      (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const bytes = (n?: number) =>
      n == null ? 'N/A' : n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${(n / 1024).toFixed(1)} KB`;

    const sectionHeader = (title: string, icon: string) =>
      `<div class="section-header"><span class="icon">${icon}</span>${title}</div>`;

    const evidenceRows = report.evidence
      .map(
        (ev) => `
        <tr>
          <td><code>${esc(ev.id.substring(0, 12))}…</code></td>
          <td>${esc(ev.filename)}</td>
          <td>${esc(ev.type)}</td>
          <td>${bytes(ev.size)}</td>
          <td><code>${esc(ev.hash?.substring(0, 16))}…</code></td>
          <td>${fmt(ev.importedAt)}</td>
          <td><span class="badge ${ev.analysisStatus}">${esc(ev.analysisStatus)}</span></td>
        </tr>`
      )
      .join('');

    const imageRows = report.images
      .map(
        (img) => `
        <tr>
          <td>${esc(img.filename)}</td>
          <td>${img.width && img.height ? `${img.width}×${img.height}` : 'N/A'}</td>
          <td>${esc(img.mimeType)}</td>
          <td>${bytes(img.size)}</td>
          <td><code>${esc(img.sha256?.substring(0, 16))}…</code></td>
          <td>${img.hasExif ? '✓' : '—'}</td>
          <td>${img.hasGps ? '✓' : '—'}</td>
          <td>${img.hasOcr ? '✓' : '—'}</td>
          <td><span class="badge ${img.analysisStatus}">${esc(img.analysisStatus)}</span></td>
        </tr>`
      )
      .join('');

    const historyRows = report.browser.history
      .slice(0, 200)
      .map(
        (h) => `
        <tr>
          <td>${fmt((h as { visitTime?: string }).visitTime)}</td>
          <td>${esc((h as { browser?: string }).browser)}</td>
          <td style="max-width:320px;word-break:break-all">${esc((h as { url?: string }).url)}</td>
          <td>${esc((h as { title?: string }).title)}</td>
          <td>${esc(String((h as { visitCount?: number }).visitCount ?? ''))}</td>
        </tr>`
      )
      .join('');

    const downloadRows = report.browser.downloads
      .slice(0, 100)
      .map(
        (d) => `
        <tr>
          <td>${esc((d as { filename?: string }).filename)}</td>
          <td>${esc((d as { browser?: string }).browser)}</td>
          <td>${fmt((d as { downloadTime?: string }).downloadTime)}</td>
          <td style="max-width:240px;word-break:break-all">${esc((d as { downloadUrl?: string }).downloadUrl)}</td>
          <td>${bytes((d as { fileSize?: number }).fileSize)}</td>
        </tr>`
      )
      .join('');

    const searchRows = report.browser.searches
      .slice(0, 100)
      .map(
        (s) => `
        <tr>
          <td>${esc((s as { searchEngine?: string }).searchEngine)}</td>
          <td>${esc((s as { query?: string }).query)}</td>
          <td>${fmt((s as { timestamp?: string }).timestamp)}</td>
          <td>${esc((s as { browser?: string }).browser)}</td>
        </tr>`
      )
      .join('');

    const timelineRows = report.timeline
      .slice(0, 300)
      .map(
        (ev) => `
        <tr>
          <td>${fmt(ev.timestamp)}</td>
          <td><span class="ev-type">${esc(ev.type)}</span></td>
          <td>${esc(ev.title)}</td>
          <td>${esc(ev.browser ?? ev.sourceType)}</td>
        </tr>`
      )
      .join('');

    const relRows = report.relationships
      .slice(0, 200)
      .map(
        (r) => `
        <tr>
          <td>${esc(r.sourceType)}</td>
          <td>${esc(r.sourceId.substring(0, 12))}…</td>
          <td><strong>${esc(r.relationType)}</strong></td>
          <td>${esc(r.targetType)}</td>
          <td>${esc(r.targetId.substring(0, 12))}…</td>
          <td>${esc(r.confidence ?? '')}</td>
        </tr>`
      )
      .join('');

    const auditRows = report.auditLog
      .slice(-100)
      .map(
        (a) => `
        <tr>
          <td>${fmt(a.timestamp)}</td>
          <td><code>${esc(a.action)}</code></td>
          <td>${esc(a.description)}</td>
          <td>${esc(a.entityType ?? '')}</td>
        </tr>`
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ForensicLens — ${esc(report.caseSummary.name)} — Investigation Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; background: #f8fafc; }
  .page { max-width: 1100px; margin: 0 auto; padding: 24px; }

  /* Cover */
  .cover { background: #0f172a; color: #f1f5f9; padding: 48px 40px; border-radius: 8px; margin-bottom: 32px; }
  .cover h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 6px; }
  .cover .sub { font-size: 13px; color: #94a3b8; margin-bottom: 28px; }
  .cover table { font-size: 12px; border-collapse: collapse; }
  .cover td { padding: 4px 20px 4px 0; color: #cbd5e1; }
  .cover td:first-child { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 10px; width: 180px; }
  .cover .badge-open { color: #4ade80; }
  .cover .badge-closed { color: #f87171; }

  /* Sections */
  .section { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 20px; overflow: hidden; }
  .section-header { background: #f1f5f9; border-bottom: 1px solid #e2e8f0; padding: 10px 16px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; display: flex; align-items: center; gap: 8px; }
  .section-header .icon { font-size: 13px; }
  .section-body { padding: 16px; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 6px 10px; text-align: left; font-weight: 700; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.4px; color: #64748b; }
  td { padding: 5px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #f8fafc; }
  code { font-family: 'Consolas', monospace; font-size: 10px; background: #f1f5f9; padding: 1px 4px; border-radius: 3px; }

  /* Badges */
  .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; }
  .badge.COMPLETED { background: #dcfce7; color: #166534; }
  .badge.FAILED { background: #fee2e2; color: #991b1b; }
  .badge.ANALYZING { background: #fef3c7; color: #92400e; }
  .badge.PENDING, .badge.NOT_ANALYZED { background: #f1f5f9; color: #475569; }
  .ev-type { font-family: monospace; font-size: 9.5px; background: #e2e8f0; padding: 1px 5px; border-radius: 3px; }

  /* Key-value pairs */
  .kv { display: grid; grid-template-columns: 180px 1fr; gap: 6px; }
  .kv .k { color: #64748b; font-weight: 600; }
  .kv .v { color: #1e293b; }

  /* Warning */
  .warning { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 4px; padding: 8px 12px; font-size: 10.5px; color: #92400e; margin: 12px 0; }

  /* Disclaimer */
  .disclaimer { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; font-size: 10.5px; line-height: 1.7; color: #475569; margin-bottom: 20px; }
  .disclaimer h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; color: #334155; }

  .footer { text-align: center; font-size: 10px; color: #94a3b8; padding: 16px 0; border-top: 1px solid #e2e8f0; margin-top: 24px; }

  @media print {
    body { background: #fff; }
    .page { padding: 0; }
    .cover { border-radius: 0; }
    .section { break-inside: avoid; }
    table { break-inside: auto; }
    tr { break-inside: avoid; }
    .footer { display: block; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Cover -->
  <div class="cover">
    <div style="font-size:12px;font-weight:800;letter-spacing:2px;color:#94a3b8;margin-bottom:12px;">FORENSICLENS</div>
    <h1>Digital Investigation Report</h1>
    <div class="sub">${report.generatorVersion}</div>
    <table>
      <tr><td>Case ID</td><td>${esc(report.caseSummary.caseId)}</td></tr>
      <tr><td>Case Name</td><td>${esc(report.caseSummary.name)}</td></tr>
      <tr><td>Investigator</td><td>${esc(report.caseSummary.investigator ?? 'Not specified')}</td></tr>
      <tr><td>Status</td><td class="badge-${report.caseSummary.status.toLowerCase()}">${esc(report.caseSummary.status)}</td></tr>
      <tr><td>Generated</td><td>${fmt(report.generatedAt)}</td></tr>
      <tr><td>Report ID</td><td><code>${report.id}</code></td></tr>
      <tr><td>Report Version</td><td>${report.reportVersion}</td></tr>
    </table>
  </div>

  ${report.validationWarnings.length > 0 ? `
  <div class="warning">
    ⚠ Validation Warnings (${report.validationWarnings.length}):<br/>
    ${report.validationWarnings.map(w => esc(w)).join('<br/>')}
  </div>` : ''}

  <!-- Case Information -->
  ${report.sections.caseInfo ? `
  <div class="section">
    ${sectionHeader('Case Information', '📁')}
    <div class="section-body">
      <div class="kv">
        <span class="k">Case ID:</span><span class="v">${esc(report.caseSummary.caseId)}</span>
        <span class="k">Case Name:</span><span class="v">${esc(report.caseSummary.name)}</span>
        <span class="k">Description:</span><span class="v">${esc(report.caseSummary.description ?? 'None')}</span>
        <span class="k">Investigator:</span><span class="v">${esc(report.caseSummary.investigator ?? 'Not specified')}</span>
        <span class="k">Status:</span><span class="v">${esc(report.caseSummary.status)}</span>
        <span class="k">Created:</span><span class="v">${fmtDate(report.caseSummary.createdAt)}</span>
        <span class="k">Last Modified:</span><span class="v">${fmtDate(report.caseSummary.updatedAt)}</span>
        <span class="k">Evidence Items:</span><span class="v">${report.evidence.length}</span>
      </div>
    </div>
  </div>` : ''}

  <!-- Evidence Inventory -->
  ${report.sections.evidence && report.evidence.length > 0 ? `
  <div class="section">
    ${sectionHeader(`Evidence Inventory (${report.evidence.length})`, '🗄️')}
    <div class="section-body" style="padding:0">
      <table>
        <thead><tr><th>ID</th><th>Filename</th><th>Type</th><th>Size</th><th>SHA-256</th><th>Imported</th><th>Status</th></tr></thead>
        <tbody>${evidenceRows}</tbody>
      </table>
    </div>
  </div>` : ''}

  <!-- Image Findings -->
  ${report.sections.images && report.images.length > 0 ? `
  <div class="section">
    ${sectionHeader(`Image Findings (${report.images.length})`, '🖼️')}
    <div class="section-body" style="padding:0">
      <table>
        <thead><tr><th>Filename</th><th>Dimensions</th><th>MIME</th><th>Size</th><th>SHA-256</th><th>EXIF</th><th>GPS</th><th>OCR</th><th>Status</th></tr></thead>
        <tbody>${imageRows}</tbody>
      </table>
      ${report.images.filter(img => img.hasExif).length > 0 ? `
      <div style="padding:16px">
        <strong style="font-size:10.5px;text-transform:uppercase;color:#475569;letter-spacing:0.4px">EXIF Metadata Detail</strong>
        ${report.images.filter(img => img.hasExif && img.exif).map(img => `
          <div style="margin-top:10px;padding:8px;background:#f8fafc;border-radius:4px;border:1px solid #e2e8f0">
            <div style="font-weight:700;margin-bottom:6px">${esc(img.filename)}</div>
            <div class="kv" style="font-size:10px">
              ${Object.entries(img.exif ?? {}).slice(0, 12).map(([k, v]) => `
                <span class="k">${esc(k)}:</span><span class="v">${esc(String(v ?? ''))}</span>
              `).join('')}
            </div>
          </div>`).join('')}
      </div>` : ''}
    </div>
  </div>` : ''}

  <!-- Browser Findings -->
  ${report.sections.browser ? `
  <div class="section">
    ${sectionHeader(`Browser Findings`, '🌐')}
    <div class="section-body">
      <div class="kv" style="margin-bottom:12px">
        <span class="k">History Entries:</span><span class="v">${report.browser.totalHistory.toLocaleString()}</span>
        <span class="k">Downloads:</span><span class="v">${report.browser.totalDownloads.toLocaleString()}</span>
        <span class="k">Bookmarks:</span><span class="v">${report.browser.totalBookmarks.toLocaleString()}</span>
        <span class="k">Search Queries:</span><span class="v">${report.browser.totalSearches.toLocaleString()}</span>
      </div>
      ${historyRows ? `<strong style="font-size:10.5px;text-transform:uppercase;color:#475569">Browser History (first 200)</strong>
      <table style="margin-top:6px">
        <thead><tr><th>Visited</th><th>Browser</th><th>URL</th><th>Title</th><th>Visits</th></tr></thead>
        <tbody>${historyRows}</tbody>
      </table>` : ''}
      ${downloadRows ? `<div style="margin-top:14px"><strong style="font-size:10.5px;text-transform:uppercase;color:#475569">Downloads</strong>
      <table style="margin-top:6px">
        <thead><tr><th>Filename</th><th>Browser</th><th>Downloaded</th><th>URL</th><th>Size</th></tr></thead>
        <tbody>${downloadRows}</tbody>
      </table></div>` : ''}
      ${searchRows ? `<div style="margin-top:14px"><strong style="font-size:10.5px;text-transform:uppercase;color:#475569">Search Activity</strong>
      <table style="margin-top:6px">
        <thead><tr><th>Engine</th><th>Query</th><th>Timestamp</th><th>Browser</th></tr></thead>
        <tbody>${searchRows}</tbody>
      </table></div>` : ''}
    </div>
  </div>` : ''}

  <!-- Timeline -->
  ${report.sections.timeline && report.timeline.length > 0 ? `
  <div class="section">
    ${sectionHeader(`Unified Timeline (${report.timeline.length} events)`, '⏱️')}
    <div class="section-body" style="padding:0">
      <table>
        <thead><tr><th>Timestamp</th><th>Type</th><th>Event</th><th>Source</th></tr></thead>
        <tbody>${timelineRows}</tbody>
      </table>
      ${report.timeline.length > 300 ? `<div style="padding:8px 16px;font-size:10px;color:#64748b">Showing first 300 of ${report.timeline.length} events.</div>` : ''}
    </div>
  </div>` : ''}

  <!-- Relationships -->
  ${report.sections.relationships && report.relationships.length > 0 ? `
  <div class="section">
    ${sectionHeader(`Artifact Relationships (${report.relationships.length})`, '🔗')}
    <div class="section-body" style="padding:0">
      <table>
        <thead><tr><th>Source Type</th><th>Source ID</th><th>Relationship</th><th>Target Type</th><th>Target ID</th><th>Confidence</th></tr></thead>
        <tbody>${relRows}</tbody>
      </table>
    </div>
  </div>` : ''}

  <!-- Audit Log -->
  ${report.sections.audit && report.auditLog.length > 0 ? `
  <div class="section">
    ${sectionHeader(`Audit History (last 100 entries)`, '📋')}
    <div class="section-body" style="padding:0">
      <table>
        <thead><tr><th>Timestamp</th><th>Action</th><th>Description</th><th>Entity</th></tr></thead>
        <tbody>${auditRows}</tbody>
      </table>
    </div>
  </div>` : ''}

  <!-- Disclaimer -->
  <div class="disclaimer">
    <h3>Analysis Scope &amp; Forensic Disclaimer</h3>
    <p>This report contains observations and artifacts extracted by ForensicLens from evidence provided to the application. Similarity scores, metadata observations, OCR results, and automatically generated indicators are analytical outputs and should be interpreted in conjunction with the underlying evidence.</p>
    <p style="margin-top:8px">ForensicLens does not make determinations of guilt, authenticity, intent, or causation. All findings are for investigative support purposes only and are subject to independent expert review.</p>
  </div>

  <div class="footer">
    Generated by ${esc(report.generatorVersion)} · Report ID: ${report.id} · ${fmt(report.generatedAt)}
  </div>

</div>
</body>
</html>`;
  }

  /** Trigger browser file download */
  static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Export HTML file */
  static exportHTML(report: InvestigationReport): void {
    const html = this.toHTML(report);
    const filename = `forensiclens-report-${report.caseSummary.caseId}-${report.id.substring(0, 8)}.html`;
    this.downloadFile(html, filename, 'text/html;charset=utf-8');
  }

  /** Export JSON file */
  static exportJSON(report: InvestigationReport): void {
    const json = this.toJSON(report);
    const filename = `forensiclens-report-${report.caseSummary.caseId}-${report.id.substring(0, 8)}.json`;
    this.downloadFile(json, filename, 'application/json;charset=utf-8');
  }

  /** Export PDF via browser print dialog (most reliable cross-browser approach) */
  static async exportPDF(report: InvestigationReport): Promise<void> {
    const html = this.toHTML(report);
    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) {
      throw new Error('Unable to open print window. Please allow popups for this site.');
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    // Brief delay for rendering before triggering print
    await new Promise((res) => setTimeout(res, 800));
    printWindow.print();
  }

  /** Generate filename-safe report slug */
  static reportSlug(report: InvestigationReport): string {
    return `${report.caseSummary.caseId}-${report.id.substring(0, 8)}`;
  }
}
