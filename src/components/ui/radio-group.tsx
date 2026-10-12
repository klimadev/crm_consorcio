"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type RadioGroupContextValue = {
  nome: string;
  valor: string;
  selecionar: (valor: string) => void;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

type RadioGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string;
  onValueChange: (valor: string) => void;
};

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ value, onValueChange, className, children, ...props }, ref) => {
    const nome = React.useId();
    const contexto = React.useMemo<RadioGroupContextValue>(
      () => ({ nome, valor: value, selecionar: onValueChange }),
      [nome, value, onValueChange],
    );

    return (
      <div ref={ref} role="radiogroup" className={cn("grid gap-2", className)} {...props}>
        <RadioGroupContext.Provider value={contexto}>{children}</RadioGroupContext.Provider>
      </div>
    );
  },
);
RadioGroup.displayName = "RadioGroup";

type RadioGroupItemProps = Omit<React.LabelHTMLAttributes<HTMLLabelElement>, "value" | "htmlFor" | "onChange"> & {
  value: string;
  disabled?: boolean;
  /** Descricao curta para leitores de tela; aplicada ao input radio oculto. */
  textoAcessivel?: string;
};

const RadioGroupItem = React.forwardRef<HTMLLabelElement, RadioGroupItemProps>(
  ({ value, className, children, disabled, textoAcessivel, ...props }, ref) => {
    const contexto = React.useContext(RadioGroupContext);
    const selecionado = contexto?.valor === value;

    return (
      <label
        ref={ref}
        className={cn(
          "flex min-h-[44px] w-full cursor-pointer items-start gap-3 rounded-xl border border-border bg-background-surface p-3 text-left transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
          selecionado ? "border-primary/60 bg-muted/50" : "hover:bg-muted",
          disabled ? "pointer-events-none opacity-50" : "",
          className,
        )}
        {...props}
      >
        <input
          type="radio"
          name={contexto?.nome}
          value={value}
          checked={selecionado}
          disabled={disabled}
          onChange={() => contexto?.selecionar(value)}
          aria-label={textoAcessivel}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-border-strong transition-colors peer-checked:border-primary peer-focus-visible:border-primary"
        >
          {selecionado ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
        </span>
        <span className="min-w-0 flex-1">{children}</span>
      </label>
    );
  },
);
RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
