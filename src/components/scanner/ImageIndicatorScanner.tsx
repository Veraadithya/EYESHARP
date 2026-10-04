import React, { useState, useEffect, useRef } from 'react';
import {
  Scan,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Camera,
  MapPin,
  ShieldAlert,
  X,
  Copy,
  Check,
  RefreshCw,
  Info,
  Sliders,
  Cpu,
} from 'lucide-react';
import exifr from 'exifr';
import { OcrService } from '../../services/ocrService';
import { ImageIndicatorService } from '../../services/imageIndicatorService';
import { VisualAnalysisService } from '../../services/visualAnalysisService';
import { ImageArtifactRepository } from '../../services/imageArtifactRepository';
import { EvidenceRepository, AuditLogRepository } from '../../services/repositories';
import { calculateSHA256WithWorker } from '../../services/imageAnalysisService';
import type { EvidenceItem, ImageArtifact, ImageForensicIndicator, ImageOcrResult } from '../../types';
import { formatBytes, formatDate } from '../../utils/formatters';

interface ImageIndicatorScannerProps {
  evidenceItem: EvidenceItem;
  imageArtifact?: ImageArtifact;
  imageFile?: File;
  onClose: () => void;
  onAnalysisSaved?: () => void;
}

type ScanStage = 'IDLE' | 'LOADING_IMAGE' | 'READING_METADATA' | 'EXTRACTING_TEXT' | 'CHECKING_INDICATORS' | 'CORRELATING_RESULTS' | 'COMPLETED' | 'FAILED';

export const ImageIndicatorScanner: React.FC<ImageIndicatorScannerProps> = ({
  evidenceItem,
  imageArtifact: initialArtifact,
  imageFile,
  onClose,
  onAnalysisSaved,
}) => {
  // Artifact and File local state
  const [artifact, setArtifact] = useState<ImageArtifact | null>(initialArtifact || null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [sha256Hash, setSha256Hash] = useState<string | undefined>(evidenceItem.hash || initialArtifact?.sha256);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Scan execution state
  const [scanStage, setScanStage] = useState<ScanStage>('IDLE');
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanError, setScanError] = useState<string | null>(null);

  // Analysis result state
  const [exifData, setExifData] = useState<Record<string, unknown> | null>(null);
  const [gpsData, setGpsData] = useState<{ latitude?: number; longitude?: number; altitude?: number } | null>(null);
  const [ocrResult, setOcrResult] = useState<ImageOcrResult | null>(null);
  const [ocrLoading, setOcrLoading] = useState<boolean>(false);
  const [indicators, setIndicators] = useState<ImageForensicIndicator[]>([]);
  const [visualModelStatus, setVisualModelStatus] = useState<string>('Uninitialized');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load image preview and initial data
  useEffect(() => {
    let objectUrl: string | undefined;

    if (imageFile) {
      objectUrl = URL.createObjectURL(imageFile);
      setImageSrc(objectUrl);
      if (!sha256Hash) {
        calculateSHA256WithWorker(imageFile)
          .then((hash) => setSha256Hash(hash))
          .catch((err) => console.warn('Hash computation warning:', err));
      }
    } else if (initialArtifact?.thumbnail) {
      setImageSrc(initialArtifact.thumbnail);
    }

    // Load existing indicators if available
    if (initialArtifact?.id) {
      ImageArtifactRepository.getById(initialArtifact.id).then((art) => {
        if (art) setArtifact(art);
      });
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile, initialArtifact, sha256Hash]);

  // Execute full automated scanning workflow
  const handleRunAnalysis = async () => {
    setScanStage('LOADING_IMAGE');
    setScanProgress(10);
    setScanError(null);
    setIsSaved(false);

    try {
      // 1. Stage: Loading image & resolving File / Blob
      await new Promise((r) => setTimeout(r, 400));
      setScanProgress(25);

      let targetFile: File | undefined = imageFile;
      let dataUrl: string | null = imageSrc;

      // Convert imageSrc to DataURL if needed for Tesseract OCR
      if (!dataUrl && imageFile) {
        dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imageFile);
        });
      }

      // Calculate SHA-256 hash if missing
      let hash = sha256Hash;
      if (!hash && targetFile) {
        hash = await calculateSHA256WithWorker(targetFile);
        setSha256Hash(hash);
      }

      // 2. Stage: Reading EXIF & GPS Metadata via exifr
      setScanStage('READING_METADATA');
      setScanProgress(45);
      await new Promise((r) => setTimeout(r, 400));

      let extractedExif: Record<string, unknown> | null = null;
      let extractedGps: { latitude?: number; longitude?: number; altitude?: number } | null = null;

      if (targetFile) {
        try {
          const rawExif = await exifr.parse(targetFile, { gps: true });
          if (rawExif) {
            extractedExif = rawExif;
            setExifData(rawExif);
            if (rawExif.latitude !== undefined && rawExif.longitude !== undefined) {
              extractedGps = {
                latitude: Number(rawExif.latitude),
                longitude: Number(rawExif.longitude),
                altitude: rawExif.altitude ? Number(rawExif.altitude) : undefined,
              };
              setGpsData(extractedGps);
            }
          }
        } catch (exifErr) {
          console.warn('EXIF parse warning:', exifErr);
        }
      }

      // 3. Stage: Extracting Text (OCR via Tesseract.js)
      setScanStage('EXTRACTING_TEXT');
      setScanProgress(65);
      setOcrLoading(true);

      let ocrRes: ImageOcrResult | null = null;
      if (dataUrl) {
        try {
          ocrRes = await OcrService.runOcr(
            artifact?.id || evidenceItem.id,
            evidenceItem.caseId,
            dataUrl
          );
          setOcrResult(ocrRes);
        } catch (ocrErr) {
          console.warn('OCR processing notice:', ocrErr);
        }
      }
      setOcrLoading(false);

      // 4. Stage: Checking Computer Vision & Visual Indicators
      setScanStage('CHECKING_INDICATORS');
      setScanProgress(80);
      await new Promise((r) => setTimeout(r, 400));

      const visResult = await VisualAnalysisService.analyzeVisualContent(
        dataUrl || '',
        artifact?.id || evidenceItem.id
      );
      setVisualModelStatus(visResult.statusMessage);

      // 5. Stage: Correlating Results & Generating Neutral Forensic Indicators
      setScanStage('CORRELATING_RESULTS');
      setScanProgress(90);
      await new Promise((r) => setTimeout(r, 400));

      // Construct target ImageArtifact record
      const targetArtifact: ImageArtifact = artifact || {
        id: `img-art-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        evidenceId: evidenceItem.id,
        caseId: evidenceItem.caseId,
        filename: evidenceItem.filename,
        mimeType: evidenceItem.type,
        fileSize: evidenceItem.size,
        sha256: hash,
        thumbnail: dataUrl || undefined,
        exif: extractedExif ? {
          make: extractedExif.Make ? String(extractedExif.Make) : undefined,
          model: extractedExif.Model ? String(extractedExif.Model) : undefined,
          software: extractedExif.Software ? String(extractedExif.Software) : undefined,
          dateTimeOriginal: extractedExif.DateTimeOriginal ? new Date(String(extractedExif.DateTimeOriginal)).toISOString() : undefined,
        } : undefined,
        gps: extractedGps || undefined,
        createdAt: new Date().toISOString(),
        analysisStatus: 'COMPLETED',
      };

      setArtifact(targetArtifact);

      // Sync exifData display state from artifact if raw exifr parse was skipped
      // (happens when scanning an existing artifact without a fresh File object)
      if (!extractedExif && targetArtifact.exif) {
        setExifData({
          Make: targetArtifact.exif.make,
          Model: targetArtifact.exif.model,
          Software: targetArtifact.exif.software,
          DateTimeOriginal: targetArtifact.exif.dateTimeOriginal,
        });
      }

      // Generate indicators via ImageIndicatorService
      const generatedIndicators = await ImageIndicatorService.generateIndicators(
        targetArtifact,
        ocrRes?.text,
        ocrRes?.confidence,
        visResult.indicators
      );

      setIndicators(generatedIndicators);

      // 6. Complete
      setScanStage('COMPLETED');
      setScanProgress(100);

      // Automatically persist results to Evidence & Dexie database
      await saveAnalysisToEvidence(targetArtifact, hash, generatedIndicators);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Image indicator scan failed';
      setScanError(msg);
      setScanStage('FAILED');
    }
  };

  // Persist analysis results directly into Dexie DB and update Evidence record
  const saveAnalysisToEvidence = async (
    targetArtifact: ImageArtifact,
    hashDigest?: string,
    indicatorList: ImageForensicIndicator[] = indicators
  ) => {
    try {
      // 1. Save / Update ImageArtifact in DB
      await ImageArtifactRepository.create(targetArtifact);

      // 2. Update parent EvidenceItem status & hash
      await EvidenceRepository.update(evidenceItem.id, {
        analysisStatus: 'COMPLETED',
        hash: hashDigest || evidenceItem.hash,
      });

      // 3. Log Audit Record for Forensic Provenance
      await AuditLogRepository.log({
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        caseId: evidenceItem.caseId,
        action: 'IMAGE_INDICATOR_SCAN_COMPLETED',
        description: `Completed indicator analysis scan for evidence "${evidenceItem.filename}". Generated ${indicatorList.length} neutral indicators.`,
        entityType: 'EVIDENCE',
        entityId: evidenceItem.id,
        timestamp: new Date().toISOString(),
      });

      setIsSaved(true);
      if (onAnalysisSaved) onAnalysisSaved();
    } catch (saveErr) {
      console.error('Failed to save analysis to evidence record:', saveErr);
    }
  };

  const handleCopyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-xl border border-slate-800 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden font-sans">
        
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-md bg-indigo-500/10 p-2 border border-indigo-500/20 text-indigo-400">
              <Scan className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold font-mono tracking-tight text-white uppercase">
                  Image Indicator Scanner
                </h2>
                <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 font-mono text-[10px] text-indigo-300 border border-indigo-500/30">
                  EYESHARP v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Evidence: <span className="font-mono text-slate-200">{evidenceItem.filename}</span> ({evidenceItem.caseId})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Content Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
          
          {/* Left Column: Image Preview & File Meta (5 cols) */}
          <div className="lg:col-span-5 bg-slate-950 p-5 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between space-y-4">
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="uppercase text-[10px] tracking-wider text-slate-500">Image Evidence Preview</span>
                <span>{evidenceItem.type}</span>
              </div>

              {/* Image Container with Scanning Visual Line */}
              <div className="relative aspect-4/3 w-full rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden group">
                {imageSrc ? (
                  <>
                    <img
                      src={imageSrc}
                      alt={evidenceItem.filename}
                      className="max-h-full max-w-full object-contain"
                    />
                    
                    {/* Scanning Line Visual Effect */}
                    {(scanStage !== 'IDLE' && scanStage !== 'COMPLETED' && scanStage !== 'FAILED') && (
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#38bdf8] animate-bounce top-0 bottom-0 my-auto" />
                    )}
                  </>
                ) : (
                  <div className="text-center p-6 text-slate-500">
                    <Scan className="mx-auto h-10 w-10 text-slate-600 mb-2" />
                    <p className="text-xs font-mono">No visual preview loaded</p>
                    {imageFile ? null : (
                      <p className="text-[10px] text-slate-600 mt-1">Select file to analyze</p>
                    )}
                  </div>
                )}

                {/* Case Overlay Badge */}
                <span className="absolute bottom-2 left-2 rounded bg-slate-950/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-300 backdrop-blur-md border border-slate-800">
                  ID: {evidenceItem.id}
                </span>
              </div>

              {/* File Specs Table */}
              <div className="rounded-lg bg-slate-900/60 p-3.5 border border-slate-800/80 space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                  <span className="text-slate-400 text-[11px]">Filename</span>
                  <span className="text-slate-200 font-semibold truncate max-w-[180px]">{evidenceItem.filename}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[11px]">File Size</span>
                  <span className="text-slate-200">{formatBytes(evidenceItem.size)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[11px]">File Type</span>
                  <span className="text-slate-200">{evidenceItem.type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[11px]">Dimensions</span>
                  <span className="text-slate-200">
                    {artifact?.width && artifact?.height ? `${artifact.width} × ${artifact.height} px` : 'Read on Scan'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase text-slate-500 font-bold">SHA-256 Digest</span>
                    {sha256Hash && (
                      <button
                        onClick={() => handleCopyHash(sha256Hash)}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                      >
                        {copiedHash ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        {copiedHash ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 break-all bg-slate-950 p-1.5 rounded border border-slate-800">
                    {sha256Hash || 'Hash ready on scan start'}
                  </p>
                </div>
              </div>
            </div>

            {/* Analyze Image Main Button */}
            <div className="pt-2">
              <button
                onClick={handleRunAnalysis}
                disabled={scanStage !== 'IDLE' && scanStage !== 'COMPLETED' && scanStage !== 'FAILED'}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold font-mono text-white shadow-lg hover:bg-indigo-500 active:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scanStage !== 'IDLE' && scanStage !== 'COMPLETED' && scanStage !== 'FAILED' ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-cyan-300" />
                    <span>Scanning Image ({scanProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Scan className="h-4 w-4 text-cyan-300" />
                    <span>ANALYZE IMAGE</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Scan Stages & Results Panel (7 cols) */}
          <div className="lg:col-span-7 p-5 space-y-5 overflow-y-auto">
            
            {/* Stage Progress & Scanning Animation Box */}
            <div className="rounded-lg bg-slate-950 p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-indigo-400" />
                  Analysis Stage Pipeline
                </span>
                <span className="text-xs font-mono font-semibold text-cyan-400">
                  {scanStage === 'COMPLETED' ? 'Complete' : `${scanProgress}%`}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>

              {/* Step Checkmarks */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                <div className={`flex items-center gap-2 ${scanProgress >= 25 ? 'text-emerald-400' : 'text-slate-600'}`}>
                  <span>{scanProgress >= 25 ? '✓' : '◉'}</span> Image loaded
                </div>
                <div className={`flex items-center gap-2 ${scanProgress >= 45 ? 'text-emerald-400' : 'text-slate-600'}`}>
                  <span>{scanProgress >= 45 ? '✓' : '◉'}</span> Metadata analyzed
                </div>
                <div className={`flex items-center gap-2 ${scanProgress >= 65 ? 'text-emerald-400' : 'text-slate-600'}`}>
                  <span>{scanProgress >= 65 ? '✓' : '◉'}</span> OCR completed
                </div>
                <div className={`flex items-center gap-2 ${scanProgress >= 80 ? 'text-emerald-400' : 'text-slate-600'}`}>
                  <span>{scanProgress >= 80 ? '✓' : '◉'}</span> Checking indicators
                </div>
                <div className={`flex items-center gap-2 ${scanProgress >= 90 ? 'text-emerald-400' : 'text-slate-600'}`}>
                  <span>{scanProgress >= 90 ? '✓' : '◉'}</span> Correlating results
                </div>
                <div className={`flex items-center gap-2 ${scanProgress >= 100 ? 'text-emerald-400 font-semibold' : 'text-slate-600'}`}>
                  <span>{scanProgress >= 100 ? '✓' : '◉'}</span> Analysis complete
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {scanError && (
              <div className="rounded-lg bg-red-950/60 p-3.5 border border-red-800 text-xs font-mono text-red-200 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Analysis Exception Encountered</strong>
                  <span>{scanError}</span>
                </div>
              </div>
            )}

            {/* Results Status Banner */}
            {scanStage === 'COMPLETED' && (
              <div className="rounded-lg bg-slate-950 p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-bold uppercase font-mono tracking-wider text-slate-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    IMAGE ANALYSIS STATUS
                  </span>
                  {isSaved && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                      <Check className="h-3 w-3" /> Saved to Evidence
                    </span>
                  )}
                </div>

                {/* POTENTIAL INDICATORS SECTION */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-slate-300 uppercase tracking-tight">
                      POTENTIAL INDICATORS DETECTED ({indicators.length})
                    </span>
                  </div>

                  {indicators.length === 0 ? (
                    <div className="rounded-md bg-emerald-950/30 p-3 border border-emerald-900/40 text-xs font-mono text-emerald-300">
                      ✓ No violence, threat, or metadata anomaly indicators detected.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {indicators.map((ind) => {
                        // Color by SEVERITY — gives variety across different images
                        // INFO    → 🔵 blue   (basic metadata facts)
                        // NOTICE  → 🟡 yellow  (notable but not suspicious)
                        // REVIEW  → 🟠 orange  (anomalies worth reviewing)
                        // FLAGGED → 🔴 red     (high-priority indicators)
                        let badgeColor: string;
                        let icon: string;
                        let severityLabel: string;

                        switch (ind.severity) {
                          case 'FLAGGED':
                            badgeColor = 'bg-red-950/90 text-red-200 border-red-800';
                            icon = '🔴';
                            severityLabel = 'FLAGGED';
                            break;
                          case 'REVIEW':
                            badgeColor = 'bg-amber-950/80 text-amber-200 border-amber-800';
                            icon = '🟠';
                            severityLabel = 'REVIEW';
                            break;
                          case 'NOTICE':
                            badgeColor = 'bg-yellow-950/70 text-yellow-200 border-yellow-800';
                            icon = '🟡';
                            severityLabel = 'NOTICE';
                            break;
                          case 'INFO':
                          default:
                            badgeColor = 'bg-blue-950/80 text-blue-200 border-blue-800';
                            icon = '🔵';
                            severityLabel = 'INFO';
                            break;
                        }

                        return (
                          <div
                            key={ind.id}
                            className={`rounded-lg p-3 border text-xs font-mono space-y-1.5 ${badgeColor}`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span className="flex items-center gap-1.5">
                                <span>{icon}</span>
                                <span>{ind.category || 'Potential indicator detected'}</span>
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-slate-300 font-bold">
                                  {severityLabel}
                                </span>
                                {ind.confidence && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-700 text-slate-300">
                                    {ind.confidence}% conf.
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="font-sans text-xs font-semibold text-slate-100">{ind.title}</p>
                            <p className="text-[11px] text-slate-300">{ind.description}</p>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1 border-t border-slate-800/50">
                              <span>Source: <strong className="text-slate-200">{ind.source || 'Engine'}</strong></span>
                              <span>Evidence ID: <strong className="text-slate-200">{ind.evidenceId}</strong></span>
                              <span>Code: <strong className="text-slate-300">{ind.code}</strong></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Detail Tabs / Accordion Sections */}
            <div className="space-y-3">
              
              {/* EXIF / METADATA Section */}
              <div className="rounded-lg bg-slate-950 p-4 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold font-mono text-slate-300 uppercase">
                  <Camera className="h-4 w-4 text-indigo-400" />
                  <span>IMAGE METADATA & EXIF</span>
                </div>

{(() => {
                    // Prefer raw exifData (from fresh exifr parse), fall back to artifact.exif
                    const ef = exifData || (artifact?.exif ? {
                      Make: artifact.exif.make,
                      Model: artifact.exif.model,
                      Software: artifact.exif.software,
                      DateTimeOriginal: artifact.exif.dateTimeOriginal,
                    } : null);

                    return ef ? (
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-slate-900/60 p-3 rounded-md border border-slate-800">
                        <div>
                          <span className="text-slate-500 text-[10px] block uppercase">Camera Make</span>
                          <span className="text-slate-200 font-semibold">{String((ef as Record<string, unknown>).Make || 'N/A')}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block uppercase">Camera Model</span>
                          <span className="text-slate-200 font-semibold">{String((ef as Record<string, unknown>).Model || 'N/A')}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block uppercase">Date / Time Original</span>
                          <span className="text-slate-300">
                            {(ef as Record<string, unknown>).DateTimeOriginal
                              ? String((ef as Record<string, unknown>).DateTimeOriginal)
                              : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block uppercase">Software</span>
                          <span className="text-slate-300">
                            {(ef as Record<string, unknown>).Software
                              ? String((ef as Record<string, unknown>).Software)
                              : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block uppercase">ISO</span>
                          <span className="text-slate-300">
                            {(ef as Record<string, unknown>).ISO
                              ? String((ef as Record<string, unknown>).ISO)
                              : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block uppercase">Exposure</span>
                          <span className="text-slate-300">
                            {(ef as Record<string, unknown>).ExposureTime
                              ? `${String((ef as Record<string, unknown>).ExposureTime)}s`
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md bg-slate-900/40 p-3 border border-slate-800 text-xs font-mono text-slate-400 italic">
                        No EXIF metadata found.
                      </div>
                    );
                  })()}

                {/* GPS Location Row */}
                {gpsData ? (
                  <div className="rounded-md bg-amber-950/30 p-3 border border-amber-900/40 text-xs font-mono text-amber-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-amber-400" />
                      <span>GPS Coordinates Recorded</span>
                    </div>
                    <span className="font-bold">
                      Lat: {gpsData.latitude}, Long: {gpsData.longitude}
                    </span>
                  </div>
                ) : null}
              </div>

              {/* OCR RESULTS Section */}
              <div className="rounded-lg bg-slate-950 p-4 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono text-slate-300 uppercase">
                    <FileText className="h-4 w-4 text-cyan-400" />
                    <span>OCR TEXT EXTRACTION</span>
                  </div>
                  {ocrResult?.confidence !== undefined && (
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      Confidence: {ocrResult.confidence}%
                    </span>
                  )}
                </div>

                {ocrLoading ? (
                  <div className="p-4 text-center text-xs font-mono text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                    <span>Extracting optical character text using Tesseract.js worker...</span>
                  </div>
                ) : ocrResult?.text ? (
                  <div className="rounded-md bg-slate-900/80 p-3 border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap max-h-36 overflow-y-auto">
                    {ocrResult.text}
                  </div>
                ) : (
                  <div className="rounded-md bg-slate-900/40 p-3 border border-slate-800 text-xs font-mono text-slate-400 italic">
                    No readable text detected.
                  </div>
                )}
              </div>

              {/* VISUAL MODEL ANALYSIS Section */}
              <div className="rounded-lg bg-slate-950 p-4 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono text-slate-300 uppercase">
                    <Sliders className="h-4 w-4 text-purple-400" />
                    <span>VISUAL ANALYSIS ENGINE STATUS</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Computer Vision Layer</span>
                </div>
                <p className="text-xs font-mono text-slate-300 bg-slate-900/60 p-3 rounded-md border border-slate-800">
                  {visualModelStatus}
                </p>
              </div>

              {/* FORENSIC INTEGRITY Section */}
              <div className="rounded-lg bg-indigo-950/20 p-3.5 border border-indigo-900/30 text-xs font-mono text-indigo-300 space-y-1">
                <div className="flex items-center gap-2 font-bold text-indigo-200">
                  <Info className="h-4 w-4 text-indigo-400" />
                  <span>Chain of Custody & Derived Artifact Integrity</span>
                </div>
                <p className="text-[11px] text-indigo-300/80">
                  Original evidence file hash ({sha256Hash ? `${sha256Hash.substring(0, 16)}...` : 'Preserved'}) remains untouched. Analysis results stored as derived forensic artifacts.
                </p>
              </div>

            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950 px-5 py-3 text-xs font-mono">
          <span className="text-slate-400">
            Case: <strong className="text-slate-200">{evidenceItem.caseId}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-md border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
            {scanStage === 'COMPLETED' && (
              <button
                onClick={() => artifact && saveAnalysisToEvidence(artifact, sha256Hash)}
                disabled={isSaved}
                className="rounded-md bg-emerald-600 px-4 py-1.5 font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-60 transition-colors flex items-center gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                {isSaved ? 'Analysis Saved to Evidence' : 'Save Analysis to Evidence'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
