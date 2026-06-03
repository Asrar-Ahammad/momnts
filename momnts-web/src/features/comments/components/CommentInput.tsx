import { useState, useRef, useEffect } from "react";
import { X, Crown } from "@phosphor-icons/react";
import { useAuth } from "../../auth/hooks/useAuth";
import { useAddComment } from "../hooks/useComments";
import { Button } from "../../../components/ui/button";
import { useEventAttendees } from "../../events/hooks/useEvents";
import { useWebHaptics } from "web-haptics/react";

interface CommentInputProps {
  photoId: string;
  eventId?: string;
  parentId?: string;
  replyingTo?: string;
  onSubmit: () => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  onFocus?: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CommentInput({
  photoId,
  eventId,
  parentId,
  replyingTo,
  onSubmit,
  onCancel,
  autoFocus = false,
  onFocus,
}: CommentInputProps) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const addCommentMutation = useAddComment(photoId);
  const haptic = useWebHaptics();
  const hasTriggeredWarningRef = useRef(false);

  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [mentionState, setMentionState] = useState<{ query: string; startIdx: number; endIdx: number } | null>(null);

  const { data: attendees = [] } = useEventAttendees(eventId);

  // Filter attendees list based on search query inside the @mention trigger
  const filteredAttendees = (mentionState && eventId)
    ? attendees.filter((a: any) => {
        const name = a.user?.name || "";
        return name.toLowerCase().includes(mentionState.query.toLowerCase());
      })
    : [];

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const getMentionQuery = (val: string, cursorIndex: number) => {
    const textBeforeCursor = val.slice(0, cursorIndex);
    const lastAtIdx = textBeforeCursor.lastIndexOf("@");
    if (lastAtIdx === -1) return null;

    const isAtWordStart = lastAtIdx === 0 || /\s/.test(textBeforeCursor[lastAtIdx - 1]);
    if (!isAtWordStart) return null;

    const segment = textBeforeCursor.slice(lastAtIdx);
    if (segment.includes("\n")) return null;

    const query = segment.slice(1);
    if (query.startsWith(" ") || query.length > 30) return null;

    return {
      query,
      startIdx: lastAtIdx,
      endIdx: cursorIndex,
    };
  };

  const handleTextChangeOrCursorMove = (val: string, cursorIndex: number, preserveIndex = false) => {
    const state = getMentionQuery(val, cursorIndex);
    setMentionState(state);
    if (state && !preserveIndex) {
      setActiveSuggestionIndex(0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    handleTextChangeOrCursorMove(val, e.target.selectionStart);

    // Haptic warning limit trigger (480 limit)
    if (val.length >= 480) {
      if (!hasTriggeredWarningRef.current) {
        haptic.trigger("warning");
        hasTriggeredWarningRef.current = true;
      }
    } else {
      hasTriggeredWarningRef.current = false;
    }
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) {
      const preserveIndex = ["ArrowUp", "ArrowDown"].includes(e.key);
      handleTextChangeOrCursorMove(text, e.currentTarget.selectionStart, preserveIndex);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    handleTextChangeOrCursorMove(text, e.currentTarget.selectionStart);
  };

  const selectAttendee = (attendee: any) => {
    if (!mentionState) return;
    const name = attendee.user?.name || "";
    const before = text.slice(0, mentionState.startIdx);
    const after = text.slice(mentionState.endIdx);
    const newText = `${before}@${name} ${after}`;
    setText(newText);
    setMentionState(null);

    // Keep trigger warning check up to date if mention pushes length >= 480
    if (newText.length >= 480) {
      if (!hasTriggeredWarningRef.current) {
        haptic.trigger("warning");
        hasTriggeredWarningRef.current = true;
      }
    } else {
      hasTriggeredWarningRef.current = false;
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = mentionState.startIdx + name.length + 2; // '@' + name + ' '
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedText = text.trim();
    if (!trimmedText || text.length > 500 || addCommentMutation.isPending) return;

    try {
      await addCommentMutation.mutateAsync({
        text: trimmedText,
        parent_id: parentId,
      });
      haptic.trigger("success");
      setText("");
      onSubmit();
    } catch (err) {
      haptic.trigger("error");
      console.error("Failed to post comment:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionState && filteredAttendees.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev + 1) % filteredAttendees.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestionIndex(
          (prev) => (prev - 1 + filteredAttendees.length) % filteredAttendees.length
        );
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        selectAttendee(filteredAttendees[activeSuggestionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionState(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
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
            <span>
              Replying to{" "}
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                @{replyingTo}
              </span>
            </span>
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-2 relative">
          {/* Mentions dropdown list */}
          {mentionState && filteredAttendees.length > 0 && (
            <div className="absolute bottom-full left-0 mb-2 w-full max-h-48 overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl z-50 p-1 flex flex-col gap-0.5 custom-scrollbar">
              {filteredAttendees.map((attendee: any, index: number) => {
                const isSelected = index === activeSuggestionIndex;
                return (
                  <button
                    key={attendee.id}
                    type="button"
                    onClick={() => selectAttendee(attendee)}
                    onMouseEnter={() => setActiveSuggestionIndex(index)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm cursor-pointer transition-colors w-full ${
                      isSelected
                        ? "bg-neutral-850 text-white border border-neutral-700/50"
                        : "text-neutral-300 hover:bg-neutral-800/50 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {attendee.user?.selfie_url ? (
                        <img
                          src={attendee.user.selfie_url}
                          alt={attendee.user.name}
                          className="w-6 h-6 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-400 flex items-center justify-center text-xs font-semibold shrink-0">
                          {getInitials(attendee.user?.name || "?")}
                        </div>
                      )}
                      <span className="font-medium capitalize">{attendee.user?.name}</span>
                    </div>
                    {attendee.role === "ORGANIZER" && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                        <Crown size={10} weight="fill" />
                        Organizer
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onMouseUp={handleMouseUp}
            onFocus={onFocus}
            placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
            autoFocus={autoFocus}
            className="w-full text-sm bg-transparent border border-neutral-200 dark:border-neutral-800 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-600 text-neutral-900 dark:text-neutral-100 min-h-[40px] max-h-[120px] resize-none overflow-y-auto"
          />

          <div className="flex justify-between items-center">
            {/* Tooltip hint instruction */}
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
              Type @ to mention event attendees
            </span>

            {/* Actions */}
            <div className="flex items-center gap-2">
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
