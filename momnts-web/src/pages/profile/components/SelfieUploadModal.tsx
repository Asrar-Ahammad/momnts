import { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import {
  Camera,
  UploadSimple,
  ArrowLeft,
  CircleNotch,
  ArrowCounterClockwise,
  WarningCircle
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface SelfieUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImageSelected: (imageSrc: string) => void
}

const SelfieUploadModal = ({ open, onOpenChange, onImageSelected }: SelfieUploadModalProps) => {
  const [step, setStep] = useState<'choice' | 'camera'>('choice')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isCameraLoading, setIsCameraLoading] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Bind media stream to video element when stream or videoRef becomes available
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream, step])

  // Reset modal state when opened/closed
  useEffect(() => {
    if (open) {
      setStep('choice')
      setCameraError(null)
    } else {
      stopCamera()
    }
  }, [open])

  // Manage camera streaming state when step or facingMode changes
  useEffect(() => {
    if (step === 'camera') {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [step, facingMode])

  // Check if multiple video input devices are available
  useEffect(() => {
    if (step === 'camera') {
      navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
          const videoDevices = devices.filter((device) => device.kind === 'videoinput')
          setHasMultipleCameras(videoDevices.length > 1)
        })
        .catch((err) => {
          console.error('Error enumerating devices:', err)
        })
    }
  }, [step])

  const startCamera = async () => {
    setIsCameraLoading(true)
    setCameraError(null)
    stopCamera() // Ensure clean slate

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 640 },
          aspectRatio: 1
        },
        audio: false
      })
      
      setStream(mediaStream)
    } catch (err: any) {
      console.error('Failed to get camera stream:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access denied. Please enable camera permissions in your browser settings.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.')
      } else {
        setCameraError('Could not access device camera. Please try uploading a file instead.')
      }
    } finally {
      setIsCameraLoading(false)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }

  const handleCapture = () => {
    if (!videoRef.current) return

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    
    // Create square canvas based on video size
    const size = Math.min(video.videoWidth, video.videoHeight) || 640
    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      toast.error('Failed to capture photo')
      return
    }

    // Mirror image if using front camera for natural looking photo
    if (facingMode === 'user') {
      ctx.translate(size, 0)
      ctx.scale(-1, 1)
    }

    // Draw centered square frame from rectangular video stream
    const sx = (video.videoWidth - size) / 2
    const sy = (video.videoHeight - size) / 2
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
    
    stopCamera()
    onImageSelected(dataUrl)
    onOpenChange(false)
  }

  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      onImageSelected(reader.result as string)
      onOpenChange(false)
    }
    reader.readAsDataURL(file)
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] w-[95vw] p-0 overflow-hidden bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 rounded-[32px] shadow-2xl">
        <div className="flex flex-col max-h-[90vh]">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 relative flex flex-row items-center justify-between border-b border-neutral-50 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              {step === 'camera' && (
                <button
                  onClick={() => setStep('choice')}
                  className="p-2 -ml-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  aria-label="Back"
                >
                  <ArrowLeft size={18} weight="bold" />
                </button>
              )}
              <DialogTitle className="text-xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                {step === 'choice' ? (
                  <>
                    <Camera size={24} weight="duotone" />
                    Update Selfie Photo
                  </>
                ) : (
                  <>
                    <Camera size={24} weight="duotone" />
                    Take a Selfie
                  </>
                )}
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* Body Content */}
          <div className="p-6">
            {step === 'choice' && (
              <div className="space-y-4">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mb-6">
                  Select how you would like to upload your profile selfie.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Camera Card Option */}
                  <button
                    onClick={() => setStep('camera')}
                    className="flex flex-col items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-800/40 rounded-[24px] border border-neutral-100 dark:border-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group text-center cursor-pointer"
                  >
                    <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl shadow-sm text-neutral-600 dark:text-neutral-300 mb-4 group-hover:bg-neutral-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-neutral-900 transition-all duration-300">
                      <Camera size={32} weight="duotone" />
                    </div>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200 text-sm mb-1">Use Camera</span>
                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-snug">Snap a new photo now</span>
                  </button>

                  {/* Upload Card Option */}
                  <button
                    onClick={triggerFileSelect}
                    className="flex flex-col items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-800/40 rounded-[24px] border border-neutral-100 dark:border-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group text-center cursor-pointer"
                  >
                    <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl shadow-sm text-neutral-600 dark:text-neutral-300 mb-4 group-hover:bg-neutral-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-neutral-900 transition-all duration-300">
                      <UploadSimple size={32} weight="duotone" />
                    </div>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200 text-sm mb-1">Upload Photo</span>
                    <span className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-snug">Select from library</span>
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            )}

            {step === 'camera' && (
              <div className="flex flex-col items-center justify-center">
                {/* Camera Viewport */}
                <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden bg-neutral-950 dark:bg-neutral-950/80 border-4 border-neutral-100 dark:border-neutral-800 shadow-inner flex items-center justify-center group mb-6 ring-2 ring-neutral-200 dark:ring-neutral-800">
                  
                  {/* Video Streaming */}
                  {step === 'camera' && (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover transition-opacity duration-300 ${isCameraLoading || !stream || cameraError ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                    />
                  )}

                  {/* Circular Overlay Guideline */}
                  {stream && !cameraError && !isCameraLoading && (
                    <div className="absolute inset-0 border-[6px] border-dashed border-white/40 rounded-full pointer-events-none animate-pulse" />
                  )}

                  {/* Loading Spinner */}
                  {isCameraLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 text-neutral-400">
                      <CircleNotch size={32} className="animate-spin mb-2" />
                      <span className="text-xs font-semibold">Starting camera...</span>
                    </div>
                  )}

                  {/* Camera Error Screen */}
                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-neutral-950 text-center text-white">
                      <WarningCircle size={40} className="text-red-500 mb-3" />
                      <p className="text-xs font-semibold leading-relaxed max-w-[200px] mb-4">
                        {cameraError}
                      </p>
                      <Button
                        variant="outline"
                        onClick={startCamera}
                        size="sm"
                        className="rounded-xl border-neutral-800 text-xs h-9 bg-neutral-900 hover:bg-neutral-850 hover:text-white"
                      >
                        Try Again
                      </Button>
                    </div>
                  )}
                </div>

                {/* Shutter & Controls */}
                {!cameraError && !isCameraLoading && (
                  <div className="flex items-center justify-center w-full gap-8">
                    {/* Placeholder space to balance flip camera button */}
                    <div className="w-10 h-10" />

                    {/* Shutter Button */}
                    <button
                      onClick={handleCapture}
                      disabled={!stream}
                      className="w-18 h-18 rounded-full border-4 border-neutral-200 dark:border-neutral-700 bg-transparent flex items-center justify-center p-1 active:scale-95 transition-transform duration-200 cursor-pointer disabled:opacity-50"
                      aria-label="Capture selfie"
                    >
                      <div className="w-full h-full rounded-full bg-red-500 hover:bg-red-650 transition-colors" />
                    </button>

                    {/* Camera Flip Button */}
                    {hasMultipleCameras ? (
                      <button
                        onClick={handleToggleCamera}
                        className="w-10 h-10 rounded-full bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-750 active:scale-90 transition-all cursor-pointer"
                        title="Switch Camera"
                        aria-label="Switch Camera"
                      >
                        <ArrowCounterClockwise size={18} weight="bold" />
                      </button>
                    ) : (
                      <div className="w-10 h-10" />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SelfieUploadModal
