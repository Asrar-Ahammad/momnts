import { useState, useRef, useEffect } from "react";
import { X } from "@phosphor-icons/react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useAddComment } from "../hooks/useComments";
import { Button } from "../../../components/ui/button";

interface CommentInputProps {
  photoId: string;
  parentId?: string;
  replyingTo?: string;
  onSubmit: () => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CommentInput({
  photoId,
  parentId,
  replyingTo,
  onSubmit,
  onCancel,
  autoFocus = false,
}: CommentInputProps) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const addCommentMutation = useAddComment(photoId);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || text.length > 500 || addCommentMutation.isPending) return;

    try {
      await addCommentMutation.mutateAsync({
        text,
        parent_id: parentId,
      });
      setText("");
      onSubmit();
    } catch (err) {
      console.error("Failed to post comment:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (text.trim() && text.length <= 500 && !addCommentMutation.isPending) {
        handleSubmit(e);
      }
    }
  };

  const charLimitWarning = text.length > 480;

  return (
    <div className="flex gap-2.5 items-start">
      {/* Current user initials avatar */}
      {user?.selfie_url ? (
        <img 
          src={user.selfie_url} 
          alt={user.name || "Me"} 
          className="w-8 h-8 rounded-full object-cover shrink-0 select-none"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center text-sm font-semibold shrink-0 select-none">
          {getInitials(user?.name || "Me")}
        </div>
      )}

      {/* Input area */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        {replyingTo && (
          <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/60 px-2 py-1 rounded-md text-xs text-neutral-500 w-fit">
            <span>Replying to <span className="font-semibold text-neutral-700 dark:text-neutral-300">@{replyingTo}</span></span>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X size={12} weight="bold" />
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
            autoFocus={autoFocus}
            className="w-full text-sm bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 text-neutral-900 dark:text-neutral-100 min-h-[40px] max-h-[120px] resize-none overflow-y-auto"
          />

          <div className="flex justify-between items-center">
            {/* Character counter */}
            <span
              className={`text-xs ${
                charLimitWarning
                  ? "text-red-500 font-medium"
                  : text.length > 500
                  ? "text-red-600 font-bold"
                  : "text-neutral-400"
              }`}
            >
              {text.length}/500
            </span>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  className="rounded-lg text-xs"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={!text.trim() || text.length > 500 || addCommentMutation.isPending}
                size="sm"
                className="rounded-lg text-xs font-semibold px-4 cursor-pointer"
              >
                {addCommentMutation.isPending ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
