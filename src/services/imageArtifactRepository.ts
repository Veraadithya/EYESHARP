import { db } from '../db';
import type { ImageArtifact } from '../types';

export class ImageArtifactRepository {
  static async create(artifact: ImageArtifact): Promise<string> {
    return await db.imageArtifacts.add(artifact);
  }

  static async getById(id: string): Promise<ImageArtifact | undefined> {
    return await db.imageArtifacts.get(id);
  }

  static async getByEvidenceId(evidenceId: string): Promise<ImageArtifact | undefined> {
    return await db.imageArtifacts.where('evidenceId').equals(evidenceId).first();
  }

  static async getByCaseId(caseId: string): Promise<ImageArtifact[]> {
    return await db.imageArtifacts.where('caseId').equals(caseId).toArray();
  }

  static async getAll(): Promise<ImageArtifact[]> {
    return await db.imageArtifacts.toArray();
  }

  static async update(id: string, changes: Partial<ImageArtifact>): Promise<number> {
    return await db.imageArtifacts.update(id, changes);
  }

  static async toggleBookmark(id: string): Promise<boolean> {
    const artifact = await db.imageArtifacts.get(id);
    if (!artifact) return false;
    const newBookmarked = !artifact.bookmarked;
    await db.imageArtifacts.update(id, { bookmarked: newBookmarked });
    return newBookmarked;
  }

  static async delete(id: string): Promise<void> {
    await db.imageArtifacts.delete(id);
  }

  static async deleteByEvidenceId(evidenceId: string): Promise<void> {
    const artifact = await this.getByEvidenceId(evidenceId);
    if (artifact) {
      await db.imageArtifacts.delete(artifact.id);
    }
  }
}
