import React, { useEffect, useState } from 'react';
import {
  Clock,
  Search,
  History,
  Download,
  Bookmark,
  Search as SearchIcon,
  Image,
  Database,
  X,
} from 'lucide-react';
import { useCaseStore } from '../stores';
import { TimelineService } from '../services/timelineService';
import { CaseRepository } from '../services/repositories';
import type {
  InvestigationTimelineEvent,
  TimelineEventType,
  InvestigationCase,
} from '../types';
import { formatDate } from '../utils/formatters';

export const TimelinePage: React.FC = () => {
  const { activeCase } = useCaseStore();
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [events, setEvents] = useState<InvestigationTimelineEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedCaseId, setSelectedCaseId] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedBrowser, setSelectedBrowser] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
  const [zoomLevel, setZoomLevel] = useState<'DAY' | 'HOUR' | 'EVENT'>('DAY');

  // Selected Detail Item Modal
  const [selectedEvent, setSelectedEvent] = useState<InvestigationTimelineEvent | null>(null);

  const loadData = async () => {
    setLoading(true);
    const allCases = await CaseRepository.getAll();
    setCases(allCases);

    const targetCaseId = activeCase ? activeCase.caseId : (allCases.length > 0 ? allCases[0]!.caseId : 'CASE-2026-001');
    if (activeCase) setSelectedCaseId(activeCase.caseId);

    const evs = await TimelineService.getEventsForCase(targetCaseId);
    setEvents(evs);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeCase]);

  const handleCaseChange = async (caseId: string) => {
    setSelectedCaseId(caseId);
    setLoading(true);
    const evs = await TimelineService.getEventsForCase(caseId);
    setEvents(evs);
    setLoading(false);
  };

  // Filter & Sort Logic
  const filteredEvents = events.filter((ev) => {
    const q = search.toLowerCase();
    const matchesSearch =
      ev.title.toLowerCase().includes(q) ||
      (ev.description && ev.description.toLowerCase().includes(q)) ||
      (ev.browser && ev.browser.toLowerCase().includes(q));

    const matchesType = selectedType === 'ALL' || ev.type === selectedType;
    const matchesBrowser = selectedBrowser === 'ALL' || ev.browser === selectedBrowser;

    return matchesSearch && matchesType && matchesBrowser;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return sortOrder === 'NEWEST' ? timeB - timeA : timeA - timeB;
  });

  // Event Grouping by Date
  const groupEventsByDate = (eventList: InvestigationTimelineEvent[]) => {
    const groups: Record<string, InvestigationTimelineEvent[]> = {};
    for (const ev of eventList) {
      const dateStr = new Date(ev.timestamp).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr]!.push(ev);
    }
    return groups;
  };

  const groupedEvents = groupEventsByDate(sortedEvents);

  const getEventIcon = (type: TimelineEventType) => {
    switch (type) {
      case 'BROWSER_HISTORY':
        return <History className="h-4 w-4 text-blue-600" />;
      case 'BROWSER_DOWNLOAD':
        return <Download className="h-4 w-4 text-purple-600" />;
      case 'BROWSER_SEARCH':
        return <SearchIcon className="h-4 w-4 text-amber-600" />;
      case 'BROWSER_BOOKMARK':
        return <Bookmark className="h-4 w-4 text-indigo-600" />;
      case 'IMAGE_IMPORTED':
      case 'IMAGE_ANALYZED':
      case 'IMAGE_OCR':
      case 'IMAGE_DUPLICATE':
      case 'IMAGE_SIMILARITY':
        return <Image className="h-4 w-4 text-emerald-600" />;
      case 'EVIDENCE_IMPORTED':
        return <Database className="h-4 w-4 text-slate-600" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-mono tracking-tight flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-700" /> Unified Investigation Timeline
          </h1>
          <p className="text-xs text-slate-500">
            Chronological aggregation of normalized forensic events across browser history, downloads, searches, bookmarks, images, EXIF, and evidence imports.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <select
            value={selectedCaseId}
            onChange={(e) => handleCaseChange(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.caseId}>
                {c.caseId} - {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center font-mono">
        <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase block">Total Events</span>
          <span className="text-xl font-bold text-slate-900">{events.length}</span>
        </div>
        <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase block">Filtered Events</span>
          <span className="text-xl font-bold text-slate-900">{filteredEvents.length}</span>
        </div>
        <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase block">Browser Events</span>
          <span className="text-xl font-bold text-blue-600">
            {events.filter((e) => e.sourceType === 'BROWSER').length}
          </span>
        </div>
        <div className="rounded-lg bg-white p-3 border border-slate-200 shadow-2xs">
          <span className="text-[10px] text-slate-500 uppercase block">Image & Media Events</span>
          <span className="text-xl font-bold text-emerald-600">
            {events.filter((e) => e.sourceType === 'IMAGE').length}
          </span>
        </div>
      </div>

      {/* Timeline Controls & Filters */}
      <div className="flex flex-col gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search timeline events, URLs, queries, filenames..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Event Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700"
            >
              <option value="ALL">All Event Types</option>
              <option value="BROWSER_HISTORY">Browser History</option>
              <option value="BROWSER_DOWNLOAD">Downloads</option>
              <option value="BROWSER_SEARCH">Searches</option>
              <option value="BROWSER_BOOKMARK">Bookmarks</option>
              <option value="IMAGE_ANALYZED">Image Analysis</option>
              <option value="IMAGE_OCR">OCR Extracted</option>
              <option value="IMAGE_DUPLICATE">Duplicates</option>
              <option value="EVIDENCE_IMPORTED">Evidence Imports</option>
            </select>

            {/* Browser Filter */}
            <select
              value={selectedBrowser}
              onChange={(e) => setSelectedBrowser(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700"
            >
              <option value="ALL">All Browsers</option>
              <option value="CHROME">Chrome</option>
              <option value="EDGE">Edge</option>
              <option value="FIREFOX">Firefox</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'NEWEST' | 'OLDEST')}
              className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 font-bold"
            >
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
            </select>

            {/* Grouping / Zoom */}
            <div className="flex items-center rounded-md border border-slate-300 overflow-hidden text-[11px]">
              <button
                onClick={() => setZoomLevel('DAY')}
                className={`px-2 py-1 font-bold ${zoomLevel === 'DAY' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
              >
                Day
              </button>
              <button
                onClick={() => setZoomLevel('EVENT')}
                className={`px-2 py-1 font-bold ${zoomLevel === 'EVENT' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
              >
                Flat
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Timeline Stream */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500 font-mono">
          Assembling unified timeline from IndexedDB repositories...
        </div>
      ) : sortedEvents.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 font-mono bg-white rounded-lg border border-slate-200">
          No matching timeline events found for this case and filter criteria.
        </div>
      ) : zoomLevel === 'DAY' ? (
        // Grouped Timeline View
        <div className="space-y-6 font-mono text-xs">
          {Object.entries(groupedEvents).map(([dateStr, dateEvents]) => (
            <div key={dateStr} className="space-y-3">
              <div className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur-xs px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-between">
                <span>{dateStr}</span>
                <span className="text-[10px] text-slate-500 font-normal">{dateEvents.length} events</span>
              </div>

              <div className="relative pl-6 space-y-3 border-l-2 border-slate-200 ml-3">
                {dateEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="relative group p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-400 hover:shadow-xs transition-all cursor-pointer space-y-1"
                  >
                    <div className="absolute -left-[31px] top-3.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-slate-900 shadow-2xs" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                        {getEventIcon(ev.type)}
                        <span>{ev.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        {ev.browser && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-800">
                            {ev.browser}
                          </span>
                        )}
                        <span className="font-semibold">{formatDate(ev.timestamp)}</span>
                      </div>
                    </div>

                    {ev.description && (
                      <div className="text-slate-600 text-[11px] truncate pt-0.5">{ev.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Flat List Timeline View
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs font-mono text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Type</th>
                <th className="p-3">Event Title</th>
                <th className="p-3">Browser / Source</th>
                <th className="p-3">Case</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedEvents.map((ev) => (
                <tr
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="p-3 text-slate-600 whitespace-nowrap">{formatDate(ev.timestamp)}</td>
                  <td className="p-3">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-800 uppercase">
                      {ev.type}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-slate-900 max-w-md truncate">{ev.title}</td>
                  <td className="p-3 text-slate-600">{ev.browser || ev.sourceType}</td>
                  <td className="p-3 text-slate-500">{ev.caseId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-2xl space-y-4 font-mono text-xs">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-slate-200 pb-3">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                TIMELINE EVENT DETAILS
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-1">{selectedEvent.title}</h3>
            </div>

            <div className="space-y-2 bg-slate-50 p-3 rounded border border-slate-200 text-[11px] leading-relaxed">
              <div>
                <span className="text-slate-400 block">Timestamp:</span>
                <span className="font-bold text-slate-900">{formatDate(selectedEvent.timestamp)}</span>
              </div>

              <div>
                <span className="text-slate-400 block">Description:</span>
                <span className="text-slate-800">{selectedEvent.description || 'N/A'}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[10px]">
                <div>
                  <span className="text-slate-400 block">Event Type:</span>
                  <span className="font-bold">{selectedEvent.type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Source Type:</span>
                  <span className="font-bold">{selectedEvent.sourceType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Case ID:</span>
                  <span className="font-bold">{selectedEvent.caseId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Browser:</span>
                  <span className="font-bold">{selectedEvent.browser || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
