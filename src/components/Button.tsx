import { type ButtonHTMLAttributes } from 'react'
import { cx } from '../lib/cx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cupido-purple/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent'

  const sizes: Record<Size, string> = {
    sm: 'h-10 px-4 text-sm',
    md: 'h-11 px-5 text-sm',
    lg: 'h-12 px-6 text-base',
  }

  const variants: Record<Variant, string> = {
    primary:
      'text-white bg-gradient-to-r from-cupido-pink to-cupido-purple shadow-sm shadow-cupido-pink/20 hover:shadow-md hover:shadow-cupido-purple/20',
    secondary:
      'text-slate-900 bg-white/70 ring-1 ring-black/10 backdrop-blur hover:bg-white/85',
    ghost: 'text-slate-800 hover:bg-black/5',
    danger:
      'text-white bg-gradient-to-r from-cupido-coral to-rose-600 shadow-sm shadow-rose-500/20 hover:shadow-md hover:shadow-rose-500/25',
  }

  return (
    <button
      {...props}
      className={cx(base, sizes[size], variants[variant], className)}
    />
  )
}

