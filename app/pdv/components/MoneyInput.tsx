import React from "react";

interface MoneyInputProps {
    value: number;
    onChange: (value: number) => void;
    onEnter?: () => void;
    onShortcut?: (key: string) => void;
    className?: string;
    autoFocus?: boolean;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
    value,
    onChange,
    onEnter,
    onShortcut,
    className,
    autoFocus
}) => {
    return (
    <input
      type="number"
      inputMode="decimal"
      autoFocus={autoFocus}
      step="0.01"
      value={(value / 100).toFixed(2)}
      onChange={(e) => {
        const val = e.target.value;
        onChange(val === "" ? 0 : Math.round(parseFloat(val) * 100));
      }}
      onKeyDown={(e) => {
        // Bloqueia funções nativas do navegador (F1, F3, etc)
        if (["F1", "F3", "F4", "F6", "F9", "F10"].includes(e.key)) {
          e.preventDefault();
          onShortcut?.(e.key);
        }

        if (e.key === "Enter" && value > 0) {
          onEnter?.();
        }
      }}
      onFocus={(e) => e.target.select()}
      className={className}
    />
  );
}