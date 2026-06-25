import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, XCircle, RefreshCcw } from 'lucide-react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Badge } from '../components/Badge'
import type { MessageStatus } from '../lib/status'
import { messageStatusLabel, messageStatusTone } from '../lib/status'
import { supabase } from '../lib/supabase'

type MensagemRow = {
  id: string
  destinatario_nome: string
  destinatario_sobrenome: string
  destinatario_apelido: string | null
  destinatario_turma: string | null
  claim_code: string | null
  emissor_nome: string | null
  emissor_sobrenome: string | null
  emissor_apelido: string | null
  emissor_turma: string | null
  mensagem: string
  anonima: boolean
  status: MessageStatus
  created_at: string
  approved_at: string | null
  delivered_at: string | null
}

const statuses: MessageStatus[] = [
  'PENDENTE_MODERACAO',
  'AGUARDANDO_DESTINATARIO',
  'REJEITADA',
  'ENTREGUE',
]

export function ModerationPage() {
  const [status, setStatus] = useState<MessageStatus>('PENDENTE_MODERACAO')
  const [rows, setRows] = useState<MensagemRow[]>([])
  const [loading, setLoading] = useState(false)

  const title = useMemo(() => messageStatusLabel[status], [status])

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const watchdogId = window.setTimeout(() => {
      setLoading(false)
    }, 12000)
    try {
      const { data, error } = await supabase
        .from('mensagens')
        .select(
          'id,destinatario_nome,destinatario_sobrenome,destinatario_apelido,destinatario_turma,claim_code,emissor_nome,emissor_sobrenome,emissor_apelido,emissor_turma,mensagem,anonima,status,created_at,approved_at,delivered_at',
        )
        .eq('status', status)
        .order('created_at', { ascending: false })

      if (error) {
        toast.error('Falha ao carregar mensagens')
        return
      }

      setRows((data as MensagemRow[]) ?? [])
    } catch {
      toast.error('Falha ao carregar mensagens')
    } finally {
      window.clearTimeout(watchdogId)
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const client = supabase
    if (!client) return
    const channel = client
      .channel('admin_mensagens')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mensagens' },
        () => {
          void load()
        },
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [load])

  useEffect(() => {
    const handler = () => {
      void load()
    }
    window.addEventListener('cupido302_admin_refresh', handler)
    return () => {
      window.removeEventListener('cupido302_admin_refresh', handler)
    }
  }, [load])

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', handler)
    window.addEventListener('focus', handler)
    return () => {
      document.removeEventListener('visibilitychange', handler)
      window.removeEventListener('focus', handler)
    }
  }, [load])

  const approve = async (m: MensagemRow) => {
    if (!supabase) return
    const existing = await findExistingClaimCodeForRecipient(m)
    const claimCode = existing ?? generateClaimCode()

    const { error: approveErr } = await supabase
      .from('mensagens')
      .update({
        status: 'AGUARDANDO_DESTINATARIO',
        approved_at: new Date().toISOString(),
        claim_code: claimCode,
      })
      .eq('id', m.id)

    if (approveErr) {
      const msg = `${approveErr.message ?? ''} ${approveErr.details ?? ''}`.toLowerCase()
      if (msg.includes('claim_code') && msg.includes('does not exist')) {
        toast.error('Banco não atualizado: execute o supabase.sql para criar o código de resgate')
        return
      }
      toast.error('Não foi possível aprovar')
      return
    }

    let q = supabase
      .from('mensagens')
      .update({ claim_code: claimCode })
      .eq('status', 'AGUARDANDO_DESTINATARIO')
      .eq('destinatario_nome', m.destinatario_nome)
      .eq('destinatario_sobrenome', m.destinatario_sobrenome)
      .is('claim_code', null)

    q = m.destinatario_apelido
      ? q.eq('destinatario_apelido', m.destinatario_apelido)
      : q.is('destinatario_apelido', null)
    q = m.destinatario_turma
      ? q.eq('destinatario_turma', m.destinatario_turma)
      : q.is('destinatario_turma', null)

    await q
    toast.success('Mensagem aprovada')
    void load()
  }

  const reject = async (id: string) => {
    if (!supabase) return
    const { error } = await supabase
      .from('mensagens')
      .update({ status: 'REJEITADA' })
      .eq('id', id)

    if (error) {
      toast.error('Não foi possível rejeitar')
      return
    }
    toast.success('Mensagem rejeitada')
    void load()
  }

  return (
    <div className="space-y-4">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm text-slate-600">Mensagens</div>
            <div className="text-xl font-semibold tracking-tight text-slate-900">
              {title}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={[
                  'rounded-full px-4 py-2 text-sm font-medium ring-1 transition',
                  status === s
                    ? 'bg-black/5 text-slate-900 ring-black/10'
                    : 'bg-white/60 text-slate-700 ring-black/5 hover:bg-white/80',
                ].join(' ')}
              >
                {messageStatusLabel[s]}
              </button>
            ))}
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              <RefreshCcw className="size-4" />
              Atualizar
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <Card className="p-6">
            <div className="text-sm text-slate-600">
              {loading ? 'Carregando…' : 'Nenhuma mensagem nesta categoria.'}
            </div>
          </Card>
        ) : (
          rows.map((m) => (
            <Card key={m.id} className="p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="text-sm text-slate-600">Destinatário</div>
                  <div className="text-lg font-semibold tracking-tight text-slate-900">
                    {m.destinatario_nome} {m.destinatario_sobrenome}{' '}
                    {m.destinatario_apelido ? (
                      <span className="text-slate-500">({m.destinatario_apelido})</span>
                    ) : null}
                  </div>
                  <div className="text-sm text-slate-600">
                    {m.destinatario_turma ? `Turma: ${m.destinatario_turma} • ` : null}
                    {m.anonima ? 'Anônima' : 'Identificada'}
                  </div>
                  {!m.anonima ? (
                    <div className="text-sm text-slate-600">
                      Emissor:{' '}
                      <span className="font-medium text-slate-800">
                        {[m.emissor_nome, m.emissor_sobrenome].filter(Boolean).join(' ') || '—'}
                        {m.emissor_apelido ? ` (${m.emissor_apelido})` : ''}
                      </span>
                      {m.emissor_turma ? ` • Turma: ${m.emissor_turma}` : ''}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={messageStatusTone[m.status]}>
                    {messageStatusLabel[m.status]}
                  </Badge>
                </div>
              </div>

              <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-900">
                {m.mensagem}
              </div>

              {m.status === 'PENDENTE_MODERACAO' ? (
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => approve(m)}>
                    <CheckCircle2 className="size-4" />
                    Aprovar
                  </Button>
                  <Button variant="danger" onClick={() => reject(m.id)}>
                    <XCircle className="size-4" />
                    Rejeitar
                  </Button>
                </div>
              ) : null}
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

async function findExistingClaimCodeForRecipient(m: MensagemRow): Promise<string | null> {
  const client = supabase
  if (!client) return null

  let q = client
    .from('mensagens')
    .select('claim_code')
    .eq('status', 'AGUARDANDO_DESTINATARIO')
    .eq('destinatario_nome', m.destinatario_nome)
    .eq('destinatario_sobrenome', m.destinatario_sobrenome)
    .not('claim_code', 'is', null)
    .limit(1)

  q = m.destinatario_apelido ? q.eq('destinatario_apelido', m.destinatario_apelido) : q.is('destinatario_apelido', null)
  q = m.destinatario_turma ? q.eq('destinatario_turma', m.destinatario_turma) : q.is('destinatario_turma', null)

  const { data, error } = await q.maybeSingle()
  if (error) return null
  return (data as { claim_code: string } | null)?.claim_code ?? null
}

function generateClaimCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 12; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}
