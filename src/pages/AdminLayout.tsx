import { useEffect, useRef, useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { BarChart3, ClipboardCheck, Users, LogOut, HandHeart, Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { RequireRole } from '../components/RequireRole'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export function AdminLayout() {
  const { session, signOut } = useAuth()
  const location = useLocation()
  const [refreshKey, setRefreshKey] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const lastPendingCountRef = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const audioUnlockedRef = useRef(false)
  const lastRefreshAtRef = useRef<number>(0)

  const getAudioContextCtor = () => {
    return (
      window.AudioContext ||
      (
        window as unknown as {
          webkitAudioContext: typeof AudioContext | undefined
        }
      ).webkitAudioContext
    )
  }

  const unlockAudio = async (createIfMissing: boolean) => {
    try {
      const AudioContextCtor = getAudioContextCtor()
      if (!AudioContextCtor) return
      if (!audioCtxRef.current && !createIfMissing) return

      const ctx = audioCtxRef.current ?? new AudioContextCtor()
      audioCtxRef.current = ctx
      if (ctx.state === 'suspended') await ctx.resume()
      audioUnlockedRef.current = ctx.state === 'running'
    } catch {
      return
    }
  }

  const playNotificationSound = async () => {
    try {
      await unlockAudio(false)
      const ctx = audioCtxRef.current
      if (!ctx) return
      if (!audioUnlockedRef.current) return

      const now = ctx.currentTime
      const master = ctx.createGain()
      master.gain.setValueAtTime(0.9, now)
      master.connect(ctx.destination)

      const strike = (t0: number, level: number) => {
        const base = 880
        const partials: Array<{ ratio: number; gain: number; decay: number; type: OscillatorType }> =
          [
            { ratio: 1.0, gain: 0.10, decay: 0.55, type: 'sine' },
            { ratio: 2.03, gain: 0.08, decay: 0.70, type: 'sine' },
            { ratio: 2.97, gain: 0.06, decay: 0.80, type: 'triangle' },
            { ratio: 4.12, gain: 0.05, decay: 0.95, type: 'sine' },
          ]

        for (const p of partials) {
          const osc = ctx.createOscillator()
          const g = ctx.createGain()

          osc.type = p.type
          osc.frequency.setValueAtTime(base * p.ratio, t0)
          osc.detune.setValueAtTime((Math.random() - 0.5) * 8, t0)

          const peak = Math.max(0.0001, p.gain * level)
          g.gain.setValueAtTime(0.0001, t0)
          g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01)
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + p.decay)

          osc.connect(g)
          g.connect(master)

          osc.start(t0)
          osc.stop(t0 + p.decay + 0.03)
        }
      }

      strike(now, 1.0)
      strike(now + 0.10, 0.7)
    } catch {
      return
    }
  }

  const triggerAdminRefresh = () => {
    window.dispatchEvent(new Event('cupido302_admin_refresh'))

    if (location.pathname.startsWith('/admin/moderacao')) return
    const now = Date.now()
    if (now - lastRefreshAtRef.current < 1200) return
    lastRefreshAtRef.current = now
    setRefreshKey((k) => k + 1)
  }

  useEffect(() => {
    const handler = () => {
      void unlockAudio(true)
    }

    window.addEventListener('pointerdown', handler, { once: true })
    window.addEventListener('keydown', handler, { once: true })

    return () => {
      window.removeEventListener('pointerdown', handler)
      window.removeEventListener('keydown', handler)
    }
  }, [])

  useEffect(() => {
    const client = supabase
    if (!client) return
    if (!session?.user?.id) return

    const fetchPendingCount = async () => {
      const { count, error } = await client
        .from('mensagens')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'PENDENTE_MODERACAO')

      if (error) return null
      return count ?? 0
    }

    const poll = async (shouldNotify: boolean) => {
      const newCount = await fetchPendingCount()
      if (newCount === null) return

      const prev = lastPendingCountRef.current
      lastPendingCountRef.current = newCount
      setPendingCount(newCount)
      if (prev === null) return
      if (!shouldNotify) return
      if (newCount <= prev) return

      const delta = newCount - prev
      toast.success(
        delta === 1
          ? 'Chegou 1 nova mensagem pendente de moderação'
          : `Chegaram ${delta} novas mensagens pendentes de moderação`,
      )
      void playNotificationSound()
      triggerAdminRefresh()
    }

    void poll(false)
    const intervalId = window.setInterval(() => {
      void poll(true)
    }, 7000)

    const channel = client
      .channel(`admin_notifications:${session.user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens' },
        (payload) => {
          const row = payload.new as Record<string, unknown> | null
          if (!row) return
          if (row.status !== 'PENDENTE_MODERACAO') return

          const id = typeof row.id === 'string' ? row.id : crypto.randomUUID()
          if (seenIdsRef.current.has(id)) return
          seenIdsRef.current.add(id)
          if (seenIdsRef.current.size > 50) {
            const first = seenIdsRef.current.values().next().value as string | undefined
            if (first) seenIdsRef.current.delete(first)
          }

          if (lastPendingCountRef.current !== null) {
            lastPendingCountRef.current = Math.max(0, lastPendingCountRef.current + 1)
            setPendingCount(lastPendingCountRef.current)
          }

          const nome =
            typeof row.destinatario_nome === 'string' ? row.destinatario_nome.trim() : ''
          const sobrenome =
            typeof row.destinatario_sobrenome === 'string'
              ? row.destinatario_sobrenome.trim()
              : ''
          const recipient = [nome, sobrenome].filter(Boolean).join(' ')

          toast.success(
            recipient
              ? `Nova mensagem pendente para ${recipient}`
              : 'Nova mensagem pendente de moderação',
            { id: `admin_new_message_${id}` },
          )
          void playNotificationSound()
          triggerAdminRefresh()
        },
      )
      .subscribe()

    return () => {
      window.clearInterval(intervalId)
      void client.removeChannel(channel)
    }
  }, [session?.user?.id])

  return (
    <RequireRole role="admin">
      <div className="space-y-4">
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm text-slate-600">Dashboard</div>
              <div className="text-2xl font-semibold tracking-tight text-slate-900">
                Administração
              </div>
              {session?.user?.email ? (
                <div className="mt-1 text-sm text-slate-600">{session.user.email}</div>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <NavLink
                to="/admin/moderacao"
                title="Mensagens pendentes"
                className="relative inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-medium text-slate-800 transition hover:bg-black/5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cupido-purple/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                <Bell className="size-4" />
                Notificações
                {pendingCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-cupido-coral px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white ring-2 ring-white/80">
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                ) : null}
              </NavLink>
              <Button variant="ghost" onClick={signOut}>
                <LogOut className="size-4" />
                Sair
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Tab to="/admin/moderacao" icon={<ClipboardCheck className="size-4" />}>
            Mensagens
          </Tab>
          <Tab to="/admin/participantes" icon={<Users className="size-4" />}>
            Participantes
          </Tab>
          <Tab to="/admin/cupidos" icon={<HandHeart className="size-4" />}>
            Cupidos
          </Tab>
          <Tab to="/admin/estatisticas" icon={<BarChart3 className="size-4" />}>
            Estatísticas
          </Tab>
        </div>

        <Outlet key={refreshKey} />
      </div>
    </RequireRole>
  )
}

function Tab({
  to,
  icon,
  children,
}: {
  to: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1 transition',
          isActive
            ? 'bg-gradient-to-r from-cupido-pink to-cupido-purple text-white ring-transparent shadow-sm shadow-cupido-purple/20'
            : 'bg-white/60 text-slate-800 ring-black/10 hover:bg-white/80',
        ].join(' ')
      }
    >
      {icon}
      {children}
    </NavLink>
  )
}
