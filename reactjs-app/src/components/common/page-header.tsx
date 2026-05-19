import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b bg-background/95 px-4 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
      <div className="max-w-3xl space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
        ) : null}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
