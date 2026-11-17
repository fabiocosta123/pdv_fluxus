export type PurchasePdfLine = {
  name: string;
  detail: string;
  values: string[];
};

export type PurchasePdfSupplier = {
  name: string;
  cost: string;
  lines: PurchasePdfLine[];
};

export type PurchasePdf = {
  period: string;
  headers: string[];
  suppliers: PurchasePdfSupplier[];
  totalLabel: string;
  total: string;
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 36;
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

export function buildPurchasePdf(list: PurchasePdf): Uint8Array {
  const streams = drawPages(list);
  const bodies = new Map<number, string>();
  bodies.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  bodies.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  bodies.set(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");

  const pageIds: number[] = [];
  let nextId = 5;
  for (const stream of streams) {
    const contentId = nextId;
    const pageId = nextId + 1;
    nextId += 2;
    pageIds.push(pageId);
    bodies.set(contentId, streamObject(stream));
    bodies.set(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(PAGE_W)} ${num(PAGE_H)}] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`,
    );
  }
  bodies.set(2, `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`);

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

export function downloadPurchaseList(list: PurchasePdf) {
  const bytes = buildPurchasePdf(list);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "lista-compra.pdf";
  link.click();
  URL.revokeObjectURL(url);
}

function drawPages(list: PurchasePdf) {
  const pages: string[][] = [[]];
  let y = header(pages[0], list.period, list.headers);

  const push = (height: number, draw: (commands: string[], top: number) => void) => {
    if (y - height < MARGIN) {
      pages.push([]);
      y = header(pages[pages.length - 1], list.period, list.headers);
    }
    draw(pages[pages.length - 1], y);
    y -= height;
  };

  for (const supplier of list.suppliers) {
    push(22, (commands, top) => {
      commands.push("0.95 g", `${num(MARGIN)} ${num(top - 16)} ${num(PAGE_W - MARGIN * 2)} 18 re f`, "0 g");
      text(commands, supplier.name, MARGIN + 4, top - 12, 10, true);
      const costWidth = textWidth(supplier.cost, 10);
      text(commands, supplier.cost, PAGE_W - MARGIN - 4 - costWidth, top - 12, 10, true);
    });
    for (const line of supplier.lines) {
      push(24, (commands, top) => {
        text(commands, fit(line.name, 42), MARGIN, top - 10, 9, true);
        text(commands, fit(line.detail, 64), MARGIN, top - 20, 7, false);
        line.values.forEach((value, index) => {
          const right = numericRight(list.headers.length, index);
          text(commands, value, right - textWidth(value, 9), top - 12, 9, false);
        });
      });
    }
  }

  push(28, (commands, top) => {
    text(commands, list.totalLabel, MARGIN, top - 18, 11, true);
    const totalWidth = textWidth(list.total, 14);
    text(commands, list.total, PAGE_W - MARGIN - totalWidth, top - 18, 14, true);
  });

  return pages.map((commands) => commands.join("\n"));
}

function header(commands: string[], period: string, headers: string[]) {
  text(commands, "LISTA DE COMPRA", MARGIN, PAGE_H - 48, 16, true);
  text(commands, period, MARGIN, PAGE_H - 66, 10, false);
  let cursor = PAGE_H - 86;
  text(commands, headers[0] ?? "Produto", MARGIN, cursor, 8, true);
  headers.slice(1).forEach((label, index) => {
    const right = numericRight(headers.length, index);
    text(commands, label, right - textWidth(label, 8), cursor, 8, true);
  });
  cursor -= 6;
  commands.push("0.5 w", `${num(MARGIN)} ${num(cursor)} m ${num(PAGE_W - MARGIN)} ${num(cursor)} l S`);
  return cursor - 16;
}

function numericRight(columns: number, index: number) {
  const count = Math.max(columns - 1, 1);
  const start = MARGIN + 250;
  const width = (PAGE_W - MARGIN - start) / count;
  return start + width * (index + 1);
}

function text(commands: string[], value: string, x: number, y: number, size: number, bold: boolean) {
  commands.push("BT", `/${bold ? "F2" : "F1"} ${size} Tf`, `1 0 0 1 ${num(x)} ${num(y)} Tm`, `${pdfText(value)} Tj`, "ET");
}

function textWidth(value: string, size: number) {
  let width = 0;
  for (const char of value) width += size * (char === " " ? 0.28 : 0.52);
  return width;
}

function fit(value: string, max: number) {
  const clean = value.replace(/\s+/g, " ").trim();
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

function num(value: number) {
  return Number(value.toFixed(2)).toString();
}
