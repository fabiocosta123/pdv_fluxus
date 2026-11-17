import { barcodeFor } from "@/modules/labels/barcode";

export const LABEL_SIZES = [
  { id: "50x30", label: "50 × 30 mm", hint: "Etiqueta pequena" },
  { id: "80x40", label: "80 × 40 mm", hint: "Gôndola" },
  { id: "100x30", label: "100 × 30 mm", hint: "Faixa de gôndola" },
] as const;

export type LabelSizeId = (typeof LABEL_SIZES)[number]["id"];

export function PriceTag({
  name,
  price,
  barCode,
  unit,
  size,
}: {
  name: string;
  price: number;
  barCode: string | null;
  unit?: string | null;
  size: LabelSizeId;
}) {
  const mark = barcodeFor(barCode);
  const reais = Math.trunc(price / 100).toLocaleString("pt-BR");
  const centavos = String(Math.abs(price % 100)).padStart(2, "0");
  const measure = unit?.trim();
  const showUnit = measure && !/^(un|und|unidade|pc)$/i.test(measure);

  return (
    <article className={`argox-tag argox-${size}`}>
      <p className="argox-name">
        {name}
        {showUnit ? <span className="argox-unit"> {measure}</span> : null}
      </p>
      <p className="argox-price">
        <span className="argox-currency">R$</span>
        <span className="argox-major">{reais}</span>
        <span className="argox-minor">,{centavos}</span>
      </p>
      <div className="argox-code">
        {mark ? (
          <svg viewBox={`0 0 ${mark.bits.length} 100`} preserveAspectRatio="none" aria-hidden="true">
            {runs(mark.bits).map((run) => (
              <rect key={run.x} x={run.x} y="0" width={run.w} height="100" fill="#000" />
            ))}
          </svg>
        ) : (
          <span className="argox-missing">Sem código</span>
        )}
        <span className="argox-digits">{mark?.text ?? ""}</span>
      </div>
    </article>
  );
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
