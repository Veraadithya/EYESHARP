import React, { useEffect, useState, useRef } from 'react';
import {
  Upload,
  Search,
  HardDrive,
  Bookmark,
  Trash2,
  X,
  Info,
  Scan,
} from 'lucide-react';
import { EvidenceRepository, CaseRepository } from '../services/repositories';
import { filesystemService } from '../services/filesystem';
import { ImageIndicatorScanner } from '../components/scanner/ImageIndicatorScanner';
import { useCaseStore } from '../stores';
import type { EvidenceItem, InvestigationCase } from '../types';
import { formatBytes, formatDate } from '../utils/formatters';

export const EvidencePage: React.FC = () => {
  const { activeCase } = useCaseStore();
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [allCases, setAllCases] = useState<InvestigationCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedCaseFilter, setSelectedCaseFilter] = useState<string>('ALL');

  // Detail Drawer State
  const [selectedItem, setSelectedItem] = useState<EvidenceItem | null>(null);

  // Scanner Modal State
  const [scanningItem, setScanningItem] = useState<EvidenceItem | null>(null);

  // File Upload State
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    const cases = await CaseRepository.getAll();
    setAllCases(cases);

    let items: EvidenceItem[] = [];
    if (activeCase) {
      items = await EvidenceRepository.getByCaseId(activeCase.caseId);
      setSelectedCaseFilter(activeCase.caseId);
    } else {
      items = await EvidenceRepository.getAll();
    }

    setEvidenceList(items);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeCase]);

  const handleCaseFilterChange = async (caseId: string) => {
    setSelectedCaseFilter(caseId);
    if (caseId === 'ALL') {
      const items = await EvidenceRepository.getAll();
      setEvidenceList(items);
    } else {
      const items = await EvidenceRepository.getByCaseId(caseId);
      setEvidenceList(items);
    }
  };

  const processFiles = async (files: FileList | File[]) => {
    if (files.length === 0) return;
    setImporting(true);

    const targetCaseId =
      activeCase?.caseId || (allCases.length > 0 ? allCases[0]!.caseId : 'CASE-2026-001');

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;

      // Check if file is image evidence to route through Phase 2 ImageAnalysisService
      const isImage = file.type.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp'].some((ext) => file.name.toLowerCase().endsWith(ext));

      if (isImage) {
        try {
          const { ImageAnalysisService } = await import('../services/imageAnalysisService');
          await ImageAnalysisService.processImageEvidence(file, targetCaseId);
        } catch (imgErr) {
          console.error('Image evidence processing error:', imgErr);
        }
      } else {
        const handle = filesystemService.computeBasicFileMetadata(file);
        const newItem: EvidenceItem = {
          id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          caseId: targetCaseId,
          filename: handle.name,
          type: handle.type,
          size: handle.size,
          hash: undefined,
          importedAt: new Date().toISOString(),
          source: 'Local File Import (Browser FileSystem API)',
          analysisStatus: 'NOT_ANALYZED',
          bookmarked: false,
        };

        await EvidenceRepository.create(newItem);
      }
    }

    setImporting(false);
    handleCaseFilterChange(selectedCaseFilter);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleToggleBookmark = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await EvidenceRepository.toggleBookmark(id);
    handleCaseFilterChange(selectedCaseFilter);
  };

  const handleDeleteEvidence = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Remove this evidence item from the investigation database?')) {
      await EvidenceRepository.delete(id);
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
      handleCaseFilterChange(selectedCaseFilter);
    }
  };

  const filteredEvidence = evidenceList.filter((item) => {
    return (
      item.filename.toLowerCase().includes(search.toLowerCase()) ||
      item.type.toLowerCase().includes(search.toLowerCase()) ||
      item.caseId.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-mono tracking-tight">
            Evidence Management
          </h1>
          <p className="text-xs text-slate-500">
            Import evidence files, maintain chain of custody logs, and review metadata.
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors"
        >
          <Upload className="h-3.5 w-3.5" />
          Import Files
        </button>
        <input
          type="file"
          ref={fileInputRef}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && processFiles(e.target.files)}
        />
      </div>

      {/* Drag & Drop Import Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleFileDrop}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${isDragOver
          ? 'border-slate-800 bg-slate-100'
          : 'border-slate-300 bg-white hover:border-slate-400'
          }`}
      >
        <Upload className="h-6 w-6 text-slate-400" />
        <p className="mt-2 text-xs font-medium text-slate-700">
          Drag & drop evidence files here, or{' '}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="font-semibold text-slate-900 underline"
          >
            browse files
          </button>
        </p>
        <p className="mt-1 text-[11px] text-slate-400 font-mono">
          Target Case:{' '}
          <span className="font-bold text-slate-700">
            {activeCase ? activeCase.caseId : allCases[0]?.caseId || 'CASE-2026-001'}
          </span>
        </p>
        {importing && (
          <span className="mt-2 text-xs font-semibold text-emerald-600 font-mono animate-pulse">
            Processing and hashing evidence...
          </span>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search evidence filename, type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-md border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-hidden font-mono w-64"
            />
          </div>
          <select
            value={selectedCaseFilter}
            onChange={(e) => handleCaseFilterChange(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-700 focus:border-slate-500 focus:outline-hidden"
          >
            <option value="ALL">All Cases</option>
            {allCases.map((c) => (
              <option key={c.id} value={c.caseId}>
                {c.caseId} - {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          {filteredEvidence.length} items recorded
        </div>
      </div>

      {/* Evidence Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500 font-mono">
          Loading evidence index...
        </div>
      ) : filteredEvidence.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white py-16 px-4 text-center shadow-2xs">
          <HardDrive className="mx-auto h-8 w-8 text-slate-300" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900">No evidence imported</h3>
          <p className="mt-1 text-xs text-slate-500">
            Drag and drop evidence files here or click Import to register evidence sources.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                <th className="py-2.5 px-3">Bookmark</th>
                <th className="py-2.5 px-3">Filename</th>
                <th className="py-2.5 px-3">Case</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Size</th>
                <th className="py-2.5 px-3">Imported</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[12px]">
              {filteredEvidence.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`cursor-pointer hover:bg-slate-50/80 transition-colors ${selectedItem?.id === item.id ? 'bg-slate-100/70' : ''
                    }`}
                >
                  <td className="py-3 px-3">
                    <button
                      onClick={(e) => handleToggleBookmark(item.id, e)}
                      className="text-slate-400 hover:text-amber-500 transition-colors"
                    >
                      <Bookmark
                        className={`h-4 w-4 ${item.bookmarked ? 'fill-amber-400 text-amber-500' : ''
                          }`}
                      />
                    </button>
                  </td>
                  <td className="py-3 px-3 font-sans font-medium text-slate-900 truncate max-w-xs">
                    {item.filename}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-800">{item.caseId}</td>
                  <td className="py-3 px-3 text-slate-500 text-[11px] truncate max-w-[120px]">
                    {item.type}
                  </td>
                  <td className="py-3 px-3 text-slate-700">{formatBytes(item.size)}</td>
                  <td className="py-3 px-3 text-slate-500 text-[11px]">
                    {formatDate(item.importedAt)}
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      {item.analysisStatus}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {(item.type.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff'].some(e => item.filename.toLowerCase().endsWith(e))) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setScanningItem(item);
                          }}
                          className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200"
                          title="Analyze Image Indicators"
                        >
                          <Scan className="h-3 w-3" /> Analyze
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDeleteEvidence(item.id, e)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete Evidence"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Item Detail Side Drawer */}
      {selectedItem && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-96 flex-col border-l border-slate-200 bg-white p-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 font-mono">Evidence Details</h3>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex-1 space-y-4 text-xs overflow-y-auto">
            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-400">Filename</span>
              <p className="font-semibold text-slate-900 mt-0.5 break-all">
                {selectedItem.filename}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-semibold uppercase text-slate-400">Case ID</span>
                <p className="font-mono font-bold text-slate-800 mt-0.5">{selectedItem.caseId}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase text-slate-400">File Size</span>
                <p className="font-mono text-slate-800 mt-0.5">
                  {formatBytes(selectedItem.size)}
                </p>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-400">
                MIME / Type
              </span>
              <p className="font-mono text-slate-700 mt-0.5 break-all">{selectedItem.type}</p>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-400">
                Hash Status (Phase 2 Worker)
              </span>
              <p className="font-mono text-slate-700 mt-0.5 break-all">
                {selectedItem.hash ? selectedItem.hash : 'Hash calculation scheduled for Phase 2.'}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-400">
                Import Source
              </span>
              <p className="text-slate-700 mt-0.5">{selectedItem.source || 'Local File Picker'}</p>
            </div>

            <div>
              <span className="text-[11px] font-semibold uppercase text-slate-400">
                Imported Timestamp
              </span>
              <p className="font-mono text-slate-700 mt-0.5">
                {formatDate(selectedItem.importedAt)}
              </p>
            </div>

            <div className="rounded-md bg-slate-50 p-3 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-700 font-semibold mb-1">
                <Info className="h-4 w-4 text-slate-500" />
                <span>Chain of Custody Provenance</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Artifact &rarr; Source File &rarr; Evidence Item &rarr; Case
              </p>
            </div>

            {(selectedItem.type.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff'].some(e => selectedItem.filename.toLowerCase().endsWith(e))) && (
              <button
                onClick={() => setScanningItem(selectedItem)}
                className="w-full mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-500 transition-colors"
              >
                <Scan className="h-4 w-4" />
                Open Image Indicator Scanner
              </button>
            )}
          </div>
        </div>
      )}

      {/* Image Indicator Scanner Modal */}
      {scanningItem && (
        <ImageIndicatorScanner
          evidenceItem={scanningItem}
          onClose={() => setScanningItem(null)}
          onAnalysisSaved={() => loadData()}
        />
      )}
    </div>
  );
};
