import { useState, useEffect } from "react";
import { ChatCircleDots, WarningCircle } from "@phosphor-icons/react";
import { useComments, useDeleteComment } from "../hooks/useComments";
import { CommentItem } from "./CommentItem";
import { CommentInput } from "./CommentInput";
import { Skeleton } from "../../../components/ui/skeleton";
import { Badge } from "../../../components/ui/badge";

interface CommentsSectionProps {
  photoId: string;
  eventId?: string;
  currentUserId: string;
  isOrganizer: boolean;
  hideHeader?: boolean;
  highlightCommentId?: string;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onFocusInput?: () => void;
}

export function CommentsSection({
  photoId,
  eventId,
  currentUserId,
  isOrganizer,
  hideHeader = false,
  highlightCommentId,
  onScroll,
  onFocusInput,
}: CommentsSectionProps) {
  const [replyTarget, setReplyTarget] = useState<{ commentId: string; userName: string } | null>(null);

  // Reset reply target when changing photos
  useEffect(() => {
    setReplyTarget(null);
  }, [photoId]);

  const { data, isLoading, error } = useComments(photoId);
  const deleteCommentMutation = useDeleteComment(photoId);

  const totalComments = data?.total ?? 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 1. Section header */}
      {!hideHeader && (
        <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2 px-6 pt-4 shrink-0">
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

      {/* Comments list container (Scrollable) */}
      <div
        onScroll={onScroll}
        className="flex-1 overflow-y-auto p-6 custom-scrollbar text-neutral-200 dark pt-4 space-y-4"
      >
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
                highlightCommentId={highlightCommentId}
                onDelete={(id) => deleteCommentMutation.mutate(id)}
                onReply={(commentId, userName) => setReplyTarget({ commentId, userName })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sticky Comment Input Footer */}
      <div className="border-t border-neutral-100 dark:border-neutral-900 p-4 bg-neutral-950 shrink-0">
        {/* 6. Reply input (when replyTarget is set) */}
        {replyTarget ? (
          <CommentInput
            photoId={photoId}
            eventId={eventId}
            parentId={replyTarget.commentId}
            replyingTo={replyTarget.userName}
            onSubmit={() => setReplyTarget(null)}
            onCancel={() => setReplyTarget(null)}
            autoFocus
            onFocus={onFocusInput}
          />
        ) : (
          /* 7. New top-level comment input (always shown at bottom when not replying) */
          <CommentInput
            photoId={photoId}
            eventId={eventId}
            onSubmit={() => {}}
            onFocus={onFocusInput}
          />
        )}
      </div>
    </div>
  );
}
