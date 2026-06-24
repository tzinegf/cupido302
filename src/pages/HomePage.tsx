import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, QrCode, Users, Inbox } from 'lucide-react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { SetupRequired } from '../components/SetupRequired'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type PublicStats = {
  total_mensagens: number
  total_entregues: number
  total_participantes: number
}

export function HomePage() {
  const [stats, setStats] = useState<PublicStats | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    const client = supabase
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const { data, error } = await client.rpc('get_public_stats')
        if (cancelled) return
        if (error) {
          setStats(null)
          return
        }

        const normalized = Array.isArray(data)
          ? (data[0] as PublicStats | undefined)
          : ((data as PublicStats | null) ?? null)

        setStats(normalized ?? null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()

    const channel = client
      .channel('public_stats')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mensagens' },
        () => {
          void run()
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void client.removeChannel(channel)
    }
  }, [])

  if (!isSupabaseConfigured) return <SetupRequired />

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,93,143,0.22),transparent_45%),radial-gradient(ellipse_at_bottom,rgba(96,165,250,0.22),transparent_45%)]" />
        <div className="relative space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1 text-sm text-slate-700 ring-1 ring-black/5 backdrop-blur">
            <span className="size-1.5 rounded-full bg-cupido-pink" />
            Sistema de Correio Elegante Digital
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            O app oficial para farmar aura com o crush.
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Envie recados com privacidade. As mensagens passam por moderação e só
            são liberadas após aprovação. Cupidos avisam presencialmente que há um
            correio aguardando.
          </p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Link to="/enviar" className="w-full sm:w-auto">
              <Button className="w-full" size="lg">
                <Mail className="size-4" />
                Enviar Mensagem
              </Button>
            </Link>
            <Link to="/resgatar" className="w-full sm:w-auto">
              <Button className="w-full" variant="secondary" size="lg">
                <QrCode className="size-4" />
                Resgatar Mensagens
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Mensagens enviadas"
          value={loading ? '—' : String(stats?.total_mensagens ?? 0)}
          icon={<Inbox className="size-5" />}
        />
        <StatCard
          title="Mensagens entregues"
          value={loading ? '—' : String(stats?.total_entregues ?? 0)}
          icon={<Mail className="size-5" />}
        />
        <StatCard
          title="Pessoas que já enviaram uma mensagem"
          value={loading ? '—' : String(stats?.total_participantes ?? 0)}
          icon={<Users className="size-5" />}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        <Card className="p-6">
          <div className="text-sm font-medium text-slate-900">
            Como funciona
          </div>
          <div className="mt-2 grid gap-4 sm:grid-cols-3">
            <Step
              title="1) Enviar"
              text="Envie para alguém (sem precisar cadastrar o destinatário)."
            />
            <Step
              title="2) Moderação"
              text="Uma equipe aprova ou rejeita cada mensagem."
            />
            <Step
              title="3) Resgate"
              text="O destinatário se cadastra e resgata suas mensagens."
            />
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-slate-600">{title}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {value}
          </div>
        </div>
        <div className="grid size-11 place-items-center rounded-2xl bg-white/60 ring-1 ring-black/5">
          {icon}
        </div>
      </div>
    </Card>
  )
}

function Step({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-white/50 ring-1 ring-black/5 px-4 py-3">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{text}</div>
    </div>
  )
}
