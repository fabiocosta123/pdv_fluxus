"use client";
import { useState, useEffect } from "react";

interface Product {
  id: string;
  name: string;
  barCode?: string;
  price: number;
  stock: number;
  isActive: boolean;
}

interface ProductSearchProps {
  onAddToCart: (product: Product) => void;
}

export default function ProductSearch({ onAddToCart }: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data : [data]);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Digite nome ou código de barras"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border-2 border-gray-300 rounded-lg p-3 text-xl font-mono focus:border-blue-600 outline-none bg-gray-50 uppercase"
      />

      {results.length > 0 && (
        <ul className="absolute bg-white border rounded mt-1 w-full max-h-40 overflow-y-auto z-10">
          {results.map((p) => (
            <li
              key={p.id}
              className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between"
              onClick={() => {
                onAddToCart(p);
                setQuery("");
                setResults([]);
              }}
            >
              <span>{p.name}</span>
              <span className="text-gray-400 text-sm">{p.barCode}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
