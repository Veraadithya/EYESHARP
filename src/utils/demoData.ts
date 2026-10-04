import { CaseRepository, EvidenceRepository, AuditLogRepository } from '../services/repositories';
import type { InvestigationCase, EvidenceItem } from '../types';

export const DEMO_CASE_ID = 'CASE-2026-001';

export async function loadDemoData(): Promise<void> {
  const existingCase = await CaseRepository.getByCaseId(DEMO_CASE_ID);

  if (!existingCase) {
    const demoCase: InvestigationCase = {
      id: `case-demo-001`,
      caseId: DEMO_CASE_ID,
      name: 'Sample Digital Investigation',
      description: 'Corporate workstation investigation involving unauthorized file transfers and suspected web artifact tampering.',
      investigator: 'Forensic Analyst',
      createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'OPEN',
      evidenceCount: 5,
      artifactCount: 0,
      notes: 'Initial triage completed. Disk image and memory capture pending analysis.',
    };

    await CaseRepository.create(demoCase);
  }

  const existingEvidence = await EvidenceRepository.getByCaseId(DEMO_CASE_ID);
  if (existingEvidence.length === 0) {
    const sampleEvidence: EvidenceItem[] = [
      {
        id: `ev-demo-001`,
        caseId: DEMO_CASE_ID,
        filename: 'Chrome_History.sqlite',
        type: 'application/x-sqlite3',
        size: 4194304, // 4 MB
        hash: undefined, // Not calculated in Phase 1
        importedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        source: 'Target Workstation / AppData / Local / Google / Chrome / User Data',
        analysisStatus: 'NOT_ANALYZED',
        bookmarked: true,
      },
      {
        id: `ev-demo-002`,
        caseId: DEMO_CASE_ID,
        filename: 'browser_downloads.csv',
        type: 'text/csv',
        size: 524288, // 512 KB
        hash: undefined,
        importedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        source: 'Investigator Triage Export',
        analysisStatus: 'NOT_ANALYZED',
        bookmarked: false,
      },
      {
        id: `ev-demo-003`,
        caseId: DEMO_CASE_ID,
        filename: 'evidence-images.zip',
        type: 'application/zip',
        size: 15728640, // 15 MB
        hash: undefined,
        importedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        source: 'Target Disk Mount E:',
        analysisStatus: 'NOT_ANALYZED',
        bookmarked: true,
      },
      {
        id: `ev-demo-004`,
        caseId: DEMO_CASE_ID,
        filename: 'suspected-document.pdf',
        type: 'application/pdf',
        size: 2097152, // 2 MB
        hash: undefined,
        importedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
        source: 'Target User Downloads Directory',
        analysisStatus: 'NOT_ANALYZED',
        bookmarked: false,
      },
      {
        id: `ev-demo-005`,
        caseId: DEMO_CASE_ID,
        filename: 'photo-evidence-001.jpg',
        type: 'image/jpeg',
        size: 1048576, // 1 MB
        hash: undefined,
        importedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        source: 'Carved Unallocated Cluster 8921',
        analysisStatus: 'NOT_ANALYZED',
        bookmarked: true,
      },
    ];

    for (const item of sampleEvidence) {
      await EvidenceRepository.create(item);
    }
  }

  // Log demo creation audit event
  await AuditLogRepository.log({
    id: `audit-demo-init-${Date.now()}`,
    caseId: DEMO_CASE_ID,
    action: 'CASE_OPENED',
    description: `Sample investigation "${DEMO_CASE_ID}" loaded into active workstation session.`,
    timestamp: new Date().toISOString(),
  });
}
