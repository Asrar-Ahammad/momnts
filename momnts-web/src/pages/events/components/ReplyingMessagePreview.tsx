import { useState, useEffect } from "react"
import { ChatMessageData } from "@/features/chats/services/chats.api"
import { decryptTextMessage } from "@/lib/crypto/e2ee"

export interface ReplyingMessagePreviewProps {
  msg: ChatMessageData
  dek: CryptoKey | null
  hasPhotoLayout?: boolean
}

export function ReplyingMessagePreview({ msg, dek, hasPhotoLayout = false }: ReplyingMessagePreviewProps) {
  const [decryptedText, setDecryptedText] = useState("")
  const [decrypting, setDecrypting] = useState(true)

  useEffect(() => {
    let active = true
    const decrypt = async () => {
      if (!dek) {
        setDecrypting(false)
        setDecryptedText("")
        return
      }
      try {
        setDecrypting(true)
        const text = await decryptTextMessage(msg.message_text, msg.encryption_iv, msg.encryption_tag, dek)
        if (active) {
          setDecryptedText(text)
        }
      } catch (err) {
        console.error("Failed to decrypt reply preview:", err)
      } finally {
        if (active) {
          setDecrypting(false)
        }
      }
    }
    decrypt()
    return () => {
      active = false
    }
  }, [msg.message_text, msg.encryption_iv, msg.encryption_tag, dek])

  if (decrypting) {
    return <p className={hasPhotoLayout ? "text-[13px] text-muted-foreground italic truncate" : "text-xs text-muted-foreground italic truncate"}>Decrypting...</p>
  }

  if (hasPhotoLayout) {
    return (
      <p className="text-[13px] text-zinc-300 truncate leading-snug">
        {decryptedText || (msg.photos && msg.photos.length > 0 ? "Tagged Photo" : "Encrypted message")}
      </p>
    )
  }

  return (
    <p className="text-xs text-muted-foreground truncate leading-snug">
      {decryptedText || (msg.photos && msg.photos.length > 0 ? `📷 Tagged Photo${msg.photos.length === 1 ? "" : "s"}` : "Encrypted message")}
    </p>
  )
}
