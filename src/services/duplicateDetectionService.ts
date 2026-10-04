import { ImageArtifactRepository } from './imageArtifactRepository';
import {
  ImageDuplicateRepository,
  ImageSimilarityRepository,
} from './advancedImageRepositories';
import { dHashProvider } from '../utils/perceptualHash';
import { AuditLogRepository } from './repositories';
import type { ImageArtifact, ImageDuplicateGroup, ImageSimilarityResult } from '../types';

export const DuplicateDetectionService = {
  /**
   * Identifies exact SHA-256 duplicate image groups across a case.
   */
  async detectExactDuplicates(caseId: string): Promise<ImageDuplicateGroup[]> {
    const images =
      caseId === 'ALL'
        ? await ImageArtifactRepository.getAll()
        : await ImageArtifactRepository.getByCaseId(caseId);

    // Group by SHA-256
    const hashMap: Record<string, string[]> = {};
    for (const img of images) {
      if (img.sha256) {
        if (!hashMap[img.sha256]) hashMap[img.sha256] = [];
        hashMap[img.sha256]!.push(img.id);
      }
    }

    const groups: ImageDuplicateGroup[] = [];
    const timestamp = new Date().toISOString();

    for (const [hash, artifactIds] of Object.entries(hashMap)) {
      if (artifactIds.length > 1) {
        const group: ImageDuplicateGroup = {
          id: `dup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          caseId: caseId === 'ALL' ? 'CASE-GLOBAL' : caseId,
          hash,
          imageArtifactIds: artifactIds,
          detectedAt: timestamp,
        };
        await ImageDuplicateRepository.saveGroup(group);
        groups.push(group);

        await AuditLogRepository.log({
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          caseId: group.caseId,
          action: 'IMAGE_DUPLICATE_DETECTED',
          description: `Exact SHA-256 duplicate group detected with ${artifactIds.length} images (Hash: ${hash.substring(0, 12)}...).`,
          entityType: 'IMAGE_DUPLICATE_GROUP',
          entityId: group.id,
          timestamp,
        });
      }
    }

    return groups;
  },

  /**
   * Computes dHash perceptual similarity matrix for images in a case.
   */
  async calculatePerceptualSimilarities(
    caseId: string,
    threshold: number = 75
  ): Promise<ImageSimilarityResult[]> {
    const images =
      caseId === 'ALL'
        ? await ImageArtifactRepository.getAll()
        : await ImageArtifactRepository.getByCaseId(caseId);

    // Ensure dHash is computed for each image with a thumbnail
    const processedImages: ImageArtifact[] = [];
    for (let img of images) {
      if (!img.dhash && img.thumbnail) {
        try {
          const dh = await dHashProvider.computeFromDataUrl(img.thumbnail);
          await ImageArtifactRepository.update(img.id, { dhash: dh });
          img = { ...img, dhash: dh };
        } catch (e) {
          console.error(`Failed to calculate dHash for image ${img.id}:`, e);
        }
      }
      if (img.dhash) {
        processedImages.push(img);
      }
    }

    const results: ImageSimilarityResult[] = [];
    const timestamp = new Date().toISOString();

    // Compare all unique pairs
    for (let i = 0; i < processedImages.length; i++) {
      for (let j = i + 1; j < processedImages.length; j++) {
        const imgA = processedImages[i]!;
        const imgB = processedImages[j]!;

        // Skip if exact same SHA-256
        if (imgA.sha256 && imgB.sha256 && imgA.sha256 === imgB.sha256) continue;

        const distance = dHashProvider.distance(imgA.dhash!, imgB.dhash!);
        const similarity = dHashProvider.calculateSimilarity(imgA.dhash!, imgB.dhash!);

        if (similarity >= threshold) {
          const simResult: ImageSimilarityResult = {
            id: `sim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            caseId: imgA.caseId,
            sourceImageId: imgA.id,
            targetImageId: imgB.id,
            algorithm: 'dHash',
            distance,
            similarity,
            threshold,
            analyzedAt: timestamp,
          };

          await ImageSimilarityRepository.saveResult(simResult);
          results.push(simResult);
        }
      }
    }

    return results;
  },
};
