'use client'

import { cn } from '@/lib/utils'

// ── Badge ──────────────────────────────────────────────────────
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline'

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-[rgba(36,28,19,0.08)] text-[#241C13]',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger:  'bg-red-50 text-red-700 border border-red-200',
  info:    'bg-blue-50 text-blue-700 border border-blue-200',
  outline: 'bg-transparent border border-[rgba(36,28,19,0.20)] text-[rgba(36,28,19,0.66)]',
}

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        badgeVariants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

// ── Card ───────────────────────────────────────────────────────
export function Card({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('bg-white rounded-lg border border-[rgba(36,28,19,0.14)] shadow-sm', className)}>
      {children}
    </div>
  )
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('px-5 py-4 border-b border-gray-100', className)}>{children}</div>
  )
}

export function CardContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>
}

export function CardTitle({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <h3 className={cn('text-sm font-semibold text-gray-900', className)}>{children}</h3>
  )
}

// ── Button ─────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const buttonVariants: Record<ButtonVariant, string> = {
  primary:   'text-white border border-transparent hover:opacity-90',
  secondary: 'bg-white text-[#241C13] hover:bg-[#F1E8D7] border border-[rgba(36,28,19,0.20)]',
  ghost:     'bg-transparent text-[rgba(36,28,19,0.66)] hover:bg-[rgba(36,28,19,0.06)] border border-transparent',
  danger:    'bg-red-600 text-white hover:bg-red-700 border border-red-600',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  onClick,
  type = 'button',
}: {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={variant === 'primary' ? { background: 'linear-gradient(135deg, #C8804E 0%, #B5683A 50%, #9A5530 100%)' } : undefined}
      className={cn(
        'inline-flex items-center gap-2 rounded-md font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
    >
      {children}
    </button>
  )
}

// ── Spinner ────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className ?? 'w-4 h-4 text-gray-500')}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

// ── Stat card ─────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  sub,
  icon,
  trend,
}: {
  label: string
  value: string | number
  sub?: string
  icon?: React.ReactNode
  trend?: { value: number; label: string }
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-5">
        {icon && (
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-md bg-[rgba(181,104,58,0.10)] border border-[rgba(181,104,58,0.20)] flex items-center justify-center text-[#B5683A]">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          {trend && (
            <p className={cn('text-xs mt-1 font-medium', trend.value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Empty state ───────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-gray-300 mb-4">{icon}</div>}
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-400 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
