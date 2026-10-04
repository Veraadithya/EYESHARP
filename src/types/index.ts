export type CaseStatus = 'OPEN' | 'PAUSED' | 'CLOSED';

export interface InvestigationCase {
  id: string;
  caseId: string;
  name: string;
  description?: string;
  investigator?: string;
  createdAt: string;
  updatedAt: string;
  status: CaseStatus;
  evidenceCount: number;
  artifactCount: number;
  notes?: string;
}

export type AnalysisStatus = 'NOT_ANALYZED' | 'ANALYZING' | 'COMPLETED' | 'FAILED';

export interface EvidenceItem {
  id: string;
  caseId: string;
  filename: string;
  type: string;
  size: number;
  hash?: string;
  importedAt: string;
  source?: string;
  analysisStatus: AnalysisStatus;
  bookmarked: boolean;
}

export interface AuditLog {
  id: string;
  caseId?: string;
  action: string;
  description: string;
  entityType?: string;
  entityId?: string;
  timestamp: string;
}

export interface DomainEntityRelation {
  artifact?: string;
  sourceFile?: string;
  evidenceId: string;
  caseId: string;
}

/* Phase 2: Image Artifact & EXIF / GPS Domain Models */

export type ImageAnalysisStatus = 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';

export interface ImageExifMetadata {
  make?: string;
  model?: string;
  lensModel?: string;
  dateTimeOriginal?: string;
  exposureTime?: string;
  fNumber?: number;
  iso?: number;
  focalLength?: number;
  software?: string;
  orientation?: number;
}

export interface ImageGpsMetadata {
  latitude?: number;
  longitude?: number;
  altitude?: number;
}

export interface ImageArtifact {
  id: string;
  evidenceId: string;
  caseId: string;

  filename: string;
  mimeType: string;
  fileSize: number;

  width?: number;
  height?: number;
  aspectRatio?: number;

  sha256?: string;
  md5?: string;

  thumbnail?: string;

  exif?: ImageExifMetadata;
  gps?: ImageGpsMetadata;

  createdAt: string;
  analyzedAt?: string;

  analysisStatus: ImageAnalysisStatus;
  bookmarked?: boolean;

  dhash?: string;
  analysisVersion?: string;
}

/* Phase 3: Advanced Image Forensics Domain Models */

export interface ImageDuplicateGroup {
  id: string;
  caseId: string;
  hash: string;
  imageArtifactIds: string[];
  detectedAt: string;
}

export interface ImageSimilarityResult {
  id: string;
  caseId: string;
  sourceImageId: string;
  targetImageId: string;
  algorithm: 'dHash' | 'pHash' | 'aHash';
  distance: number;
  similarity: number; // Percentage 0 - 100
  threshold: number;
  analyzedAt: string;
}

export interface ImageOcrResult {
  id: string;
  caseId: string;
  imageArtifactId: string;
  text: string;
  language?: string;
  confidence?: number;
  engine: string;
  analyzedAt: string;
}

export type ImageIndicatorSeverity = 'INFO' | 'NOTICE' | 'REVIEW' | 'FLAGGED';

export interface ImageForensicIndicator {
  id: string;
  caseId: string;
  imageArtifactId: string;
  evidenceId?: string;
  category?: string;
  source?: 'EXIF' | 'OCR' | 'Visual analysis' | 'Metadata';
  confidence?: number;
  severity: ImageIndicatorSeverity;
  code: string;
  title: string;
  description: string;
  evidence?: Record<string, unknown>;
  createdAt: string;
}

/* Phase 4: Browser Evidence Analysis Domain Models */

export type SupportedBrowser = 'CHROME' | 'EDGE' | 'FIREFOX' | 'UNKNOWN';
export type BrowserArtifactType = 'HISTORY' | 'DOWNLOADS' | 'BOOKMARKS' | 'SEARCH_ACTIVITY' | 'AUTO_DETECT';
export type BrowserAnalysisStatus = 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';

export interface BrowserEvidence {
  id: string;
  evidenceId: string;
  caseId: string;
  browser: SupportedBrowser;
  artifactType: BrowserArtifactType;
  filename: string;
  fileSize: number;
  parserVersion: string;
  importedAt: string;
  analysisStatus: BrowserAnalysisStatus;
  analyzedAt?: string;
  recordCount?: number;
}

export interface BrowserHistoryArtifact {
  id: string;
  caseId: string;
  browserEvidenceId: string;
  sourceEvidenceId: string;
  browser: SupportedBrowser;
  url: string;
  title?: string;
  visitTime?: string; // ISO 8601
  visitCount?: number;
  domain?: string;
  rawTimestamp?: string | number;
  sourceFile: string;
  parserVersion: string;
  createdAt: string;
  bookmarked?: boolean;
}

export interface BrowserDownloadArtifact {
  id: string;
  caseId: string;
  browserEvidenceId: string;
  sourceEvidenceId: string;
  browser: SupportedBrowser;
  filename?: string;
  downloadUrl?: string;
  sourceUrl?: string;
  downloadTime?: string; // ISO 8601
  fileSize?: number;
  localPath?: string;
  mimeType?: string;
  sourceFile: string;
  parserVersion: string;
  createdAt: string;
  bookmarked?: boolean;
}

export interface BrowserBookmarkArtifact {
  id: string;
  caseId: string;
  browserEvidenceId: string;
  sourceEvidenceId: string;
  browser: SupportedBrowser;
  title?: string;
  url: string;
  folder?: string;
  createdAtBrowser?: string; // ISO 8601
  sourceFile: string;
  parserVersion: string;
  createdAt: string;
  bookmarked?: boolean;
}

export interface BrowserSearchArtifact {
  id: string;
  caseId: string;
  browserEvidenceId: string;
  sourceEvidenceId: string;
  browser: SupportedBrowser;
  searchEngine?: string;
  query: string;
  timestamp?: string; // ISO 8601
  sourceUrl: string;
  sourceFile: string;
  parserVersion: string;
  createdAt: string;
  bookmarked?: boolean;
}

/* Phase 5: Unified Investigation Correlation Domain Models */

export type TimelineEventType =
  | 'BROWSER_HISTORY'
  | 'BROWSER_DOWNLOAD'
  | 'BROWSER_SEARCH'
  | 'BROWSER_BOOKMARK'
  | 'IMAGE_IMPORTED'
  | 'IMAGE_ANALYZED'
  | 'IMAGE_OCR'
  | 'IMAGE_DUPLICATE'
  | 'IMAGE_SIMILARITY'
  | 'EVIDENCE_IMPORTED';

export interface InvestigationTimelineEvent {
  id: string;
  caseId: string;
  timestamp: string; // ISO 8601
  type: TimelineEventType;
  title: string;
  description?: string;
  sourceType: 'BROWSER' | 'IMAGE' | 'EVIDENCE';
  sourceId: string;
  sourceEvidenceId?: string;
  browser?: SupportedBrowser;
  metadata?: Record<string, unknown>;
}

export type ArtifactRelationType =
  | 'SOURCE_OF'
  | 'DERIVED_FROM'
  | 'DUPLICATE_OF'
  | 'SIMILAR_TO'
  | 'DOWNLOADED_FROM'
  | 'ASSOCIATED_WITH';

export interface ArtifactRelationship {
  id: string;
  caseId: string;
  sourceType: 'EVIDENCE' | 'BROWSER_EVIDENCE' | 'IMAGE_ARTIFACT' | 'BROWSER_DOWNLOAD' | 'BROWSER_HISTORY';
  sourceId: string;
  targetType: 'EVIDENCE' | 'BROWSER_EVIDENCE' | 'IMAGE_ARTIFACT' | 'BROWSER_DOWNLOAD' | 'BROWSER_HISTORY';
  targetId: string;
  relationType: ArtifactRelationType;
  confidence?: 'EXPLICIT' | 'DERIVED';
  createdAt: string;
  evidence?: Record<string, unknown>;
}

export type SearchResultType =
  | 'CASE'
  | 'EVIDENCE'
  | 'BROWSER_HISTORY'
  | 'BROWSER_DOWNLOAD'
  | 'BROWSER_BOOKMARK'
  | 'BROWSER_SEARCH'
  | 'IMAGE'
  | 'OCR'
  | 'TIMELINE';

export interface InvestigationSearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  description?: string;
  matchedField?: string;
  matchedValue?: string;
  caseId: string;
  artifactId: string;
  sourceEvidenceId?: string;
  timestamp?: string;
  browser?: SupportedBrowser;
}

/* Phase 6: Investigation Reporting Domain Models */

export const REPORT_VERSION = '1.0' as const;
export const GENERATOR_VERSION = 'EYESHARP Report Generator v1.0';
export const APP_VERSION = '1.0.0';

export interface CaseReportSummary {
  caseId: string;
  name: string;
  description?: string;
  investigator?: string;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
  evidenceCount: number;
  artifactCount: number;
}

export interface EvidenceReportEntry {
  id: string;
  filename: string;
  type: string;
  size: number;
  hash?: string;
  importedAt: string;
  source?: string;
  analysisStatus: AnalysisStatus;
  bookmarked: boolean;
  imageStatus?: ImageAnalysisStatus;
}

export interface ImageReportEntry {
  id: string;
  filename: string;
  evidenceId: string;
  width?: number;
  height?: number;
  mimeType: string;
  size: number;
  sha256?: string;
  hasExif: boolean;
  hasGps: boolean;
  hasOcr: boolean;
  ocrText?: string;
  analysisStatus: ImageAnalysisStatus;
  indicators: string[];
  exif?: Record<string, unknown>;
  gps?: Record<string, unknown>;
}

export interface ReportAuditEntry {
  action: string;
  description: string;
  timestamp: string;
  entityType?: string;
  entityId?: string;
}

export type ReportSectionKey =
  | 'caseInfo'
  | 'evidence'
  | 'images'
  | 'browser'
  | 'timeline'
  | 'relationships'
  | 'audit';

export interface ReportSections {
  caseInfo: boolean;
  evidence: boolean;
  images: boolean;
  browser: boolean;
  timeline: boolean;
  relationships: boolean;
  audit: boolean;
}

export interface InvestigationReport {
  id: string;
  reportVersion: string;
  generatorVersion: string;
  generatedAt: string;
  caseId: string;
  caseSummary: CaseReportSummary;
  evidence: EvidenceReportEntry[];
  images: ImageReportEntry[];
  browser: {
    totalHistory: number;
    totalDownloads: number;
    totalBookmarks: number;
    totalSearches: number;
    history: BrowserHistoryArtifact[];
    downloads: BrowserDownloadArtifact[];
    bookmarks: BrowserBookmarkArtifact[];
    searches: BrowserSearchArtifact[];
  };
  timeline: InvestigationTimelineEvent[];
  relationships: ArtifactRelationship[];
  auditLog: ReportAuditEntry[];
  sections: ReportSections;
  validationWarnings: string[];
}
