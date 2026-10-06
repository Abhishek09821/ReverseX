import {
  CheckCircle2Icon,
  CopyIcon,
  FileCodeIcon,
  FolderGitIcon,
  GlobeIcon,
  InfoIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ReconstructionResult as ReconstructionResultType } from '@/types/analysis';

export function ReconstructionResult({ result }: { result: ReconstructionResultType }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.prompt.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isGitHub = result.source_type === 'github_repository';
  const SourceIcon = isGitHub ? FolderGitIcon : GlobeIcon;

  return (
    <div className="space-y-4">
      {/* Result header */}
      <header className="reveal rounded-xl border border-border bg-card p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[0.6875rem] font-medium tracking-[0.12em] text-primary uppercase">
              Reconstruction Prompt
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {result.target_url}
              </h2>
              <Badge variant="verified" className="gap-1.5">
                <SourceIcon className="size-3" />
                {isGitHub ? 'GitHub Repository' : 'Website'}
              </Badge>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              A natural-language prompt that tells an AI coding agent how to rebuild this{' '}
              {isGitHub ? 'repository' : 'website'}.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="shrink-0 gap-1.5"
          >
            {copied ? (
              <>
                <CheckCircle2Icon className="size-3.5" />
                Copied!
              </>
            ) : (
              <>
                <CopyIcon className="size-3.5" />
                Copy Prompt
              </>
            )}
          </Button>
        </div>

        {/* Metadata */}
        <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border/60 pt-6 sm:grid-cols-4">
          <Stat label="Confidence" value={`${Math.round(result.prompt.confidence * 100)}%`} />
          <Stat label="Generated" value={new Date(result.timestamp).toLocaleDateString()} />
          <Stat label="Status" value={result.scan.status.replace(/_/g, ' ')} />
          {isGitHub && result.github_info && (
            <Stat
              label="Repository"
              value={`${result.github_info.owner}/${result.github_info.name}`}
            />
          )}
        </dl>
      </header>

      {/* GitHub repository info */}
      {isGitHub && result.github_info && (
        <section className="reveal rounded-xl border border-border bg-card p-5 sm:p-6" style={{ animationDelay: '60ms' }}>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <FolderGitIcon className="size-4 text-primary" aria-hidden="true" />
            Repository Information
          </h3>
          <div className="mt-4 space-y-3">
            {result.github_info.description && (
              <p className="text-sm text-muted-foreground">{result.github_info.description}</p>
            )}
            <dl className="grid gap-3 sm:grid-cols-2">
              {result.github_info.language && (
                <div>
                  <dt className="text-xs text-muted-foreground">Primary Language</dt>
                  <dd className="mt-1 text-sm font-medium">{result.github_info.language}</dd>
                </div>
              )}
              {result.github_info.default_branch && (
                <div>
                  <dt className="text-xs text-muted-foreground">Default Branch</dt>
                  <dd className="mt-1 font-mono text-sm">{result.github_info.default_branch}</dd>
                </div>
              )}
            </dl>
          </div>
        </section>
      )}

      {/* The reconstruction prompt */}
      <section className="reveal rounded-xl border border-border bg-card p-5 sm:p-6" style={{ animationDelay: '120ms' }}>
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <FileCodeIcon className="size-4 text-primary" aria-hidden="true" />
          Full Reconstruction Prompt
        </h3>
        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
          <pre className="whitespace-pre-wrap text-xs leading-6 text-foreground sm:text-sm">
            {result.prompt.prompt}
          </pre>
        </div>
      </section>

      {/* Limitations */}
      {result.limitations.length > 0 && (
        <section
          className="reveal rounded-xl border border-border bg-card p-5 sm:p-6"
          style={{ animationDelay: '180ms' }}
          aria-labelledby="limitations-title"
        >
          <h3
            id="limitations-title"
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <InfoIcon className="size-4 text-primary" aria-hidden="true" />
            Scope & Limitations
          </h3>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {result.limitations.map((limitation) => (
              <li
                key={limitation}
                className="flex gap-2.5 text-xs leading-5 text-muted-foreground"
              >
                <span
                  className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50"
                  aria-hidden="true"
                />
                {limitation}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Errors if any */}
      {result.errors.length > 0 && (
        <section
          className="reveal rounded-xl border border-border bg-card p-5 sm:p-6"
          style={{ animationDelay: '240ms' }}
        >
          <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <TriangleAlertIcon className="size-4" aria-hidden="true" />
            Issues Encountered
          </h3>
          <ul className="mt-4 space-y-2">
            {result.errors.map((error, index) => (
              <li
                key={index}
                className="flex gap-2.5 text-xs leading-5 text-muted-foreground"
              >
                <span
                  className="mt-1.5 size-1 shrink-0 rounded-full bg-destructive/60"
                  aria-hidden="true"
                />
                <span>
                  <span className="font-semibold text-foreground">{error.phase}:</span>{' '}
                  {error.detail}
                  {error.code && (
                    <span className="ml-2 font-mono text-[0.625rem]">({error.code})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1.5 truncate font-mono text-lg font-semibold tracking-tight tabular-nums">
        {value}
      </dd>
    </div>
  );
}
