import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface TalentPoolCardProps {
  totalTalentPool: number;
}

export function TalentPoolCard({ totalTalentPool }: TalentPoolCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.45 }}
      className="relative overflow-hidden rounded-lg bg-[#1e293b] p-5 text-white shadow-md"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_35%,rgba(33,112,228,0.34),transparent_34%)]" />
      <div className="relative space-y-5">
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Talent Pool Growth</h2>
          <p className="text-sm leading-6 text-slate-200">
            Your talent pool has {totalTalentPool ? "grown with fresh candidate activity" : "no activity yet"} across active roles.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-md bg-blue-700 text-white hover:bg-blue-800">
            <Link to="/hr/jobs">Explore Pool</Link>
          </Button>
        </div>
      </div>
    </motion.section>
  );
}
