import { TriangleAlertIcon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { ReconstructionResult } from '@/components/reconstruction/ReconstructionResult';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useStoredResult } from '@/features/history/useScanLibrary';

export function ScanRoute() {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();
  const stored = useStoredResult(scanId);

  if (stored.isLoading) {
    return (
      <div className="section-shell space-y-4 py-12">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-96" />
        <Skeleton className="mt-8 h-32 w-full" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      </div>
    );
  }

  if (!stored.data) {
    return (
      <div className="section-shell py-12">
        <Alert variant="warning" className="mx-auto max-w-2xl">
          <TriangleAlertIcon className="size-4" />
          <AlertTitle>This reconstruction is not stored in this browser</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Reconstructions live only in the browser profile that ran them. If this link came from
              elsewhere, or the reconstruction was deleted, run a new analysis.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/')}>
              Back to analyze
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const result = stored.data;

  return (
    <div className="section-shell space-y-6 py-8 pb-20">
      <ReconstructionResult result={result} />
    </div>
  );
}
