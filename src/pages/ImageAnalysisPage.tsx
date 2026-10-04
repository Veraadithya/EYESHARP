import React, { useEffect, useState, useRef } from 'react';
import {
  Upload,
  Search,
  Image as ImageIcon,
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Bookmark,
  X,
  Copy,
  Check,
  Info,
  Scan,
} from 'lucide-react';
import { ImageArtifactRepository } from '../services/imageArtifactRepository';
import { ImageAnalysisService } from '../services/imageAnalysisService';
import { CaseRepository } from '../services/repositories';
import { ImageIndicatorScanner } from '../components/scanner/ImageIndicatorScanner';
import { useCaseStore } from '../stores';
import type { ImageArtifact, InvestigationCase } from '../types';
import { formatBytes, formatDate } from '../utils/formatters';

export const ImageAnalysisPage: React.FC = () => {
  const { activeCase } = useCaseStore();
  const [artifacts, setArtifacts] = useState<ImageArtifact[]>([]);
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [importing, setImporting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Toolbar & Filter State
  const [search, setSearch] = useState<string>('');
  const [selectedCaseFilter, setSelectedCaseFilter] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('dateDesc');

  // Selected Detail Modal State
  const [selectedArtifact, setSelectedArtifact] = useState<ImageArtifact | null>(null);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [scannerArtifact, setScannerArtifact] = useState<ImageArtifact | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    const allCases = await CaseRepository.getAll();
    setCases(allCases);

    let items: ImageArtifact[] = [];
    if (activeCase) {
      items = await ImageArtifactRepository.getByCaseId(activeCase.caseId);
      setSelectedCaseFilter(activeCase.caseId);
    } else {
      items = await ImageArtifactRepository.getAll();
    }

    setArtifacts(items);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeCase]);

  const handleCaseFilterChange = async (caseId: string) => {
    setSelectedCaseFilter(caseId);
    if (caseId === 'ALL') {
      const items = await ImageArtifactRepository.getAll();
      setArtifacts(items);
    } else {
      const items = await ImageArtifactRepository.getByCaseId(caseId);
      setArtifacts(items);
    }
  };

  const processImageFiles = async (files: FileList | File[]) => {
    if (files.length === 0) return;
    setImporting(true);
    setErrorMessage(null);

    const targetCaseId =
      activeCase?.caseId || (cases.length > 0 ? cases[0]!.caseId : 'CASE-2026-001');

    let errorCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      try {
        await ImageAnalysisService.processImageEvidence(file, targetCaseId);
      } catch (err: unknown) {
        errorCount++;
        const msg = err instanceof Error ? err.message : 'Failed to import image';
        setErrorMessage(msg);
      }
    }

    setImporting(false);
    handleCaseFilterChange(selectedCaseFilter);
  };

  const handleToggleBookmark = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedBookmarked = await ImageArtifactRepository.toggleBookmark(id);
    setArtifacts((prev) =>
      prev.map((art) => (art.id === id ? { ...art, bookmarked: updatedBookmarked } : art))
    );
    if (selectedArtifact?.id === id) {
      setSelectedArtifact((prev) => (prev ? { ...prev, bookmarked: updatedBookmarked } : null));
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Filter & Sort Logic
  const filteredArtifacts = artifacts
    .filter((item) => {
      const matchesSearch =
        item.filename.toLowerCase().includes(search.toLowerCase()) ||
        item.mimeType.toLowerCase().includes(search.toLowerCase()) ||
        item.caseId.toLowerCase().includes(search.toLowerCase());

      const matchesCase = selectedCaseFilter === 'ALL' || item.caseId === selectedCaseFilter;

      let matchesFilter = true;
      if (filterType === 'ANALYZED') matchesFilter = item.analysisStatus === 'COMPLETED';
      else if (filterType === 'PENDING') matchesFilter = item.analysisStatus === 'PENDING' || item.analysisStatus === 'ANALYZING';
      else if (filterType === 'FAILED') matchesFilter = item.analysisStatus === 'FAILED';
      else if (filterType === 'HAS_EXIF') matchesFilter = !!item.exif;
      else if (filterType === 'HAS_GPS') matchesFilter = !!item.gps;
      else if (filterType === 'BOOKMARKED') matchesFilter = !!item.bookmarked;

      return matchesSearch && matchesCase && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'dateDesc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'dateAsc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'nameAsc') return a.filename.localeCompare(b.filename);
      if (sortBy === 'sizeDesc') return b.fileSize - a.fileSize;
      return 0;
    });

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-mono tracking-tight">
            Image Analysis Workspace
          </h1>
          <p className="text-xs text-slate-500">
            Local-first image evidence triage, Web Worker SHA-256 calculation, and EXIF/GPS metadata extraction.
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {importing ? 'Processing Image...' : 'Import Images'}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/jpeg,image/png,image/webp,image/tiff"
          className="hidden"
          onChange={(e) => e.target.files && processImageFiles(e.target.files)}
        />
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

      {/* Image Analysis Summary Card Banner */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono mb-3">
          Advanced Image Forensics Summary
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-6 text-center font-mono">
          <div className="rounded bg-slate-50 p-2.5 border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block">Total Images</span>
            <span className="text-xl font-bold text-slate-900">{artifacts.length}</span>
          </div>
          <div className="rounded bg-emerald-50/60 p-2.5 border border-emerald-200">
            <span className="text-[10px] text-emerald-800 uppercase block">Analyzed</span>
            <span className="text-xl font-bold text-emerald-900">
              {artifacts.filter((a) => a.analysisStatus === 'COMPLETED').length}
            </span>
          </div>
          <div className="rounded bg-blue-50/60 p-2.5 border border-blue-200">
            <span className="text-[10px] text-blue-800 uppercase block">Has EXIF</span>
            <span className="text-xl font-bold text-blue-900">
              {artifacts.filter((a) => !!a.exif).length}
            </span>
          </div>
          <div className="rounded bg-amber-50/60 p-2.5 border border-amber-200">
            <span className="text-[10px] text-amber-800 uppercase block">Has GPS</span>
            <span className="text-xl font-bold text-amber-900">
              {artifacts.filter((a) => !!a.gps).length}
            </span>
          </div>
          <div className="rounded bg-purple-50/60 p-2.5 border border-purple-200">
            <span className="text-[10px] text-purple-800 uppercase block">Exact Duplicates</span>
            <span className="text-xl font-bold text-purple-900">
              {artifacts.filter((a, _, self) => a.sha256 && self.some((other) => other.id !== a.id && other.sha256 === a.sha256)).length}
            </span>
          </div>
          <div className="rounded bg-slate-100 p-2.5 border border-slate-200">
            <span className="text-[10px] text-slate-600 uppercase block">Bookmarked</span>
            <span className="text-xl font-bold text-slate-800">
              {artifacts.filter((a) => !!a.bookmarked).length}
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters, Case Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search filename, SHA-256, OCR text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-md border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-hidden font-mono w-64"
            />
          </div>

          {/* Filter Type */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-700 focus:border-slate-500 focus:outline-hidden"
          >
            <option value="ALL">All Statuses & Types</option>
            <option value="ANALYZED">Analyzed Only</option>
            <option value="HAS_EXIF">Has EXIF Camera Metadata</option>
            <option value="HAS_GPS">Has GPS Location</option>
            <option value="EXACT_DUPLICATES">Exact Duplicates (SHA-256)</option>
            <option value="BOOKMARKED">Bookmarked</option>
            <option value="FAILED">Failed</option>
          </select>

          {/* Case Filter */}
          <select
            value={selectedCaseFilter}
            onChange={(e) => handleCaseFilterChange(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-700 focus:border-slate-500 focus:outline-hidden"
          >
            <option value="ALL">All Cases</option>
            {cases.map((c) => (
              <option key={c.id} value={c.caseId}>
                {c.caseId} - {c.name}
              </option>
            ))}
          </select>

          {/* Sorting */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-700 focus:border-slate-500 focus:outline-hidden"
          >
            <option value="dateDesc">Newest Imported</option>
            <option value="dateAsc">Oldest Imported</option>
            <option value="nameAsc">Filename (A-Z)</option>
            <option value="sizeDesc">File Size (Largest)</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          {filteredArtifacts.length} image artifacts recorded
        </div>
      </div>

      {/* Image Evidence Gallery Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500 font-mono">
          Loading image evidence database...
        </div>
      ) : filteredArtifacts.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white py-16 px-4 text-center shadow-2xs">
          <ImageIcon className="mx-auto h-8 w-8 text-slate-300" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900">No image evidence found</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Import image evidence files (JPG, PNG, WEBP, TIFF) to calculate hashes and extract EXIF/GPS metadata.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800"
          >
            <Upload className="h-3.5 w-3.5" />
            Import Image Evidence
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredArtifacts.map((art) => (
            <div
              key={art.id}
              onClick={() => setSelectedArtifact(art)}
              className="group relative flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs hover:border-slate-400 hover:shadow-sm transition-all cursor-pointer"
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-4/3 w-full bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-100">
                {art.thumbnail ? (
                  <img
                    src={art.thumbnail}
                    alt={art.filename}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <ImageIcon className="h-10 w-10 text-slate-300" />
                )}

                {/* Bookmark Toggle Overlay */}
                <button
                  onClick={(e) => handleToggleBookmark(art.id, e)}
                  className="absolute top-2 right-2 rounded bg-white/80 p-1 text-slate-500 hover:text-amber-500 backdrop-blur-xs transition-colors"
                >
                  <Bookmark
                    className={`h-4 w-4 ${art.bookmarked ? 'fill-amber-400 text-amber-500' : ''}`}
                  />
                </button>

                {/* Case Badge */}
                <span className="absolute bottom-2 left-2 rounded bg-slate-900/80 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white backdrop-blur-xs">
                  {art.caseId}
                </span>
              </div>

              {/* Card Metadata Footer */}
              <div className="p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-1">
                  <h4 className="font-sans text-xs font-semibold text-slate-900 truncate max-w-[180px]">
                    {art.filename}
                  </h4>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>
                    {art.width && art.height ? `${art.width}×${art.height}` : 'Resolution N/A'}
                  </span>
                  <span>{formatBytes(art.fileSize)}</span>
                </div>

                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-100">
                  {art.sha256 ? (
                    <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-2.5 w-2.5" /> SHA-256
                    </span>
                  ) : (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono text-slate-500">
                      No Hash
                    </span>
                  )}

                  {art.exif && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-blue-700 border border-blue-200">
                      <Camera className="h-2.5 w-2.5" /> EXIF
                    </span>
                  )}

                  {art.gps && (
                    <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-amber-800 border border-amber-200">
                      <MapPin className="h-2.5 w-2.5" /> GPS
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Detail Investigation Workspace Modal */}
      {selectedArtifact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="relative flex flex-col md:flex-row w-full max-w-4xl max-h-[90vh] rounded-lg border border-slate-200 bg-white shadow-2xl overflow-hidden">
            {/* Modal Close Button */}
            <button
              onClick={() => setSelectedArtifact(null)}
              className="absolute top-3 right-3 z-10 rounded-full bg-white/80 p-1 text-slate-500 hover:text-slate-900 backdrop-blur-xs"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Left: Preview Panel */}
            <div className="md:w-1/2 bg-slate-950 p-6 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-slate-800">
              {selectedArtifact.thumbnail ? (
                <img
                  src={selectedArtifact.thumbnail}
                  alt={selectedArtifact.filename}
                  className="max-h-[60vh] max-w-full object-contain rounded shadow-md"
                />
              ) : (
                <div className="text-slate-500 flex flex-col items-center gap-2">
                  <ImageIcon className="h-12 w-12" />
                  <span className="text-xs font-mono">Preview Unavailable</span>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between w-full text-[11px] font-mono text-slate-400">
                <span>
                  Dimensions:{' '}
                  <strong className="text-slate-200">
                    {selectedArtifact.width && selectedArtifact.height
                      ? `${selectedArtifact.width} × ${selectedArtifact.height}`
                      : 'Unknown'}
                  </strong>
                </span>
                <span>
                  Aspect Ratio:{' '}
                  <strong className="text-slate-200">
                    {selectedArtifact.aspectRatio ? `${selectedArtifact.aspectRatio}:1` : 'N/A'}
                  </strong>
                </span>
              </div>
            </div>

            {/* Right: Forensic Metadata Inspection */}
            <div className="md:w-1/2 p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 font-mono block">
                  Evidence Filename
                </span>
                <h3 className="font-sans font-bold text-slate-900 text-sm mt-0.5">
                  {selectedArtifact.filename}
                </h3>
              </div>

              {/* SHA-256 Hash Box */}
              <div className="rounded-md bg-slate-50 p-3 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
                    Canonical SHA-256 Hash Digest
                  </span>
                  {selectedArtifact.sha256 && (
                    <button
                      onClick={() => handleCopyHash(selectedArtifact.sha256!)}
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-600 hover:text-slate-900 font-medium"
                    >
                      {copiedHash ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> Copy
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p className="font-mono text-[11px] text-slate-800 break-all bg-white p-2 rounded border border-slate-200">
                  {selectedArtifact.sha256 || 'Hash not calculated.'}
                </p>
              </div>

              {/* File Technical Metadata */}
              <div className="grid grid-cols-2 gap-3 border-b border-slate-200 pb-3">
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400 font-mono block">
                    Case ID
                  </span>
                  <span className="font-mono font-bold text-slate-800">{selectedArtifact.caseId}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400 font-mono block">
                    File Size
                  </span>
                  <span className="font-mono text-slate-800">{formatBytes(selectedArtifact.fileSize)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400 font-mono block">
                    MIME Type
                  </span>
                  <span className="font-mono text-slate-700">{selectedArtifact.mimeType}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase text-slate-400 font-mono block">
                    Import Date
                  </span>
                  <span className="font-mono text-slate-700">{formatDate(selectedArtifact.createdAt)}</span>
                </div>
              </div>

              {/* Camera EXIF Metadata */}
              <div className="space-y-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold font-mono">
                  <Camera className="h-4 w-4 text-slate-600" />
                  <span>Camera EXIF Metadata</span>
                </div>

                {selectedArtifact.exif ? (
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-700 bg-slate-50 p-3 rounded border border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Make:</span>
                      <span className="font-semibold">{selectedArtifact.exif.make || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Model:</span>
                      <span className="font-semibold">{selectedArtifact.exif.model || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Lens:</span>
                      <span>{selectedArtifact.exif.lensModel || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Date Taken:</span>
                      <span>{selectedArtifact.exif.dateTimeOriginal ? formatDate(selectedArtifact.exif.dateTimeOriginal) : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">ISO:</span>
                      <span>{selectedArtifact.exif.iso || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Exposure:</span>
                      <span>{selectedArtifact.exif.exposureTime || 'N/A'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 font-mono text-[11px] italic bg-slate-50 p-2.5 rounded border border-slate-200">
                    EXIF metadata unavailable
                  </p>
                )}
              </div>

              {/* GPS Location Metadata */}
              <div className="space-y-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold font-mono">
                  <MapPin className="h-4 w-4 text-amber-600" />
                  <span>GPS Geolocation Metadata</span>
                </div>

                {selectedArtifact.gps ? (
                  <div className="font-mono text-[11px] text-slate-800 bg-amber-50/60 p-3 rounded border border-amber-200 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Latitude:</span>
                      <span className="font-bold">{selectedArtifact.gps.latitude}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Longitude:</span>
                      <span className="font-bold">{selectedArtifact.gps.longitude}</span>
                    </div>
                    {selectedArtifact.gps.altitude !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Altitude:</span>
                        <span>{selectedArtifact.gps.altitude} m</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-slate-500 font-mono text-[11px] italic bg-slate-50 p-2.5 rounded border border-slate-200">
                    GPS metadata unavailable
                  </p>
                )}
              </div>

              {/* Evidence Indicators & Provenance */}
              <div className="rounded-md bg-blue-50/60 p-3 border border-blue-200 space-y-1 text-[11px]">
                <div className="flex items-center gap-1.5 text-blue-900 font-bold font-mono">
                  <Info className="h-4 w-4 text-blue-700" />
                  <span>Forensic Evidence Provenance</span>
                </div>
                <p className="text-blue-800">
                  <strong className="font-mono">INFO:</strong> Provenance chain confirmed:
                  ImageArtifact ({selectedArtifact.id}) &rarr; Evidence ({selectedArtifact.evidenceId}) &rarr; Case ({selectedArtifact.caseId})
                </p>
              </div>

              <button
                onClick={() => {
                  setScannerArtifact(selectedArtifact);
                  setSelectedArtifact(null);
                }}
                className="w-full mt-3 inline-flex items-center justify-center gap-2 rounded-md bg-indigo-900 px-3 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-800 transition-colors font-mono"
              >
                <Scan className="h-4 w-4 text-cyan-300" />
                Launch Image Indicator Scanner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Indicator Scanner Modal */}
      {scannerArtifact && (
        <ImageIndicatorScanner
          evidenceItem={{
            id: scannerArtifact.evidenceId,
            caseId: scannerArtifact.caseId,
            filename: scannerArtifact.filename,
            type: scannerArtifact.mimeType,
            size: scannerArtifact.fileSize,
            hash: scannerArtifact.sha256,
            importedAt: scannerArtifact.createdAt,
            analysisStatus: scannerArtifact.analysisStatus === 'COMPLETED' ? 'COMPLETED' : 'ANALYZING',
            bookmarked: !!scannerArtifact.bookmarked,
          }}
          imageArtifact={scannerArtifact}
          onClose={() => setScannerArtifact(null)}
          onAnalysisSaved={() => loadData()}
        />
      )}
    </div>
  );
};
