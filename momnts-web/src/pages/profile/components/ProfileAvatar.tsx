import { User, ShieldCheck, Camera, CameraPlus, CircleNotch } from '@phosphor-icons/react'
import { Tooltip, TooltipTrigger, TooltipContent } from '../../../components/ui/tooltip'
import { useWebHaptics } from 'web-haptics/react'

interface ProfileAvatarProps {
  selfieUrl?: string
  username: string
  isUpdatingSelfie: boolean
  onSelfieClick: () => void
}

const ProfileAvatar = ({ selfieUrl, username, isUpdatingSelfie, onSelfieClick }: ProfileAvatarProps) => {
  const haptic = useWebHaptics()

  return (
    <div className="relative group w-28 h-28 sm:w-32 sm:h-32">
      {/* Avatar circle */}
      <div 
        className="w-full h-full rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border-4 border-white dark:border-neutral-950 shadow-xl relative ring-1 ring-neutral-200/50 dark:ring-neutral-700/50 cursor-pointer"
        onClick={() => { if (!isUpdatingSelfie) { haptic.trigger("medium"); onSelfieClick(); } }}
      >
        {selfieUrl ? (
          <img
            src={selfieUrl}
            alt={username}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-50 dark:bg-neutral-800 text-neutral-300 dark:text-neutral-600">
            <User size={48} weight="duotone" />
          </div>
        )}

        {/* Hover overlay for camera (Desktop) / Loading state */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-300 ${
          isUpdatingSelfie
            ? 'opacity-100 bg-black/60 z-20'
            : 'opacity-0 group-hover:opacity-100 bg-black/40'
        }`}>
          {isUpdatingSelfie ? (
            <CircleNotch size={24} className="animate-spin text-white" />
          ) : (
            <CameraPlus size={28} weight="fill" className="text-white drop-shadow-md hidden sm:block" />
          )}
        </div>
      </div>

      {/* Mobile edit badge (since there's no hover) */}
      {!isUpdatingSelfie && (
        <div className="absolute bottom-1 right-1 sm:hidden bg-black/60 backdrop-blur-md text-white p-1.5 rounded-full shadow-lg border border-white/20 pointer-events-none z-10">
          <CameraPlus size={14} weight="fill" />
        </div>
      )}
    </div>
  )
}

export default ProfileAvatar
