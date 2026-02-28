"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

let inputIdCounter = 0;
function generateInputId() {
  return `form-field-${++inputIdCounter}`;
}

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  erro?: string;
  hint?: string;
  containerClassName?: string;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ className, label, erro, hint, containerClassName, id, ...props }, ref) => {
    const inputId = id || generateInputId();

    return (
      <div className={cn("space-y-1.5", containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            className={cn(
              "flex h-11 w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400",
              "focus:outline-none focus:ring-2 focus:ring-slate-200/50",
              erro
                ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                : "border-slate-200 focus:border-slate-400",
              className
            )}
            ref={ref}
            aria-invalid={!!erro}
            aria-describedby={erro ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
        </div>
        {erro && (
          <p id={`${inputId}-error`} className="flex items-center gap-1 text-xs text-red-600" role="alert">
            <AlertCircle className="h-3 w-3" />
            {erro}
          </p>
        )}
        {hint && !erro && (
          <p id={`${inputId}-hint`} className="text-xs text-slate-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
FormField.displayName = "FormField";
