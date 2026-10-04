import { db } from '../db';
import type { ArtifactRelationship } from '../types';

export const RelationshipRepository = {
  async getAll(): Promise<ArtifactRelationship[]> {
    return db.artifactRelationships.toArray();
  },

  async getByCaseId(caseId: string): Promise<ArtifactRelationship[]> {
    return db.artifactRelationships.where('caseId').equals(caseId).toArray();
  },

  async getForArtifact(artifactId: string): Promise<ArtifactRelationship[]> {
    const asSource = await db.artifactRelationships.where('sourceId').equals(artifactId).toArray();
    const asTarget = await db.artifactRelationships.where('targetId').equals(artifactId).toArray();
    return [...asSource, ...asTarget];
  },

  async bulkAdd(items: ArtifactRelationship[]): Promise<void> {
    if (items.length > 0) {
      await db.artifactRelationships.bulkAdd(items);
    }
  },

  async create(item: ArtifactRelationship): Promise<void> {
    await db.artifactRelationships.add(item);
  },
};
