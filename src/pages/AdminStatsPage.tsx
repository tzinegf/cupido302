import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { supabase } from '../lib/supabase'

type Counts = {
  totalMensagens: number
  pendentes: number
  aguardando: number
  entregues: number
  rejeitadas: number
  participantes: number
}

export function AdminStatsPage() {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [loading, setLoading] = useState(false)

  const approvalRate = useMemo(() => {
    if (!counts) return 0
    const aprovadas = counts.aguardando + counts.entregues
    const moderadas = aprovadas + counts.rejeitadas
    if (moderadas === 0) return 0
    return Math.round((aprovadas / moderadas) * 100)
  }, [counts])

  const load = async () => {
    if (!supabase) return
    setLoading(true)
    try {
      const [total, pendentes, aguardando, entregues, rejeitadas, participantes] =
        await Promise.all([
          supabase.from('mensagens').select('id', { count: 'exact', head: true }),
          supabase
            .from('mensagens')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'PENDENTE_MODERACAO'),
          supabase
            .from('mensagens')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'AGUARDANDO_DESTINATARIO'),
          supabase
            .from('mensagens')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'ENTREGUE'),
          supabase
            .from('mensagens')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'REJEITADA'),
          supabase.from('usuarios').select('id', { count: 'exact', head: true }),
        ])

      const errors = [
        total.error,
        pendentes.error,
        aguardando.error,
        entregues.error,
        rejeitadas.error,
        participantes.error,
      ].filter(Boolean)

      if (errors.length > 0) {
        toast.error('Falha ao carregar estatísticas')
        return
      }

      setCounts({
        totalMensagens: total.count ?? 0,
        pendentes: pendentes.count ?? 0,
        aguardando: aguardando.count ?? 0,
        entregues: entregues.count ?? 0,
        rejeitadas: rejeitadas.count ?? 0,
        participantes: participantes.count ?? 0,
      })
    } catch {
      toast.error('Falha ao carregar estatísticas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="space-y-4">
      <Card className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-slate-600">Visão geral</div>
            <div className="text-xl font-semibold tracking-tight text-slate-900">
              Estatísticas
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            Atualizar
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Metric title="Total de mensagens" value={counts?.totalMensagens ?? 0} />
        <Metric title="Mensagens entregues" value={counts?.entregues ?? 0} />
        <Metric title="Taxa de aprovação" value={`${approvalRate}%`} />
        <Metric title="Participantes cadastrados" value={counts?.participantes ?? 0} />
      </div>

      <Card className="p-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <Pill title="Pendentes" value={counts?.pendentes ?? 0} />
          <Pill title="Aguardando" value={counts?.aguardando ?? 0} />
          <Pill title="Rejeitadas" value={counts?.rejeitadas ?? 0} />
          <Pill title="Entregues" value={counts?.entregues ?? 0} />
        </div>
      </Card>
    </div>
  )
}

function Metric({ title, value }: { title: string; value: number | string }) {
  return (
    <Card className="p-6">
      <div className="text-sm text-slate-600">{title}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </div>
    </Card>
  )
}

function Pill({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/50 px-4 py-3 ring-1 ring-black/5">
      <div className="text-xs text-slate-600">{title}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  )
}
