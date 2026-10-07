export type LookupProduct = {
  id: string;
  name: string;
  price: number;
  barCode?: string | null;
  stock: number;
  unit?: string;
  isActive?: boolean;
};

export type SaleInput = {
  quantityToLoad: number;
  codeToSearch: string;
  isScaleLabel: boolean;
  priceFromLabel: number;
};

export type ProductDecision<T> =
  | { type: "match"; product: T }
  | { type: "inactive" }
  | { type: "ambiguous" }
  | { type: "none" };

const SUGGESTION_LIMIT = 8;

export function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function parseSaleInput(inputVal: string): SaleInput {
  const raw = inputVal.trim();
  let quantityToLoad = 1;
  let codeToSearch = raw;
  let isScaleLabel = false;
  let priceFromLabel = 0;

  if (raw.length === 13 && raw.startsWith("2") && /^\d+$/.test(raw)) {
    isScaleLabel = true;
    codeToSearch = raw.substring(1, 6);
    priceFromLabel = parseFloat(raw.substring(6, 11)) / 100;
  } else if (raw.includes("*")) {
    const star = raw.indexOf("*");
    quantityToLoad = parseFloat(raw.slice(0, star).replace(",", ".")) || 1;
    codeToSearch = raw.slice(star + 1).trim();
  }

  return { quantityToLoad, codeToSearch, isScaleLabel, priceFromLabel };
}

function rankProduct(product: LookupProduct, query: string) {
  const name = normalizeSearch(product.name);
  const code = normalizeSearch(product.barCode ?? "");
  if ((code && code === query) || name === query) return 0;
  if (name.startsWith(query) || (code && code.startsWith(query))) return 1;
  if (name.includes(query) || (code && code.includes(query))) return 2;
  return 3;
}

export function findSuggestions<T extends LookupProduct>(catalog: T[], term: string) {
  const query = normalizeSearch(term);
  if (!query) return { items: [] as T[], total: 0 };

  const ranked = catalog
    .filter((product) => product.isActive !== false)
    .map((product) => ({ product, rank: rankProduct(product, query) }))
    .filter((item) => item.rank < 3)
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.product.name.localeCompare(b.product.name, "pt-BR"),
    );

  return {
    items: ranked.slice(0, SUGGESTION_LIMIT).map((item) => item.product),
    total: ranked.length,
  };
}

export function resolveProduct<T extends LookupProduct>(
  catalog: T[],
  term: string,
  highlightedIndex: number,
  barcodeOnly = false,
): ProductDecision<T> {
  const query = normalizeSearch(term);
  if (!query) return { type: "none" };

  const barcodeHit = catalog.find(
    (product) => product.barCode && normalizeSearch(product.barCode) === query,
  );
  if (barcodeHit) {
    return barcodeHit.isActive === false
      ? { type: "inactive" }
      : { type: "match", product: barcodeHit };
  }

  if (barcodeOnly) return { type: "none" };

  const { items } = findSuggestions(catalog, term);
  const exactNames = items.filter((product) => normalizeSearch(product.name) === query);
  if (exactNames.length === 1) return { type: "match", product: exactNames[0] };
  if (exactNames.length > 1) return { type: "ambiguous" };
  if (items.length === 1) return { type: "match", product: items[0] };
  if (highlightedIndex >= 0 && items[highlightedIndex]) {
    return { type: "match", product: items[highlightedIndex] };
  }
  if (items.length > 1) return { type: "ambiguous" };
  return { type: "none" };
}
