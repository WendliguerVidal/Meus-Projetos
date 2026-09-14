"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Campo de texto que continua 100% digitável à mão, mas com uma "setinha" que abre uma
 * lista de sugestões (`options`) para escolher rapidamente — usado em Objeto/Equipamento
 * e Modelo no formulário de Itens do Processo, alimentado pelo Cadastro de Equipamentos.
 * Digitar filtra a lista ao vivo; escolher uma opção preenche o campo e fecha a lista.
 */
export const ComboboxInput = React.forwardRef<
  HTMLInputElement,
  {
    value: string;
    onValueChange: (value: string) => void;
    options: string[];
    placeholder?: string;
  } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">
>(({ value, onValueChange, options, placeholder, className, ...props }, ref) => {
  const [open, setOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    const term = value.trim().toLowerCase();
    const list = term ? options.filter((o) => o.toLowerCase().includes(term)) : options;
    // Some pra quê mostrar a opção que já bate exatamente com o que está digitado.
    return list.filter((o) => o.toLowerCase() !== term).slice(0, 30);
  }, [options, value]);

  const hasSuggestions = filtered.length > 0;

  return (
    <Popover open={open && hasSuggestions} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          <Input
            ref={ref}
            value={value}
            onChange={(e) => {
              onValueChange(e.target.value);
              setOpen(true);
            }}
            // Abrir no onFocus junto com o próprio mousedown que o dispara confunde o
            // dismissable layer do Radix (ele às vezes trata esse clique como "fora" e
            // fecha na mesma hora) — onClick evita a corrida, mesma abordagem já usada
            // e comprovada no botão de seta.
            onClick={() => setOpen(true)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className={cn("pr-8", className)}
            autoComplete="off"
            {...props}
          />
          {options.length > 0 && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setOpen((o) => !o)}
              className="absolute right-0 top-0 flex h-full w-8 items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Ver sugestões"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="max-h-56 min-w-[220px] overflow-y-auto p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {filtered.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              onValueChange(option);
              setOpen(false);
            }}
            className="block w-full truncate rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
          >
            {option}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
});
ComboboxInput.displayName = "ComboboxInput";
