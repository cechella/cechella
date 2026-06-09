'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  X, Settings, Subtitles, SkipBack, SkipForward, Loader2
} from 'lucide-react'

interface SecureVideoPlayerProps {
  videoId: string
  title: string
  userEmail: string
  onClose?: () => void
}

const WATERMARK_POSITIONS = [
  { top: '8%', left: '4%' },
  { top: '8%', right: '4%', left: 'auto' },
  { top: '45%', left: '4%' },
  { top: '45%', right: '4%', left: 'auto' },
  { top: '78%', left: '4%' },
  { top: '78%', right: '4%', left: 'auto' },
  { top: '25%', left: '35%' },
  { top: '65%', left: '55%' },
]

function formatTime(s: number) {
  if (!s || isNaN(s)) return '0:00'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function SecureVideoPlayer({ videoId, title, userEmail, onClose }: SecureVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const watermarkIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [watermarkPos, setWatermarkPos] = useState(WATERMARK_POSITIONS[0])
  const [qualityLevels, setQualityLevels] = useState<{ height: number; index: number }[]>([])
  const [currentQuality, setCurrentQuality] = useState(-1)
  const [showQualityMenu, setShowQualityMenu] = useState(false)
  const [buffered, setBuffered] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  // Load video
  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        setIsLoading(true)
        setError(null)

        const res = await fetch(`/api/video/r2-signed-url?videoId=${videoId}`)
        const data = await res.json()

        if (!res.ok) throw new Error(data.error || 'Falha ao carregar vídeo')
        if (cancelled) return

        const { signedUrl, isHls } = data
        const video = videoRef.current
        if (!video) return

        if (isHls && Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true })
          hlsRef.current = hls
          hls.loadSource(signedUrl)
          hls.attachMedia(video)
          hls.on(Hls.Events.MANIFEST_PARSED, (_, d) => {
            if (cancelled) return
            setIsLoading(false)
            setQualityLevels(d.levels.map((l, i) => ({ height: l.height, index: i })))
          })
          hls.on(Hls.Events.ERROR, (_, d) => {
            if (d.fatal && !cancelled) {
              setError('Erro ao reproduzir. Tente novamente.')
              setIsLoading(false)
            }
          })
        } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = signedUrl
          video.addEventListener('loadedmetadata', () => { if (!cancelled) setIsLoading(false) }, { once: true })
        } else {
          video.src = signedUrl
          video.addEventListener('loadedmetadata', () => { if (!cancelled) setIsLoading(false) }, { once: true })
          video.addEventListener('error', () => {
            if (!cancelled) { setError('Erro ao reproduzir. Tente novamente.'); setIsLoading(false) }
          }, { once: true })
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Erro desconhecido')
          setIsLoading(false)
        }
      }
    }

    init()
    return () => {
      cancelled = true
      hlsRef.current?.destroy()
      hlsRef.current = null
    }
  }, [videoId])

  // Video events
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTime = () => { setCurrentTime(v.currentTime); updateBuffered() }
    const onDuration = () => setDuration(v.duration)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const updateBuffered = () => {
      if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1))
    }
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('durationchange', onDuration)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    v.addEventListener('progress', updateBuffered)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('durationchange', onDuration)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
      v.removeEventListener('progress', updateBuffered)
    }
  }, [])

  // Fullscreen events
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  // Save progress
  useEffect(() => {
    saveIntervalRef.current = setInterval(async () => {
      const v = videoRef.current
      if (!v || v.currentTime < 1) return
      try {
        await fetch('/api/video/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId,
            progressSeconds: Math.floor(v.currentTime),
            completed: v.duration > 0 && v.currentTime / v.duration > 0.9,
          }),
        })
      } catch {}
    }, 10000)
    return () => { if (saveIntervalRef.current) clearInterval(saveIntervalRef.current) }
  }, [videoId])

  // Watermark rotation
  useEffect(() => {
    let i = 0
    watermarkIntervalRef.current = setInterval(() => {
      i = (i + 1) % WATERMARK_POSITIONS.length
      setWatermarkPos(WATERMARK_POSITIONS[i])
    }, 30000)
    return () => { if (watermarkIntervalRef.current) clearInterval(watermarkIntervalRef.current) }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const v = videoRef.current
      if (!v) return
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay() }
      if (e.key === 'ArrowRight') v.currentTime = Math.min(v.currentTime + 10, v.duration)
      if (e.key === 'ArrowLeft') v.currentTime = Math.max(v.currentTime - 10, 0)
      if (e.key === 'm') toggleMute()
      if (e.key === 'f') toggleFullscreen()
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Block context menu
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const block = (e: Event) => e.preventDefault()
    v.addEventListener('contextmenu', block)
    return () => v.removeEventListener('contextmenu', block)
  }, [])

  const resetControlsTimer = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000)
  }, [])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }, [])

  const toggleMute = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setIsMuted(v.muted)
  }, [])

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {})
    else document.exitFullscreen().catch(() => {})
  }, [])

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current
    const bar = progressRef.current
    if (!v || !bar) return
    const rect = bar.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    v.currentTime = pct * v.duration
  }, [])

  const changeVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current
    if (!v) return
    const val = parseFloat(e.target.value)
    v.volume = val
    setVolume(val)
    setIsMuted(val === 0)
    v.muted = val === 0
  }, [])

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.97)' }}
    >
      {/* Cinema container */}
      <div
        ref={containerRef}
        className="relative w-full h-full flex flex-col"
        onMouseMove={resetControlsTimer}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        style={{ cursor: showControls ? 'default' : 'none' }}
      >
        {/* Video */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain"
          onClick={togglePlay}
          playsInline
        />

        {/* Watermark */}
        <div
          className="absolute pointer-events-none select-none z-20 transition-all duration-1000"
          style={{ ...watermarkPos, position: 'absolute' }}
        >
          <span className="text-white/20 text-xs font-mono tracking-wider">{userEmail}</span>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/60">
            <Loader2 className="w-12 h-12 text-[#7B3FE4] animate-spin mb-3" />
            <p className="text-white/60 text-sm">Carregando vídeo...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
            <div className="bg-[#1A1A1F] border border-[#2A2A30] rounded-2xl p-8 text-center max-w-sm mx-4">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <X className="w-7 h-7 text-red-400" />
              </div>
              <p className="text-white font-medium mb-2">Não foi possível carregar</p>
              <p className="text-white/40 text-sm mb-5">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-[#7B3FE4] hover:bg-[#6325C8] text-white text-sm rounded-xl transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div
          className="absolute top-0 left-0 right-0 z-20 transition-all duration-300"
          style={{
            opacity: showControls ? 1 : 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)',
          }}
        >
          <div className="flex items-center justify-between px-6 py-5">
            <h2 className="text-white font-semibold text-lg tracking-wide truncate max-w-[70%]">{title}</h2>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Center play/pause flash */}
        {!isLoading && !error && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
            onClick={togglePlay}
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Bottom controls */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 transition-all duration-300"
          style={{
            opacity: showControls ? 1 : 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
          }}
        >
          {/* Progress bar */}
          <div className="px-5 pb-1">
            <div
              ref={progressRef}
              className="relative h-1 hover:h-1.5 bg-white/20 rounded-full cursor-pointer transition-all duration-150 group"
              onClick={seek}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseMove={(e) => isDragging && seek(e)}
            >
              {/* Buffered */}
              <div
                className="absolute top-0 left-0 h-full bg-white/30 rounded-full"
                style={{ width: `${bufferedPct}%` }}
              />
              {/* Progress */}
              <div
                className="absolute top-0 left-0 h-full bg-[#7B3FE4] rounded-full"
                style={{ width: `${progressPct}%` }}
              />
              {/* Thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${progressPct}% - 6px)` }}
              />
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between px-5 py-3 gap-3">
            {/* Left controls */}
            <div className="flex items-center gap-3">
              {/* Skip back */}
              <button
                onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.max(0, v.currentTime - 10) }}
                className="text-white/80 hover:text-white transition-colors"
                title="-10s"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
              >
                {isPlaying
                  ? <Pause className="w-5 h-5 text-white" fill="white" />
                  : <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                }
              </button>

              {/* Skip forward */}
              <button
                onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.min(v.duration, v.currentTime + 10) }}
                className="text-white/80 hover:text-white transition-colors"
                title="+10s"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2 group/vol">
                <button onClick={toggleMute} className="text-white/80 hover:text-white transition-colors">
                  {isMuted || volume === 0
                    ? <VolumeX className="w-5 h-5" />
                    : <Volume2 className="w-5 h-5" />
                  }
                </button>
                <div className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-200">
                  <input
                    type="range"
                    min="0" max="1" step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={changeVolume}
                    className="w-20 h-1 accent-[#7B3FE4] cursor-pointer"
                  />
                </div>
              </div>

              {/* Time */}
              <span className="text-white/70 text-xs tabular-nums select-none">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-2">
              {/* Subtitles placeholder */}
              <button
                className="text-white/40 cursor-default transition-colors"
                title="Legendas (em breve)"
              >
                <Subtitles className="w-5 h-5" />
              </button>

              {/* Quality */}
              {qualityLevels.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowQualityMenu(p => !p)}
                    className="flex items-center gap-1 text-white/80 hover:text-white transition-colors text-xs font-medium"
                  >
                    <Settings className="w-4 h-4" />
                    <span>{currentQuality === -1 ? 'Auto' : `${qualityLevels.find(l => l.index === currentQuality)?.height}p`}</span>
                  </button>
                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-[#1A1A1F] border border-[#2A2A30] rounded-xl overflow-hidden shadow-xl min-w-[110px]">
                      <button
                        onClick={() => { hlsRef.current && (hlsRef.current.currentLevel = -1); setCurrentQuality(-1); setShowQualityMenu(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${currentQuality === -1 ? 'text-[#7B3FE4] bg-[#7B3FE4]/10' : 'text-white/80 hover:bg-white/5'}`}
                      >
                        Auto
                      </button>
                      {qualityLevels.map(l => (
                        <button
                          key={l.index}
                          onClick={() => { hlsRef.current && (hlsRef.current.currentLevel = l.index); setCurrentQuality(l.index); setShowQualityMenu(false) }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${currentQuality === l.index ? 'text-[#7B3FE4] bg-[#7B3FE4]/10' : 'text-white/80 hover:bg-white/5'}`}
                        >
                          {l.height}p
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="text-white/80 hover:text-white transition-colors"
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
