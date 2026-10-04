import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path: string;
}

const routeNameMap: Record<string, string> = {
  dashboard: 'Dashboard',
  cases: 'Cases',
  evidence: 'Evidence',
  browser: 'Browser Analysis',
  images: 'Image Analysis',
  timeline: 'Investigation Timeline',
  reports: 'Reports',
  settings: 'Settings',
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const breadcrumbs: BreadcrumbItem[] = pathnames.map((value, index) => {
    const path = `/${pathnames.slice(0, index + 1).join('/')}`;
    const label = routeNameMap[value] || value;
    return { label, path };
  });

  return (
    <nav className="flex items-center space-x-1.5 text-xs text-slate-500 mb-3" aria-label="Breadcrumb">
      <Link
        to="/dashboard"
        className="flex items-center text-slate-500 hover:text-slate-900 transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.path}>
          <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
          {index === breadcrumbs.length - 1 ? (
            <span className="font-semibold text-slate-900 font-mono" aria-current="page">
              {crumb.label}
            </span>
          ) : (
            <Link
              to={crumb.path}
              className="hover:text-slate-900 transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
