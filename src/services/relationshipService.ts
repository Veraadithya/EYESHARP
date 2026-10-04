import { RelationshipRepository } from './relationshipRepository';
import { ImageArtifactRepository } from './imageArtifactRepository';
import {
  ImageDuplicateRepository,
  ImageSimilarityRepository,
} from './advancedImageRepositories';
import {
  BrowserEvidenceRepository,
  BrowserDownloadRepository,
} from './browserRepositories';
import { EvidenceRepository } from './repositories';
import type { ArtifactRelationship } from '../types';

export class RelationshipService {
  /**
   * Generates and returns strictly evidence-based relationships for a case.
   * Derives provenance, exact duplicate clusters, perceptual similarity, and download linkages.
   */
  static async getRelationshipsForCase(caseId: string): Promise<ArtifactRelationship[]> {
    const relationships: ArtifactRelationship[] = [];
    const nowIso = new Date().toISOString();

    // 1. Stored Relationships from DB
    const stored = await RelationshipRepository.getByCaseId(caseId);
    relationships.push(...stored);

    // 2. Derive Provenance: EvidenceItem -> ImageArtifact (DERIVED_FROM)
    const images = await ImageArtifactRepository.getByCaseId(caseId);
    for (const img of images) {
      relationships.push({
        id: `rel-prov-img-${img.id}`,
        caseId,
        sourceType: 'IMAGE_ARTIFACT',
        sourceId: img.id,
        targetType: 'EVIDENCE',
        targetId: img.evidenceId,
        relationType: 'DERIVED_FROM',
        confidence: 'EXPLICIT',
        createdAt: img.createdAt || nowIso,
        evidence: { description: `Image artifact extracted from evidence file` },
      });
    }

    // 3. Derive Provenance: EvidenceItem -> BrowserEvidence -> BrowserHistory/Downloads
    const browserEvidences = await BrowserEvidenceRepository.getByCaseId(caseId);
    for (const be of browserEvidences) {
      relationships.push({
        id: `rel-prov-be-${be.id}`,
        caseId,
        sourceType: 'BROWSER_EVIDENCE',
        sourceId: be.id,
        targetType: 'EVIDENCE',
        targetId: be.evidenceId,
        relationType: 'DERIVED_FROM',
        confidence: 'EXPLICIT',
        createdAt: be.importedAt || nowIso,
        evidence: { description: `Browser database extracted from evidence file` },
      });
    }

    // 4. Derive Image Exact Duplicates (DUPLICATE_OF)
    const duplicateGroups = await ImageDuplicateRepository.getByCaseId(caseId);
    for (const dup of duplicateGroups) {
      const dupImages = images.filter((i) => i.sha256 === dup.hash);
      for (let i = 0; i < dupImages.length; i++) {
        for (let j = i + 1; j < dupImages.length; j++) {
          const imgA = dupImages[i]!;
          const imgB = dupImages[j]!;
          relationships.push({
            id: `rel-dup-${imgA.id}-${imgB.id}`,
            caseId,
            sourceType: 'IMAGE_ARTIFACT',
            sourceId: imgA.id,
            targetType: 'IMAGE_ARTIFACT',
            targetId: imgB.id,
            relationType: 'DUPLICATE_OF',
            confidence: 'EXPLICIT',
            createdAt: dup.detectedAt || nowIso,
            evidence: { sha256: dup.hash },
          });
        }
      }
    }

    // 5. Derive Image Perceptual Similarity (SIMILAR_TO)
    const similarities = await ImageSimilarityRepository.getByCaseId(caseId);
    for (const sim of similarities) {
      relationships.push({
        id: `rel-sim-${sim.id}`,
        caseId,
        sourceType: 'IMAGE_ARTIFACT',
        sourceId: sim.sourceImageId,
        targetType: 'IMAGE_ARTIFACT',
        targetId: sim.targetImageId,
        relationType: 'SIMILAR_TO',
        confidence: 'DERIVED',
        createdAt: sim.analyzedAt || nowIso,
        evidence: { algorithm: sim.algorithm, similarity: sim.similarity },
      });
    }

    // 6. Derive Browser Downloads -> Imported Evidence File Linkage (DOWNLOADED_FROM)
    const downloads = await BrowserDownloadRepository.getByCaseId(caseId);
    const allEvidence = await EvidenceRepository.getByCaseId(caseId);

    for (const dl of downloads) {
      if (dl.filename) {
        // Match downloaded file to imported evidence items by exact filename or path match
        const matchingEv = allEvidence.find(
          (ev) => ev.filename.toLowerCase() === dl.filename?.toLowerCase()
        );
        if (matchingEv) {
          relationships.push({
            id: `rel-dl-ev-${dl.id}-${matchingEv.id}`,
            caseId,
            sourceType: 'BROWSER_DOWNLOAD',
            sourceId: dl.id,
            targetType: 'EVIDENCE',
            targetId: matchingEv.id,
            relationType: 'DOWNLOADED_FROM',
            confidence: 'EXPLICIT',
            createdAt: dl.downloadTime || nowIso,
            evidence: { filename: dl.filename, downloadUrl: dl.downloadUrl },
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Returns all direct relationships connected to a single artifact.
   */
  static async getRelationshipsForArtifact(artifactId: string, caseId: string): Promise<ArtifactRelationship[]> {
    const allRel = await this.getRelationshipsForCase(caseId);
    return allRel.filter((r) => r.sourceId === artifactId || r.targetId === artifactId);
  }
}
