import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Code,
  Globe,
  RefreshCw,
  CheckSquare,
  Square,
  AlertTriangle,
  Eye,
  Loader,
} from 'lucide-react';
import { useCaseStore } from '../stores';
import { CaseRepository } from '../services/repositories';
import { ReportService, type ReportProgress } from '../services/reportService';
import { AuditLogRepository } from '../services/repositories';
import type {
  InvestigationCase,
  InvestigationReport,
  ReportSections,
  ReportSectionKey,
} from '../types';

const DEFAULT_SECTIONS: ReportSections = {
  caseInfo: true,
  evidence: true,
  images: true,
  browser: true,
  timeline: true,
  relationships: true,
  audit: true,
};

const SECTION_LABELS: Record<ReportSectionKey, string> = {
  caseInfo: 'Case Information',
  evidence: 'Evidence Inventory',
  images: 'Image Findings',
  browser: 'Browser Findings',
  timeline: 'Unified Timeline',
  relationships: 'Artifact Relationships',
  audit: 'Audit History',
};

const PROGRESS_LABELS: Record<ReportProgress, string> = {
  IDLE: 'Ready',
  COLLECTING_CASE: 'Loading case data...',
  COLLECTING_EVIDENCE: 'Collecting evidence inventory...',
  COLLECTING_IMAGES: 'Compiling image findings...',
  COLLECTING_BROWSER: 'Aggregating browser artifacts...',
  BUILDING_TIMELINE: 'Building investigation timeline...',
  COLLECTING_RELATIONSHIPS: 'Mapping artifact relationships...',
  COLLECTING_AUDIT: 'Loading audit history...',
  VALIDATING: 'Validating report integrity...',
  COMPLETE: 'Report ready.',
};

export const ReportsPage: React.FC = () => {
  const { activeCase } = useCaseStore();
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [sections, setSections] = useState<ReportSections>(DEFAULT_SECTIONS);
  const [progress, setProgress] = useState<ReportProgress>('IDLE');
  const [report, setReport] = useState<InvestigationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');

  useEffect(() => {
    CaseRepository.getAll().then((all) => {
      setCases(all);
      if (activeCase) setSelectedCaseId(activeCase.caseId);
      else if (all.length > 0) setSelectedCaseId(all[0]!.caseId);
    });
  }, [activeCase]);

  const toggleSection = (key: ReportSectionKey) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = async () => {
    if (!selectedCaseId) return;
    setProgress('COLLECTING_CASE');
    setReport(null);
    setError(null);
    setPreviewing(false);

    try {
      const generated = await ReportService.generate(
        selectedCaseId,
        sections,
        (step) => setProgress(step)
      );
      setReport(generated);
      setProgress('COMPLETE');

      // Audit the generation
      const caseObj = cases.find((c) => c.caseId === selectedCaseId);
      if (caseObj) {
        await AuditLogRepository.log({
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          caseId: selectedCaseId,
          action: 'REPORT_GENERATED',
          description: `Investigation report ${generated.id} generated for case ${selectedCaseId}.`,
          entityType: 'REPORT',
          entityId: generated.id,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error during report generation.');
      setProgress('IDLE');
    }
  };

  const handlePreview = () => {
    if (!report) return;
    const html = ReportService.toHTML(report);
    setPreviewHtml(html);
    setPreviewing(true);
  };

  const isGenerating = progress !== 'IDLE' && progress !== 'COMPLETE';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-700" /> Investigation Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate deterministic forensic reports from actual case data. No fabrication — all findings derived from evidence.
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 rounded px-2 py-1 border border-slate-200">
          Report Generator v1.0
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: Controls */}
        <div className="lg:col-span-1 space-y-4">
          {/* Case Selector */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-3 font-mono text-xs">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Case</h2>
            <select
              value={selectedCaseId}
              onChange={(e) => {
                setSelectedCaseId(e.target.value);
                setReport(null);
                setProgress('IDLE');
              }}
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
            >
              {cases.length === 0 && <option value="">No cases available</option>}
              {cases.map((c) => (
                <option key={c.id} value={c.caseId}>
                  {c.caseId} — {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Toggles */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-2 font-mono text-xs">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">Report Sections</h2>
            {(Object.keys(SECTION_LABELS) as ReportSectionKey[]).map((key) => (
              <button
                key={key}
                onClick={() => toggleSection(key)}
                className="flex items-center gap-2 w-full text-left hover:text-slate-900 transition-colors text-slate-700"
              >
                {sections[key] ? (
                  <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <Square className="h-4 w-4 text-slate-300 shrink-0" />
                )}
                {SECTION_LABELS[key]}
              </button>
            ))}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!selectedCaseId || isGenerating}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono"
          >
            {isGenerating ? (
              <><Loader className="h-4 w-4 animate-spin" /> Generating...</>
            ) : (
              <><FileText className="h-4 w-4" /> Generate Report</>
            )}
          </button>

          {/* Progress Status */}
          {progress !== 'IDLE' && (
            <div className={`rounded-md px-3 py-2 text-xs font-mono font-semibold border ${progress === 'COMPLETE'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : error
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}>
              {error ? (
                <span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />{error}</span>
              ) : PROGRESS_LABELS[progress]}
            </div>
          )}

          {/* Export Controls */}
          {report && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-2xs space-y-2 font-mono text-xs">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-3 flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> Export Report
              </h2>
              <div className="text-[10px] text-emerald-600 space-y-1 mb-3">
                <div>ID: {report.id.substring(0, 16)}…</div>
                <div>Generated: {new Date(report.generatedAt).toLocaleString()}</div>
                <div className="flex items-center gap-1">
                  Evidence: {report.evidence.length} · Images: {report.images.length} · Timeline: {report.timeline.length}
                </div>
                {report.validationWarnings.length > 0 && (
                  <div className="text-amber-700 font-bold">⚠ {report.validationWarnings.length} validation warning(s)</div>
                )}
              </div>

              <button
                onClick={handlePreview}
                className="flex w-full items-center justify-center gap-2 rounded bg-white border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
              >
                <Eye className="h-3.5 w-3.5" /> Preview HTML
              </button>
              <button
                onClick={() => ReportService.exportHTML(report)}
                className="flex w-full items-center justify-center gap-2 rounded bg-slate-900 border border-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
              >
                <Globe className="h-3.5 w-3.5" /> Export HTML
              </button>
              <button
                onClick={() => ReportService.exportPDF(report)}
                className="flex w-full items-center justify-center gap-2 rounded bg-blue-700 border border-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Export PDF
              </button>
              <button
                onClick={() => ReportService.exportJSON(report)}
                className="flex w-full items-center justify-center gap-2 rounded bg-emerald-700 border border-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
              >
                <Code className="h-3.5 w-3.5" /> Export JSON
              </button>
            </div>
          )}
        </div>

        {/* Right: Preview Pane */}
        <div className="lg:col-span-2">
          {!report && !isGenerating && (
            <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-2xs h-full min-h-[400px] flex flex-col items-center justify-center">
              <FileText className="h-10 w-10 text-slate-300 mb-4" />
              <h3 className="text-sm font-bold text-slate-900 font-mono mb-1">No Report Generated</h3>
              <p className="text-xs text-slate-500 max-w-xs">
                Select a case, choose sections, then click <strong>Generate Report</strong> to build your investigation report.
              </p>
            </div>
          )}

          {isGenerating && (
            <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-2xs h-full min-h-[400px] flex flex-col items-center justify-center">
              <Loader className="h-8 w-8 text-slate-400 animate-spin mb-4" />
              <p className="text-sm font-bold text-slate-700 font-mono">{PROGRESS_LABELS[progress]}</p>
              <p className="text-xs text-slate-400 mt-1">Querying IndexedDB repositories…</p>
            </div>
          )}

          {report && !previewing && (
            <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 font-mono uppercase tracking-wider">Report Summary</span>
                <button onClick={handlePreview} className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-mono">
                  <Eye className="h-3.5 w-3.5" /> Preview
                </button>
              </div>
              <div className="p-4 space-y-4 font-mono text-xs">
                {/* Case block */}
                <div className="bg-slate-900 text-slate-100 rounded-md p-4 space-y-1.5">
                  <div className="text-[10px] text-slate-400 uppercase font-bold mb-2">EYESHARP · DIGITAL INVESTIGATION REPORT</div>
                  <div className="text-sm font-bold text-white">{report.caseSummary.name}</div>
                  <div className="text-slate-400">{report.caseSummary.caseId}</div>
                  <div className="text-slate-400 text-[10px] mt-1">Generated: {new Date(report.generatedAt).toLocaleString()}</div>
                  <div className="text-slate-400 text-[10px]">Report ID: {report.id}</div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Evidence Items', value: report.evidence.length, color: 'text-blue-700' },
                    { label: 'Image Findings', value: report.images.length, color: 'text-emerald-700' },
                    { label: 'Timeline Events', value: report.timeline.length, color: 'text-purple-700' },
                    { label: 'Relationships', value: report.relationships.length, color: 'text-amber-700' },
                    { label: 'Browser History', value: report.browser.totalHistory, color: 'text-indigo-700' },
                    { label: 'Downloads', value: report.browser.totalDownloads, color: 'text-rose-700' },
                    { label: 'Searches', value: report.browser.totalSearches, color: 'text-teal-700' },
                    { label: 'Audit Entries', value: report.auditLog.length, color: 'text-slate-700' },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded border border-slate-200 p-2.5 text-center">
                      <div className={`text-lg font-bold ${stat.color}`}>{stat.value.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-500">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Warnings */}
                {report.validationWarnings.length > 0 && (
                  <div className="rounded bg-amber-50 border border-amber-200 px-3 py-2 text-amber-800 text-[11px] space-y-1">
                    <div className="font-bold flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Validation Warnings</div>
                    {report.validationWarnings.map((w, i) => <div key={i}>• {w}</div>)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HTML Preview iframe */}
          {previewing && previewHtml && (
            <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden flex flex-col" style={{ height: '70vh' }}>
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 font-mono">HTML Preview</span>
                <button
                  onClick={() => setPreviewing(false)}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-mono"
                >
                  <RefreshCw className="h-3 w-3" /> Back to Summary
                </button>
              </div>
              <iframe
                title="Report Preview"
                srcDoc={previewHtml}
                className="flex-1 w-full border-0"
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
