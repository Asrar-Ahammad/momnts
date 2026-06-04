import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../../components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../../../components/ui/input-otp'
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../components/ui/dialog'
import { QrCode, CaretLeft, Camera, X } from '@phosphor-icons/react'
import { eventsApi, EventData } from '../../../features/events/services/events.api'
import { toast } from 'sonner'
import { useWebHaptics } from 'web-haptics/react'
import { Html5Qrcode } from 'html5-qrcode'
import { motion, AnimatePresence } from 'framer-motion'

interface JoinEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEventJoined: (events: EventData[]) => void
  initialInviteCode?: string
}

/**
 * Extract invite code from a scanned QR value.
 * Supports:
 *   - Full URL: https://…/events?joinCode=ABC123
 *   - Raw 6-char code: ABC123
 */
function extractInviteCode(scannedText: string): string | null {
  // Try URL parse first
  try {
    const url = new URL(scannedText)
    const code = url.searchParams.get('joinCode')
    if (code && code.length === 6) return code.toUpperCase()
  } catch {
    // Not a URL — fall through
  }

  // Fallback: raw 6-char alphanumeric code
  const trimmed = scannedText.trim()
  if (/^[A-Za-z0-9]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase()
  }

  return null
}

export const JoinEventModal = ({ open, onOpenChange, onEventJoined, initialInviteCode = '' }: JoinEventModalProps) => {
  const navigate = useNavigate()
  const [inviteCode, setInviteCode] = useState(initialInviteCode.toUpperCase())
  const [joiningEvent, setJoiningEvent] = useState(false)
  const joiningEventRef = useRef(false)
  const haptic = useWebHaptics()

  // QR Scanner state
  const [showScanner, setShowScanner] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scanHandledRef = useRef(false)
  const scannerContainerId = 'qr-reader-container'

  useEffect(() => {
    if (open && initialInviteCode) {
      setInviteCode(initialInviteCode.toUpperCase())
    }
  }, [open, initialInviteCode])

  // Cleanup scanner when modal closes
  useEffect(() => {
    if (!open) {
      stopScanner()
      setShowScanner(false)
      setScannerError(null)
    }
  }, [open])

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState()
        // State 2 = SCANNING, 3 = PAUSED
        if (state === 2 || state === 3) {
          await scannerRef.current.stop()
        }
      } catch (err) {
        // Ignore stop errors
      }
      try {
        scannerRef.current.clear()
      } catch {
        // Ignore clear errors
      }
      scannerRef.current = null
    }
  }, [])

  const startScanner = useCallback(async () => {
    setScannerError(null)
    scanHandledRef.current = false

    // Small delay to let the DOM render the container
    await new Promise(resolve => setTimeout(resolve, 100))

    const container = document.getElementById(scannerContainerId)
    if (!container) {
      setScannerError('Scanner container not found')
      return
    }

    try {
      const scanner = new Html5Qrcode(scannerContainerId)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1,
        },
        (decodedText) => {
          // Guard: callback fires every frame until camera stops
          if (scanHandledRef.current) return

          const code = extractInviteCode(decodedText)
          if (code) {
            scanHandledRef.current = true
            haptic.trigger("success")
            setInviteCode(code)
            setShowScanner(false)
            stopScanner()
            toast.success('QR code scanned!')
          }
          // Don't toast on every failed frame — just ignore non-matching scans
        },
        () => {
          // QR scan failure callback — ignore (fires every frame without a QR)
        }
      )
    } catch (err) {
      console.error('QR Scanner error:', err)
      const message = err instanceof Error ? err.message : String(err)

      if (message.includes('NotAllowedError') || message.includes('Permission')) {
        setScannerError('Camera permission denied. Please allow camera access and try again.')
      } else if (message.includes('NotFoundError') || message.includes('no camera')) {
        setScannerError('No camera found on this device.')
      } else {
        setScannerError('Could not start the camera. Please try again.')
      }
    }
  }, [haptic, stopScanner])

  // Start/stop scanner when view toggles
  useEffect(() => {
    if (showScanner) {
      startScanner()
    } else {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
  }, [showScanner, startScanner, stopScanner])

  const handleJoinEvent = async () => {
    if (joiningEventRef.current) return
    if (!inviteCode || inviteCode.length !== 6) {
      toast.error('Please enter a valid 6-digit invite code')
      haptic.trigger("error")
      return
    }

    try {
      joiningEventRef.current = true
      setJoiningEvent(true)
      const result = await eventsApi.joinEvent(inviteCode)
      
      if ('status' in result && result.status === 'PENDING') {
        toast.info(result.message || 'Join request sent! Waiting for organizer approval.')
        haptic.trigger("success")
        onOpenChange(false)
        setInviteCode('')
        return
      }

      const event = result as EventData
      toast.success(`Successfully joined ${event.name}!`)
      haptic.trigger("success")
      onOpenChange(false)
      setInviteCode('')
      navigate(`/events/${event.id}`)
      // Refresh events
      const [myEvents, joinedEvents] = await Promise.all([
        eventsApi.getMyEvents(),
        eventsApi.getJoinedEvents()
      ])
      const allEvents = [...myEvents, ...joinedEvents]
      const uniqueEvents = allEvents.filter((event, index, self) =>
        index === self.findIndex((e) => e.id === event.id)
      )
      onEventJoined(uniqueEvents)
    } catch (error) {
      console.error('Failed to join event:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to join event')
      haptic.trigger("error")
    } finally {
      joiningEventRef.current = false
      setJoiningEvent(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    setInviteCode('')
    setShowScanner(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden">
        <AnimatePresence mode="wait">
          {showScanner ? (
            <motion.div
              key="scanner"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {/* Scanner Header */}
              <div className="flex items-center gap-3 mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-full cursor-pointer"
                  onClick={() => setShowScanner(false)}
                >
                  <CaretLeft size={22} weight="bold" />
                </Button>
                <div>
                  <h3 className="text-lg font-bold font-sirage">Scan QR Code</h3>
                  <p className="text-xs text-muted-foreground">Point your camera at an event QR code</p>
                </div>
              </div>

              {/* Scanner Viewport */}
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-square">
                <div id={scannerContainerId} className="w-full h-full" />

                {/* Scanner overlay corners */}
                {!scannerError && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-[220px] h-[220px] relative">
                      {/* Top-left */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-white rounded-tl-lg" />
                      {/* Top-right */}
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-white rounded-tr-lg" />
                      {/* Bottom-left */}
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-white rounded-bl-lg" />
                      {/* Bottom-right */}
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-white rounded-br-lg" />
                    </div>
                  </div>
                )}

                {/* Error State */}
                {scannerError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/90 text-white px-6 text-center gap-3">
                    <Camera size={40} className="text-neutral-400" />
                    <p className="text-sm font-medium">{scannerError}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="rounded-xl mt-2"
                      onClick={() => {
                        stopScanner()
                        startScanner()
                      }}
                    >
                      Try Again
                    </Button>
                  </div>
                )}
              </div>

              <p className="text-xs text-center text-muted-foreground mt-4">
                Or go back to enter the code manually
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="code-entry"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              <DialogHeader>
                <DialogTitle className="text-4xl font-sirage">Join Event</DialogTitle>
                <DialogDescription>
                  Enter the 6-digit invite code to join an event.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-6 py-6">
                <InputOTP
                  maxLength={6}
                  value={inviteCode}
                  onChange={(value: string) => setInviteCode(value.toUpperCase())}
                  pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                  inputMode="text"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>

                {/* QR Scanner Button */}
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
                >
                  <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700 transition-colors">
                    <QrCode size={20} weight="bold" />
                  </div>
                  <span>Scan QR Code instead</span>
                </button>
              </div>
              <DialogFooter>
                <Button className="cursor-pointer" variant="outline" onClick={handleCancel} disabled={joiningEvent}>
                  Cancel
                </Button>
                <Button onClick={handleJoinEvent} disabled={joiningEvent || inviteCode.length !== 6}>
                  {joiningEvent ? 'Joining...' : 'Join Event'}
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
