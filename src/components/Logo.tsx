import { HeartHandshake } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cx } from '../lib/cx'

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cx('inline-flex items-center gap-2', className)}>
      <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-cupido-pink to-cupido-purple text-white shadow-sm shadow-cupido-pink/20">
        <HeartHandshake className="size-5" />
      </span>
      <span className="text-lg font-semibold tracking-tight text-slate-900">
        Cupido 302
      </span>
    </Link>
  )
}

