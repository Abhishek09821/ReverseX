import { DownloadIcon, FileArchiveIcon, FileIcon, FileJson2Icon, FileTextIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { bundleToZip, downloadBlob, downloadJson, downloadText } from '@/features/reports/bundle';
import { buildReportBundle } from '@/features/reports/generate';
import { REPORT_DEFINITIONS } from '@/features/reports/markdown/renderers';
import { renderAnalysisJson } from '@/features/reports/json';
import { slugifyHost, timestampSlug } from '@/lib/format/values';
import { useStoredScreenshots } from '@/features/history/useScanLibrary';
import type { AnalysisResult, SectionKey } from '@/types/analysis';

/**
 * Report downloads.
 *
 * Generated in the browser from the stored result, so exports keep working after a restart with the
 * backend stopped (docs/blueprint/decisions.md D2).
 */
export function ExportMenu({ result }: { result: AnalysisResult }) {
  const screenshots = useStoredScreenshots(result.scan.scan_id);
  const [busy, setBusy] = useState(false);

  const bundle = buildReportBundle(result);
  const baseName = `weblens-${slugifyHost(result.target.host)}-${timestampSlug(result.scan.created_at)}`;

  const downloadZip = async () => {
    setBusy(true);
    try {
      const blob = await bundleToZip(bundle, screenshots.data ?? []);
      downloadBlob(blob, `${bundle.suggestedName}.zip`);
    } finally {
      setBusy(false);
    }
  };

  /**
   * The PDF engine is loaded on demand.
   *
   * jsPDF and its table plugin are a large dependency that most visits to a result never need;
   * pulling them in eagerly made simply *reading* a scan pay for the ability to export one.
   */
  const downloadFullPdf = async () => {
    setBusy(true);
    try {
      const { generateCompletePdf } = await import('@/features/reports/pdf');
      downloadBlob(generateCompletePdf(result), `${baseName}-complete.pdf`);
    } finally {
      setBusy(false);
    }
  };

  const downloadSectionPdf = async (sectionKey: SectionKey) => {
    setBusy(true);
    try {
      const { generateSectionPdf } = await import('@/features/reports/pdf');
      downloadBlob(generateSectionPdf(result, sectionKey), `${baseName}-${sectionKey}.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={busy}>
          <DownloadIcon className="size-3.5" />
          {busy ? 'Packaging…' : 'Download'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-[70vh] min-w-[16rem] overflow-y-auto">
        <DropdownMenuLabel>Complete bundle</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => void downloadZip()}>
          <FileArchiveIcon className="size-4" />
          complete-report.zip
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void downloadFullPdf()}>
          <FileIcon className="size-4" />
          complete-report.pdf
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            downloadJson(renderAnalysisJson(result), `${baseName}-analysis.json`)
          }
        >
          <FileJson2Icon className="size-4" />
          analysis.json
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Individual PDF reports</DropdownMenuLabel>
        {REPORT_DEFINITIONS.map((definition) => (
          <DropdownMenuItem
            key={`pdf-${definition.section}`}
            onSelect={() => void downloadSectionPdf(definition.section)}
          >
            <FileIcon className="size-4" />
            {definition.file.replace(/\.md$/, '.pdf')}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Individual Markdown reports</DropdownMenuLabel>
        {REPORT_DEFINITIONS.map((definition) => {
          const file = bundle.files.find((candidate) => candidate.path === definition.file);
          if (!file) return null;
          return (
            <DropdownMenuItem key={definition.file} onSelect={() => downloadText(file)}>
              <FileTextIcon className="size-4" />
              {definition.file}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
