import Dexie, { type Table } from 'dexie';
import type {
  InvestigationCase,
  EvidenceItem,
  AuditLog,
  ImageArtifact,
  ImageDuplicateGroup,
  ImageSimilarityResult,
  ImageOcrResult,
  ImageForensicIndicator,
  BrowserEvidence,
  BrowserHistoryArtifact,
  BrowserDownloadArtifact,
  BrowserBookmarkArtifact,
  BrowserSearchArtifact,
  ArtifactRelationship,
} from '../types';

export class EyeSharpDatabase extends Dexie {
  cases!: Table<InvestigationCase, string>;
  evidence!: Table<EvidenceItem, string>;
  auditLogs!: Table<AuditLog, string>;
  imageArtifacts!: Table<ImageArtifact, string>;
  imageDuplicateGroups!: Table<ImageDuplicateGroup, string>;
  imageSimilarityResults!: Table<ImageSimilarityResult, string>;
  imageOcrResults!: Table<ImageOcrResult, string>;
  imageIndicators!: Table<ImageForensicIndicator, string>;
  browserEvidence!: Table<BrowserEvidence, string>;
  browserHistoryArtifacts!: Table<BrowserHistoryArtifact, string>;
  browserDownloadArtifacts!: Table<BrowserDownloadArtifact, string>;
  browserBookmarkArtifacts!: Table<BrowserBookmarkArtifact, string>;
  browserSearchArtifacts!: Table<BrowserSearchArtifact, string>;
  artifactRelationships!: Table<ArtifactRelationship, string>;

  constructor() {
    super('EyeSharpDB');
    this.version(1).stores({
      cases: 'id, caseId, name, status, createdAt, updatedAt',
      evidence: 'id, caseId, filename, type, importedAt, analysisStatus, bookmarked',
      auditLogs: 'id, caseId, action, timestamp',
    });

    this.version(2).stores({
      cases: 'id, caseId, name, status, createdAt, updatedAt',
      evidence: 'id, caseId, filename, type, importedAt, analysisStatus, bookmarked',
      auditLogs: 'id, caseId, action, timestamp',
      imageArtifacts: 'id, evidenceId, caseId, filename, mimeType, sha256, createdAt, analysisStatus, bookmarked',
    });

    this.version(3).stores({
      cases: 'id, caseId, name, status, createdAt, updatedAt',
      evidence: 'id, caseId, filename, type, importedAt, analysisStatus, bookmarked',
      auditLogs: 'id, caseId, action, timestamp',
      imageArtifacts: 'id, evidenceId, caseId, filename, mimeType, sha256, dhash, createdAt, analysisStatus, bookmarked',
      imageDuplicateGroups: 'id, caseId, hash, detectedAt',
      imageSimilarityResults: 'id, caseId, sourceImageId, targetImageId, algorithm, similarity, analyzedAt',
      imageOcrResults: 'id, caseId, imageArtifactId, engine, analyzedAt',
      imageIndicators: 'id, caseId, imageArtifactId, severity, code, createdAt',
    });

    this.version(4).stores({
      cases: 'id, caseId, name, status, createdAt, updatedAt',
      evidence: 'id, caseId, filename, type, importedAt, analysisStatus, bookmarked',
      auditLogs: 'id, caseId, action, timestamp',
      imageArtifacts: 'id, evidenceId, caseId, filename, mimeType, sha256, dhash, createdAt, analysisStatus, bookmarked',
      imageDuplicateGroups: 'id, caseId, hash, detectedAt',
      imageSimilarityResults: 'id, caseId, sourceImageId, targetImageId, algorithm, similarity, analyzedAt',
      imageOcrResults: 'id, caseId, imageArtifactId, engine, analyzedAt',
      imageIndicators: 'id, caseId, imageArtifactId, severity, code, createdAt',
      browserEvidence: 'id, evidenceId, caseId, browser, artifactType, filename, importedAt, analysisStatus',
      browserHistoryArtifacts: 'id, caseId, browserEvidenceId, sourceEvidenceId, browser, url, visitTime, domain, bookmarked',
      browserDownloadArtifacts: 'id, caseId, browserEvidenceId, sourceEvidenceId, browser, filename, downloadTime, bookmarked',
      browserBookmarkArtifacts: 'id, caseId, browserEvidenceId, sourceEvidenceId, browser, folder, url, bookmarked',
      browserSearchArtifacts: 'id, caseId, browserEvidenceId, sourceEvidenceId, browser, searchEngine, timestamp, bookmarked',
    });

    this.version(5).stores({
      cases: 'id, caseId, name, status, createdAt, updatedAt',
      evidence: 'id, caseId, filename, type, importedAt, analysisStatus, bookmarked',
      auditLogs: 'id, caseId, action, timestamp',
      imageArtifacts: 'id, evidenceId, caseId, filename, mimeType, sha256, dhash, createdAt, analysisStatus, bookmarked',
      imageDuplicateGroups: 'id, caseId, hash, detectedAt',
      imageSimilarityResults: 'id, caseId, sourceImageId, targetImageId, algorithm, similarity, analyzedAt',
      imageOcrResults: 'id, caseId, imageArtifactId, engine, analyzedAt',
      imageIndicators: 'id, caseId, imageArtifactId, severity, code, createdAt',
      browserEvidence: 'id, evidenceId, caseId, browser, artifactType, filename, importedAt, analysisStatus',
      browserHistoryArtifacts: 'id, caseId, browserEvidenceId, sourceEvidenceId, browser, url, visitTime, domain, bookmarked',
      browserDownloadArtifacts: 'id, caseId, browserEvidenceId, sourceEvidenceId, browser, filename, downloadTime, bookmarked',
      browserBookmarkArtifacts: 'id, caseId, browserEvidenceId, sourceEvidenceId, browser, folder, url, bookmarked',
      browserSearchArtifacts: 'id, caseId, browserEvidenceId, sourceEvidenceId, browser, searchEngine, timestamp, bookmarked',
      artifactRelationships: 'id, caseId, sourceType, sourceId, targetType, targetId, relationType, createdAt',
    });
  }
}

export const db = new EyeSharpDatabase();
