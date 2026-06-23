import React from "react"
import { ChatMessageParent } from "@/features/chats/services/chats.api"
import { TaggedPhotoThumbnail } from "./TaggedPhotoThumbnail"
import { ParentMessageText } from "./ParentMessageText"

export interface ParentMessageQuoteProps {
  parent: ChatMessageParent
  dek: CryptoKey | null
  isSelf: boolean
}

export function ParentMessageQuote({ parent, dek, isSelf }: ParentMessageQuoteProps) {
  const hasParentPhoto = parent.photos && parent.photos.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = document.getElementById(`msg-${parent.id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-primary/20", "dark:bg-primary/30");
      setTimeout(() => {
        el.classList.remove("bg-primary/20", "dark:bg-primary/30");
      }, 1500);
    }
  };

  if (hasParentPhoto) {
    return (
      <div
        onClick={handleClick}
        className={`mb-2 p-1.5 rounded-lg text-[11px] cursor-pointer select-none transition-colors border-l-4 flex items-center gap-2.5 bg-current/10 hover:bg-current/15 w-full min-w-[200px] ${
          isSelf ? "border-l-current/70 text-current/80" : "border-l-primary text-current/80"
        }`}
      >
        <div className="shrink-0 w-8 h-8 rounded-md overflow-hidden bg-neutral-800/20">
          <TaggedPhotoThumbnail photo={parent.photos[0]} dek={dek} isFullFill={true} />
        </div>
        <div className="flex flex-col min-w-0 text-left">
          <span className={`font-bold text-[11px] leading-tight ${isSelf ? "text-current" : "text-primary"}`}>
            {parent.user?.name || "Guest"}
          </span>
          <div className="text-[11px] leading-tight truncate mt-0.5 opacity-90">
            <ParentMessageText parentMsg={parent} dek={dek} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`mb-2 p-2 rounded-lg text-[11px] cursor-pointer select-none transition-colors border-l-[3px] flex flex-col gap-0.5 bg-current/10 hover:bg-current/15 ${isSelf
          ? "text-current/80 border-l-current/70"
          : "text-current/80 border-l-primary"
        }`}
    >
      <span className={`font-bold text-[10px] leading-none ${isSelf ? "text-current" : "text-primary"}`}>
        {parent.user?.name || "Guest"}
      </span>
      <ParentMessageText parentMsg={parent} dek={dek} />
    </div>
  );
}
