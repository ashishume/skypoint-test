import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
}

export function MetricCard({ title, value, detail, icon: Icon }: MetricCardProps) {
  return (
    <Card className="overflow-hidden rounded-lg">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
