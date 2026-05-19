/**
 * Lightweight form-field wrappers that integrate with react-hook-form
 * without dragging the full shadcn Form context in. Keeps the API simple:
 *
 *   <FormField label="Email" error={errors.email?.message}>
 *     <Input {...register("email")} />
 *   </FormField>
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FormFieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormField({ label, hint, error, required, className, children }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
