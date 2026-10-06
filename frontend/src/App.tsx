import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { ThemeProvider } from '@/components/layout/ThemeProvider';

const AnalyzeRoute = lazy(() =>
  import('@/routes/AnalyzeRoute').then((module) => ({ default: module.AnalyzeRoute })),
);
const ScanRoute = lazy(() =>
  import('@/routes/ScanRoute').then((module) => ({ default: module.ScanRoute })),
);
const HistoryRoute = lazy(() =>
  import('@/routes/HistoryRoute').then((module) => ({ default: module.HistoryRoute })),
);
const MethodologyRoute = lazy(() =>
  import('@/routes/MethodologyRoute').then((module) => ({ default: module.MethodologyRoute })),
);
const NotFoundRoute = lazy(() =>
  import('@/routes/NotFoundRoute').then((module) => ({ default: module.NotFoundRoute })),
);

export function App() {
  return (
    <ThemeProvider>
      <AppShell>
        <Suspense
          fallback={
            <p className="py-16 text-center text-sm text-muted-foreground" role="status">
              Loading…
            </p>
          }
        >
          <Routes>
            <Route path="/" element={<AnalyzeRoute />} />
            <Route path="/scan/:scanId" element={<ScanRoute />} />
            <Route path="/history" element={<HistoryRoute />} />
            <Route path="/methodology" element={<MethodologyRoute />} />
            {/* Kept so existing links and bookmarks do not break. */}
            <Route path="/about" element={<Navigate to="/methodology" replace />} />
            <Route path="/index.html" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundRoute />} />
          </Routes>
        </Suspense>
      </AppShell>
    </ThemeProvider>
  );
}
