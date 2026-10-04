import React from 'react';
import { Search, Bell, User, Briefcase, ChevronRight } from 'lucide-react';
import { useCaseStore, useUIStore } from '../../stores';

interface HeaderProps {
  onLoadDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLoadDemo }) => {
  const { activeCase } = useCaseStore();
  const { setGlobalSearchOpen } = useUIStore();

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4 shadow-2xs select-none">
      {/* Active Case Context */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200">
          <Briefcase className="h-3.5 w-3.5 text-slate-500" />
          <span className="font-mono font-semibold text-slate-900">
            {activeCase ? activeCase.caseId : 'NO CASE ACTIVE'}
          </span>
          {activeCase && (
            <>
              <ChevronRight className="h-3 w-3 text-slate-400" />
              <span className="truncate max-w-[200px] text-slate-600 font-medium">
                {activeCase.name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Global Actions */}
      <div className="flex items-center gap-3">
        {/* Quick Demo Data Loader Button */}
        <button
          onClick={onLoadDemo}
          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-400 transition-colors"
        >
          Load Demo Investigation
        </button>

        {/* Global Search Trigger */}
        <button
          onClick={() => setGlobalSearchOpen(true)}
          className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500 hover:border-slate-300 hover:bg-slate-100 focus:outline-hidden focus:ring-2 focus:ring-slate-400 transition-colors"
        >
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <span>Search evidence, logs...</span>
          <kbd className="rounded border border-slate-300 bg-white px-1 text-[10px] font-mono text-slate-400 shadow-2xs">
            Ctrl+K
          </kbd>
        </button>

        {/* Activity Indicator */}
        <button
          aria-label="Activity Notifications"
          className="relative rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
        </button>

        {/* User / Investigator Placeholder */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-mono text-xs font-bold">
            <User className="h-4 w-4 text-slate-600" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-800 leading-tight">
              Investigator
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Forensics Unit</span>
          </div>
        </div>
      </div>
    </header>
  );
};
