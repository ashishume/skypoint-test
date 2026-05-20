import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/app/auth-context";
import { getApiError, messagesApi } from "@/api/client";
import type { MessageThread } from "@/api/types";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageThreadCard } from "@/features/messages/message-thread-card";

export default function HrMessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const messagesQuery = useQuery({
    queryKey: ["messages", "hr"],
    queryFn: messagesApi.hrThreads,
  });

  const replyMutation = useMutation({
    mutationFn: ({ threadId, body }: { threadId: number; body: string }) =>
      messagesApi.hrReply(threadId, { body }),
    onSuccess: async (updatedThread, variables) => {
      toast.success("Reply sent");
      setDrafts((current) => ({ ...current, [variables.threadId]: "" }));
      queryClient.setQueryData<MessageThread[]>(["messages", "hr"], (current) => {
        if (!current) return [updatedThread];
        return current.map((thread) => (thread.id === updatedThread.id ? updatedThread : thread));
      });
      await queryClient.refetchQueries({ queryKey: ["messages", "hr"], type: "active" });
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
        eyebrow="Candidate conversations"
        title="Messages"
        description="Read candidate replies and continue conversations tied to your own jobs."
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
              jobHref={`/hr/jobs/${thread.job.id}`}
              replyPlaceholder="Write a reply to the candidate"
              onDraftChange={(value) => setDrafts((current) => ({ ...current, [thread.id]: value }))}
              onReply={() => sendReply(thread.id)}
            />
          ))
        ) : (
          <EmptyState
            icon={Mail}
            title="No conversations yet"
            description="Messages you send from candidate profiles will appear here when candidates reply."
          />
        )}
      </section>
    </>
  );
}
