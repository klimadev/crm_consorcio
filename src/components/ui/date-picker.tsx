"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  className,
  disabled,
}: DatePickerProps) {
  return (
    <div className={cn("relative", className)}>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        min={min}
        max={max}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-slate-400",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60",
          "[&::-webkit-calendar-picker-indicator]:hover:opacity-100"
        )}
      />
    </div>
  );
}

export interface DatePickerWithWarningProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  warningMessage?: string;
  disabled?: boolean;
}

export function DatePickerWithWarning({
  value,
  onChange,
  label,
  placeholder,
  warningMessage,
  disabled,
}: DatePickerWithWarningProps) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const dataSelecionada = value ? new Date(value + "T00:00:00") : null;
  const isDataPassado = dataSelecionada && dataSelecionada < hoje;

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-xs font-medium text-slate-600">{label}</label>
      )}
      <DatePicker value={value} onChange={onChange} disabled={disabled} />
      {isDataPassado && warningMessage && (
        <p className="flex items-center gap-1 text-xs text-amber-600">
          <CalendarIcon className="h-3 w-3" />
          {warningMessage}
        </p>
      )}
    </div>
  );
}
