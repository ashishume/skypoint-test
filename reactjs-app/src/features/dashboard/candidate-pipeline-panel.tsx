import { Link } from "react-router-dom";
import type { ApplicationStatus, ApplicationWithJobAndCandidate } from "@/api/types";
import { AnimatedPanel } from "@/features/dashboard/animated-panel";
import { PipelineCard } from "@/features/dashboard/pipeline-card";

export interface PipelineColumn {
  key: string;
  label: string;
  statuses: ApplicationStatus[];
  applications: ApplicationWithJobAndCandidate[];
  count: number;
}

interface CandidatePipelinePanelProps {
  columns: PipelineColumn[];
}

export function CandidatePipelinePanel({ columns }: CandidatePipelinePanelProps) {
  return (
    <AnimatedPanel delay={0.25} className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-5">
        <h2 className="text-xl font-bold tracking-tight">Candidate Pipeline</h2>
        <Link to="/hr/jobs" className="text-sm font-bold text-blue-700 hover:underline">
          View All Pipeline
        </Link>
      </div>
      <div className="overflow-x-auto p-4 sm:p-5">
        <div className="grid min-w-[600px] grid-cols-3 gap-4">
          {columns.map((column) => (
            <div key={column.key} className="space-y-3">
              <div className="px-1 text-sm font-bold uppercase tracking-wide text-slate-600">
                {column.label} ({column.count})
              </div>
              {column.applications.slice(0, column.key === "applied" ? 2 : 1).map((application) => (
                <PipelineCard
                  key={application.id}
                  application={application}
                  isHighlighted={column.key === "interview"}
                />
              ))}
              {!column.applications.length ? (
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm font-medium text-slate-500">
                  No {column.label.toLowerCase()} candidates
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </AnimatedPanel>
  );
}
