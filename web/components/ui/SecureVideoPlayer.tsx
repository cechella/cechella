'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, X } from 'lucide-react'

interface SecureVideoPlayerProps {
  videoId: string
  title: string
  userEmail: string
  onClose?: () => void
}

const WATERMARK_POSITIONS = [
  { top: '10%', left: '5%' },
  { top: '10%', right: '5%' },
  { top: '50%', left: '5%' },
  { top: '50%', right: '5%' },
  { top: '80%', left: '5%' },
  { top: '80%', right: '5%' },
  { top: '30%', left: '30%' },
  { top: '60%', left: '60%' },
]

export function SecureVideoPlayer({ videoId, title, userEmail, onClose }: SecureVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const watermarkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [watermarkPos, setWatermarkPos] = useState(WATERMARK_POSITIONS[0])
  const [qualityLevels, setQualityLevels] = useState<{ height: number; index: number }[]>([])
  const [currentQuality, setCurrentQuality] = useState(-1)
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch signed URL and initialize HLS
  useEffect(() => {
    let cancelled = false

    async function initPlayer() {
      try {
        setIsLoading(true)
        setError(null)

        const res = await fetch(`/api/video/r2-signed-url?videoId=${videoId}`)
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to load video')
        }
        const { signedUrl } = await res.json()

        if (cancelled) return

        const video = videoRef.current
        if (!video) return

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
          })
          hlsRef.current = hls

          hls.loadSource(signedUrl)
          hls.attachMedia(video)

          hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
            if (cancelled) return
            setIsLoading(false)
            const levels = data.levels.map((l, i) => ({ height: l.height, index: i }))
            setQualityLevels(levels)
          })

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              setError('Erro ao carregar o vídeo. Tente novamente.')
              setIsLoading(false)
            }
          })
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari native HLS
          video.src = signedUrl
          video.addEventListener('loadedmetadata', () => {
            if (!cancelled) setIsLoading(false)
          })
        } else {
          throw new Error('HLS not supported on this browser')
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error')
          setIsLoading(false)
        }
      }
    }

    initPlayer()

    return () => {
      cancelled = true
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [videoId])

  // Auto-save progress every 10 seconds
  useEffect(() => {
    const saveProgress = async () => {
      const video = videoRef.current
      if (!video || video.currentTime < 1) return
      const completed = video.duration > 0 && video.currentTime / video.duration > 0.9
      try {
        await fetch('/api/video/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId,
            progressSeconds: Math.floor(video.currentTime),
            completed,
          }),
        })
      } catch {
        // Silent fail - don't interrupt playback
      }
    }

    progressIntervalRef.current = setInterval(saveProgress, 10000)
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [videoId])

  // Watermark position rotation every 30 seconds
  useEffect(() => {
    let posIndex = 0
    watermarkIntervalRef.current = setInterval(() => {
      posIndex = (posIndex + 1) % WATERMARK_POSITIONS.length
      setWatermarkPos(WATERMARK_POSITIONS[posIndex])
    }, 30000)
    return () => {
      if (watermarkIntervalRef.current) clearInterval(watermarkIntervalRef.current)
    }
  }, [])

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onTimeUpdate = () => setCurrentTime(video.currentTime)
    const onDurationChange = () => setDuration(video.duration)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => setIsPlaying(false)

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('durationchange', onDurationChange)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', onEnded)

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('durationchange', onDurationChange)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onEnded)
    }
  }, [])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }, [isPlaying])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !isMuted
    setIsMuted(!isMuted)
  }, [isMuted])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    const video = videoRef.current
    if (!video) return
    video.volume = v
    setVolume(v)
    setIsMuted(v === 0)
  }, [])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = parseFloat(e.target.value)
  }, [])

  const handleFullscreen = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      video.requestFullscreen()
    }
  }, [])

  const handleQualityChange = useCallback((index: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index
      setCurrentQuality(index)
    }
    setShowQualityMenu(false)
  }, [])

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3000)
  }, [isPlaying])

  const formatTime = (s: number) => {
    if (isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Title */}
      <div className="absolute top-4 left-4 z-50">
        <h2 className="text-white text-sm font-semibold drop-shadow">{title}</h2>
      </div>

      {/* Player container */}
      <div
        className="relative w-full max-w-5xl mx-auto aspect-video"
        onMouseMove={showControlsTemporarily}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        {/* Video element - pointer-events none to prevent direct interaction */}
        <video
          ref={videoRef}
          className="w-full h-full bg-black"
          style={{ pointerEvents: 'none' }}
          onContextMenu={(e) => e.preventDefault()}
          playsInline
        />

        {/* Watermark overlay */}
        <div
          className="absolute z-30 select-none"
          style={{
            ...watermarkPos,
            pointerEvents: 'none',
            transition: 'all 1s ease',
          }}
        >
          <span
            className="text-white text-xs font-medium"
            style={{ opacity: 0.35, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
          >
            {userEmail}
          </span>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-[#7B3FE4] border-t-transparent animate-spin" />
              <p className="text-white/60 text-sm">Carregando vídeo...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
            <div className="text-center">
              <p className="text-red-400 text-sm mb-3">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-[#7B3FE4] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#6325C8] transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* Click area to toggle play */}
        {!isLoading && !error && (
          <div
            className="absolute inset-0 z-10 cursor-pointer"
            onClick={togglePlay}
          />
        )}

        {/* Controls overlay */}
        {!isLoading && !error && (
          <div
            className="absolute inset-x-0 bottom-0 z-20 transition-opacity duration-300"
            style={{ opacity: showControls ? 1 : 0 }}
          >
            {/* Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

            <div className="relative px-4 pb-4 pt-8">
              {/* Progress bar */}
              <div className="mb-3 relative">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 appearance-none bg-white/20 rounded-full cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #7B3FE4 ${progressPct}%, rgba(255,255,255,0.2) ${progressPct}%)`,
                  }}
                />
              </div>

              {/* Controls row */}
              <div className="flex items-center gap-3">
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" fill="white" /> : <Play className="w-4 h-4 ml-0.5" fill="white" />}
                </button>

                {/* Volume */}
                <button
                  onClick={toggleMute}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 appearance-none bg-white/20 rounded-full cursor-pointer"
                />

                {/* Time */}
                <span className="text-white/70 text-xs tabular-nums">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                <div className="ml-auto flex items-center gap-2">
                  {/* Quality selector */}
                  {qualityLevels.length > 1 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowQualityMenu(!showQualityMenu)}
                        className="text-white/70 hover:text-white transition-colors flex items-center gap-1 text-xs"
                      >
                        <Settings className="w-4 h-4" />
                        <span>
                          {currentQuality === -1
                            ? 'Auto'
                            : qualityLevels.find((q) => q.index === currentQuality)?.height + 'p'}
                        </span>
                      </button>
                      {showQualityMenu && (
                        <div className="absolute bottom-8 right-0 bg-black/90 border border-white/10 rounded-lg overflow-hidden min-w-[100px]">
                          <button
                            onClick={() => handleQualityChange(-1)}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition-colors ${currentQuality === -1 ? 'text-[#7B3FE4]' : 'text-white'}`}
                          >
                            Auto
                          </button>
                          {qualityLevels.map((q) => (
                            <button
                              key={q.index}
                              onClick={() => handleQualityChange(q.index)}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition-colors ${currentQuality === q.index ? 'text-[#7B3FE4]' : 'text-white'}`}
                            >
                              {q.height}p
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fullscreen */}
                  <button
                    onClick={handleFullscreen}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    <Maximize className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
