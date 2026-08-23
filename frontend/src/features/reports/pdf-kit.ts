/**
 * PDF layout primitives.
 *
 * jsPDF is a drawing API, not a document model: it has no concept of a heading, a table, or a page
 * break. Everything that makes the exported report readable — the type scale, the running footer,
 * page-break awareness, the colour roles — has to be defined once here, or every renderer invents
 * its own and the output looks like five different documents stapled together.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type Rgb = [number, number, number];

export const PAGE = { width: 210, height: 297, margin: 16 } as const;
export const CONTENT_W = PAGE.width - PAGE.margin * 2;

/** Print-tuned versions of the product palette. Screen tokens are too light on paper. */
export const COLOR = {
  ink: [20, 24, 29] as Rgb,
  body: [55, 62, 70] as Rgb,
  muted: [122, 130, 139] as Rgb,
  primary: [15, 118, 115] as Rgb,
  primaryDark: [10, 88, 86] as Rgb,
  hairline: [223, 227, 232] as Rgb,
  surface: [246, 248, 250] as Rgb,
  white: [255, 255, 255] as Rgb,
  verified: [22, 132, 96] as Rgb,
  strong: [37, 108, 168] as Rgb,
  inferred: [178, 124, 24] as Rgb,
  ai: [128, 74, 168] as Rgb,
  attention: [186, 92, 38] as Rgb,
  neutral: [118, 125, 133] as Rgb,
} as const;

interface AutoTableDoc extends jsPDF {
  lastAutoTable?: { finalY?: number };
}

export class Pdf {
  readonly doc: jsPDF;
  y: number;
  /** Shown in the running footer; set per section. */
  chapter = '';

  constructor() {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    this.y = PAGE.margin;
  }

  // --- page management --------------------------------------------------------------

  /** Start a new page when `needed` mm would overflow the text area. */
  need(mm: number): void {
    if (this.y + mm <= PAGE.height - PAGE.margin - 10) return;
    this.page();
  }

  page(): void {
    this.doc.addPage();
    this.y = PAGE.margin;
  }

  get pageNumber(): number {
    return this.doc.getCurrentPageInfo().pageNumber;
  }

  // --- text ------------------------------------------------------------------------

  /** Chapter opener: a filled band, so a reader flicking through lands on boundaries. */
  chapterBanner(index: string, title: string, subtitle?: string): void {
    this.chapter = title;
    const height = subtitle ? 26 : 20;
    this.fill(COLOR.primary, PAGE.margin, this.y, CONTENT_W, height, 2);

    this.doc.setTextColor(...COLOR.white);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(15);
    this.doc.text(title, PAGE.margin + 7, this.y + (subtitle ? 11 : 13));

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.text(index.toUpperCase(), PAGE.margin + CONTENT_W - 7, this.y + (subtitle ? 11 : 13), {
      align: 'right',
    });

    if (subtitle) {
      this.doc.setFontSize(8.5);
      this.doc.setTextColor(232, 244, 243);
      this.doc.text(subtitle, PAGE.margin + 7, this.y + 19.5);
    }

    this.y += height + 8;
  }

  h2(text: string): void {
    this.need(16);
    this.y += 2;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11.5);
    this.doc.setTextColor(...COLOR.ink);
    this.doc.text(text, PAGE.margin, this.y);
    this.y += 2.5;
    this.rule(COLOR.primary, 0.5);
    this.y += 5;
  }

  h3(text: string): void {
    this.need(12);
    this.y += 1;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9.5);
    this.doc.setTextColor(...COLOR.ink);
    this.doc.text(text, PAGE.margin, this.y);
    this.y += 5;
  }

  /** Body copy. `lead` is used for the one paragraph that opens a chapter. */
  para(text: string, options: { muted?: boolean; lead?: boolean; indent?: number } = {}): void {
    const { muted = false, lead = false, indent = 0 } = options;
    const size = lead ? 9.8 : 9;
    const lineHeight = lead ? 5 : 4.5;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(size);
    this.doc.setTextColor(...(muted ? COLOR.muted : COLOR.body));
    const lines = this.doc.splitTextToSize(text, CONTENT_W - indent) as string[];
    for (const line of lines) {
      this.need(lineHeight + 2);
      this.doc.text(line, PAGE.margin + indent, this.y);
      this.y += lineHeight;
    }
    this.y += 2;
  }

  bullet(text: string, options: { muted?: boolean } = {}): void {
    const { muted = false } = options;
    this.need(7);
    this.doc.setFillColor(...(muted ? COLOR.muted : COLOR.primary));
    this.doc.circle(PAGE.margin + 1.4, this.y - 1.1, 0.75, 'F');
    this.para(text, { muted, indent: 5 });
    this.y -= 1;
  }

  /** Callout box for scope statements and disclaimers. */
  note(text: string, tone: Rgb = COLOR.primary): void {
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.5);
    const lines = this.doc.splitTextToSize(text, CONTENT_W - 14) as string[];
    const height = lines.length * 4.2 + 8;
    this.need(height + 4);

    this.fill(COLOR.surface, PAGE.margin, this.y, CONTENT_W, height, 1.5);
    this.doc.setFillColor(...tone);
    this.doc.rect(PAGE.margin, this.y, 1.6, height, 'F');

    this.doc.setTextColor(...COLOR.body);
    let cursor = this.y + 5.5;
    for (const line of lines) {
      this.doc.text(line, PAGE.margin + 7, cursor);
      cursor += 4.2;
    }
    this.y += height + 5;
  }

  // --- data ------------------------------------------------------------------------

  /** Two-column field/value list. */
  fields(rows: [string, unknown][]): void {
    const body = rows
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => [key, String(value)]);
    if (body.length === 0) return;

    this.table({
      body,
      theme: 'plain',
      columnStyles: {
        0: { cellWidth: 46, textColor: COLOR.muted, fontStyle: 'bold' },
        1: { textColor: COLOR.ink },
      },
      styles: { fontSize: 8.5, cellPadding: { top: 1.6, bottom: 1.6, left: 0, right: 2 } },
    });
  }

  /** Full data grid with a header row. */
  grid(head: string[], rows: unknown[][], columnStyles?: Record<number, object>): void {
    if (rows.length === 0) {
      this.para('No rows were produced for this group.', { muted: true });
      return;
    }
    this.table({
      head: [head],
      body: rows.map((row) => row.map((cell) => (cell === null || cell === undefined || cell === '' ? '—' : String(cell)))),
      theme: 'striped',
      ...(columnStyles ? { columnStyles } : {}),
    });
  }

  private table(options: Parameters<typeof autoTable>[1]): void {
    this.need(24);
    autoTable(this.doc, {
      startY: this.y,
      margin: { left: PAGE.margin, right: PAGE.margin, top: PAGE.margin, bottom: PAGE.margin + 12 },
      styles: {
        font: 'helvetica',
        fontSize: 8.2,
        cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
        lineColor: COLOR.hairline,
        lineWidth: 0.1,
        textColor: COLOR.body,
        overflow: 'linebreak',
        valign: 'top',
      },
      headStyles: {
        fillColor: COLOR.ink,
        textColor: COLOR.white,
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [250, 251, 252] },
      ...options,
    });
    const finalY = (this.doc as AutoTableDoc).lastAutoTable?.finalY;
    this.y = (finalY ?? this.y) + 6;
  }

  /** Metric tiles, used on the cover and at the top of each chapter. */
  metrics(items: { label: string; value: string; hint?: string; tone?: Rgb }[]): void {
    if (items.length === 0) return;
    const gap = 3;
    const width = (CONTENT_W - gap * (items.length - 1)) / items.length;
    const height = 22;
    this.need(height + 6);

    items.forEach((item, index) => {
      const x = PAGE.margin + index * (width + gap);
      this.fill(COLOR.surface, x, this.y, width, height, 1.5);
      this.doc.setFillColor(...(item.tone ?? COLOR.primary));
      this.doc.rect(x, this.y, width, 1.1, 'F');

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.8);
      this.doc.setTextColor(...COLOR.muted);
      this.doc.text(item.label.toUpperCase(), x + 4, this.y + 7);

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(13);
      this.doc.setTextColor(...COLOR.ink);
      this.doc.text(truncate(this.doc, item.value, width - 8, 13), x + 4, this.y + 14.5);

      if (item.hint) {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(6.5);
        this.doc.setTextColor(...COLOR.muted);
        this.doc.text(truncate(this.doc, item.hint, width - 8, 6.5), x + 4, this.y + 19);
      }
    });

    this.y += height + 7;
  }

  /** Labelled progress bar. Percentages are shown as bars because a bar cannot be misread. */
  meter(label: string, percentage: number, caption?: string, tone: Rgb = COLOR.primary): void {
    this.need(13);
    const pct = Math.max(0, Math.min(100, percentage));

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(...COLOR.ink);
    this.doc.text(label, PAGE.margin, this.y);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...COLOR.muted);
    this.doc.text(`${Math.round(pct)}%`, PAGE.margin + CONTENT_W, this.y, { align: 'right' });
    this.y += 2.5;

    this.fill(COLOR.hairline, PAGE.margin, this.y, CONTENT_W, 2.4, 1.2);
    if (pct > 0) {
      this.doc.setFillColor(...tone);
      this.doc.roundedRect(PAGE.margin, this.y, (CONTENT_W * pct) / 100, 2.4, 1.2, 1.2, 'F');
    }
    this.y += 5;

    if (caption) {
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(...COLOR.muted);
      this.doc.text(caption, PAGE.margin, this.y);
      this.y += 4;
    }
    this.y += 1;
  }

  /** Small filled status chip drawn inline at an explicit position. */
  chip(text: string, tone: Rgb, x: number, y: number): number {
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.6);
    const width = this.doc.getTextWidth(text.toUpperCase()) + 4.5;
    this.doc.setFillColor(...tone);
    this.doc.roundedRect(x, y - 3.2, width, 4.6, 0.9, 0.9, 'F');
    this.doc.setTextColor(...COLOR.white);
    this.doc.text(text.toUpperCase(), x + 2.25, y);
    this.doc.setTextColor(...COLOR.ink);
    return width;
  }

  /** Heading for one finding: name on the left, status chip after it. */
  findingHeading(name: string, status: string, tone: Rgb): void {
    this.need(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9.2);
    this.doc.setTextColor(...COLOR.ink);
    const clipped = truncate(this.doc, name, CONTENT_W - 34, 9.2);
    this.doc.text(clipped, PAGE.margin, this.y);
    this.chip(status, tone, PAGE.margin + this.doc.getTextWidth(clipped) + 3, this.y);
    this.y += 5;
  }

  // --- drawing helpers -------------------------------------------------------------

  fill(color: Rgb, x: number, y: number, w: number, h: number, radius = 0): void {
    this.doc.setFillColor(...color);
    if (radius > 0) this.doc.roundedRect(x, y, w, h, radius, radius, 'F');
    else this.doc.rect(x, y, w, h, 'F');
  }

  rule(color: Rgb = COLOR.hairline, width = 0.2): void {
    this.doc.setDrawColor(...color);
    this.doc.setLineWidth(width);
    this.doc.line(PAGE.margin, this.y, PAGE.margin + CONTENT_W, this.y);
  }

  divider(): void {
    this.y += 2;
    this.rule();
    this.y += 6;
  }

  space(mm = 4): void {
    this.y += mm;
  }

  /**
   * Running footer on every page except the cover.
   *
   * Written last, because the total page count is only known once all content exists.
   */
  finish(host: string, title: string): void {
    const total = this.doc.getNumberOfPages();
    for (let page = 1; page <= total; page += 1) {
      this.doc.setPage(page);
      if (page === 1) continue;

      const y = PAGE.height - 10;
      this.doc.setDrawColor(...COLOR.hairline);
      this.doc.setLineWidth(0.2);
      this.doc.line(PAGE.margin, y - 4, PAGE.margin + CONTENT_W, y - 4);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7);
      this.doc.setTextColor(...COLOR.muted);
      this.doc.text(`ReverseX · ${title} · ${host}`, PAGE.margin, y);
      this.doc.text(`${page} / ${total}`, PAGE.margin + CONTENT_W, y, { align: 'right' });
    }
  }

  /**
   * Draw the brand mark, if it is available.
   *
   * The icon is fetched by the app shell long before an export is triggered, so it is normally in
   * cache. It is still optional: a report must generate offline, and a missing decorative image is
   * not a reason to fail a download. Returns whether it was drawn so callers can shift their layout.
   */
  drawBrandMark(x: number, y: number, size: number): boolean {
    const image = brandMark();
    if (!image) return false;
    try {
      this.doc.addImage(image, 'PNG', x, y, size, size, undefined, 'FAST');
      return true;
    } catch {
      return false;
    }
  }

  blob(): Blob {
    return this.doc.output('blob');
  }
}

/**
 * The brand mark as an already-decoded element jsPDF can embed.
 *
 * Read from the DOM rather than re-fetched: the header renders this exact image, so it is decoded
 * and cached by the time anyone opens the export menu. `null` when it is not present, which keeps
 * PDF generation free of network work.
 */
function brandMark(): HTMLImageElement | null {
  if (typeof document === 'undefined') return null;
  const image = document.querySelector<HTMLImageElement>('img[src="/weblens-icon.png"]');
  return image?.complete && image.naturalWidth > 0 ? image : null;
}

/** Trim to fit an exact width, with an ellipsis rather than a mid-glyph cut. */
export function truncate(doc: jsPDF, text: string, maxWidth: number, fontSize: number): string {
  doc.setFontSize(fontSize);
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let output = text;
  while (output.length > 1 && doc.getTextWidth(`${output}…`) > maxWidth) {
    output = output.slice(0, -1);
  }
  return `${output}…`;
}
