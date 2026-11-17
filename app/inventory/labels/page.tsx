"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer, Search, X } from "lucide-react";
import { toast } from "sonner";
import { money } from "@/app/finance/format";
import { A4_PER_PAGE, downloadA4Labels } from "@/modules/labels/a4-pdf";
import { LABEL_SIZES, PriceTag, type LabelSizeId } from "./PriceTag";

type ProductRow = {
  id: string;
  name: string;
  price: number;
  barCode: string | null;
  unit: string | null;
};

type LabelLine = ProductRow & { copies: number };

const SIZE_KEY = "fluxus-argox-label";
const MEDIA_KEY = "fluxus-label-media";
type LabelMedia = "a4" | "argox";

export default function PriceLabelsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<LabelLine[]>([]);
  const [size, setSize] = useState<LabelSizeId>("80x40");
  const [media, setMedia] = useState<LabelMedia>("a4");

  useEffect(() => {
    const stored = window.localStorage.getItem(SIZE_KEY);
    if (stored === "50x30" || stored === "80x40" || stored === "100x30") setSize(stored);
    const storedMedia = window.localStorage.getItem(MEDIA_KEY);
    if (storedMedia === "a4" || storedMedia === "argox") setMedia(storedMedia);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/products")
      .then(async (response) => {
        const data = await response.json().catch(() => []);
        if (!active) return;
        setProducts(Array.isArray(data) ? data : []);
        const requested = new URLSearchParams(window.location.search).get("product");
        const found = Array.isArray(data) ? data.find((item: ProductRow) => item.id === requested) : null;
        if (found) setLines([{ ...found, copies: 1 }]);
      })
      .catch(() => toast.error("Não foi possível carregar os produtos"))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter(
        (product) =>
          product.name.toLowerCase().includes(term) || (product.barCode ?? "").includes(term),
      )
      .slice(0, 8);
  }, [products, search]);

  function chooseSize(next: LabelSizeId) {
    setSize(next);
    window.localStorage.setItem(SIZE_KEY, next);
  }

  function chooseMedia(next: LabelMedia) {
    setMedia(next);
    window.localStorage.setItem(MEDIA_KEY, next);
  }

  function addProduct(product: ProductRow) {
    setLines((current) => {
      const existing = current.find((line) => line.id === product.id);
      if (!existing) return [...current, { ...product, copies: 1 }];
      return current.map((line) =>
        line.id === product.id ? { ...line, copies: Math.min(line.copies + 1, 200) } : line,
      );
    });
    setSearch("");
  }

  function setCopies(id: string, copies: number) {
    const next = Number.isFinite(copies) ? Math.min(Math.max(Math.round(copies), 1), 200) : 1;
    setLines((current) => current.map((line) => (line.id === id ? { ...line, copies: next } : line)));
  }

  const sheet = lines.flatMap((line) =>
    Array.from({ length: line.copies }, (_, copy) => ({ ...line, key: `${line.id}-${copy}` })),
  );
  const pages = chunk(sheet, A4_PER_PAGE);
  const pageCount = Math.max(pages.length, sheet.length > 0 ? 1 : 0);

  function printLabels() {
    if (lines.length === 0) {
      toast.error("Escolha um produto para imprimir");
      return;
    }
    window.print();
  }

  function downloadLabels() {
    if (sheet.length === 0) {
      toast.error("Escolha um produto para baixar");
      return;
    }
    downloadA4Labels(sheet.map(({ name, price, barCode, unit }) => ({ name, price, barCode, unit })));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="no-print bg-white border-b px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/inventory")}
            className="p-2 rounded-xl hover:bg-gray-100"
            aria-label="Voltar ao estoque"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter text-gray-800">Etiquetas de preço</h1>
            <p className="text-sm text-gray-500">Sulfite A4 ou Argox · nome, preço e código de barras</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadLabels}
            className="bg-white border border-gray-200 text-gray-800 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-tighter flex items-center gap-2"
          >
            <Download size={18} /> Baixar
          </button>
          <button
            type="button"
            onClick={printLabels}
            className="bg-blue-600 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-tighter flex items-center gap-2"
          >
            <Printer size={18} /> Imprimir
          </button>
        </div>
      </header>

      <main className="no-print max-w-5xl mx-auto p-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="grid min-w-0 gap-4 content-start">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => chooseMedia("a4")}
              className={`min-w-0 rounded-2xl border p-3 text-left ${
                media === "a4" ? "bg-gray-900 text-white border-gray-900" : "bg-white"
              }`}
            >
              <p className="text-sm font-black leading-none">Sulfite A4</p>
              <p className={`text-[11px] mt-1 leading-tight ${media === "a4" ? "text-gray-300" : "text-gray-500"}`}>
                {A4_PER_PAGE} etiquetas por folha
              </p>
            </button>
            <button
              type="button"
              onClick={() => chooseMedia("argox")}
              className={`min-w-0 rounded-2xl border p-3 text-left ${
                media === "argox" ? "bg-gray-900 text-white border-gray-900" : "bg-white"
              }`}
            >
              <p className="text-sm font-black leading-none">Argox</p>
              <p className={`text-[11px] mt-1 leading-tight ${media === "argox" ? "text-gray-300" : "text-gray-500"}`}>
                Uma etiqueta por folha
              </p>
            </button>
          </div>

          {media === "argox" && (
            <div className="grid grid-cols-3 gap-2">
              {LABEL_SIZES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => chooseSize(option.id)}
                  className={`min-w-0 rounded-2xl border p-3 text-left ${
                    size === option.id ? "bg-gray-900 text-white border-gray-900" : "bg-white"
                  }`}
                >
                  <p className="text-sm font-black leading-none">{option.id.replace("x", "×")}</p>
                  <p className={`text-[11px] mt-1 leading-tight ${size === option.id ? "text-gray-300" : "text-gray-500"}`}>
                    {option.hint}
                  </p>
                </button>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar produto por nome ou código de barras"
              className="w-full pl-11 pr-4 py-4 bg-white rounded-2xl outline-none border-2 border-transparent focus:border-blue-500"
            />
            {matches.length > 0 && (
              <div className="absolute z-10 mt-2 w-full bg-white rounded-2xl border shadow-lg overflow-hidden">
                {matches.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center justify-between gap-3"
                  >
                    <span>
                      <span className="block font-bold text-gray-800 uppercase">{product.name}</span>
                      <span className="text-xs text-gray-400 font-mono">{product.barCode || "Sem código"}</span>
                    </span>
                    <span className="font-black text-sm">{money(product.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Carregando produtos...</p>
          ) : lines.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-dashed border-gray-200 p-10 text-center">
              <p className="font-black uppercase tracking-tighter text-gray-400">Nenhuma etiqueta na fila</p>
              <p className="text-sm text-gray-500 mt-2">Busque o produto e informe quantas etiquetas imprimir.</p>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden">
              {lines.map((line) => (
                <div key={line.id} className="px-5 py-4 border-b last:border-b-0 flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-800 uppercase truncate">{line.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{line.barCode || "Sem código"}</p>
                  </div>
                  <p className="font-black text-sm">{money(line.price)}</p>
                  <label className="text-[10px] font-black uppercase text-gray-400">
                    Qtd
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={line.copies}
                      onChange={(event) => setCopies(line.id, Number(event.target.value))}
                      className="mt-1 block w-16 rounded-xl border px-2 py-2 text-sm font-black text-gray-800"
                      aria-label={`Quantidade de etiquetas de ${line.name}`}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}
                    className="p-2 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remover ${line.name}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500">
            {media === "a4"
              ? `Cada folha A4 leva ${A4_PER_PAGE} etiquetas. A linha tracejada é o corte. Baixar gera o PDF. Imprimir abre a janela do navegador: escolha a impressora comum e o papel A4.`
              : `Na impressão, escolha a Argox e o papel ${LABEL_SIZES.find((option) => option.id === size)?.label}. Cada etiqueta sai em uma folha. Baixar continua gerando a folha A4.`}
          </p>
        </section>

        <aside className="min-w-0 bg-white rounded-[2rem] border border-gray-100 p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Prévia</p>
          {media === "a4" ? (
            <>
              <div className="a4-preview">
                <section className="a4-page">
                  {(sheet.length > 0 ? sheet.slice(0, A4_PER_PAGE) : [sampleLabel]).map((line) => (
                    <PriceTag
                      key={line.key}
                      name={line.name}
                      price={line.price}
                      barCode={line.barCode}
                      unit={line.unit}
                      size={size}
                      layout="a4"
                    />
                  ))}
                </section>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                {sheet.length === 0
                  ? `Exemplo. A folha cabe ${A4_PER_PAGE} etiquetas.`
                  : `${sheet.length} ${sheet.length === 1 ? "etiqueta" : "etiquetas"} · ${pageCount} ${pageCount === 1 ? "folha" : "folhas"}`}
              </p>
            </>
          ) : (
            <div className="max-w-full overflow-x-auto">
              {lines[0] ? (
                <PriceTag
                  name={lines[0].name}
                  price={lines[0].price}
                  barCode={lines[0].barCode}
                  unit={lines[0].unit}
                  size={size}
                />
              ) : (
                <PriceTag name="Produto" price={1290} barCode="7891000315507" unit="UN" size={size} />
              )}
            </div>
          )}
        </aside>
      </main>

      {media === "a4" ? (
        <div className="print-area a4-sheet">
          {pages.map((page, index) => (
            <section className="a4-page" key={index}>
              {page.map((line) => (
                <PriceTag
                  key={line.key}
                  name={line.name}
                  price={line.price}
                  barCode={line.barCode}
                  unit={line.unit}
                  size={size}
                  layout="a4"
                />
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="print-area argox-sheet">
          {sheet.map((line) => (
            <PriceTag
              key={line.key}
              name={line.name}
              price={line.price}
              barCode={line.barCode}
              unit={line.unit}
              size={size}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const sampleLabel = {
  key: "sample",
  name: "Produto",
  price: 1290,
  barCode: "7891000315507",
  unit: "UN",
};

function chunk<T>(items: T[], size: number) {
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) pages.push(items.slice(index, index + size));
  return pages;
}
