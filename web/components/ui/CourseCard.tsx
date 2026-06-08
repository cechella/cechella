import { Clock, BookOpen, ChevronRight } from 'lucide-react'
import { ProgressRing } from './ProgressRing'

interface CourseCardProps {
  title: string
  description: string
  icon: React.ReactNode
  lessons: number
  duration: string
  progress: number
  category?: string
  isStarted?: boolean
}

export function CourseCard({ title, description, icon, lessons, duration, progress, category, isStarted }: CourseCardProps) {
  const isCompleted = progress >= 100

  return (
    <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 hover:border-[#7B3FE4]/30 transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_24px_rgba(0,0,0,0.4)] group">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <ProgressRing progress={progress} size={64} strokeWidth={4}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7B3FE4]/30 to-[#3B82F6]/30 flex items-center justify-center">
              <span className="text-[#7B3FE4]">{icon}</span>
            </div>
          </ProgressRing>
        </div>
        <div className="flex-1 min-w-0">
          {category && (
            <p className="text-xs text-[#7B3FE4] font-medium uppercase tracking-wide mb-1">{category}</p>
          )}
          <h3 className="font-semibold text-white text-sm leading-tight mb-1 group-hover:text-[#9558EE] transition-colors">
            {title}
          </h3>
          <p className="text-xs text-[#71717A] line-clamp-2 leading-relaxed mb-3">{description}</p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-[#71717A]">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {lessons} aulas
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {duration}
              </span>
            </div>
            <button className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
              isCompleted
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : isStarted || progress > 0
                ? 'bg-[#7B3FE4]/10 text-[#7B3FE4] border border-[#7B3FE4]/20 hover:bg-[#7B3FE4]/20'
                : 'bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white hover:opacity-90'
            }`}>
              {isCompleted ? 'Concluído' : progress > 0 ? 'Continuar' : 'Iniciar'}
              {!isCompleted && <ChevronRight className="w-3 h-3" />}
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-[#71717A] mb-1">
              <span>{progress}% concluído</span>
              {progress > 0 && !isCompleted && <span>{Math.ceil((lessons * (100 - progress)) / 100)} aulas restantes</span>}
            </div>
            <div className="h-1 bg-[#1C1C1E] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
