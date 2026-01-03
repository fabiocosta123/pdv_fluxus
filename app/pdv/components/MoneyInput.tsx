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
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove tudo que não for número (limpa pontos e vírgulas)
        const digits = e.target.value.replace(/\D/g, "");
        
        // Converte a string de dígitos para um número inteiro (centavos)
        // Ex: "1050" vira 1050 (que representa R$ 10,50)
        const newValue = digits ? parseInt(digits, 10) : 0;
        
        onChange(newValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Atalhos de função (F1, F3, etc)
        if (["F1", "F3", "F4", "F6", "F9", "F10"].includes(e.key)) {
            e.preventDefault();
            onShortcut?.(e.key);
            return;
        }

        // Enter para confirmar o valor
        if (e.key === "Enter") {
            // Se o valor for 0 mas o saldo já estiver pago, o Enter deve passar adiante            
            onEnter?.();
        }
    };

    // Formata o inteiro para exibição (BR)
    const displayValue = (value / 100).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    return (
        <input
            type="text" 
            inputMode="numeric"
            autoFocus={autoFocus}
            value={displayValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={(e) => e.target.select()}
            className={className}
            spellCheck={false}
            autoComplete="off"
        />
    );
};