import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { createRouter } from './router';
import { loadDemoData } from '../utils/demoData';
import { CaseRepository } from '../services/repositories';
import { useCaseStore } from '../stores';

export const App: React.FC = () => {
  const { setActiveCase } = useCaseStore();

  // Load initial active case if present in IndexedDB
  useEffect(() => {
    CaseRepository.getAll().then((cases) => {
      if (cases.length > 0) {
        setActiveCase(cases[0]!);
      }
    });
  }, [setActiveCase]);

  const handleLoadDemo = async () => {
    await loadDemoData();
    const cases = await CaseRepository.getAll();
    if (cases.length > 0) {
      setActiveCase(cases[0]!);
    }
    // Reload page to refresh all active hooks and views cleanly
    window.location.reload();
  };

  const router = createRouter(handleLoadDemo);

  return <RouterProvider router={router} />;
};
