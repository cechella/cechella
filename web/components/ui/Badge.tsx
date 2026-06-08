import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args))

type BadgeVariant = 'purple' | 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'gradient'

interface BadgeProps {
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'purple', size = 'sm', children, className }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    purple: 'bg-[#7B3FE4]/15 text-[#9558EE] border border-[#7B3FE4]/20',
    blue: 'bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/20',
    green: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    yellow: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    red: 'bg-red-500/15 text-red-400 border border-red-500/20',
    gray: 'bg-[#27272A] text-[#A1A1AA] border border-[#1C1C1E]',
    gradient: 'bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white border-0',
  }

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
  }

  return (
    <span className={cn('inline-flex items-center font-medium rounded-full', variants[variant], sizes[size], className)}>
      {children}
    </span>
  )
}

export function RoleBadge({ role }: { role: 'patient' | 'doctor' | 'sales' | 'admin' | 'lead' }) {
  const roleConfig = {
    patient: { label: 'Paciente', variant: 'purple' as BadgeVariant },
    doctor: { label: 'Médico', variant: 'blue' as BadgeVariant },
    sales: { label: 'Consultor', variant: 'green' as BadgeVariant },
    admin: { label: 'Admin', variant: 'gradient' as BadgeVariant },
    lead: { label: 'Lead', variant: 'yellow' as BadgeVariant },
  }
  const config = roleConfig[role]
  return <Badge variant={config.variant}>{config.label}</Badge>
}
