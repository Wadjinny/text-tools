import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icon: LucideIcon
  label: string
  className?: string
}

export function EmptyState({ icon: Icon, label, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`empty empty-state ${className}`.trim()}
      role="status"
      aria-label={label}
      title={label}
    >
      <Icon className="empty-state-icon" size={20} strokeWidth={1.4} aria-hidden="true" />
    </div>
  )
}
