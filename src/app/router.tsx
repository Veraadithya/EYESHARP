import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { DashboardPage } from '../pages/DashboardPage';
import { CasesPage } from '../pages/CasesPage';
import { EvidencePage } from '../pages/EvidencePage';
import { ImageAnalysisPage } from '../pages/ImageAnalysisPage';
import { BrowserAnalysisPage } from '../pages/BrowserAnalysisPage';
import { TimelinePage } from '../pages/TimelinePage';
import { ReportsPage } from '../pages/ReportsPage';
import { SettingsPage } from '../pages/PlaceholderPages';

interface AppLayoutProps {
  onLoadDemo: () => void;
}

const wrap = (name: string, element: React.ReactElement) => (
  <ErrorBoundary moduleName={name}>{element}</ErrorBoundary>
);

const AppLayout: React.FC<AppLayoutProps> = ({ onLoadDemo }) => (
  <MainLayout onLoadDemo={onLoadDemo}>
    <Outlet />
  </MainLayout>
);

export const createRouter = (onLoadDemo: () => void) =>
  createBrowserRouter([
    {
      path: '/',
      element: <AppLayout onLoadDemo={onLoadDemo} />,
      children: [
        { index: true, element: <Navigate to="/dashboard" replace /> },
        { path: 'dashboard', element: wrap('Dashboard', <DashboardPage />) },
        { path: 'cases', element: wrap('Cases', <CasesPage />) },
        { path: 'evidence', element: wrap('Evidence', <EvidencePage />) },
        { path: 'browser', element: wrap('Browser Analysis', <BrowserAnalysisPage />) },
        { path: 'images', element: wrap('Image Analysis', <ImageAnalysisPage />) },
        { path: 'timeline', element: wrap('Timeline', <TimelinePage />) },
        { path: 'reports', element: wrap('Reports', <ReportsPage />) },
        { path: 'settings', element: wrap('Settings', <SettingsPage />) },
        { path: '*', element: <Navigate to="/dashboard" replace /> },
      ],
    },
  ]);
