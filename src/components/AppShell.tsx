import { Outlet, Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HandHeart, Shield, Sparkles } from 'lucide-react'
import { Logo } from './Logo'
import { Button } from './Button'

export function AppShell() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,rgba(255,93,143,0.18),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.18),transparent_55%),linear-gradient(to_bottom,#ffffff,#f8fafc)]">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-white/55 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Logo />
          <div className="flex items-center gap-2">
            <Link to="/enviar" className="hidden sm:block">
              <Button variant="secondary" size="sm">
                <Sparkles className="size-4" />
                Enviar
              </Button>
            </Link>
            <Link to="/cupidos" className="hidden sm:block">
              <Button variant="secondary" size="sm">
                <HandHeart className="size-4" />
                Cupido
              </Button>
            </Link>
            <Link to="/admin/login">
              <Button variant={isAdminRoute ? 'primary' : 'secondary'} size="sm">
                <Shield className="size-4" />
                Admin
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-4 pb-10 pt-4 text-sm text-slate-500">
        <div className="rounded-3xl bg-white/40 ring-1 ring-black/5 backdrop-blur px-5 py-4">
          Conectando corações, uma mensagem por vez ❤️
        </div>
      </footer>
    </div>
  )
}
