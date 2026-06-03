import { useState, useRef, useEffect } from "react";
import { ChatCircle, TrashSimple } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { CommentData } from "../services/comments.api";
import { ReplyItem } from "./ReplyItem";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../components/ui/alert-dialog";
import { useWebHaptics } from "web-haptics/react";

interface CommentItemProps {
  comment: CommentData;
  photoId: string;
  currentUserId: string;
  isOrganizer: boolean;
  highlightCommentId?: string;
  onDelete: (commentId: string) => void;
  onReply: (commentId: string, userName: string) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CommentItem({
  comment,
  photoId,
  currentUserId,
  isOrganizer,
  highlightCommentId,
  onDelete,
  onReply,
}: CommentItemProps) {
  const haptic = useWebHaptics();
  const [showReplies, setShowReplies] = useState(true);
  const [, setShowReplyInput] = useState(false); // Declared state as requested

  const ref = useRef<HTMLDivElement>(null);
  const isHighlighted = comment.id === highlightCommentId;

  useEffect(() => {
    if (isHighlighted && ref.current) {
      const timer = setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted, highlightCommentId]);

  const canDelete = currentUserId === comment.user_id || isOrganizer;
  const hasReplies = comment.replies && comment.replies.length > 0;

  const handleReplyClick = () => {
    haptic.trigger("light");
    setShowReplyInput(true);
    onReply(comment.id, comment.user?.name || "User");
  };

  return (
    <div ref={ref} className={`mb-4 rounded-xl p-1.5 transition-all duration-1000 ${isHighlighted ? "bg-amber-500/10 ring-1 ring-amber-500/30" : ""}`}>
      {/* Top section: Main comment itself */}
      <div className="flex gap-2.5 relative group">
        {/* Avatar */}
        {comment.user?.selfie_url ? (
          <img 
            src={comment.user.selfie_url} 
            alt={comment.user.name} 
            className="w-8 h-8 rounded-full object-cover shrink-0 select-none"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center text-sm font-semibold shrink-0 select-none">
            {getInitials(comment.user?.name || "User")}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {comment.user?.name}
            </span>
            <span className="text-xs text-neutral-400">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
          </div>

          <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-0.5 break-words">
            {comment.text}
          </p>

          {/* Action Row */}
          <div className="flex items-center gap-4 mt-2">
            {/* Reply Button */}
            <button
              type="button"
              onClick={handleReplyClick}
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
            >
              <ChatCircle size={14} />
              <span>Reply</span>
            </button>

            {/* Replies Toggle */}
            {hasReplies && (
              <button
                type="button"
                onClick={() => setShowReplies((prev) => !prev)}
                className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
              >
                {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
              </button>
            )}

          </div>
        </div>

        {/* Delete Button (top right trash icon) */}
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="absolute top-0 right-0 text-neutral-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                title="Delete comment"
              >
                <TrashSimple size={14} />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this comment? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => haptic.trigger("light")}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => {
                    haptic.trigger("warning");
                    onDelete(comment.id);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Replies section */}
      {showReplies && hasReplies && (
        <div className="ml-10 border-l-2 border-neutral-100 dark:border-neutral-800 pl-3 mt-2 space-y-3">
          {comment.replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              photoId={photoId}
              currentUserId={currentUserId}
              isOrganizer={isOrganizer}
              highlightCommentId={highlightCommentId}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
