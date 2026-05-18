import { Images, UserCircleDashed } from "@phosphor-icons/react"
import type { ConnectionPerson } from "../services/connections.api"

interface PersonCardProps {
  connection: ConnectionPerson
  onClick: () => void
}

/**
 * Deterministic avatar color from name string.
 */
function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 45%, 42%)`
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export default function PersonCard({ connection, onClick }: PersonCardProps) {
  const { person, shared_photo_count, is_claimed } = connection
  const photoLabel =
    shared_photo_count === 1
      ? "1 photo together"
      : `${shared_photo_count} photos together`

  return (
    <>
      {/* ── Desktop: Photo background card ── */}
      <button
        type="button"
        onClick={onClick}
        className="hidden md:block relative w-full aspect-[3/4] overflow-hidden rounded-2xl cursor-pointer group focus:outline-none"
      >
        {/* Background image or color fallback */}
        {person.selfie_url ? (
          <img
            src={person.selfie_url}
            alt={person.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              backgroundColor: is_claimed
                ? avatarColor(person.name)
                : "rgb(163 163 163)",
            }}
          >
            {is_claimed ? (
              <span className="text-white/60 text-5xl font-bold select-none">
                {getInitials(person.name)}
              </span>
            ) : (
              <UserCircleDashed
                size={64}
                className="text-white/40"
                weight="thin"
              />
            )}
          </div>
        )}

        {/* Bottom gradient overlay — always visible */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Text content — bottom left */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p
            className={`font-semibold text-white truncate text-base ${
              !is_claimed ? "italic opacity-70" : ""
            }`}
          >
            {person.name}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <Images size={14} className="text-white/70" />
            <span className="text-sm text-white/70">{photoLabel}</span>
          </div>
        </div>

        {/* Hover/Focus ring */}
        <div className="absolute inset-0 rounded-2xl ring-0 group-hover:ring-2 group-focus-within:ring-2 ring-white/30 transition-all pointer-events-none" />
      </button>

      {/* ── Mobile: Compact row card ── */}
      <button
        type="button"
        onClick={onClick}
        className="md:hidden w-full bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 p-3 flex items-center gap-3 cursor-pointer transition-colors rounded-xl group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-offset-neutral-800"
      >
        {/* Avatar */}
        {person.selfie_url ? (
          <img
            src={person.selfie_url}
            alt={person.name}
            className="w-12 h-12 rounded-xl object-cover shrink-0"
          />
        ) : is_claimed ? (
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-semibold shrink-0 select-none"
            style={{ backgroundColor: avatarColor(person.name) }}
          >
            {getInitials(person.name)}
          </div>
        ) : (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-neutral-200 dark:bg-neutral-600 shrink-0">
            <UserCircleDashed
              size={24}
              className="text-neutral-400 dark:text-neutral-300"
            />
          </div>
        )}

        {/* Name + count */}
        <div className="flex-1 text-left min-w-0">
          <p
            className={`font-semibold truncate ${
              is_claimed
                ? "text-neutral-900 dark:text-neutral-100"
                : "text-neutral-400 dark:text-neutral-500 italic"
            }`}
          >
            {person.name}
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {photoLabel}
          </p>
        </div>

        {/* Right icon */}
        <div className="flex items-center gap-1 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors shrink-0">
          <Images size={16} />
        </div>
      </button>
    </>
  )
}
