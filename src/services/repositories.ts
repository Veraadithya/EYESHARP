import { db } from '../db';
import type { InvestigationCase, EvidenceItem, AuditLog } from '../types';

// Case Repository
export const CaseRepository = {
  async getAll(): Promise<InvestigationCase[]> {
    return db.cases.orderBy('updatedAt').reverse().toArray();
  },

  async getById(id: string): Promise<InvestigationCase | undefined> {
    return db.cases.get(id);
  },

  async getByCaseId(caseId: string): Promise<InvestigationCase | undefined> {
    return db.cases.where('caseId').equals(caseId).first();
  },

  async create(caseData: InvestigationCase): Promise<string> {
    await db.cases.add(caseData);
    await AuditLogRepository.log({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      caseId: caseData.caseId,
      action: 'CASE_CREATED',
      description: `Case "${caseData.name}" (${caseData.caseId}) created.`,
      entityType: 'CASE',
      entityId: caseData.id,
      timestamp: new Date().toISOString(),
    });
    return caseData.id;
  },

  async update(id: string, updates: Partial<InvestigationCase>): Promise<void> {
    await db.cases.update(id, { ...updates, updatedAt: new Date().toISOString() });
    const updated = await db.cases.get(id);
    if (updated) {
      await AuditLogRepository.log({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        caseId: updated.caseId,
        action: 'CASE_UPDATED',
        description: `Case "${updated.name}" updated.`,
        entityType: 'CASE',
        entityId: id,
        timestamp: new Date().toISOString(),
      });
    }
  },

  async delete(id: string): Promise<void> {
    const existing = await db.cases.get(id);
    if (existing) {
      // Clean up evidence related to this case
      const evidenceList = await db.evidence.where('caseId').equals(existing.caseId).toArray();
      const evidenceIds = evidenceList.map((e) => e.id);
      if (evidenceIds.length > 0) {
        await db.evidence.bulkDelete(evidenceIds);
      }
      await db.cases.delete(id);

      await AuditLogRepository.log({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        caseId: existing.caseId,
        action: 'CASE_DELETED',
        description: `Case "${existing.name}" (${existing.caseId}) deleted.`,
        entityType: 'CASE',
        entityId: id,
        timestamp: new Date().toISOString(),
      });
    }
  },

  async updateCounts(caseId: string): Promise<void> {
    const caseItem = await db.cases.where('caseId').equals(caseId).first();
    if (caseItem) {
      const evidenceCount = await db.evidence.where('caseId').equals(caseId).count();
      await db.cases.update(caseItem.id, {
        evidenceCount,
        updatedAt: new Date().toISOString(),
      });
    }
  },
};

// Evidence Repository
export const EvidenceRepository = {
  async getAll(): Promise<EvidenceItem[]> {
    return db.evidence.orderBy('importedAt').reverse().toArray();
  },

  async getByCaseId(caseId: string): Promise<EvidenceItem[]> {
    return db.evidence.where('caseId').equals(caseId).toArray();
  },

  async getById(id: string): Promise<EvidenceItem | undefined> {
    return db.evidence.get(id);
  },

  async create(evidenceData: EvidenceItem): Promise<string> {
    await db.evidence.add(evidenceData);
    await CaseRepository.updateCounts(evidenceData.caseId);
    await AuditLogRepository.log({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      caseId: evidenceData.caseId,
      action: 'EVIDENCE_IMPORTED',
      description: `Evidence file "${evidenceData.filename}" imported into case ${evidenceData.caseId}.`,
      entityType: 'EVIDENCE',
      entityId: evidenceData.id,
      timestamp: new Date().toISOString(),
    });
    return evidenceData.id;
  },

  async update(id: string, updates: Partial<EvidenceItem>): Promise<void> {
    await db.evidence.update(id, updates);
  },

  async toggleBookmark(id: string): Promise<boolean> {
    const item = await db.evidence.get(id);
    if (!item) return false;
    const newStatus = !item.bookmarked;
    await db.evidence.update(id, { bookmarked: newStatus });
    return newStatus;
  },

  async delete(id: string): Promise<void> {
    const item = await db.evidence.get(id);
    if (item) {
      await db.evidence.delete(id);
      await CaseRepository.updateCounts(item.caseId);
      await AuditLogRepository.log({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        caseId: item.caseId,
        action: 'EVIDENCE_REMOVED',
        description: `Evidence file "${item.filename}" removed from case ${item.caseId}.`,
        entityType: 'EVIDENCE',
        entityId: id,
        timestamp: new Date().toISOString(),
      });
    }
  },
};

// Audit Log Repository
export const AuditLogRepository = {
  async getAll(limit = 100): Promise<AuditLog[]> {
    return db.auditLogs.orderBy('timestamp').reverse().limit(limit).toArray();
  },

  async getByCaseId(caseId: string, limit = 50): Promise<AuditLog[]> {
    return db.auditLogs
      .where('caseId')
      .equals(caseId)
      .reverse()
      .limit(limit)
      .toArray();
  },

  async log(logItem: AuditLog): Promise<string> {
    await db.auditLogs.add(logItem);
    return logItem.id;
  },
};
