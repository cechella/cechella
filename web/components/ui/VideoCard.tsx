'use client'

import { Play, Clock, Star, BookmarkPlus } from 'lucide-react'

interface VideoCardProps {
  title: string
  duration: string
  category: string
  thumbnail?: string
  gradientFrom?: string
  gradientTo?: string
  progress?: number
  isNew?: boolean
  rating?: number
}

export function VideoCard({
  title,
  duration,
  category,
  gradientFrom = '#7B3FE4',
  gradientTo = '#3B82F6',
  progress,
  isNew,
  rating,
}: VideoCardProps) {
  return (
    <div className="video-card group relative flex-shrink-0 w-44 cursor-pointer">
      {/* Thumbnail */}
      <div className="relative aspect-video rounded-xl overflow-hidden mb-2" style={{
        background: `linear-gradient(135deg, ${gradientFrom}33, ${gradientTo}33)`,
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div className="absolute inset-0 flex items-center justify-center" style={{
          background: `linear-gradient(135deg, ${gradientFrom}20, ${gradientTo}20)`,
        }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
            background: `linear-gradient(135deg, ${gradientFrom}60, ${gradientTo}60)`,
          }}>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-xl font-bold text-white/30">{category.charAt(0)}</span>
            </div>
          </div>
        </div>

        {/* Hover overlay */}
        <div className="video-card-overlay absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 text-[#0A0A0B] ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {isNew && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white">
              NOVO
            </span>
          )}
        </div>
        <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <BookmarkPlus className="w-4 h-4 text-white" />
        </button>

        {/* Duration */}
        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          {duration}
        </div>

        {/* Progress bar */}
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6]"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <div>
        <p className="text-[10px] text-[#7B3FE4] font-medium uppercase tracking-wide mb-0.5">{category}</p>
        <h4 className="text-xs text-white font-medium line-clamp-2 group-hover:text-[#9558EE] transition-colors leading-tight">
          {title}
        </h4>
        {rating && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
            <span className="text-[10px] text-[#71717A]">{rating}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function VideoCardLarge({
  title,
  duration,
  category,
  gradientFrom = '#7B3FE4',
  gradientTo = '#3B82F6',
  progress,
  isNew,
}: VideoCardProps) {
  return (
    <div className="video-card group relative cursor-pointer">
      <div className="relative rounded-2xl overflow-hidden aspect-video mb-3" style={{
        background: `linear-gradient(135deg, ${gradientFrom}33, ${gradientTo}33)`,
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
            <span className="text-3xl font-bold text-white/20">{category.charAt(0)}</span>
          </div>
        </div>

        <div className="video-card-overlay absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
            <Play className="w-7 h-7 text-[#0A0A0B] ml-1" fill="currentColor" />
          </div>
        </div>

        {isNew && (
          <div className="absolute top-3 left-3">
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white">
              NOVO
            </span>
          </div>
        )}

        <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-lg flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {duration}
        </div>

        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div className="h-full bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6]" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <p className="text-xs text-[#7B3FE4] font-medium uppercase tracking-wide mb-1">{category}</p>
      <h4 className="text-sm text-white font-semibold line-clamp-2 group-hover:text-[#9558EE] transition-colors">{title}</h4>
    </div>
  )
}
