import { TrashSimple } from "@phosphor-icons/react";
import { formatDistanceToNow } from "date-fns";
import { CommentData } from "../services/comments.api";
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

interface ReplyItemProps {
  reply: CommentData;
  photoId: string;
  currentUserId: string;
  isOrganizer: boolean;
  onDelete: (commentId: string) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ReplyItem({
  reply,
  currentUserId,
  isOrganizer,
  onDelete,
}: ReplyItemProps) {
  const canDelete = currentUserId === reply.user_id || isOrganizer;

  return (
    <div className="flex gap-2.5 relative group">
      {/* Avatar */}
      {reply.user?.selfie_url ? (
        <img 
          src={reply.user.selfie_url} 
          alt={reply.user.name} 
          className="w-7 h-7 rounded-full object-cover shrink-0 select-none"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center text-xs font-semibold shrink-0 select-none">
          {getInitials(reply.user?.name || "User")}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {reply.user?.name}
          </span>
          <span className="text-xs text-neutral-400">
            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-0.5 break-words">
          {reply.text}
        </p>
      </div>

      {/* Delete button */}
      {canDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="absolute top-0 right-0 text-neutral-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
              title="Delete reply"
            >
              <TrashSimple size={14} />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Reply</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this reply? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => onDelete(reply.id)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
