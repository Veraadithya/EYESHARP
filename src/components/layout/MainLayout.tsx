import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumbs } from '../navigation/Breadcrumbs';
import { useUIStore } from '../../stores';
import { GlobalSearchModal } from '../search/GlobalSearchModal';

interface LayoutProps {
  children: React.ReactNode;
  onLoadDemo: () => void;
}

export const MainLayout: React.FC<LayoutProps> = ({ children, onLoadDemo }) => {
  const { globalSearchOpen, setGlobalSearchOpen } = useUIStore();

  // Keyboard shortcut Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(!globalSearchOpen);
      }
      if (e.key === 'Escape' && globalSearchOpen) {
        setGlobalSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [globalSearchOpen, setGlobalSearchOpen]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 font-sans antialiased">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onLoadDemo={onLoadDemo} />

        <main className="flex-1 overflow-y-auto p-5 bg-slate-100/60">
          <Breadcrumbs />
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Global Investigation Search Modal (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
      />
    </div>
  );
};
