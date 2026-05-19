import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  limit: number;
  offset: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ limit, offset, total, onPageChange }: PaginationControlsProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + limit, total);

  if (total <= limit && currentPage === 1) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="font-medium text-muted-foreground">
        Showing {start}-{end} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="min-w-20 text-center text-sm font-semibold">
          {currentPage} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
