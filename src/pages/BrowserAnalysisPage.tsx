import React, { useEffect, useState, useRef } from 'react';
import {
  Upload,
  Search,
  History,
  Download,
  Bookmark,
  Search as SearchIcon,
  Database,
  ExternalLink,
  X,
  AlertCircle,
} from 'lucide-react';
import { useCaseStore } from '../stores';
import { CaseRepository } from '../services/repositories';
import {
  BrowserEvidenceRepository,
  BrowserHistoryRepository,
  BrowserDownloadRepository,
  BrowserBookmarkRepository,
  BrowserSearchRepository,
} from '../services/browserRepositories';
import { BrowserAnalysisService } from '../services/browserAnalysisService';
import { seedDemoBrowserData } from '../services/demoBrowserData';
import type {
  BrowserEvidence,
  BrowserHistoryArtifact,
  BrowserDownloadArtifact,
  BrowserBookmarkArtifact,
  BrowserSearchArtifact,
  SupportedBrowser,
  InvestigationCase,
} from '../types';
import { formatBytes, formatDate } from '../utils/formatters';

export const BrowserAnalysisPage: React.FC = () => {
  const { activeCase } = useCaseStore();
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [importing, setImporting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter Toolbar State
  const [activeTab, setActiveTab] = useState<'HISTORY' | 'DOWNLOADS' | 'BOOKMARKS' | 'SEARCH' | 'SOURCES'>('HISTORY');
  const [search, setSearch] = useState<string>('');
  const [selectedCaseFilter, setSelectedCaseFilter] = useState<string>('ALL');
  const [selectedBrowserFilter, setSelectedBrowserFilter] = useState<string>('ALL');
  const [preferredBrowserInput, setPreferredBrowserInput] = useState<SupportedBrowser>('UNKNOWN');

  // Artifact Lists
  const [evidences, setEvidences] = useState<BrowserEvidence[]>([]);
  const [historyItems, setHistoryItems] = useState<BrowserHistoryArtifact[]>([]);
  const [downloadItems, setDownloadItems] = useState<BrowserDownloadArtifact[]>([]);
  const [bookmarkItems, setBookmarkItems] = useState<BrowserBookmarkArtifact[]>([]);
  const [searchItems, setSearchItems] = useState<BrowserSearchArtifact[]>([]);

  // Selected Detail Item State
  const [selectedItem, setSelectedItem] = useState<{
    type: 'HISTORY' | 'DOWNLOAD' | 'BOOKMARK' | 'SEARCH' | 'EVIDENCE';
    data: BrowserHistoryArtifact | BrowserDownloadArtifact | BrowserBookmarkArtifact | BrowserSearchArtifact | BrowserEvidence;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    const allCases = await CaseRepository.getAll();
    setCases(allCases);

    const targetCaseId = activeCase ? activeCase.caseId : selectedCaseFilter;
    if (activeCase) setSelectedCaseFilter(activeCase.caseId);

    // Seed demo data if database is empty
    await seedDemoBrowserData(activeCase?.caseId || 'CASE-2026-001');

    const evs = await BrowserEvidenceRepository.getByCaseId(targetCaseId);
    const hists = await BrowserHistoryRepository.getByCaseId(targetCaseId);
    const dls = await BrowserDownloadRepository.getByCaseId(targetCaseId);
    const bms = await BrowserBookmarkRepository.getByCaseId(targetCaseId);
    const srchs = await BrowserSearchRepository.getByCaseId(targetCaseId);

    setEvidences(evs);
    setHistoryItems(hists);
    setDownloadItems(dls);
    setBookmarkItems(bms);
    setSearchItems(srchs);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeCase]);

  const handleCaseFilterChange = async (caseId: string) => {
    setSelectedCaseFilter(caseId);
    setLoading(true);
    const evs = await BrowserEvidenceRepository.getByCaseId(caseId);
    const hists = await BrowserHistoryRepository.getByCaseId(caseId);
    const dls = await BrowserDownloadRepository.getByCaseId(caseId);
    const bms = await BrowserBookmarkRepository.getByCaseId(caseId);
    const srchs = await BrowserSearchRepository.getByCaseId(caseId);

    setEvidences(evs);
    setHistoryItems(hists);
    setDownloadItems(dls);
    setBookmarkItems(bms);
    setSearchItems(srchs);
    setLoading(false);
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    if (files.length === 0) return;
    setImporting(true);
    setErrorMessage(null);

    const targetCaseId = activeCase?.caseId || (cases.length > 0 ? cases[0]!.caseId : 'CASE-2026-001');

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      try {
        await BrowserAnalysisService.processBrowserEvidence(file, targetCaseId, preferredBrowserInput);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to parse browser evidence file';
        setErrorMessage(msg);
      }
    }

    setImporting(false);
    handleCaseFilterChange(selectedCaseFilter);
  };

  const matchesBrowser = (browser: string) => selectedBrowserFilter === 'ALL' || browser === selectedBrowserFilter;

  // Filtered Artifacts
  const filteredHistory = historyItems.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch = item.url.toLowerCase().includes(q) || (item.title && item.title.toLowerCase().includes(q)) || (item.domain && item.domain.toLowerCase().includes(q));
    return matchSearch && matchesBrowser(item.browser);
  });

  const filteredDownloads = downloadItems.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch = (item.filename && item.filename.toLowerCase().includes(q)) || (item.downloadUrl && item.downloadUrl.toLowerCase().includes(q));
    return matchSearch && matchesBrowser(item.browser);
  });

  const filteredBookmarks = bookmarkItems.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch = item.url.toLowerCase().includes(q) || (item.title && item.title.toLowerCase().includes(q)) || (item.folder && item.folder.toLowerCase().includes(q));
    return matchSearch && matchesBrowser(item.browser);
  });

  const filteredSearches = searchItems.filter((item) => {
    const q = search.toLowerCase();
    const matchSearch = item.query.toLowerCase().includes(q) || (item.searchEngine && item.searchEngine.toLowerCase().includes(q));
    return matchSearch && matchesBrowser(item.browser);
  });

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-mono tracking-tight">
            Browser Evidence Workspace
          </h1>
          <p className="text-xs text-slate-500">
            Local browser artifact analysis for Chrome, Edge, and Firefox history, downloads, bookmarks, and search activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={preferredBrowserInput}
            onChange={(e) => setPreferredBrowserInput(e.target.value as SupportedBrowser)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-mono text-slate-700"
          >
            <option value="UNKNOWN">Auto Detect Browser</option>
            <option value="CHROME">Chrome / Chromium</option>
            <option value="EDGE">Microsoft Edge</option>
            <option value="FIREFOX">Mozilla Firefox</option>
          </select>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {importing ? 'Parsing Evidence...' : 'Import Browser Database'}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            multiple
            accept=".sqlite,.db,History,places.sqlite,.json"
            className="hidden"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Error Toast Notification */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-md bg-red-50 p-3 border border-red-200 text-xs text-red-800 font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 text-center font-mono">
        <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase block">History Events</span>
          <span className="text-xl font-bold text-slate-900">{historyItems.length}</span>
        </div>
        <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase block">Downloads</span>
          <span className="text-xl font-bold text-slate-900">{downloadItems.length}</span>
        </div>
        <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase block">Bookmarks</span>
          <span className="text-xl font-bold text-slate-900">{bookmarkItems.length}</span>
        </div>
        <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase block">Search Activity</span>
          <span className="text-xl font-bold text-slate-900">{searchItems.length}</span>
        </div>
        <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase block">Evidence Sources</span>
          <span className="text-xl font-bold text-slate-900">{evidences.length}</span>
        </div>
      </div>

      {/* Toolbar: Search, Browser Filter, Case Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search URLs, titles, queries, downloads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-md border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-hidden font-mono w-64"
            />
          </div>

          {/* Browser Filter */}
          <select
            value={selectedBrowserFilter}
            onChange={(e) => setSelectedBrowserFilter(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-700"
          >
            <option value="ALL">All Browsers</option>
            <option value="CHROME">Chrome / Chromium</option>
            <option value="EDGE">Microsoft Edge</option>
            <option value="FIREFOX">Mozilla Firefox</option>
          </select>

          {/* Case Filter */}
          <select
            value={selectedCaseFilter}
            onChange={(e) => handleCaseFilterChange(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-700"
          >
            <option value="ALL">All Cases</option>
            {cases.map((c) => (
              <option key={c.id} value={c.caseId}>
                {c.caseId} - {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-4 text-xs font-mono">
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-2 flex items-center gap-1.5 font-semibold border-b-2 transition-colors ${activeTab === 'HISTORY' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          <History className="h-4 w-4" /> History ({filteredHistory.length})
        </button>
        <button
          onClick={() => setActiveTab('DOWNLOADS')}
          className={`pb-2 flex items-center gap-1.5 font-semibold border-b-2 transition-colors ${activeTab === 'DOWNLOADS' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          <Download className="h-4 w-4" /> Downloads ({filteredDownloads.length})
        </button>
        <button
          onClick={() => setActiveTab('BOOKMARKS')}
          className={`pb-2 flex items-center gap-1.5 font-semibold border-b-2 transition-colors ${activeTab === 'BOOKMARKS' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          <Bookmark className="h-4 w-4" /> Bookmarks ({filteredBookmarks.length})
        </button>
        <button
          onClick={() => setActiveTab('SEARCH')}
          className={`pb-2 flex items-center gap-1.5 font-semibold border-b-2 transition-colors ${activeTab === 'SEARCH' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          <SearchIcon className="h-4 w-4" /> Search Activity ({filteredSearches.length})
        </button>
        <button
          onClick={() => setActiveTab('SOURCES')}
          className={`pb-2 flex items-center gap-1.5 font-semibold border-b-2 transition-colors ${activeTab === 'SOURCES' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
        >
          <Database className="h-4 w-4" /> Evidence Sources ({evidences.length})
        </button>
      </div>

      {/* Main Content Workspace Tables */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500 font-mono">
          Loading browser forensic database...
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
          {/* HISTORY TAB */}
          {activeTab === 'HISTORY' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Visit Time</th>
                    <th className="p-3">Browser</th>
                    <th className="p-3">Title / URL</th>
                    <th className="p-3">Domain</th>
                    <th className="p-3">Visits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        No history artifacts found.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItem({ type: 'HISTORY', data: item })}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {item.visitTime ? formatDate(item.visitTime) : 'N/A'}
                        </td>
                        <td className="p-3">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-800">
                            {item.browser}
                          </span>
                        </td>
                        <td className="p-3 max-w-md truncate">
                          <div className="font-semibold text-slate-900 truncate">
                            {item.title || 'Untitled Page'}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{item.url}</div>
                        </td>
                        <td className="p-3 text-slate-700">{item.domain || 'N/A'}</td>
                        <td className="p-3 text-slate-800 font-bold">{item.visitCount || 1}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* DOWNLOADS TAB */}
          {activeTab === 'DOWNLOADS' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Download Time</th>
                    <th className="p-3">Browser</th>
                    <th className="p-3">Filename</th>
                    <th className="p-3">File Size</th>
                    <th className="p-3">Download URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDownloads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        No download artifacts found.
                      </td>
                    </tr>
                  ) : (
                    filteredDownloads.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItem({ type: 'DOWNLOAD', data: item })}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {item.downloadTime ? formatDate(item.downloadTime) : 'N/A'}
                        </td>
                        <td className="p-3">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-800">
                            {item.browser}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-900">{item.filename || 'Unknown'}</td>
                        <td className="p-3 text-slate-600">{formatBytes(item.fileSize || 0)}</td>
                        <td className="p-3 text-slate-500 max-w-xs truncate">{item.downloadUrl || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* BOOKMARKS TAB */}
          {activeTab === 'BOOKMARKS' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Browser</th>
                    <th className="p-3">Title</th>
                    <th className="p-3">Folder</th>
                    <th className="p-3">URL</th>
                    <th className="p-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookmarks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        No bookmark artifacts found.
                      </td>
                    </tr>
                  ) : (
                    filteredBookmarks.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItem({ type: 'BOOKMARK', data: item })}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="p-3">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-800">
                            {item.browser}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-900">{item.title || 'Untitled'}</td>
                        <td className="p-3 text-slate-600">{item.folder || 'Root'}</td>
                        <td className="p-3 text-slate-500 max-w-xs truncate">{item.url}</td>
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {item.createdAtBrowser ? formatDate(item.createdAtBrowser) : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* SEARCH ACTIVITY TAB */}
          {activeTab === 'SEARCH' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Browser</th>
                    <th className="p-3">Search Engine</th>
                    <th className="p-3">Search Query</th>
                    <th className="p-3">Source URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSearches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        No search activity artifacts found.
                      </td>
                    </tr>
                  ) : (
                    filteredSearches.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItem({ type: 'SEARCH', data: item })}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {item.timestamp ? formatDate(item.timestamp) : 'N/A'}
                        </td>
                        <td className="p-3">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-800">
                            {item.browser}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                            {item.searchEngine || 'Generic Search'}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">&ldquo;{item.query}&rdquo;</td>
                        <td className="p-3 text-slate-500 max-w-xs truncate">{item.sourceUrl}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* EVIDENCE SOURCES TAB */}
          {activeTab === 'SOURCES' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Browser</th>
                    <th className="p-3">Filename</th>
                    <th className="p-3">Records Extracted</th>
                    <th className="p-3">Parser Version</th>
                    <th className="p-3">Import Date</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {evidences.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        No browser evidence databases imported yet.
                      </td>
                    </tr>
                  ) : (
                    evidences.map((ev) => (
                      <tr
                        key={ev.id}
                        onClick={() => setSelectedItem({ type: 'EVIDENCE', data: ev })}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="p-3">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-800">
                            {ev.browser}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-900">{ev.filename}</td>
                        <td className="p-3 font-bold text-slate-800">{ev.recordCount || 0}</td>
                        <td className="p-3 text-slate-600">{ev.parserVersion}</td>
                        <td className="p-3 text-slate-600">{formatDate(ev.importedAt)}</td>
                        <td className="p-3">
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            {ev.analysisStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Artifact Detail Panel Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-2xl space-y-4 font-mono text-xs">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-slate-200 pb-3">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                {selectedItem.type} FORENSIC ARTIFACT DETAIL
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-1">
                {(selectedItem.data as any).title || (selectedItem.data as any).filename || (selectedItem.data as any).query || 'Browser Artifact'}
              </h3>
            </div>

            <div className="space-y-2 bg-slate-50 p-3 rounded border border-slate-200 text-[11px] leading-relaxed">
              {'url' in selectedItem.data && (
                <div>
                  <span className="text-slate-400 block">URL:</span>
                  <a
                    href={(selectedItem.data as any).url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline break-all inline-flex items-center gap-1"
                  >
                    {(selectedItem.data as any).url} <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {'query' in selectedItem.data && (
                <div>
                  <span className="text-slate-400 block">Search Query:</span>
                  <span className="font-bold text-slate-900">&ldquo;{(selectedItem.data as any).query}&rdquo;</span>
                </div>
              )}

              {'downloadUrl' in selectedItem.data && (
                <div>
                  <span className="text-slate-400 block">Download URL:</span>
                  <span className="text-slate-800 break-all">{(selectedItem.data as any).downloadUrl}</span>
                </div>
              )}

              {'localPath' in selectedItem.data && (
                <div>
                  <span className="text-slate-400 block">Local Path:</span>
                  <span className="text-slate-800 break-all font-bold">{(selectedItem.data as any).localPath || 'N/A'}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[10px]">
                <div>
                  <span className="text-slate-400 block">Browser:</span>
                  <span className="font-bold">{selectedItem.data.browser}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Case ID:</span>
                  <span className="font-bold">{selectedItem.data.caseId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Source File:</span>
                  <span>{(selectedItem.data as any).sourceFile || (selectedItem.data as any).filename}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Parser Version:</span>
                  <span>{selectedItem.data.parserVersion}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-slate-400">
                Created: {formatDate((selectedItem.data as any).createdAt || (selectedItem.data as any).importedAt)}
              </span>
              <button
                onClick={() => setSelectedItem(null)}
                className="rounded bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
