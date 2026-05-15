import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Slider } from '../../../components/ui/slider'
import { CircleNotch, Selection, MagnifyingGlassPlus } from '@phosphor-icons/react'

interface SelfieCropModalProps {
  image: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCropComplete: (croppedImage: Blob) => void
  isUploading: boolean
}

const SelfieCropModal = ({ image, open, onOpenChange, onCropComplete, isUploading }: SelfieCropModalProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop)
  }

  const onZoomChange = (zoom: number) => {
    setZoom(zoom)
  }

  const onCropCompleteInternal = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener('load', () => resolve(image))
      image.addEventListener('error', (error) => reject(error))
      image.setAttribute('crossOrigin', 'anonymous')
      image.src = url
    })

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any
  ): Promise<Blob> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('No 2d context')
    }

    // Set canvas size to the cropped area size
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    // Draw the cropped image onto the canvas
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    )

    // As a blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'))
          return
        }
        resolve(blob)
      }, 'image/jpeg', 0.95)
    })
  }

  const handleDone = async () => {
    if (!image || !croppedAreaPixels) return
    try {
      const croppedImage = await getCroppedImg(image, croppedAreaPixels)
      onCropComplete(croppedImage)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] w-[95vw] p-0 overflow-hidden bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 rounded-[32px] shadow-2xl">
        <div className="flex flex-col max-h-[90vh]">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Selection size={24} weight="duotone" className="text-neutral-900 dark:text-neutral-100" />
              Crop your selfie
            </DialogTitle>
            <p className="text-neutral-500 text-xs mt-1">Center your face in the circle for best results.</p>
          </DialogHeader>

          <div className="relative w-full h-[320px] sm:h-[380px] bg-neutral-100 dark:bg-neutral-950 overflow-hidden">
            {image && (
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                minZoom={1}
                maxZoom={3}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={onCropChange}
                onCropComplete={onCropCompleteInternal}
                onZoomChange={onZoomChange}
                classes={{
                  containerClassName: "bg-neutral-100 dark:bg-neutral-950",
                  mediaClassName: "max-w-none"
                }}
              />
            )}
          </div>

          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-400 uppercase tracking-wider">
                <span className="flex items-center gap-2">
                  <MagnifyingGlassPlus size={16} />
                  Zoom Level
                </span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.01}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full appearance-none cursor-pointer accent-neutral-900 dark:accent-neutral-100"
              />
            </div>

            <DialogFooter className="flex flex-row sm:justify-between gap-3 items-center pt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isUploading}
                className="flex-1 rounded-2xl h-12 border-neutral-200 dark:border-neutral-800 font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDone}
                disabled={isUploading}
                className="flex-[1.5] rounded-2xl h-12 bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 font-bold"
              >
                {isUploading ? (
                  <>
                    <CircleNotch size={18} className="animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  'Save & Upload'
                )}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SelfieCropModal
