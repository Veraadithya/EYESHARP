import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Search, X, Folder, Image, Globe, Download, Database, Clock } from 'lucide-react';
import { SearchService } from '../../services/searchService';
import { useCaseStore } from '../../stores';
import type { InvestigationSearchResult, SearchResultType } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToResult?: (result: InvestigationSearchResult) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigateToResult,
}) => {
  const { activeCase } = useCaseStore();
  const [query, setQuery] = useState('');
  const [caseFilter, setCaseFilter] = useState<string>('CURRENT');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [results, setResults] = useState<InvestigationSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search trigger (300ms)
  const executeSearch = useCallback(async (q: string, cFilter: string, tFilter: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const targetCaseId = cFilter === 'CURRENT' && activeCase ? activeCase.caseId : 'ALL';
    const res = await SearchService.search(q, targetCaseId, tFilter);
    setResults(res);
    setSearching(false);
  }, [activeCase]);

  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch(query, caseFilter, typeFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, caseFilter, typeFilter, executeSearch]);

  if (!isOpen) return null;

  const getTypeIcon = (type: SearchResultType) => {
    switch (type) {
      case 'CASE':
        return <Folder className="h-4 w-4 text-blue-600" />;
      case 'EVIDENCE':
        return <Database className="h-4 w-4 text-purple-600" />;
      case 'IMAGE':
      case 'OCR':
        return <Image className="h-4 w-4 text-emerald-600" />;
      case 'BROWSER_HISTORY':
      case 'BROWSER_BOOKMARK':
      case 'BROWSER_SEARCH':
        return <Globe className="h-4 w-4 text-amber-600" />;
      case 'BROWSER_DOWNLOAD':
        return <Download className="h-4 w-4 text-indigo-600" />;
      case 'TIMELINE':
        return <Clock className="h-4 w-4 text-slate-600" />;
      default:
        return <Search className="h-4 w-4 text-slate-400" />;
    }
  };

  const highlightMatch = (text: string | undefined, searchQ: string) => {
    if (!text) return '';
    if (!searchQ.trim()) return text;
    const parts = text.split(new RegExp(`(${searchQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === searchQ.toLowerCase() ? (
            <mark key={i} className="bg-amber-200 text-slate-900 rounded-xs px-0.5 font-bold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 backdrop-blur-xs pt-16 p-4">
      <div className="relative w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden font-mono text-xs flex flex-col max-h-[80vh]">
        {/* Search Header Input */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 bg-slate-50">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Global Investigation Search (URLs, filenames, EXIF, OCR, hashes, queries)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-hidden"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 bg-white text-[11px]">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 uppercase font-bold">Scope:</span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="caseScope"
                checked={caseFilter === 'CURRENT'}
                onChange={() => setCaseFilter('CURRENT')}
              />
              <span>Current Case ({activeCase ? activeCase.caseId : 'None'})</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="caseScope"
                checked={caseFilter === 'ALL'}
                onChange={() => setCaseFilter('ALL')}
              />
              <span>All Cases</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 uppercase font-bold">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] text-slate-700"
            >
              <option value="ALL">All Artifact Types</option>
              <option value="CASE">Cases</option>
              <option value="EVIDENCE">Evidence Files</option>
              <option value="BROWSER_HISTORY">Browser History</option>
              <option value="BROWSER_DOWNLOAD">Browser Downloads</option>
              <option value="BROWSER_SEARCH">Browser Searches</option>
              <option value="IMAGE">Image Artifacts</option>
              <option value="OCR">OCR Extracted Text</option>
              <option value="TIMELINE">Timeline Descriptions</option>
            </select>
          </div>
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {searching ? (
            <div className="py-12 text-center text-slate-400">Searching IndexedDB repositories...</div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              {query.trim() ? 'No matching investigation artifacts found.' : 'Type to search across all case evidence.'}
            </div>
          ) : (
            results.map((res) => (
              <div
                key={res.id}
                onClick={() => {
                  onClose();
                  if (onNavigateToResult) onNavigateToResult(res);
                }}
                className="group p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-400 hover:shadow-xs transition-all cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    {getTypeIcon(res.type)}
                    <span>{highlightMatch(res.title, query)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700 uppercase">
                      {res.type}
                    </span>
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 font-bold text-blue-700 border border-blue-200">
                      {res.caseId}
                    </span>
                  </div>
                </div>

                <div className="text-slate-600 text-xs truncate">
                  {highlightMatch(res.description, query)}
                </div>

                {res.matchedField && (
                  <div className="text-[10px] text-slate-400 pt-1 flex items-center gap-2 border-t border-slate-100">
                    <span>Matched Field: <strong className="text-slate-600">{res.matchedField}</strong></span>
                    {res.browser && <span>Browser: <strong className="text-slate-600">{res.browser}</strong></span>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 px-4 py-2 bg-slate-50 flex items-center justify-between text-[10px] text-slate-400">
          <span>Found {results.length} matching artifacts</span>
          <span>Press <kbd className="rounded bg-slate-200 px-1 text-slate-700">ESC</kbd> to close</span>
        </div>
      </div>
    </div>
  );
};
