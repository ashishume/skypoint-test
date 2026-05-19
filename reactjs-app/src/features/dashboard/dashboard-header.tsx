import { motion } from "framer-motion";
import { useAuth } from "@/app/auth-context";

export function DashboardHeader() {
  const { user } = useAuth();
  const firstName = user?.full_name?.split(" ")[0] ?? "there";
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-2"
    >
      <h1 className="text-3xl font-bold tracking-tight text-[#091426] sm:text-4xl">Good Morning, {firstName}</h1>
      <p className="text-base font-medium text-slate-600">
        Here&apos;s what&apos;s happening with your recruitment funnel today.
      </p>
    </motion.header>
  );
}
