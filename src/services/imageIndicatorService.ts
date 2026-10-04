import { ImageIndicatorRepository } from './advancedImageRepositories';
import { AuditLogRepository } from './repositories';
import type { ImageArtifact, ImageForensicIndicator } from '../types';

export interface ComprehensiveScanInput {
  artifact: ImageArtifact;
  ocrText?: string;
  ocrConfidence?: number;
  visualDetections?: Array<{
    category: 'Violence-related visual indicator' | 'Weapon-related visual indicator' | 'Visual anomaly' | string;
    title: string;
    description: string;
    confidence?: number;
    evidence?: Record<string, unknown>;
  }>;
}

export const ImageIndicatorService = {
  /**
   * Generates neutral, evidence-based forensic indicators for an image artifact,
   * combining Metadata, EXIF anomalies, OCR text analysis, and Visual CV detections.
   *
   * ETHICAL / FORENSIC COMPLIANCE RULE:
   * Indicators are strictly restricted to observable visual, text, and technical metadata facts.
   * Never profile, label, or evaluate persons based on personal or protected characteristics.
   */
  async generateIndicators(
    artifact: ImageArtifact,
    ocrText?: string,
    ocrConfidence?: number,
    visualDetections?: ComprehensiveScanInput['visualDetections']
  ): Promise<ImageForensicIndicator[]> {
    const indicators: ImageForensicIndicator[] = [];
    const timestamp = new Date().toISOString();
    const evidenceId = artifact.evidenceId || artifact.id;

    // 1. EXIF Metadata & Anomaly Detection
    if (artifact.exif) {
      // General EXIF Present
      indicators.push({
        id: `ind-${Date.now()}-exif-${Math.random().toString(36).substring(2, 6)}`,
        caseId: artifact.caseId,
        imageArtifactId: artifact.id,
        evidenceId,
        category: 'Metadata anomaly',
        source: 'EXIF',
        severity: 'INFO',
        code: 'EXIF_METADATA_DETECTED',
        title: 'EXIF Metadata Present',
        description: 'Camera EXIF metadata structures detected in image header.',
        evidence: { exif: artifact.exif },
        createdAt: timestamp,
      });

      // Editing Software Detection (Metadata Anomaly)
      if (artifact.exif.software) {
        const sw = artifact.exif.software.toLowerCase();
        const editingKeywords = [
          'photoshop',
          'gimp',
          'lightroom',
          'paint',
          'snapseed',
          'canva',
          'affinity',
          'pixelmator',
          'corel',
        ];
        const isEditingTool = editingKeywords.some((k) => sw.includes(k));

        if (isEditingTool) {
          indicators.push({
            id: `ind-${Date.now()}-software-${Math.random().toString(36).substring(2, 6)}`,
            caseId: artifact.caseId,
            imageArtifactId: artifact.id,
            evidenceId,
            category: 'Metadata anomaly',
            source: 'EXIF',
            severity: 'REVIEW',
            code: 'EDITING_SOFTWARE_DETECTED',
            title: 'Metadata Anomaly (Processing Software Recorded)',
            description: `EXIF metadata header indicates modification using processing software: "${artifact.exif.software}".`,
            evidence: { software: artifact.exif.software },
            createdAt: timestamp,
          });
        }
      }

      // Timestamp Discrepancy (Metadata Anomaly)
      if (artifact.exif.dateTimeOriginal) {
        const exifTime = new Date(artifact.exif.dateTimeOriginal).getTime();
        const importTime = new Date(artifact.createdAt).getTime();

        if (!isNaN(exifTime) && Math.abs(importTime - exifTime) > 86400000) {
          indicators.push({
            id: `ind-${Date.now()}-timestamp-${Math.random().toString(36).substring(2, 6)}`,
            caseId: artifact.caseId,
            imageArtifactId: artifact.id,
            evidenceId,
            category: 'Metadata anomaly',
            source: 'EXIF',
            severity: 'REVIEW',
            code: 'TIMESTAMP_DISCREPANCY',
            title: 'Metadata Anomaly (Timestamp Discrepancy)',
            description: 'EXIF DateTimeOriginal differs significantly from system import timestamp (>24 hours).',
            evidence: {
              dateTimeOriginal: artifact.exif.dateTimeOriginal,
              importTimestamp: artifact.createdAt,
            },
            createdAt: timestamp,
          });
        }
      }
    } else {
      // EXIF Missing Anomaly
      indicators.push({
        id: `ind-${Date.now()}-no-exif-${Math.random().toString(36).substring(2, 6)}`,
        caseId: artifact.caseId,
        imageArtifactId: artifact.id,
        evidenceId,
        category: 'Metadata anomaly',
        source: 'Metadata',
        severity: 'NOTICE',
        code: 'NO_EXIF_METADATA',
        title: 'Metadata Anomaly (EXIF Strip / Missing)',
        description: 'No EXIF metadata structure was found in the image header.',
        createdAt: timestamp,
      });
    }

    // 2. GPS Location Geolocation Indicator
    if (artifact.gps) {
      indicators.push({
        id: `ind-${Date.now()}-gps-${Math.random().toString(36).substring(2, 6)}`,
        caseId: artifact.caseId,
        imageArtifactId: artifact.id,
        evidenceId,
        category: 'Metadata anomaly',
        source: 'EXIF',
        severity: 'INFO',
        code: 'GPS_LOCATION_DETECTED',
        title: 'GPS Geolocation Metadata Recorded',
        description: `Geolocation coordinates recorded (Lat: ${artifact.gps.latitude}, Long: ${artifact.gps.longitude}).`,
        evidence: { gps: artifact.gps },
        createdAt: timestamp,
      });
    }

    // 3. OCR Text Analysis Indicators
    if (ocrText && ocrText.trim().length > 0) {
      const lowerText = ocrText.toLowerCase();

      // Threat-related text patterns
      const threatKeywords = [
        'threat',
        'attack',
        'kill',
        'bomb',
        'weapon',
        'gun',
        'explosive',
        'hostage',
        'terror',
        'danger',
        'warning',
        'target',
        'destroy',
        'murder',
        'extort',
        'ransom',
      ];
      const matchedThreats = threatKeywords.filter((kw) => lowerText.includes(kw));

      if (matchedThreats.length > 0) {
        indicators.push({
          id: `ind-${Date.now()}-threat-text-${Math.random().toString(36).substring(2, 6)}`,
          caseId: artifact.caseId,
          imageArtifactId: artifact.id,
          evidenceId,
          category: 'Threat-related text',
          source: 'OCR',
          confidence: ocrConfidence || 85,
          severity: 'FLAGGED',
          code: 'POTENTIAL_THREAT_TEXT',
          title: 'Potential Threat-Related Text Detected',
          description: `Potential threat-related language detected in extracted image text: [${matchedThreats.join(', ')}].`,
          evidence: {
            extractedTextSnippet: ocrText.substring(0, 200),
            matchedKeywords: matchedThreats,
            confidence: ocrConfidence,
          },
          createdAt: timestamp,
        });
      }

      // Suspicious text patterns (e.g. passwords, bitcoin/crypto addresses, confidential labels)
      const suspiciousKeywords = [
        'confidential',
        'top secret',
        'classified',
        'password',
        'passcode',
        'private key',
        'seed phrase',
        'bank',
        'ssn',
        'credentials',
      ];
      const matchedSuspicious = suspiciousKeywords.filter((kw) => lowerText.includes(kw));

      if (matchedSuspicious.length > 0) {
        indicators.push({
          id: `ind-${Date.now()}-suspicious-text-${Math.random().toString(36).substring(2, 6)}`,
          caseId: artifact.caseId,
          imageArtifactId: artifact.id,
          evidenceId,
          category: 'Suspicious text',
          source: 'OCR',
          confidence: ocrConfidence || 80,
          severity: 'REVIEW',
          code: 'SUSPICIOUS_TEXT_DETECTED',
          title: 'Potential Indicator Detected (Sensitive Text)',
          description: `Sensitive or restricted textual indicators identified: [${matchedSuspicious.join(', ')}].`,
          evidence: {
            extractedTextSnippet: ocrText.substring(0, 200),
            matchedKeywords: matchedSuspicious,
            confidence: ocrConfidence,
          },
          createdAt: timestamp,
        });
      }
    }

    // 4. Visual Analysis Indicators (from Computer Vision Model layer)
    if (visualDetections && visualDetections.length > 0) {
      for (const det of visualDetections) {
        indicators.push({
          id: `ind-${Date.now()}-vis-${Math.random().toString(36).substring(2, 6)}`,
          caseId: artifact.caseId,
          imageArtifactId: artifact.id,
          evidenceId,
          category: det.category,
          source: 'Visual analysis',
          confidence: det.confidence,
          severity: det.category.includes('Violence') || det.category.includes('Weapon') ? 'FLAGGED' : 'REVIEW',
          code: det.category.toUpperCase().replace(/[^A_Z0-9]/g, '_'),
          title: det.title,
          description: det.description,
          evidence: det.evidence,
          createdAt: timestamp,
        });
      }
    }

    // Save indicators to DB
    await ImageIndicatorRepository.saveIndicators(artifact.id, indicators);

    // Audit log entries
    for (const ind of indicators) {
      await AuditLogRepository.log({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        caseId: artifact.caseId,
        action: 'IMAGE_INDICATOR_CREATED',
        description: `Forensic indicator [${ind.severity}] (${ind.category}): ${ind.title} for evidence ${artifact.filename}.`,
        entityType: 'IMAGE_FORENSIC_INDICATOR',
        entityId: ind.id,
        timestamp,
      });
    }

    return indicators;
  },
};
