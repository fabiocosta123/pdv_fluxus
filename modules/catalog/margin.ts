export const PRICE_GROUPS = [
  { id: "bebidas", label: "Bebidas", margin: 20 },
  { id: "mercearia", label: "Mercearia", margin: 22 },
  { id: "limpeza", label: "Limpeza", margin: 30 },
  { id: "higiene", label: "Higiene", margin: 35 },
  { id: "frios", label: "Frios e laticínios", margin: 30 },
  { id: "hortifruti", label: "Hortifruti", margin: 40 },
  { id: "padaria", label: "Padaria", margin: 45 },
  { id: "acougue", label: "Açougue", margin: 28 },
  { id: "congelados", label: "Congelados", margin: 30 },
  { id: "outros", label: "Outros", margin: 25 },
] as const;

export type PriceGroupId = (typeof PRICE_GROUPS)[number]["id"];

const KEYWORDS: Record<PriceGroupId, string[]> = {
  limpeza: [
    "agua sanitaria",
    "detergente",
    "sabao",
    "desinfetante",
    "amaciante",
    "alvejante",
    "esponja",
    "multiuso",
    "bombril",
    "inseticida",
    "saponaceo",
    "cloro",
    "odorizador",
    "alcool",
  ],
  higiene: [
    "alcool em gel",
    "creme dental",
    "pasta de dente",
    "papel higienico",
    "escova de dente",
    "shampoo",
    "condicionador",
    "sabonete",
    "desodorante",
    "absorvente",
    "fralda",
    "enxaguante",
    "cotonete",
    "prestobarba",
  ],
  congelados: ["congelado", "sorvete", "lasanha", "nugget", "empanado"],
  acougue: [
    "picanha",
    "alcatra",
    "linguica",
    "costela",
    "frango",
    "carne",
    "bacon",
    "peixe",
    "salsicha",
    "acem",
  ],
  hortifruti: [
    "hortifruti",
    "banana",
    "tomate",
    "alface",
    "batata",
    "cebola",
    "laranja",
    "limao",
    "mamao",
    "abacaxi",
    "cenoura",
    "beterraba",
    "couve",
    "repolho",
    "melancia",
    "verdura",
    "legume",
  ],
  padaria: ["biscoito", "bolacha", "padaria", "croissant", "rosca", "bolo", "pao"],
  frios: [
    "requeijao",
    "mortadela",
    "mussarela",
    "mucarela",
    "presunto",
    "iogurte",
    "manteiga",
    "margarina",
    "queijo",
    "leite",
    "ricota",
  ],
  bebidas: [
    "refrigerante",
    "energetico",
    "isotonico",
    "guarana",
    "cerveja",
    "heineken",
    "vodka",
    "whisky",
    "vinho",
    "sprite",
    "fanta",
    "coca",
    "pepsi",
    "skol",
    "brahma",
    "suco",
    "agua",
    "soda",
    "cha",
    "bebida",
  ],
  mercearia: [
    "macarrao",
    "feijao",
    "acucar",
    "farinha",
    "vinagre",
    "maionese",
    "ketchup",
    "mostarda",
    "sardinha",
    "ervilha",
    "extrato",
    "tempero",
    "azeite",
    "arroz",
    "oleo",
    "cafe",
    "molho",
    "milho",
    "atum",
    "fuba",
    "sal",
  ],
  outros: [],
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matches(text: string, keyword: string) {
  if (keyword.includes(" ") || keyword.length >= 4) return text.includes(keyword);
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text);
}

export function classifyProduct(name: string): PriceGroupId {
  const text = normalize(name);
  let best: { id: PriceGroupId; length: number } | null = null;

  for (const group of PRICE_GROUPS) {
    for (const keyword of KEYWORDS[group.id]) {
      if (!matches(text, keyword)) continue;
      if (!best || keyword.length > best.length) best = { id: group.id, length: keyword.length };
    }
  }

  return best?.id ?? "outros";
}

export function priceGroup(id: string) {
  return PRICE_GROUPS.find((group) => group.id === id) ?? PRICE_GROUPS[PRICE_GROUPS.length - 1];
}

export function priceFromMargin(costCents: number, marginPercent: number) {
  if (costCents <= 0 || marginPercent <= 0 || marginPercent >= 100) return 0;
  return Math.round(costCents / (1 - marginPercent / 100));
}

export function suggestProduct(name: string, costCents: number, groupId?: string) {
  const group = priceGroup(groupId ?? classifyProduct(name));
  const price = priceFromMargin(costCents, group.margin);
  if (price <= 0) return null;
  return { ...group, price };
}
