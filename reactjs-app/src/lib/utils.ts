import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | Date, opts?: Intl.DateTimeFormatOptions) {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...opts,
  }).format(d);
}

export function formatRelative(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return formatDate(d);
}

export function formatSalary(min?: number | null, max?: number | null): string {
  if (!min && !max) return "—";
  const fmt = (n: number) =>
    n >= 100_000 ? `${(n / 100_000).toFixed(n % 100_000 === 0 ? 0 : 1)}L` : `${n.toLocaleString()}`;
  if (min && max) return `₹${fmt(min)} – ₹${fmt(max)}`;
  return `₹${fmt((min ?? max) as number)}`;
}

export function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
