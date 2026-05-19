import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AnimatedPanelProps {
  children: ReactNode;
  className?: string;
  delay: number;
}

export function AnimatedPanel({ children, className, delay }: AnimatedPanelProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={cn("rounded-lg border border-slate-200 bg-white shadow-sm", className)}
    >
      {children}
    </motion.section>
  );
}
