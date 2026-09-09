"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function centsToDisplay(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Campo de moeda (R$) com máscara — o usuário digita apenas números; cada dígito
 * empurra a casa decimal (padrão de apps bancários), então não há como digitar
 * separadores ambíguos ("," vs ".") — o valor exposto via `onValueChange` já é um
 * `number` em reais (ex: 999999.98), pronto para ir ao formulário/Server Action.
 */
export const CurrencyInput = React.forwardRef<
  HTMLInputElement,
  {
    value: number | null;
    onValueChange: (value: number | null) => void;
  } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">
>(({ value, onValueChange, className, ...props }, ref) => {
  const [display, setDisplay] = React.useState(() =>
    value != null ? centsToDisplay(Math.round(value * 100)) : ""
  );

  // Mantém o texto exibido em sincronia quando o valor muda por fora (ex: reset()
  // do formulário ao abrir o modal em modo de edição).
  React.useEffect(() => {
    setDisplay(value != null ? centsToDisplay(Math.round(value * 100)) : "");
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) {
      setDisplay("");
      onValueChange(null);
      return;
    }
    const cents = parseInt(digits, 10);
    setDisplay(centsToDisplay(cents));
    onValueChange(cents / 100);
  };

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        placeholder="0,00"
        value={display}
        onChange={handleChange}
        className={cn("pl-9", className)}
        {...props}
      />
    </div>
  );
});
CurrencyInput.displayName = "CurrencyInput";
