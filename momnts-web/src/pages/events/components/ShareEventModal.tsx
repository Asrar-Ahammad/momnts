import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { DownloadSimple, ShareNetwork, WhatsappLogo, TwitterLogo, TelegramLogo, FacebookLogo, LinkSimple } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { EventData } from '../../../features/events/services/events.api'

interface ShareEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: EventData | null
}

const ShareEventModal = ({ open, onOpenChange, event }: ShareEventModalProps) => {
  const qrRef = useRef<SVGSVGElement>(null)

  if (!event) return null

  const inviteUrl = `${window.location.origin}/events?joinCode=${event.invite_code}`
  const shareText = `Join "${event.name}" on Momnts!`

  // Handle native Web Share API for Links
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Momnts Event',
          text: shareText,
          url: inviteUrl,
        })
        toast.success('Event shared successfully')
      } catch (err) {
        // user cancelled or share failed, silently ignore cancellation
        console.error('Error sharing', err)
      }
    } else {
      toast.info('Native sharing is not supported on this device.')
    }
  }

  // Handle downloading QR code as PNG
  const handleDownloadQR = () => {
    const svg = qrRef.current
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      // Create white background
      canvas.width = img.width + 40
      canvas.height = img.height + 40
      if (ctx) {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 20, 20)
        
        const pngFile = canvas.toDataURL('image/png')
        const downloadLink = document.createElement('a')
        downloadLink.download = `momnts-event-${event.invite_code}-qr.png`
        downloadLink.href = pngFile
        downloadLink.click()
      }
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  // Handle native sharing of the QR code image itself
  const handleShareQRImage = async () => {
    if (!navigator.share) {
      toast.error('Native sharing not supported.')
      return
    }

    const svg = qrRef.current
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = async () => {
      canvas.width = img.width + 40
      canvas.height = img.height + 40
      if (ctx) {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 20, 20)

        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `momnts-${event.invite_code}-qr.png`, { type: 'image/png' })
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              try {
                await navigator.share({
                  files: [file],
                  title: 'Event QR Code',
                  text: shareText,
                })
                toast.success('QR shared successfully')
              } catch (err) {
                console.error(err)
              }
            } else {
              toast.info("Your browser doesn't support sharing images directly.")
            }
          }
        }, 'image/png')
      }
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      toast.success('Invite link copied!')
    } catch (err) {
      toast.error('Failed to copy invite link')
    }
  }

  // Social Links
  const socialLinks = [
    {
      name: 'WhatsApp',
      icon: <WhatsappLogo size={24} weight="fill" />,
      color: 'bg-[#25D366] hover:bg-[#20bd5a] text-white',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + inviteUrl)}`
    },
    {
      name: 'Twitter',
      icon: <TwitterLogo size={24} weight="fill" />,
      color: 'bg-black hover:bg-neutral-800 text-white',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(inviteUrl)}`
    },
    {
      name: 'Telegram',
      icon: <TelegramLogo size={24} weight="fill" />,
      color: 'bg-[#0088cc] hover:bg-[#007ab8] text-white',
      url: `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(shareText)}`
    },
    {
      name: 'Facebook',
      icon: <FacebookLogo size={24} weight="fill" />,
      color: 'bg-[#1877F2] hover:bg-[#166fe5] text-white',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}`
    }
  ]

  // Check if native sharing is available for the UI
  const canNativeShare = !!navigator.share

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 overflow-y-auto max-h-[90vh]">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-bold font-sirage text-center capitalize">Share Event</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-8">
          
          {/* QR Code Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-4 rounded-3xl shadow-lg ring-1 ring-black/5 dark:ring-white/10 relative group">
              <QRCodeSVG
                value={inviteUrl}
                size={200}
                level="H"
                includeMargin={false}
                ref={qrRef}
                className="rounded-xl"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button onClick={handleDownloadQR} variant="secondary" className="rounded-xl flex-1 px-6 shadow-sm">
                <DownloadSimple size={18} className="mr-2" />
                Save QR
              </Button>
              {canNativeShare && (
                <Button onClick={handleShareQRImage} className="rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm">
                  <ShareNetwork size={18} className="mr-2" />
                  Share QR
                </Button>
              )}
            </div>
          </div>

          <div className="w-full h-px bg-neutral-100 dark:bg-neutral-800" />

          {/* Share Links Section */}
          <div className="w-full space-y-4">
            <h3 className="text-sm font-semibold text-neutral-500 text-center uppercase tracking-wider">
              Share Link
            </h3>

            {/* Native share button for mobile mostly */}
            {canNativeShare ? (
              <Button onClick={handleNativeShare} className="w-full h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white shadow-md transition-all group">
                <ShareNetwork size={20} className="mr-2 group-hover:scale-110 transition-transform" weight="bold" />
                <span className="font-semibold text-base">Share via...</span>
              </Button>
            ) : (
              <Button onClick={handleCopyLink} variant="outline" className="w-full h-12 rounded-2xl border-neutral-200 dark:border-neutral-800 shadow-sm transition-all group">
                <LinkSimple size={20} className="mr-2 group-hover:scale-110 transition-transform text-neutral-500" />
                <span className="font-semibold text-base">Copy Link</span>
              </Button>
            )}

            {/* Social Grid (More relevant on desktop or when native share is limited) */}
            <div className="grid grid-cols-4 gap-3 pt-2">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-transform hover:scale-105 active:scale-95 ${social.color} shadow-sm`}
                  title={`Share on ${social.name}`}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ShareEventModal
