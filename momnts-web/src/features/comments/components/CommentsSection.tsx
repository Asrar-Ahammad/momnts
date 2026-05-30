import { useState } from "react";
import { ChatCircleDots, WarningCircle } from "@phosphor-icons/react";
import { useComments, useDeleteComment } from "../hooks/useComments";
import { CommentItem } from "./CommentItem";
import { CommentInput } from "./CommentInput";
import { Skeleton } from "../../../components/ui/skeleton";
import { Badge } from "../../../components/ui/badge";

interface CommentsSectionProps {
  photoId: string;
  currentUserId: string;
  isOrganizer: boolean;
  hideHeader?: boolean;
}

export function CommentsSection({
  photoId,
  currentUserId,
  isOrganizer,
  hideHeader = false,
}: CommentsSectionProps) {
  const [replyTarget, setReplyTarget] = useState<{ commentId: string; userName: string } | null>(null);

  const { data, isLoading, error } = useComments(photoId);
  const deleteCommentMutation = useDeleteComment(photoId);

  const totalComments = data?.total ?? 0;

  return (
    <div className="space-y-4">
      {/* 1. Section header */}
      {!hideHeader && (
        <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Comments
          </h2>
          {data !== undefined && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              {totalComments}
            </Badge>
          )}
        </div>
      )}

      {/* 2. Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-3 w-1/4 bg-neutral-200 dark:bg-neutral-800" />
                <Skeleton className="h-3 w-3/4 bg-neutral-200 dark:bg-neutral-800" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Error state */}
      {error && (
        <div className="flex flex-col items-center justify-center py-6 text-neutral-500 gap-2">
          <WarningCircle size={32} className="text-neutral-400" />
          <p className="text-sm font-medium">Failed to load comments</p>
        </div>
      )}

      {/* 4. Empty state */}
      {!isLoading && !error && totalComments === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <ChatCircleDots size={32} className="text-neutral-300 dark:text-neutral-700 mb-2" />
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">No comments yet</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">Be the first to comment</p>
        </div>
      )}

      {/* 5. Comments list */}
      {!isLoading && !error && totalComments > 0 && data && (
        <div className="space-y-4">
          {data.data.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              photoId={photoId}
              currentUserId={currentUserId}
              isOrganizer={isOrganizer}
              onDelete={(id) => deleteCommentMutation.mutate(id)}
              onReply={(commentId, userName) => setReplyTarget({ commentId, userName })}
            />
          ))}
        </div>
      )}

      {/* 6. Reply input (when replyTarget is set) */}
      {replyTarget && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3">
          <CommentInput
            photoId={photoId}
            parentId={replyTarget.commentId}
            replyingTo={replyTarget.userName}
            onSubmit={() => setReplyTarget(null)}
            onCancel={() => setReplyTarget(null)}
            autoFocus
          />
        </div>
      )}

      {/* 7. New top-level comment input (always shown at bottom when not replying) */}
      {!replyTarget && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3">
          <CommentInput photoId={photoId} onSubmit={() => {}} />
        </div>
      )}
    </div>
  );
}
