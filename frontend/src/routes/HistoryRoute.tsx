import { Link } from 'react-router-dom';

import { BuildCapabilities } from '@/components/history/BuildCapabilities';
import { ScanLibrary } from '@/components/history/ScanLibrary';
import { Button } from '@/components/ui/button';
import { useScanLibrary } from '@/features/history/useScanLibrary';
import { isPersistent } from '@/lib/db/repository';

/**
 * Stored scans.
 *
 * Lifted out of the landing page: browsing past work is an application task, and mixing it into
 * the marketing scroll was what made the homepage read like a dashboard.
 */
export function HistoryRoute() {
  const library = useScanLibrary();
  const total = library.data?.length ?? 0;
  const persistent = isPersistent();

  return (
    <div className="space-y-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.12em] text-primary uppercase">Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Stored scans</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {total === 0
              ? 'Nothing analyzed in this browser yet. Every completed scan is saved here.'
              : `${total} scan${total === 1 ? '' : 's'} saved in this browser. `}
            {!persistent &&
              'Browser storage is unavailable, so results last only for this session.'}
          </p>
        </div>
        <Button asChild>
          <Link to="/#analyze">Analyze a Website</Link>
        </Button>
      </header>

      <ScanLibrary />

      <section aria-labelledby="build-title" className="border-t border-border/60 pt-12">
        <h2 id="build-title" className="text-xl font-semibold tracking-tight">
          Available in this build
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Reported live by the backend. A report only ever contains findings from analyzers that
          actually ran.
        </p>
        <div className="mt-8">
          <BuildCapabilities />
        </div>
      </section>
    </div>
  );
}
