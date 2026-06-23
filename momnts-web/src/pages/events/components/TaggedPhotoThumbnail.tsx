import { useDecryptedPhoto } from "@/features/events/hooks/useDecryptedPhoto"
import { Warning } from "@phosphor-icons/react"

export interface TaggedPhotoThumbnailProps {
  photo: any
  dek: CryptoKey | null
  isFullFill?: boolean
}

export function TaggedPhotoThumbnail({ photo, dek, isFullFill = false }: TaggedPhotoThumbnailProps) {
  const isEncrypted = !!photo.encryption_iv && !!photo.encryption_tag
  const { url: decryptedUrl, error: decryptionError } = useDecryptedPhoto(
    photo.thumb_url,
    photo.encryption_iv || "",
    photo.encryption_tag || "",
    dek
  )

  const displayUrl = isEncrypted ? decryptedUrl : photo.thumb_url

  if (decryptionError) {
    return (
      <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-amber-500">
        <Warning size={16} />
      </div>
    )
  }

  if (isFullFill) {
    return displayUrl ? (
      <img src={displayUrl} alt="Tagged photo" className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full bg-neutral-800 animate-pulse flex items-center justify-center">
        <span className="text-[10px] text-muted-foreground">Decrypting...</span>
      </div>
    )
  }

  return (
    <div className="w-10 h-10 rounded-lg overflow-hidden border border-border relative shrink-0">
      {displayUrl ? (
        <img src={displayUrl} alt="Preview" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-neutral-800 animate-pulse" />
      )}
    </div>
  )
}
