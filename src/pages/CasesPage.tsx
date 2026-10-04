import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  FolderOpen,
  Trash2,
  X,
  ArrowLeft,
} from 'lucide-react';
import { CaseRepository, EvidenceRepository, AuditLogRepository } from '../services/repositories';
import { useCaseStore } from '../stores';
import type { InvestigationCase, CaseStatus, EvidenceItem, AuditLog } from '../types';
import { formatDate, generateCaseId, formatBytes } from '../utils/formatters';

export const CasesPage: React.FC = () => {
  const { activeCase, setActiveCase } = useCaseStore();
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Selected Case Detail View State
  const [viewingCase, setViewingCase] = useState<InvestigationCase | null>(null);
  const [caseEvidence, setCaseEvidence] = useState<EvidenceItem[]>([]);
  const [caseAuditLogs, setCaseAuditLogs] = useState<AuditLog[]>([]);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [investigator, setInvestigator] = useState('Forensic Analyst');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<CaseStatus>('OPEN');

  const loadCases = async () => {
    setLoading(true);
    const data = await CaseRepository.getAll();
    setCases(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCases();
  }, []);

  const openCaseDetail = async (c: InvestigationCase) => {
    setActiveCase(c);
    setViewingCase(c);
    const evidence = await EvidenceRepository.getByCaseId(c.caseId);
    const logs = await AuditLogRepository.getByCaseId(c.caseId);
    setCaseEvidence(evidence);
    setCaseAuditLogs(logs);

    await AuditLogRepository.log({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      caseId: c.caseId,
      action: 'CASE_OPENED',
      description: `Case "${c.name}" (${c.caseId}) opened in workstation.`,
      entityType: 'CASE',
      entityId: c.id,
      timestamp: new Date().toISOString(),
    });
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const autoId = generateCaseId(cases.length + 1);
    const newCase: InvestigationCase = {
      id: `case-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      caseId: autoId,
      name: name.trim(),
      description: description.trim() || undefined,
      investigator: investigator.trim() || 'Unassigned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status,
      evidenceCount: 0,
      artifactCount: 0,
      notes: notes.trim() || undefined,
    };

    await CaseRepository.create(newCase);
    setIsCreateModalOpen(false);
    setName('');
    setDescription('');
    setNotes('');
    loadCases();
  };

  const handleDeleteCase = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this case and its associated evidence records?')) {
      await CaseRepository.delete(id);
      if (activeCase?.id === id) {
        setActiveCase(null);
      }
      if (viewingCase?.id === id) {
        setViewingCase(null);
      }
      loadCases();
    }
  };

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.caseId.toLowerCase().includes(search.toLowerCase()) ||
      (c.investigator && c.investigator.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Render Full Case Detail View if viewing a specific case
  if (viewingCase) {
    const bookmarkedCount = caseEvidence.filter((e) => e.bookmarked).length;

    return (
      <div className="space-y-5">
        {/* Back Button & Case Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewingCase(null)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All Cases
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-mono text-slate-900">{viewingCase.caseId}</h1>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${viewingCase.status === 'OPEN'
                    ? 'bg-emerald-100 text-emerald-800'
                    : viewingCase.status === 'PAUSED'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-200 text-slate-700'
                    }`}
                >
                  {viewingCase.status}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-800">{viewingCase.name}</p>
            </div>
          </div>
        </div>

        {/* Case Metrics Bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
            <span className="text-[10px] font-semibold uppercase text-slate-500 font-mono">Evidence Items</span>
            <p className="text-xl font-bold font-mono text-slate-900 mt-0.5">{caseEvidence.length}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
            <span className="text-[10px] font-semibold uppercase text-slate-500 font-mono">Parsed Artifacts</span>
            <p className="text-xl font-bold font-mono text-slate-900 mt-0.5">{viewingCase.artifactCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
            <span className="text-[10px] font-semibold uppercase text-slate-500 font-mono">Timeline Events</span>
            <p className="text-xl font-bold font-mono text-slate-900 mt-0.5">0</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
            <span className="text-[10px] font-semibold uppercase text-slate-500 font-mono">Bookmarked Items</span>
            <p className="text-xl font-bold font-mono text-slate-900 mt-0.5">{bookmarkedCount}</p>
          </div>
        </div>

        {/* Metadata Details & Notes Grid */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono border-b border-slate-200 pb-2">
              Case Metadata & Scope
            </h2>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block">Investigator Lead:</span>
                <span className="font-medium text-slate-900">{viewingCase.investigator || 'Unassigned'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Created Date:</span>
                <span className="font-mono text-slate-800">{formatDate(viewingCase.createdAt)}</span>
              </div>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-xs">Description:</span>
              <p className="text-xs text-slate-700 mt-0.5">{viewingCase.description || 'No description provided.'}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block text-xs">Investigation Notes:</span>
              <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 font-mono mt-0.5">
                {viewingCase.notes || 'No triage notes entered.'}
              </p>
            </div>
          </div>

          {/* Case Audit Activity */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono border-b border-slate-200 pb-2">
              Case Audit Trail
            </h2>
            {caseAuditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No case events logged.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100 text-xs max-h-48 overflow-y-auto">
                {caseAuditLogs.map((log) => (
                  <li key={log.id} className="py-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span className="font-bold text-slate-700">{log.action}</span>
                      <span>{formatDate(log.timestamp)}</span>
                    </div>
                    <p className="text-[11px] text-slate-700 mt-0.5">{log.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Evidence Preview List */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono border-b border-slate-200 pb-3">
            Associated Evidence Files ({caseEvidence.length})
          </h2>
          {caseEvidence.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No evidence files associated with case {viewingCase.caseId} yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs mt-2">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                  <th className="py-2 px-3">Filename</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Size</th>
                  <th className="py-2 px-3">Imported</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {caseEvidence.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-900">{item.filename}</td>
                    <td className="py-2.5 px-3 text-slate-500">{item.type}</td>
                    <td className="py-2.5 px-3 text-slate-700">{formatBytes(item.size)}</td>
                    <td className="py-2.5 px-3 text-slate-500">{formatDate(item.importedAt)}</td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                        {item.analysisStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  // Main Cases List View
  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-mono tracking-tight">
            Case Management
          </h1>
          <p className="text-xs text-slate-500">
            Create, view, and organize forensic investigation cases.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Create Case
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter cases by ID or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-md border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-hidden focus:ring-1 focus:ring-slate-500 font-mono w-64"
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-mono text-slate-700 focus:border-slate-500 focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="PAUSED">PAUSED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          Showing {filteredCases.length} of {cases.length} cases
        </div>
      </div>

      {/* Cases List / Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500 font-mono">
          Loading investigation database...
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white py-16 px-4 text-center shadow-2xs">
          <FolderOpen className="mx-auto h-8 w-8 text-slate-300" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900">No investigations yet</h3>
          <p className="mt-1 text-xs text-slate-500">
            Create your first digital forensic investigation case to begin.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5" />
            New Case
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                <th className="py-2.5 px-3">Case ID</th>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Investigator</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Evidence</th>
                <th className="py-2.5 px-3">Last Modified</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
              {filteredCases.map((c) => {
                const isActive = activeCase?.id === c.id;
                return (
                  <tr
                    key={c.id}
                    onClick={() => openCaseDetail(c)}
                    className={`cursor-pointer hover:bg-slate-50/80 transition-colors ${isActive ? 'bg-slate-100/70' : ''
                      }`}
                  >
                    <td className="py-3 px-3 font-bold text-slate-900">{c.caseId}</td>
                    <td className="py-3 px-3 font-sans font-medium text-slate-900">
                      {c.name}
                      {c.description && (
                        <span className="block text-[11px] font-normal text-slate-500 truncate max-w-xs">
                          {c.description}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-700">{c.investigator || 'Unassigned'}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.status === 'OPEN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'PAUSED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                          }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{c.evidenceCount} items</td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {formatDate(c.updatedAt)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openCaseDetail(c)}
                          className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${isActive
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                            }`}
                        >
                          {isActive ? 'Active' : 'Open'}
                        </button>
                        <button
                          onClick={(e) => handleDeleteCase(c.id, e)}
                          aria-label="Delete Case"
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Case Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 font-mono">
                Create Investigation Case
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Generated Case ID
                </label>
                <input
                  type="text"
                  value={generateCaseId(cases.length + 1)}
                  disabled
                  className="w-full rounded border border-slate-200 bg-slate-100 px-2.5 py-1.5 font-mono text-slate-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Case Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Target Host Compromise Investigation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-slate-900 focus:border-slate-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief context regarding the scope of investigation..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-slate-900 focus:border-slate-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Investigator</label>
                  <input
                    type="text"
                    value={investigator}
                    onChange={(e) => setInvestigator(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-slate-900 focus:border-slate-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CaseStatus)}
                    className="w-full rounded border border-slate-300 px-2.5 py-1.5 font-mono text-slate-900 focus:border-slate-500 focus:outline-hidden"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional investigation notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-slate-900 focus:border-slate-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-slate-900 px-3 py-1.5 font-semibold text-white hover:bg-slate-800"
                >
                  Create Investigation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
