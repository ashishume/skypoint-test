import { Link } from "react-router-dom";
import { Send } from "lucide-react";
import type { MessageThread } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, jobTypeLabels } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MessageThreadCardProps {
  thread: MessageThread;
  currentUserId?: number;
  draft: string;
  isSending: boolean;
  jobHref: string;
  replyPlaceholder: string;
  onDraftChange: (value: string) => void;
  onReply: () => void;
}

export function MessageThreadCard({
  thread,
  currentUserId,
  draft,
  isSending,
  jobHref,
  replyPlaceholder,
  onDraftChange,
  onReply,
}: MessageThreadCardProps) {
  return (
    <Card className="overflow-hidden rounded-lg">
      <CardHeader className="border-b bg-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link to={jobHref} className="text-xl font-bold text-slate-900 hover:text-blue-700">
              {thread.job.title}
            </Link>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {thread.job.location} · {jobTypeLabels[thread.job.job_type]} · Candidate:{" "}
              {thread.candidate.full_name} · Recruiter: {thread.hr.full_name}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to={jobHref}>View job</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <div className="space-y-3">
          {thread.messages.map((message) => {
            const isMine = message.sender_id === currentUserId;
            return (
              <div key={message.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[min(680px,90%)] rounded-lg px-4 py-3 shadow-sm",
                    isMine ? "bg-blue-700 text-white" : "border bg-slate-50 text-slate-900"
                  )}
                >
                  <div className={cn("mb-1 text-xs font-bold", isMine ? "text-blue-100" : "text-slate-500")}>
                    {isMine ? "You" : message.sender.full_name} · {formatDate(message.created_at)}
                  </div>
                  <p className="whitespace-pre-line text-sm leading-6">{message.body}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="rounded-lg border bg-white p-3">
          <Textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            placeholder={replyPlaceholder}
            className="min-h-24 resize-none border-0 p-0 shadow-none focus-visible:ring-0"
          />
          <div className="mt-3 flex justify-end">
            <Button type="button" onClick={onReply} disabled={isSending || !draft.trim()}>
              <Send className="h-4 w-4" />
              Reply
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
