/**
 * What this build can actually examine.
 *
 * Analyzer ids are namespaced (`security.headers`), so grouping by namespace turns a wall of
 * 30 monospace chips into a readable capability map. Counts come from the backend, so planned
 * work is never presented as examined.
 */
import { useCapabilities } from '@/features/scan/useHealth';
import { Skeleton } from '@/components/ui/skeleton';

const GROUP_LABELS: Record<string, string> = {
  technology: 'Tech Stack',
  architecture: 'Architecture',
  design: 'Design',
  security: 'Security',
  traffic: 'Traffic',
  network: 'Network',
  performance: 'Performance',
  seo: 'SEO',
  accessibility: 'Accessibility',
};

interface AnalyzerEntry {
  id: string;
  implemented: boolean;
  description: string;
}

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
        Capabilities are unavailable while the backend is offline. Stored scans remain readable.
      </p>
    );
  }

  const analyzers = capabilities.data.analyzers as AnalyzerEntry[];
  const implemented = analyzers.filter((entry) => entry.implemented);
  const planned = analyzers.filter((entry) => !entry.implemented);
  const groups = groupByNamespace(implemented);

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
        <Metric label="Analyzers live" value={String(implemented.length)} />
        <Metric label="Reports" value="4" />
        <Metric label="Collection" value={capabilities.data.collection_mode} />
        <Metric label="Engine" value={capabilities.data.engine_version} />
      </dl>

      <div className="grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map(([namespace, entries]) => (
          <section key={namespace}>
            <h3 className="flex items-baseline gap-2 text-sm font-medium">
              {GROUP_LABELS[namespace] ?? namespace}
              <span className="font-mono text-xs text-muted-foreground">{entries.length}</span>
            </h3>
            <ul className="mt-2.5 space-y-1.5">
              {entries.map((entry) => (
                <li key={entry.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-status-verified"
                    aria-hidden="true"
                  />
                  <span>{describe(entry.id)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {planned.length > 0 && (
        <p className="border-t border-border/60 pt-5 text-xs text-muted-foreground">
          {planned.length} further analyzer{planned.length === 1 ? '' : 's'} declared but not yet
          built. Nothing declared-only contributes to a report.
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

/** `security.headers` → `Headers`; the namespace is already the group heading. */
function describe(id: string): string {
  const leaf = id.includes('.') ? id.slice(id.indexOf('.') + 1) : id;
  const words = leaf.replace(/[._]/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function groupByNamespace(entries: AnalyzerEntry[]): [string, AnalyzerEntry[]][] {
  const map = new Map<string, AnalyzerEntry[]>();
  for (const entry of entries) {
    const namespace = entry.id.includes('.') ? entry.id.slice(0, entry.id.indexOf('.')) : 'other';
    const bucket = map.get(namespace);
    if (bucket) bucket.push(entry);
    else map.set(namespace, [entry]);
  }
  return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
}
