"use client";

import {
  FISCAL_ORIGINS,
  ICMS_CSTS,
  PIS_COFINS_CSTS,
  formatPercent,
  icmsUsesRate,
  pisCofinsUsesRate,
  readPercent,
} from "@/modules/catalog/fiscal";

export type FiscalDraft = {
  ncm: string;
  cest: string;
  cfop: string;
  origin: number;
  icmsCst: string;
  icmsRate: string;
  pisCst: string;
  pisRate: string;
  cofinsCst: string;
  cofinsRate: string;
};

export function emptyFiscalDraft(): FiscalDraft {
  return {
    ncm: "",
    cest: "",
    cfop: "5102",
    origin: 0,
    icmsCst: "00",
    icmsRate: "",
    pisCst: "01",
    pisRate: "0,65",
    cofinsCst: "01",
    cofinsRate: "3,00",
  };
}

export function fiscalDraftFromProduct(product: {
  ncm?: string | null;
  cest?: string | null;
  cfop?: string | null;
  origin?: number | null;
  icmsCst?: string | null;
  icmsRate?: number | null;
  pisCst?: string | null;
  pisRate?: number | null;
  cofinsCst?: string | null;
  cofinsRate?: number | null;
}): FiscalDraft {
  const blank = emptyFiscalDraft();
  return {
    ncm: product.ncm ?? "",
    cest: product.cest ?? "",
    cfop: product.cfop || blank.cfop,
    origin: product.origin ?? blank.origin,
    icmsCst: product.icmsCst || blank.icmsCst,
    icmsRate: product.icmsRate ? formatPercent(product.icmsRate) : "",
    pisCst: product.pisCst || blank.pisCst,
    pisRate: formatPercent(product.pisRate ?? 65),
    cofinsCst: product.cofinsCst || blank.cofinsCst,
    cofinsRate: formatPercent(product.cofinsRate ?? 300),
  };
}

export function fiscalPayload(draft: FiscalDraft) {
  return {
    ncm: draft.ncm,
    cest: draft.cest,
    cfop: draft.cfop,
    origin: draft.origin,
    icmsCst: draft.icmsCst,
    icmsRate: readPercent(draft.icmsRate),
    pisCst: draft.pisCst,
    pisRate: readPercent(draft.pisRate),
    cofinsCst: draft.cofinsCst,
    cofinsRate: readPercent(draft.cofinsRate),
  };
}

const fieldClass =
  "w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-700 shadow-inner";

export function FiscalFields({
  value,
  onChange,
}: {
  value: FiscalDraft;
  onChange: (next: FiscalDraft) => void;
}) {
  const icmsOpen = icmsUsesRate(value.icmsCst);
  const pisOpen = pisCofinsUsesRate(value.pisCst);
  const cofinsOpen = pisCofinsUsesRate(value.cofinsCst);

  function digits(field: "ncm" | "cest" | "cfop", max: number, raw: string) {
    onChange({ ...value, [field]: raw.replace(/\D/g, "").slice(0, max) });
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-500">
        Lucro presumido. PIS 0,65% e COFINS 3% no regime cumulativo. A alíquota de ICMS é a do estado.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="block">
          <span className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">NCM</span>
          <input required inputMode="numeric" placeholder="00000000" className={`${fieldClass} font-mono`} value={value.ncm} onChange={(event) => digits("ncm", 8, event.target.value)} />
        </label>
        <label className="block">
          <span className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">CEST</span>
          <input inputMode="numeric" placeholder="Opcional" className={`${fieldClass} font-mono`} value={value.cest} onChange={(event) => digits("cest", 7, event.target.value)} />
        </label>
        <label className="block">
          <span className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">CFOP</span>
          <input required inputMode="numeric" className={`${fieldClass} font-mono`} value={value.cfop} onChange={(event) => digits("cfop", 4, event.target.value)} />
        </label>
      </div>
      <label className="block">
        <span className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Origem</span>
        <select className={fieldClass} value={value.origin} onChange={(event) => onChange({ ...value, origin: Number(event.target.value) })}>
          {FISCAL_ORIGINS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">CST ICMS</span>
          <select
            className={fieldClass}
            value={value.icmsCst}
            onChange={(event) => onChange({
              ...value,
              icmsCst: event.target.value,
              icmsRate: icmsUsesRate(event.target.value) ? value.icmsRate : "0,00",
            })}
          >
            {ICMS_CSTS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Alíquota ICMS (%)</span>
          <input
            inputMode="decimal"
            disabled={!icmsOpen}
            placeholder="Ex: 19,00"
            className={`${fieldClass} disabled:text-gray-400`}
            value={icmsOpen ? value.icmsRate : "0,00"}
            onChange={(event) => onChange({ ...value, icmsRate: event.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">CST PIS</span>
          <select
            className={fieldClass}
            value={value.pisCst}
            onChange={(event) => onChange({
              ...value,
              pisCst: event.target.value,
              pisRate: pisCofinsUsesRate(event.target.value) ? value.pisRate : "0,00",
            })}
          >
            {PIS_COFINS_CSTS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Alíquota PIS (%)</span>
          <input
            inputMode="decimal"
            disabled={!pisOpen}
            className={`${fieldClass} disabled:text-gray-400`}
            value={pisOpen ? value.pisRate : "0,00"}
            onChange={(event) => onChange({ ...value, pisRate: event.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">CST COFINS</span>
          <select
            className={fieldClass}
            value={value.cofinsCst}
            onChange={(event) => onChange({
              ...value,
              cofinsCst: event.target.value,
              cofinsRate: pisCofinsUsesRate(event.target.value) ? value.cofinsRate : "0,00",
            })}
          >
            {PIS_COFINS_CSTS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Alíquota COFINS (%)</span>
          <input
            inputMode="decimal"
            disabled={!cofinsOpen}
            className={`${fieldClass} disabled:text-gray-400`}
            value={cofinsOpen ? value.cofinsRate : "0,00"}
            onChange={(event) => onChange({ ...value, cofinsRate: event.target.value })}
          />
        </label>
      </div>
    </div>
  );
}
