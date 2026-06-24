import { type HTMLAttributes } from 'react'
import { cx } from '../lib/cx'

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ring-1',
        className,
      )}
    />
  )
}

