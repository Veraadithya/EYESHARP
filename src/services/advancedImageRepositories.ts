import { db } from '../db';
import type {
  ImageDuplicateGroup,
  ImageSimilarityResult,
  ImageOcrResult,
  ImageForensicIndicator,
} from '../types';

export const ImageDuplicateRepository = {
  async getAll(): Promise<ImageDuplicateGroup[]> {
    return db.imageDuplicateGroups.orderBy('detectedAt').reverse().toArray();
  },

  async getByCaseId(caseId: string): Promise<ImageDuplicateGroup[]> {
    return db.imageDuplicateGroups.where('caseId').equals(caseId).toArray();
  },

  async saveGroup(group: ImageDuplicateGroup): Promise<void> {
    await db.imageDuplicateGroups.put(group);
  },

  async clearCaseGroups(caseId: string): Promise<void> {
    const caseGroups = await db.imageDuplicateGroups.where('caseId').equals(caseId).toArray();
    const ids = caseGroups.map((g) => g.id);
    if (ids.length > 0) {
      await db.imageDuplicateGroups.bulkDelete(ids);
    }
  },
};

export const ImageSimilarityRepository = {
  async getAll(): Promise<ImageSimilarityResult[]> {
    return db.imageSimilarityResults.orderBy('similarity').reverse().toArray();
  },

  async getByCaseId(caseId: string): Promise<ImageSimilarityResult[]> {
    return db.imageSimilarityResults.where('caseId').equals(caseId).toArray();
  },

  async getForImage(imageId: string): Promise<ImageSimilarityResult[]> {
    return db.imageSimilarityResults
      .where('sourceImageId')
      .equals(imageId)
      .or('targetImageId')
      .equals(imageId)
      .toArray();
  },

  async saveResult(result: ImageSimilarityResult): Promise<void> {
    await db.imageSimilarityResults.put(result);
  },
};

export const ImageOcrRepository = {
  async getByImageId(imageId: string): Promise<ImageOcrResult | undefined> {
    return db.imageOcrResults.where('imageArtifactId').equals(imageId).first();
  },

  async getByCaseId(caseId: string): Promise<ImageOcrResult[]> {
    return db.imageOcrResults.where('caseId').equals(caseId).toArray();
  },

  async searchOcrText(query: string, caseId?: string): Promise<ImageOcrResult[]> {
    const q = query.toLowerCase();
    let all = await db.imageOcrResults.toArray();
    if (caseId && caseId !== 'ALL') {
      all = all.filter((r) => r.caseId === caseId);
    }
    return all.filter((r) => r.text.toLowerCase().includes(q));
  },

  async saveResult(result: ImageOcrResult): Promise<void> {
    await db.imageOcrResults.put(result);
  },
};

export const ImageIndicatorRepository = {
  async getByImageId(imageId: string): Promise<ImageForensicIndicator[]> {
    return db.imageIndicators.where('imageArtifactId').equals(imageId).toArray();
  },

  async getByCaseId(caseId: string): Promise<ImageForensicIndicator[]> {
    return db.imageIndicators.where('caseId').equals(caseId).toArray();
  },

  async saveIndicators(imageId: string, indicators: ImageForensicIndicator[]): Promise<void> {
    const existing = await db.imageIndicators.where('imageArtifactId').equals(imageId).toArray();
    if (existing.length > 0) {
      await db.imageIndicators.bulkDelete(existing.map((i) => i.id));
    }
    if (indicators.length > 0) {
      await db.imageIndicators.bulkAdd(indicators);
    }
  },
};
