import { db } from '../db';
import type {
  BrowserEvidence,
  BrowserHistoryArtifact,
  BrowserDownloadArtifact,
  BrowserBookmarkArtifact,
  BrowserSearchArtifact,
} from '../types';

export const BrowserEvidenceRepository = {
  async getAll(): Promise<BrowserEvidence[]> {
    return db.browserEvidence.orderBy('importedAt').reverse().toArray();
  },

  async getByCaseId(caseId: string): Promise<BrowserEvidence[]> {
    return db.browserEvidence.where('caseId').equals(caseId).toArray();
  },

  async getById(id: string): Promise<BrowserEvidence | undefined> {
    return db.browserEvidence.get(id);
  },

  async create(item: BrowserEvidence): Promise<void> {
    await db.browserEvidence.add(item);
  },

  async update(id: string, changes: Partial<BrowserEvidence>): Promise<void> {
    await db.browserEvidence.update(id, changes);
  },
};

export const BrowserHistoryRepository = {
  async getAll(): Promise<BrowserHistoryArtifact[]> {
    return db.browserHistoryArtifacts.orderBy('visitTime').reverse().toArray();
  },

  async getByCaseId(caseId: string): Promise<BrowserHistoryArtifact[]> {
    if (caseId === 'ALL') return this.getAll();
    return db.browserHistoryArtifacts.where('caseId').equals(caseId).toArray();
  },

  async getByEvidenceId(browserEvidenceId: string): Promise<BrowserHistoryArtifact[]> {
    return db.browserHistoryArtifacts.where('browserEvidenceId').equals(browserEvidenceId).toArray();
  },

  async bulkAdd(items: BrowserHistoryArtifact[]): Promise<void> {
    if (items.length > 0) {
      await db.browserHistoryArtifacts.bulkAdd(items);
    }
  },

  async toggleBookmark(id: string): Promise<boolean> {
    const item = await db.browserHistoryArtifacts.get(id);
    if (!item) return false;
    const updated = !item.bookmarked;
    await db.browserHistoryArtifacts.update(id, { bookmarked: updated });
    return updated;
  },
};

export const BrowserDownloadRepository = {
  async getAll(): Promise<BrowserDownloadArtifact[]> {
    return db.browserDownloadArtifacts.orderBy('downloadTime').reverse().toArray();
  },

  async getByCaseId(caseId: string): Promise<BrowserDownloadArtifact[]> {
    if (caseId === 'ALL') return this.getAll();
    return db.browserDownloadArtifacts.where('caseId').equals(caseId).toArray();
  },

  async bulkAdd(items: BrowserDownloadArtifact[]): Promise<void> {
    if (items.length > 0) {
      await db.browserDownloadArtifacts.bulkAdd(items);
    }
  },

  async toggleBookmark(id: string): Promise<boolean> {
    const item = await db.browserDownloadArtifacts.get(id);
    if (!item) return false;
    const updated = !item.bookmarked;
    await db.browserDownloadArtifacts.update(id, { bookmarked: updated });
    return updated;
  },
};

export const BrowserBookmarkRepository = {
  async getAll(): Promise<BrowserBookmarkArtifact[]> {
    return db.browserBookmarkArtifacts.toArray();
  },

  async getByCaseId(caseId: string): Promise<BrowserBookmarkArtifact[]> {
    if (caseId === 'ALL') return this.getAll();
    return db.browserBookmarkArtifacts.where('caseId').equals(caseId).toArray();
  },

  async bulkAdd(items: BrowserBookmarkArtifact[]): Promise<void> {
    if (items.length > 0) {
      await db.browserBookmarkArtifacts.bulkAdd(items);
    }
  },

  async toggleBookmark(id: string): Promise<boolean> {
    const item = await db.browserBookmarkArtifacts.get(id);
    if (!item) return false;
    const updated = !item.bookmarked;
    await db.browserBookmarkArtifacts.update(id, { bookmarked: updated });
    return updated;
  },
};

export const BrowserSearchRepository = {
  async getAll(): Promise<BrowserSearchArtifact[]> {
    return db.browserSearchArtifacts.orderBy('timestamp').reverse().toArray();
  },

  async getByCaseId(caseId: string): Promise<BrowserSearchArtifact[]> {
    if (caseId === 'ALL') return this.getAll();
    return db.browserSearchArtifacts.where('caseId').equals(caseId).toArray();
  },

  async bulkAdd(items: BrowserSearchArtifact[]): Promise<void> {
    if (items.length > 0) {
      await db.browserSearchArtifacts.bulkAdd(items);
    }
  },

  async toggleBookmark(id: string): Promise<boolean> {
    const item = await db.browserSearchArtifacts.get(id);
    if (!item) return false;
    const updated = !item.bookmarked;
    await db.browserSearchArtifacts.update(id, { bookmarked: updated });
    return updated;
  },
};
