import { type HTMLAttributes } from 'react'
import { cx } from '../lib/cx'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cx(
        'rounded-3xl bg-white/60 ring-1 ring-black/5 backdrop-blur shadow-sm shadow-black/5',
        className,
      )}
    />
  )
}

