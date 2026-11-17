import { barcodeFor } from "./barcode";

export const A4_COLUMNS = 2;
export const A4_ROWS = 6;
export const A4_PER_PAGE = A4_COLUMNS * A4_ROWS;

export type A4Label = {
  name: string;
  price: number;
  barCode: string | null;
  unit?: string | null;
};

const MM = 72 / 25.4;
const PAGE_W = 210 * MM;
const PAGE_H = 297 * MM;
const MARGIN = 8 * MM;
const CELL_W = 97 * MM;
const CELL_H = 46 * MM;

const WIN: Record<string, number> = {
  á: 0xe1, à: 0xe0, ã: 0xe3, â: 0xe2, ä: 0xe4,
  é: 0xe9, è: 0xe8, ê: 0xea, ë: 0xeb,
  í: 0xed, ì: 0xec, î: 0xee, ï: 0xef,
  ó: 0xf3, ò: 0xf2, õ: 0xf5, ô: 0xf4, ö: 0xf6,
  ú: 0xfa, ù: 0xf9, û: 0xfb, ü: 0xfc,
  ç: 0xe7, ñ: 0xf1,
  Á: 0xc1, À: 0xc0, Ã: 0xc3, Â: 0xc2, Ä: 0xc4,
  É: 0xc9, È: 0xc8, Ê: 0xca, Ë: 0xcb,
  Í: 0xcd, Ì: 0xcc, Î: 0xce, Ï: 0xcf,
  Ó: 0xd3, Ò: 0xd2, Õ: 0xd5, Ô: 0xd4, Ö: 0xd6,
  Ú: 0xda, Ù: 0xd9, Û: 0xdb, Ü: 0xdc,
  Ç: 0xc7, Ñ: 0xd1,
};

export function buildA4Pdf(labels: A4Label[]): Uint8Array {
  const pages = chunk(labels, A4_PER_PAGE);
  if (pages.length === 0) pages.push([]);

  const bodies = new Map<number, string>();
  bodies.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  bodies.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  bodies.set(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  const pageIds: number[] = [];
  let nextId = 5;
  for (const page of pages) {
    const contentId = nextId;
    const pageId = nextId + 1;
    nextId += 2;
    pageIds.push(pageId);
    const stream = page
      .map((label, index) => {
        const col = index % A4_COLUMNS;
        const row = Math.floor(index / A4_COLUMNS);
        const x = MARGIN + col * CELL_W;
        const y = PAGE_H - MARGIN - (row + 1) * CELL_H;
        return drawLabel(label, x, y);
      })
      .join("\n");
    bodies.set(contentId, streamObject(stream));
    bodies.set(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(PAGE_W)} ${num(PAGE_H)}] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`,
    );
  }
  bodies.set(
    2,
    `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`,
  );

  const ids = [...bodies.keys()].sort((left, right) => left - right);
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const id of ids) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${bodies.get(id)}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${ids.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let id = 1; id <= ids.length; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${ids.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let index = 0; index < pdf.length; index += 1) bytes[index] = pdf.charCodeAt(index);
  return bytes;
}

export function downloadA4Labels(labels: A4Label[]) {
  const blob = new Blob([buildA4Pdf(labels)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "etiquetas-preco.pdf";
  link.click();
  URL.revokeObjectURL(url);
}

function drawLabel(label: A4Label, x: number, y: number) {
  const pad = 3 * MM;
  const commands = [
    "0.6 w",
    "[1.4 1.4] 0 d",
    `${num(x)} ${num(y)} ${num(CELL_W)} ${num(CELL_H)} re S`,
    "[] 0 d",
    "BT",
    "/F2 8 Tf",
    `1 0 0 1 ${num(x + pad)} ${num(y + CELL_H - 5 * MM)} Tm`,
    `${pdfText(fit(displayName(label), 42))} Tj`,
    "ET",
  ];

  const price = formatPrice(label.price);
  const priceSize = price.length > 12 ? 16 : 22;
  const priceWidth = price.length * priceSize * 0.52;
  commands.push(
    "BT",
    `/F2 ${priceSize} Tf`,
    `1 0 0 1 ${num(x + (CELL_W - priceWidth) / 2)} ${num(y + 18 * MM)} Tm`,
    `${pdfText(price)} Tj`,
    "ET",
  );

  const mark = barcodeFor(label.barCode);
  if (!mark) {
    commands.push(
      "BT",
      "/F2 8 Tf",
      `1 0 0 1 ${num(x + pad)} ${num(y + 6 * MM)} Tm`,
      `${pdfText("SEM CODIGO")} Tj`,
      "ET",
    );
    return commands.join("\n");
  }

  const barHeight = 12 * MM;
  const barX = x + pad;
  const barWidth = CELL_W - pad * 2;
  const module = barWidth / mark.bits.length;
  for (const run of runs(mark.bits)) {
    commands.push(
      `${num(barX + run.x * module)} ${num(y + 5.2 * MM)} ${num(run.w * module)} ${num(barHeight)} re f`,
    );
  }
  const digitSize = 7;
  const digitWidth = mark.text.length * digitSize * 0.56;
  commands.push(
    "BT",
    `/F1 ${digitSize} Tf`,
    `1 0 0 1 ${num(x + (CELL_W - digitWidth) / 2)} ${num(y + 2.1 * MM)} Tm`,
    `${pdfText(mark.text)} Tj`,
    "ET",
  );
  return commands.join("\n");
}

function displayName(label: A4Label) {
  const measure = label.unit?.trim();
  const showUnit = measure && !/^(un|und|unidade|pc)$/i.test(measure);
  return showUnit ? `${label.name} ${measure}` : label.name;
}

function formatPrice(cents: number) {
  const whole = Math.trunc(Math.abs(cents) / 100);
  const fraction = String(Math.abs(cents) % 100).padStart(2, "0");
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cents < 0 ? "-" : ""}R$ ${grouped},${fraction}`;
}

function fit(value: string, max: number) {
  const clean = value.replace(/\s+/g, " ").trim().toUpperCase();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 3)}...`;
}

function pdfText(value: string) {
  let out = "";
  for (const char of value.normalize("NFC")) {
    if (char === "\\") {
      out += "\\\\";
      continue;
    }
    if (char === "(" || char === ")") {
      out += `\\${char}`;
      continue;
    }
    const code = char.charCodeAt(0);
    if (code >= 32 && code <= 126) {
      out += char;
      continue;
    }
    const mapped = WIN[char];
    out += mapped ? `\\${mapped.toString(8).padStart(3, "0")}` : "?";
  }
  return `(${out})`;
}

function streamObject(body: string) {
  return `<< /Length ${body.length} >>\nstream\n${body}\nendstream`;
}

function runs(bits: string) {
  const bars: { x: number; w: number }[] = [];
  for (let index = 0; index < bits.length; index += 1) {
    if (bits[index] !== "1") continue;
    const last = bars[bars.length - 1];
    if (last && last.x + last.w === index) last.w += 1;
    else bars.push({ x: index, w: 1 });
  }
  return bars;
}

function chunk<T>(items: T[], size: number) {
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) pages.push(items.slice(index, index + size));
  return pages;
}

function num(value: number) {
  return Number(value.toFixed(2)).toString();
}
