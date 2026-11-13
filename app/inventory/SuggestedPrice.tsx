"use client";

import { useEffect, useState } from "react";
import { money } from "@/app/finance/format";
import { PRICE_GROUPS, classifyProduct, suggestProduct, type PriceGroupId } from "@/modules/catalog/margin";

export function SuggestedPrice({
  name,
  costCents,
  currentCents,
  onUse,
}: {
  name: string;
  costCents: number;
  currentCents: number;
  onUse: (cents: number) => void;
}) {
  const detected = classifyProduct(name);
  const [groupId, setGroupId] = useState<PriceGroupId>(detected);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!locked) setGroupId(detected);
  }, [detected, locked]);

  const suggestion = suggestProduct(name, costCents, groupId);
  if (!suggestion) return null;

  const below = currentCents > 0 && currentCents + 1 < suggestion.price;

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3">
      <div>
        <p className="text-[10px] font-black uppercase text-amber-700">Preço sugerido</p>
        <p className="text-3xl font-black text-amber-950">{money(suggestion.price)}</p>
      </div>
      <label className="block text-[10px] font-black uppercase text-amber-800">
        Grupo
        <select
          className="mt-1 block w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-gray-800"
          value={groupId}
          onChange={(event) => {
            setLocked(true);
            setGroupId(event.target.value as PriceGroupId);
          }}
        >
          {PRICE_GROUPS.map((group) => (
            <option key={group.id} value={group.id}>
              {group.label} · margem {group.margin}%
            </option>
          ))}
        </select>
      </label>
      <p className="text-xs text-amber-900">
        Margem bruta de {suggestion.margin}% sobre o preço, usual de mercado de bairro para {suggestion.label.toLowerCase()}.
      </p>
      {below && (
        <p className="text-xs font-bold text-amber-950">
          O preço digitado está {money(suggestion.price - currentCents)} abaixo do sugerido.
        </p>
      )}
      <button
        type="button"
        onClick={() => onUse(suggestion.price)}
        className="w-full rounded-xl bg-amber-500 px-4 py-3 text-xs font-black uppercase tracking-wide text-amber-950"
      >
        Usar este preço
      </button>
    </div>
  );
}
