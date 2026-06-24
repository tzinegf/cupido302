import { type ReactNode } from 'react'
import { cx } from '../lib/cx'

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between gap-3">
        <div className="text-sm font-medium text-slate-900">{label}</div>
        {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
      </div>
      {children}
      {error ? (
        <div className={cx('text-sm text-rose-600')}>{error}</div>
      ) : null}
    </div>
  )
}

export function TextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        'h-11 w-full rounded-2xl bg-white/70 ring-1 ring-black/10 px-4 text-slate-900 placeholder:text-slate-400 backdrop-blur focus:outline-none focus:ring-2 focus:ring-cupido-purple/35',
        className,
      )}
    />
  )
}

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cx(
        'min-h-32 w-full rounded-2xl bg-white/70 ring-1 ring-black/10 px-4 py-3 text-slate-900 placeholder:text-slate-400 backdrop-blur focus:outline-none focus:ring-2 focus:ring-cupido-purple/35',
        className,
      )}
    />
  )
}

export function SelectInput({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        'h-11 w-full rounded-2xl bg-white/70 ring-1 ring-black/10 px-4 text-slate-900 backdrop-blur focus:outline-none focus:ring-2 focus:ring-cupido-purple/35',
        className,
      )}
    />
  )
}
