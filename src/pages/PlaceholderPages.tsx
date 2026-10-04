import React from 'react';
import {
  Globe,
  Image as ImageIcon,
  Clock,
  FileText,
  AlertCircle,
  Database,
  Cpu,
  Monitor,
  Info,
} from 'lucide-react';

interface ModulePlaceholderProps {
  title: string;
  description: string;
  phase: string;
  supportedSources?: string[];
  icon: React.ComponentType<{ className?: string }>;
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  title,
  description,
  phase,
  supportedSources,
  icon: Icon,
}) => (
  <div className="space-y-5">
    <div className="border-b border-slate-200 pb-4">
      <h1 className="text-xl font-bold text-slate-900 font-mono tracking-tight">{title}</h1>
      <p className="text-xs text-slate-500">{description}</p>
    </div>

    <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-2xs">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-700">
        <Icon className="h-6 w-6" />
      </div>

      <h2 className="mt-4 text-sm font-bold text-slate-900 font-mono">{title} Forensic Module</h2>
      <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">{description}</p>

      {supportedSources && supportedSources.length > 0 && (
        <div className="mt-5 inline-block rounded-md bg-slate-50 p-3 border border-slate-200 text-left">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1 font-mono">
            Planned Supported Sources:
          </span>
          <ul className="list-disc list-inside text-xs font-mono text-slate-700 space-y-0.5">
            {supportedSources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200 font-mono">
          <AlertCircle className="h-3.5 w-3.5" />
          Scheduled for [{phase}]
        </span>
      </div>
    </div>
  </div>
);

export const BrowserAnalysisPage: React.FC = () => (
  <ModulePlaceholder
    title="Browser Analysis"
    description="Analyze imported Chrome, Edge, and Firefox evidence."
    phase="Phase 4"
    supportedSources={['Google Chrome (History, Cookies, Cache)', 'Microsoft Edge', 'Mozilla Firefox']}
    icon={Globe}
  />
);

export const ImageAnalysisPage: React.FC = () => (
  <ModulePlaceholder
    title="Image Analysis"
    description="Analyze image evidence, metadata, hashes, and visual indicators."
    phase="Phase 2"
    supportedSources={['JPEG / PNG / WebP metadata', 'GPS Coordinates & Camera Data', 'pHash & Image Similarity']}
    icon={ImageIcon}
  />
);

export const TimelinePage: React.FC = () => (
  <ModulePlaceholder
    title="Investigation Timeline"
    description="Correlate browser and image events into a unified investigation timeline."
    phase="Phase 5"
    supportedSources={['File Import Timestamps', 'Browser History Correlation', 'Audit Log Provenance']}
    icon={Clock}
  />
);

export const ReportsPage: React.FC = () => (
  <ModulePlaceholder
    title="Reports"
    description="Generate structured case investigation reports."
    phase="Phase 6"
    supportedSources={['Case Summary PDF', 'Evidence Hash Audit Export', 'Executive Briefing']}
    icon={FileText}
  />
);

export const SettingsPage: React.FC = () => (
  <div className="space-y-5">
    <div className="border-b border-slate-200 pb-4">
      <h1 className="text-xl font-bold text-slate-900 font-mono tracking-tight">
        Workstation Settings
      </h1>
      <p className="text-xs text-slate-500">
        Review application configurations, local persistence modes, and system architecture.
      </p>
    </div>

    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {/* Appearance Section */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Monitor className="h-4 w-4 text-slate-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
            Appearance & UI Theme
          </h2>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">Current UI Mode</span>
          <span className="rounded bg-slate-100 px-2 py-1 font-mono font-bold text-slate-800 border border-slate-200">
            Light Mode (Workstation Default)
          </span>
        </div>
        <p className="text-[11px] text-slate-500">
          Workstation palette optimized for long-form analysis with high contrast text and dense data grids.
        </p>
      </div>

      {/* Application Storage Section */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Database className="h-4 w-4 text-slate-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
            Application Persistence
          </h2>
        </div>
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-slate-500">Application Name:</span>
            <span className="font-bold text-slate-800">EYESHARP Workstation</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Current Version:</span>
            <span className="font-bold text-slate-800">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Storage Mode:</span>
            <span className="font-bold text-emerald-700">Local IndexedDB (Dexie)</span>
          </div>
        </div>
      </div>

      {/* Processing & Backend Section */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Cpu className="h-4 w-4 text-slate-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
            Processing Environment
          </h2>
        </div>
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-slate-500">Processing Pipeline:</span>
            <span className="font-bold text-emerald-700">Local-First (Zero Cloud)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Backend Server:</span>
            <span className="font-bold text-slate-500">Not Connected (Client-Only)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Desktop Bridge:</span>
            <span className="font-bold text-slate-600">Browser FileSystem API (Tauri Ready)</span>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Info className="h-4 w-4 text-slate-700" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
            About EYESHARP
          </h2>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          EYESHARP Digital Forensics Investigation Workstation. Designed for local browser artifact triage,
          image evidence extraction, and deterministic chain-of-custody logging.
        </p>
        <div className="rounded bg-slate-50 p-2.5 text-[11px] font-mono text-slate-600 border border-slate-200">
          Status: Phase 1 Completed & Verified
        </div>
      </div>
    </div>
  </div>
);
