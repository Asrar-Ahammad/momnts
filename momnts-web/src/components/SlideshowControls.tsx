import React from 'react'
import { motion } from 'framer-motion'
import {
  Play,
  Pause,
  Clock,
  MusicNotes,
  SpeakerHigh,
  SpeakerSlash,
  SquaresFour,
  CaretDown,
} from '@phosphor-icons/react'
import { PhotoData } from '../features/events/services/photos.api'
import { cn } from '../lib/utils'
import { Slider } from './ui/slider'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

interface SlideshowControlsProps {
  showControls: boolean
  showThumbnails: boolean
  setShowThumbnails: React.Dispatch<React.SetStateAction<boolean>>
  currentIndex: number
  photos: PhotoData[]
  isSlideshowPlaying: boolean
  setIsSlideshowPlaying: React.Dispatch<React.SetStateAction<boolean>>
  speed: number
  setSpeed: React.Dispatch<React.SetStateAction<number>>
  currentTrack: string
  setCurrentTrack: React.Dispatch<React.SetStateAction<string>>
  musicTracks: { id: string; name: string; url: string }[]
  isMuted: boolean
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>
  volume: number
  setVolume: React.Dispatch<React.SetStateAction<number>>
  resetControlsTimer: () => void
  children?: React.ReactNode
}

export const SlideshowControls = ({
  showControls,
  showThumbnails,
  setShowThumbnails,
  currentIndex,
  photos,
  isSlideshowPlaying,
  setIsSlideshowPlaying,
  speed,
  setSpeed,
  currentTrack,
  setCurrentTrack,
  musicTracks,
  isMuted,
  setIsMuted,
  volume,
  setVolume,
  resetControlsTimer,
  children
}: SlideshowControlsProps) => {
  return (
    <motion.div
      animate={{ y: showControls ? 0 : 180, opacity: showControls ? 1 : 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 28 }}
      className={cn(
        "absolute bottom-0 inset-x-0 z-40 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-10 md:pt-16 pb-6 md:pb-8 px-4 md:px-8 space-y-4 md:space-y-6",
        showControls ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      {/* Thumbnail strip */}
      {children}

      {/* Bottom HUD bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 pt-2 border-t border-white/5 w-full">

        {/* Left side: Position indicator & options */}
        <div className="flex items-center justify-center md:justify-start gap-3 md:gap-4 w-full md:w-auto">
          <div className="bg-white/5 border border-white/10 rounded-full px-2.5 py-1 md:px-3 md:py-1.5 text-[10px] md:text-[11px] text-white font-mono tracking-wider">
            {currentIndex + 1} / {photos.length}
          </div>
          <button
            onClick={() => {
              setShowThumbnails((prev) => !prev)
              resetControlsTimer()
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full transition-all cursor-pointer text-white text-[11px]"
            title={showThumbnails ? "Hide Thumbnails" : "Show Thumbnails"}
          >
            <SquaresFour size={14} weight={showThumbnails ? "fill" : "regular"} />
            <CaretDown
              size={11}
              className={cn(
                "transition-transform duration-300",
                showThumbnails ? "rotate-180 text-white" : "text-neutral-400"
              )}
            />
          </button>
        </div>

        {/* Center Side: Media & Slideshow controls */}
        <div className="flex items-center justify-center gap-4 md:gap-5 w-full md:w-auto">
          {/* Play/Pause Slideshow */}
          <button
            onClick={() => {
              setIsSlideshowPlaying((prev) => !prev)
              resetControlsTimer()
            }}
            className="p-3 md:p-4 bg-white text-black hover:scale-105 active:scale-95 rounded-full transition-all shadow-xl cursor-pointer"
            title={isSlideshowPlaying ? 'Pause Slideshow' : 'Play Slideshow'}
          >
            {isSlideshowPlaying ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
          </button>

          <div className="h-5 w-px bg-white/10 mx-1" />

          {/* Slideshow Speed dropdown */}
          <Select
            value={String(speed)}
            onValueChange={(val) => {
              setSpeed(Number(val))
              resetControlsTimer()
            }}
          >
            <SelectTrigger className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1 md:px-3.5 md:py-1.5 h-auto text-white cursor-pointer select-none text-[10px] md:text-[11px] min-w-[70px] focus:ring-0 focus:ring-offset-0 focus:border-white/20 hover:bg-white/10 transition-all [&_svg]:size-3 [&_svg:last-child]:text-white/40 [&_svg:last-child]:ml-0.5">
              <Clock size={12} className="text-neutral-400 shrink-0" />
              <span className="font-medium">{speed / 1000}s</span>
            </SelectTrigger>
            <SelectContent className="bg-neutral-950 border border-white/10 text-white min-w-[80px] rounded-xl z-[9999] shadow-2xl">
              <SelectGroup>
                <SelectItem value="2000" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white rounded-lg cursor-pointer text-[10px] md:text-[11px] py-1.5">2s</SelectItem>
                <SelectItem value="3000" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white rounded-lg cursor-pointer text-[10px] md:text-[11px] py-1.5">3s</SelectItem>
                <SelectItem value="5000" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white rounded-lg cursor-pointer text-[10px] md:text-[11px] py-1.5">5s</SelectItem>
                <SelectItem value="8000" className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white rounded-lg cursor-pointer text-[10px] md:text-[11px] py-1.5">8s</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Right Side: Background Music controls & visualizer */}
        <div className="flex items-center justify-center md:justify-end gap-3 md:gap-4 w-full md:w-auto">

          {/* CSS Dancing Visualizer bar graphic */}
          <div className="flex items-end gap-[3px] h-6 px-1" title="Audio Visualizer">
            {[1, 2, 3, 4, 5].map((bar) => (
              <span
                key={bar}
                className={cn(
                  "w-[2.5px] bg-white rounded-full transition-all duration-300",
                  isSlideshowPlaying ? "animate-audio-bar" : "h-[3px] w-[2.5px]"
                )}
                style={{
                  animationDelay: `${bar * 0.15}s`,
                  height: isSlideshowPlaying ? 'auto' : '3px'
                }}
              />
            ))}
          </div>

          {/* Track Selector */}
          <Select
            value={currentTrack}
            onValueChange={(val) => {
              setCurrentTrack(val)
              setIsSlideshowPlaying(true)
              resetControlsTimer()
            }}
          >
            <SelectTrigger className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2.5 py-1 md:px-3 md:py-1.5 h-auto text-white cursor-pointer select-none text-[10px] md:text-[11px] max-w-[125px] md:max-w-[160px] focus:ring-0 focus:ring-offset-0 focus:border-white/20 hover:bg-white/10 transition-all [&_svg]:size-3 [&_svg:last-child]:text-white/40 [&_svg:last-child]:ml-0.5">
              <MusicNotes size={12} className="text-neutral-400 shrink-0" />
              <SelectValue placeholder="Select Track" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-950 border border-white/10 text-white min-w-[160px] rounded-xl z-[9999] shadow-2xl">
              <SelectGroup>
                {musicTracks.map((track) => (
                  <SelectItem
                    key={track.id}
                    value={track.id}
                    className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white rounded-lg cursor-pointer text-[10px] md:text-[11px] py-1.5"
                  >
                    {track.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Mute button */}
          <button
            onClick={() => {
              setIsMuted((prev) => !prev)
              resetControlsTimer()
            }}
            className="p-1.5 md:p-2 bg-white/5 text-neutral-400 hover:text-white border border-white/10 rounded-full transition-colors cursor-pointer"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <SpeakerSlash size={13} weight="bold" /> : <SpeakerHigh size={13} weight="bold" />}
          </button>

          {/* Volume Slider */}
          <div className="w-12 md:w-16 flex items-center" title="Volume">
            <Slider
              value={[typeof volume === 'number' && isFinite(volume) ? volume : 0.4]}
              onValueChange={(val) => {
                const nextVol = Array.isArray(val) ? val[0] : val
                if (typeof nextVol === 'number' && isFinite(nextVol)) {
                  setVolume(nextVol)
                  setIsMuted(false)
                }
                resetControlsTimer()
              }}
              min={0}
              max={1}
              step={0.05}
              className="[&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-track]]:bg-white/20 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:border-white cursor-pointer"
            />
          </div>
        </div>

      </div>
    </motion.div>
  )
}
