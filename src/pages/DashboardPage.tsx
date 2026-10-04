import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  HardDrive,
  Globe,
  Image as ImageIcon,
  Clock,
  Bookmark,
  Plus,
  Upload,
  FolderOpen,
  ArrowRight,
  Database,
} from 'lucide-react';
import { CaseRepository, EvidenceRepository, AuditLogRepository } from '../services/repositories';
import { useCaseStore } from '../stores';
import { loadDemoData } from '../utils/demoData';
import type { InvestigationCase, AuditLog } from '../types';
import { formatDate } from '../utils/formatters';

interface SummaryCardProps {
  title: string;
  count: number | string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, count, icon: Icon, description }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </span>
      <div className="rounded bg-slate-100 p-1.5 text-slate-700">
        <Icon className="h-4 w-4" />
      </div>
    </div>
    <div className="mt-2 flex items-baseline justify-between">
      <span className="text-2xl font-bold font-mono text-slate-900">{count}</span>
    </div>
    <p className="mt-1 text-[11px] text-slate-500">{description}</p>
  </div>
);

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveCase } = useCaseStore();

  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loadingDemo, setLoadingDemo] = useState<boolean>(false);
  const [stats, setStats] = useState({
    activeCases: 0,
    evidenceItems: 0,
    browserArtifacts: 0,
    imagesAnalyzed: 0,
    timelineEvents: 0,
    flaggedItems: 0,
  });

  const loadDashboardData = async () => {
    const allCases = await CaseRepository.getAll();
    const allEvidence = await EvidenceRepository.getAll();
    const allImages = await (await import('../services/imageArtifactRepository')).ImageArtifactRepository.getAll();
    const logs = await AuditLogRepository.getAll(8);

    setCases(allCases.slice(0, 5));
    setRecentLogs(logs);

    const flagged = allEvidence.filter((e) => e.bookmarked).length;

    setStats({
      activeCases: allCases.filter((c) => c.status === 'OPEN').length,
      evidenceItems: allEvidence.length,
      browserArtifacts: 0, // Phase 4
      imagesAnalyzed: allImages.filter((img) => img.analysisStatus === 'COMPLETED').length,
      timelineEvents: 0, // Phase 5
      flaggedItems: flagged,
    });
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleOpenCase = (c: InvestigationCase) => {
    setActiveCase(c);
    navigate('/cases');
  };

  const handleTriggerDemo = async () => {
    setLoadingDemo(true);
    await loadDemoData();
    await loadDashboardData();
    setLoadingDemo(false);
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-mono tracking-tight">
            Forensic Workstation Summary
          </h1>
          <p className="text-xs text-slate-500">
            Local-first digital evidence processing & case management dashboard.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
          <button
            onClick={() => navigate('/cases')}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Case
          </button>
          <button
            onClick={() => navigate('/evidence')}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Import Evidence
          </button>
          <button
            onClick={handleTriggerDemo}
            disabled={loadingDemo}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Database className="h-3.5 w-3.5 text-slate-500" />
            {loadingDemo ? 'Loading Demo...' : 'Load Demo Investigation'}
          </button>
        </div>
      </div>

      {/* Forensic Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard
          title="Active Cases"
          count={stats.activeCases}
          icon={Briefcase}
          description="Open investigations"
        />
        <SummaryCard
          title="Evidence Items"
          count={stats.evidenceItems}
          icon={HardDrive}
          description="Imported sources"
        />
        <SummaryCard
          title="Browser Artifacts"
          count={stats.browserArtifacts}
          icon={Globe}
          description="Phase 4 Module"
        />
        <SummaryCard
          title="Images Analyzed"
          count={stats.imagesAnalyzed}
          icon={ImageIcon}
          description="Phase 3 Module"
        />
        <SummaryCard
          title="Timeline Events"
          count={stats.timelineEvents}
          icon={Clock}
          description="Phase 5 Module"
        />
        <SummaryCard
          title="Flagged Items"
          count={stats.flaggedItems}
          icon={Bookmark}
          description="Bookmarked evidence"
        />
      </div>

      {/* Main Grid: Active Cases & Audit Activity */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Active Cases Table */}
        <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-900 font-mono">Active Investigations</h2>
            <button
              onClick={() => navigate('/cases')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {cases.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-xs font-medium text-slate-600">No investigations created yet.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Click "New Case" or "Load Demo Investigation" to populate workspace data.
              </p>
            </div>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                    <th className="py-2 px-3">Case ID</th>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Evidence</th>
                    <th className="py-2 px-3">Last Modified</th>
                    <th className="py-2 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
                  {cases.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{c.caseId}</td>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-800">{c.name}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                          {c.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{c.evidenceCount} items</td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {formatDate(c.updatedAt)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleOpenCase(c)}
                          className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                        >
                          <FolderOpen className="h-3 w-3" />
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Audit Activity Feed */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-900 font-mono">Recent Activity</h2>
          </div>
          {recentLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No activity logged yet.</div>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 text-xs">
              {recentLogs.map((log) => (
                <li key={log.id} className="py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDate(log.timestamp)}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-700 font-medium text-[11px]">{log.description}</p>
                  {log.caseId && (
                    <span className="text-[10px] font-mono text-slate-400">
                      Case: {log.caseId}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
