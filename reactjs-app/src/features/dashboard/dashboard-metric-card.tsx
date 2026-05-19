import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const MotionLink = motion(Link);

interface DashboardMetricCardProps {
  title: string;
  value: string | number;
  detail: string;
  trend?: string;
  icon: LucideIcon;
  delay: number;
  href: string;
  accent?: boolean;
}

export function DashboardMetricCard({
  title,
  value,
  detail,
  trend,
  icon: Icon,
  delay,
  href,
  accent = false,
}: DashboardMetricCardProps) {
  return (
    <MotionLink
      to={href}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      whileHover={{ y: -2 }}
      className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
    >
      <div className="mb-5 flex items-start justify-between">
        <span className="text-sm font-bold text-slate-600">{title}</span>
        <Icon className="h-5 w-5 text-blue-700" />
      </div>
      <div className="text-3xl font-bold tracking-tight text-[#091426]">{value}</div>
      <div className={cn("mt-4 flex items-center gap-1 text-sm font-bold", accent ? "text-blue-700" : "text-green-600")}>
        {trend ? <TrendingUp className="h-4 w-4" /> : null}
        <span>{trend ?? detail}</span>
      </div>
      {trend ? <div className="mt-1 text-xs font-semibold text-slate-500">{detail}</div> : null}
    </MotionLink>
  );
}
