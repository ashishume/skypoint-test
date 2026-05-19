import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Mail, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/app/auth-context";
import { getApiError, messagesApi } from "@/api/client";
import type { MessageThread } from "@/api/types";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, jobTypeLabels } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function CandidateMessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const messagesQuery = useQuery({
    queryKey: ["messages", "candidate"],
    queryFn: messagesApi.candidateThreads,
  });

  const replyMutation = useMutation({
    mutationFn: ({ threadId, body }: { threadId: number; body: string }) =>
      messagesApi.reply(threadId, { body }),
    onSuccess: async (updatedThread, variables) => {
      toast.success("Reply sent");
      setDrafts((current) => ({ ...current, [variables.threadId]: "" }));
      queryClient.setQueryData<MessageThread[]>(["messages", "candidate"], (current) => {
        if (!current) return [updatedThread];
        return current.map((thread) => (thread.id === updatedThread.id ? updatedThread : thread));
      });
      await queryClient.refetchQueries({ queryKey: ["messages", "candidate"], type: "active" });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  function sendReply(threadId: number) {
    const body = drafts[threadId]?.trim();
    if (!body) {
      toast.error("Write a reply before sending.");
      return;
    }
    replyMutation.mutate({ threadId, body });
  }

  return (
    <>
      <PageHeader
        eyebrow="Recruiter messages"
        title="Messages"
        description="See recruiter outreach tied to your applications and reply when needed."
      />
      <section className="space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {messagesQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-80 rounded-lg" />)
        ) : messagesQuery.data?.length ? (
          messagesQuery.data.map((thread) => (
            <MessageThreadCard
              key={thread.id}
              thread={thread}
              currentUserId={user?.id}
              draft={drafts[thread.id] ?? ""}
              isSending={replyMutation.isPending}
              onDraftChange={(value) => setDrafts((current) => ({ ...current, [thread.id]: value }))}
              onReply={() => sendReply(thread.id)}
            />
          ))
        ) : (
          <EmptyState
            icon={Mail}
            title="No messages yet"
            description="When a recruiter contacts you about an application, the conversation will appear here."
          />
        )}
      </section>
    </>
  );
}

function MessageThreadCard({
  thread,
  currentUserId,
  draft,
  isSending,
  onDraftChange,
  onReply,
}: {
  thread: MessageThread;
  currentUserId?: number;
  draft: string;
  isSending: boolean;
  onDraftChange: (value: string) => void;
  onReply: () => void;
}) {
  return (
    <Card className="overflow-hidden rounded-lg">
      <CardHeader className="border-b bg-white">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link to={`/candidate/jobs/${thread.job.id}`} className="text-xl font-bold text-slate-900 hover:text-blue-700">
              {thread.job.title}
            </Link>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {thread.job.location} · {jobTypeLabels[thread.job.job_type]} · Recruiter: {thread.hr.full_name}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to={`/candidate/jobs/${thread.job.id}`}>View job</Link>
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
            placeholder="Write a reply to the recruiter"
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
