import { useState, useEffect } from "react"
import { ChatMessageParent } from "@/features/chats/services/chats.api"
import { decryptTextMessage } from "@/lib/crypto/e2ee"

export interface ParentMessageTextProps {
  parentMsg: ChatMessageParent
  dek: CryptoKey | null
}

export function ParentMessageText({ parentMsg, dek }: ParentMessageTextProps) {
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
        const text = await decryptTextMessage(parentMsg.message_text, parentMsg.encryption_iv, parentMsg.encryption_tag, dek)
        if (active) {
          setDecryptedText(text)
        }
      } catch (err) {
        console.error("Failed to decrypt parent quote text:", err)
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
  }, [parentMsg.message_text, parentMsg.encryption_iv, parentMsg.encryption_tag, dek])

  if (decrypting) {
    return <span className="italic opacity-60">Decrypting...</span>
  }

  return <span className="opacity-80 line-clamp-1 break-all">{decryptedText || "Encrypted message"}</span>
}
