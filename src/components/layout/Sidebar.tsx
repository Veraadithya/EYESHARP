import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  HardDrive,
  Globe,
  Image,
  Clock,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSidebarStore } from '../../stores';

import logoHorizontal from '../../assets/eyesharp-horizontal-lockup.jpg';
import logoIcon from '../../assets/eyesharp-app-icon.jpg';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Cases', path: '/cases', icon: Briefcase },
  { name: 'Evidence', path: '/evidence', icon: HardDrive },
  { name: 'Browser Analysis', path: '/browser', icon: Globe },
  { name: 'Image Analysis', path: '/images', icon: Image },
  { name: 'Timeline', path: '/timeline', icon: Clock },
  { name: 'Reports', path: '/reports', icon: FileText },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { isCollapsed, toggleSidebar } = useSidebarStore();

  return (
    <aside
      className={`relative flex flex-col border-r border-slate-200 bg-slate-50 transition-all duration-200 ease-in-out select-none ${isCollapsed ? 'w-16' : 'w-64'
        }`}
      aria-label="Sidebar Navigation"
    >
      {/* Brand / Application Logo Header */}
      <div className={`flex h-14 items-center border-b border-slate-200 overflow-hidden ${isCollapsed ? 'justify-center px-2 bg-white' : 'p-0 bg-[#0a0f1e]'}`}>
        {isCollapsed ? (
          <img
            src={logoIcon}
            alt="EYESHARP Logo"
            className="h-9 w-9 object-cover rounded-lg"
          />
        ) : (
          <img
            src={logoHorizontal}
            alt="EYESHARP Workstation"
            className="w-full h-14 object-cover object-left"
          />
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center rounded-md px-2.5 py-2 text-xs font-medium transition-colors ${isActive
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
                } ${isCollapsed ? 'justify-center' : 'justify-start gap-3'}`
              }
              title={isCollapsed ? item.name : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Sidebar Toggle Button */}
      <div className="border-t border-slate-200 p-2 bg-slate-100/50">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded-md p-1.5 text-xs text-slate-600 hover:bg-slate-200 hover:text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-400"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono font-medium">
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse Sidebar</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
