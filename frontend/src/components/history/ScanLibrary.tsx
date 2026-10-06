import { ArrowRightIcon, DatabaseIcon, FolderGitIcon, GlobeIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useDeleteScan,
  useQuarantinedScans,
  useScanLibrary,
} from '@/features/history/useScanLibrary';
import { formatBytes, formatRelativeTime } from '@/lib/format/values';
import type { ScanRecord } from '@/lib/db/types';

/**
 * Locally stored reconstructions.
 */
export function ScanLibrary() {
  const library = useScanLibrary();
  const quarantined = useQuarantinedScans();
  const deleteScan = useDeleteScan();
  const [pendingDelete, setPendingDelete] = useState<ScanRecord | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DatabaseIcon className="size-4" aria-hidden="true" />
          Stored reconstructions
        </CardTitle>
        <CardDescription>
          Saved in this browser and kept across restarts. Nothing is uploaded or synced.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {library.isLoading && <Skeleton className="h-16 w-full" />}

        {library.isError && (
          <p className="text-sm text-destructive">
            Local storage could not be read. Reconstructions from this session may not be listed.
          </p>
        )}

        {library.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No reconstructions stored yet. Analyze a URL or GitHub repo and the result will be kept here.
          </p>
        )}

        <ul className="divide-y divide-border">
          {library.data?.map((record) => (
            <li key={record.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <Link
                  to={`/scan/${record.id}`}
                  className="flex items-center gap-2 font-medium hover:underline"
                >
                  {record.source_type === 'github_repo' ? (
                    <FolderGitIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <GlobeIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                  <span className="truncate">{record.display_label}</span>
                </Link>

                {record.prompt_preview && (
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {record.prompt_preview}
                    {record.prompt_preview.length >= 200 ? '…' : ''}
                  </p>
                )}

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatRelativeTime(record.created_at)}</span>
                  <span className="font-mono">{formatBytes(record.result_bytes)}</span>
                  <Badge
                    variant={
                      record.confidence === 'high'
                        ? 'verified'
                        : record.confidence === 'medium'
                          ? 'inferred'
                          : 'attention'
                    }
                  >
                    {record.confidence} confidence
                  </Badge>
                  <Badge variant="outline">
                    {record.source_type === 'github_repo' ? 'GitHub' : 'Website'}
                  </Badge>
                  {record.status === 'completed_with_errors' && (
                    <Badge variant="attention">with issues</Badge>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                asChild
                aria-label={`Open reconstruction of ${record.display_label}`}
              >
                <Link to={`/scan/${record.id}`}>
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete reconstruction of ${record.display_label}`}
                onClick={() => setPendingDelete(record)}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </li>
          ))}
        </ul>

        {quarantined.data && quarantined.data.length > 0 && (
          <div className="rounded-md border border-status-attention/40 bg-status-attention/5 p-3 text-xs">
            <p className="font-medium">
              {quarantined.data.length} stored reconstruction(s) cannot be displayed
            </p>
            <ul className="mt-1 space-y-1 text-muted-foreground">
              {quarantined.data.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <code className="font-mono">{item.id}</code>
                  <span className="flex-1">{item.reason}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteScan.mutate(item.id)}
                    className="h-6"
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this reconstruction?</DialogTitle>
            <DialogDescription>
              The reconstruction of{' '}
              <span className="font-mono">{pendingDelete?.display_label}</span> will be removed
              from this browser. There is no server copy, so this cannot be undone. Copy the prompt
              first if you need to keep it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingDelete) deleteScan.mutate(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
