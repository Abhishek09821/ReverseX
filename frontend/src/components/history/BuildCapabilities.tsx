/**
 * What this build can analyze.
 *
 * Reports live capabilities from the backend — what source types are supported and
 * what analysis features are active.
 */
import { FolderGitIcon, GlobeIcon } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { useCapabilities } from '@/features/scan/useHealth';

export function BuildCapabilities() {
  const capabilities = useCapabilities();

  if (capabilities.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (capabilities.isError || !capabilities.data) {
    return (
      <p className="text-sm text-muted-foreground">
        Capabilities are unavailable while the backend is offline. Stored reconstructions remain readable.
      </p>
    );
  }

  const data = capabilities.data;

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <Metric label="Engine" value={data.engine_version} />
        <Metric label="Collection" value={data.collection_mode} />
        <Metric
          label="Website analysis"
          value={data.website_analysis ? 'Available' : 'Unavailable'}
        />
        <Metric
          label="GitHub analysis"
          value={
            data.github_analysis
              ? data.github_rate_limited
                ? 'Rate limited'
                : 'Available'
              : 'Unavailable'
          }
        />
      </dl>

      {data.sources.length > 0 && (
        <div>
          <h3 className="text-sm font-medium">Accepted input types</h3>
          <ul className="mt-3 space-y-3">
            {data.sources.map((source) => (
              <li key={source.source_type} className="flex items-start gap-3">
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/50 text-primary">
                  {source.source_type === 'github_repository' ? (
                    <FolderGitIcon className="size-3.5" aria-hidden="true" />
                  ) : (
                    <GlobeIcon className="size-3.5" aria-hidden="true" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{source.description}</p>
                  <p className="font-mono text-xs text-muted-foreground">{source.example}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.github_rate_limited && (
        <p className="rounded-lg border border-status-attention/30 bg-status-attention/5 px-3 py-2.5 text-xs text-muted-foreground">
          GitHub API rate limit reached. GitHub repository analysis may be slower or temporarily
          unavailable. Configure a GitHub token to increase the limit.
        </p>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-xl font-semibold tracking-tight capitalize tabular-nums">
        {value}
      </dd>
    </div>
  );
}
