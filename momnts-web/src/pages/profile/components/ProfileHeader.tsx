import { useState } from 'react'
import { PencilSimple, Check, X, CheckCircle, WarningCircle, Lightning, CircleNotch, ShieldCheck } from '@phosphor-icons/react'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '../../../components/ui/tooltip'
import { useWebHaptics } from 'web-haptics/react'

interface ProfileHeaderProps {
  username: string
  email: string
  emailVerified: boolean
  memberSince: string
  hasSelfie: boolean
  isPro: boolean
  isEditingName: boolean
  editName: string
  isUpdatingName: boolean
  onStartEditingName: () => void
  onCancelEditingName: () => void
  onSaveName: () => void
  onEditNameChange: (name: string) => void
  onNavigatePricing: () => void
}

const ProfileHeader = ({
  username,
  email,
  emailVerified,
  memberSince,
  hasSelfie,
  isPro,
  isEditingName,
  editName,
  isUpdatingName,
  onStartEditingName,
  onCancelEditingName,
  onSaveName,
  onEditNameChange,
  onNavigatePricing,
}: ProfileHeaderProps) => {
  const haptic = useWebHaptics()

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      day: 'numeric'
    })
  }

  return (
    <div className="flex-1 min-w-0 space-y-2.5">
      {/* Name Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {isEditingName ? (
          <div className="flex items-center gap-2 w-full max-w-sm">
            <Input
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              className="h-9 text-lg font-semibold rounded-xl flex-1 min-w-0"
              disabled={isUpdatingName}
              maxLength={50}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveName()
                if (e.key === 'Escape') onCancelEditingName()
              }}
            />
            <Button
              size="sm"
              onClick={onSaveName}
              disabled={isUpdatingName || !editName.trim()}
              className="rounded-xl h-9 w-9 p-0"
            >
              {isUpdatingName ? (
                <CircleNotch size={16} className="animate-spin" />
              ) : (
                <Check size={16} weight="bold" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancelEditingName}
              disabled={isUpdatingName}
              className="rounded-xl h-9 w-9 p-0"
            >
              <X size={16} weight="bold" />
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 capitalize truncate flex items-center gap-1.5">
              {username}
              {hasSelfie && (
                <Tooltip>
                  <TooltipTrigger delay={0} render={<span className="inline-flex mt-0.5" />}>
                    <ShieldCheck size={20} weight="fill" className="text-emerald-500 shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent>Face verified</TooltipContent>
                </Tooltip>
              )}
            </h1>
            <button
              onClick={onStartEditingName}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-neutral-300 transition-colors cursor-pointer opacity-70 hover:opacity-100"
              aria-label="Edit name"
            >
              <PencilSimple size={14} weight="bold" />
            </button>
            <button
              onClick={onNavigatePricing}
              className={`ml-auto sm:ml-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                isPro
                  ? 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-500/20'
                  : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {isPro ? (
                <span className="flex items-center gap-1">
                  <Lightning size={12} weight="fill" /> Pro
                </span>
              ) : (
                'Free'
              )}
            </button>
          </>
        )}
      </div>

      {/* Email + Member Since */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
          <span className="truncate">{email}</span>
          {emailVerified ? (
            <Tooltip>
              <TooltipTrigger delay={0} render={<span className="inline-flex" />}>
                <CheckCircle size={16} weight="fill" className="text-emerald-500/80 shrink-0" />
              </TooltipTrigger>
              <TooltipContent>Email verified</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger delay={0} render={<span className="inline-flex" />}>
                <WarningCircle size={16} weight="fill" className="text-amber-500/80 shrink-0" />
              </TooltipTrigger>
              <TooltipContent>Email not verified</TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="text-xs text-neutral-400/80 dark:text-neutral-500/80">
          Member since {formatDate(memberSince)}
        </p>
      </div>
    </div>
  )
}

export default ProfileHeader
