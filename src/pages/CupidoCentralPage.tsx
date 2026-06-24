import { useEffect, useMemo, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { HandHeart, RefreshCcw, QrCode } from 'lucide-react'
import toast from 'react-hot-toast'
import { RequireRole } from '../components/RequireRole'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { supabase } from '../lib/supabase'

type CupidoQueueRow = {
  destinatario_nome: string
  destinatario_sobrenome: string
  destinatario_apelido: string | null
  destinatario_turma: string | null
  codigo: string | null
  mensagens_aguardando: number
}

export function CupidoCentralPage() {
  const [rows, setRows] = useState<CupidoQueueRow[]>([])
  const [loading, setLoading] = useState(false)
  const [openKey, setOpenKey] = useState<string | null>(null)

  const redeemUrl = useMemo(() => `${window.location.origin}/resgatar`, [])
  const redeemBase = useMemo(() => new URL(redeemUrl), [redeemUrl])

  const load = async () => {
    if (!supabase) return
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_cupido_queue')
      if (error) {
        toast.error('Falha ao carregar a fila')
        return
      }
      setRows((data as CupidoQueueRow[]) ?? [])
    } catch {
      toast.error('Falha ao carregar a fila')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <RequireRole role="cupido">
      <div className="space-y-4">
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="text-sm text-slate-600">Painel exclusivo</div>
              <div className="text-2xl font-semibold tracking-tight text-slate-900">
                Central dos Cupidos
              </div>
              <div className="text-sm text-slate-600">
                Aqui você vê apenas quem possui mensagens aguardando. O conteúdo não
                é exibido.
              </div>
            </div>
            <div className="grid size-12 place-items-center rounded-3xl bg-white/60 ring-1 ring-black/5">
              <HandHeart className="size-5 text-slate-800" />
            </div>
          </div>
        </Card>

        <Card className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="text-lg font-semibold text-slate-900">
                QR Code para resgate
              </div>
              <div className="text-sm text-slate-600">
                Diga: “Você recebeu uma mensagem no Cupido 302 ❤️. Escaneie o QR
                personalizado (ou use o código) para resgatar.”
              </div>
            </div>
            <div className="rounded-3xl bg-white p-4 ring-1 ring-black/10">
              <QRCodeCanvas value={redeemUrl} size={168} includeMargin />
            </div>
          </div>
          <div className="mt-4 break-all rounded-2xl bg-white/50 px-4 py-3 text-xs text-slate-600 ring-1 ring-black/5">
            {redeemUrl}
          </div>
        </Card>

        <Card className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-slate-900">
                Pessoas com mensagens aguardando
              </div>
              <div className="text-sm text-slate-600">
                Total: <span className="font-medium">{rows.length}</span>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              <RefreshCcw className="size-4" />
              Atualizar
            </Button>
          </div>

          <div className="mt-4 divide-y divide-black/5 overflow-hidden rounded-3xl ring-1 ring-black/5">
            {rows.length === 0 ? (
              <div className="bg-white/40 px-5 py-6 text-sm text-slate-600">
                {loading ? 'Carregando…' : 'Nenhuma pessoa aguardando agora.'}
              </div>
            ) : (
              rows.map((r, idx) => (
                <div key={`${r.destinatario_nome}-${r.destinatario_sobrenome}-${idx}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="bg-white/40 px-5 py-4">
                      <div className="text-sm font-semibold text-slate-900">
                        {r.destinatario_nome} {r.destinatario_sobrenome}{' '}
                        {r.destinatario_apelido ? (
                          <span className="text-slate-500">({r.destinatario_apelido})</span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {r.destinatario_turma ? `Turma: ${r.destinatario_turma} • ` : null}
                        {r.mensagens_aguardando}{' '}
                        {r.mensagens_aguardando === 1 ? 'mensagem' : 'mensagens'} aguardando
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        Código:{' '}
                        <span className="font-medium text-slate-900">{r.codigo ?? '—'}</span>
                      </div>
                      <div className="mt-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={() => {
                            const k = `${r.destinatario_nome}-${r.destinatario_sobrenome}-${r.destinatario_apelido ?? ''}-${r.destinatario_turma ?? ''}`
                            setOpenKey((prev) => (prev === k ? null : k))
                          }}
                        >
                          <QrCode className="size-4" />
                          QR de resgate
                        </Button>
                      </div>
                    </div>
                    <div className="bg-white/40 px-5 py-4">
                      <div className="rounded-full bg-cupido-blue/15 px-3 py-1 text-xs font-medium text-blue-800 ring-1 ring-blue-500/20">
                        {r.mensagens_aguardando}
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const k = `${r.destinatario_nome}-${r.destinatario_sobrenome}-${r.destinatario_apelido ?? ''}-${r.destinatario_turma ?? ''}`
                    if (openKey !== k) return null
                    const url = new URL(redeemBase)
                    if (r.codigo) url.searchParams.set('codigo', r.codigo)
                    return (
                      <div className="bg-white/40 px-5 pb-5">
                        <div className="mt-2 rounded-3xl bg-white/60 ring-1 ring-black/5 p-4 backdrop-blur">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                QR Code personalizado
                              </div>
                              <div className="mt-1 text-sm text-slate-600">
                                Abre o resgate com o código para liberar as mensagens.
                              </div>
                            </div>
                            <div className="rounded-3xl bg-white p-3 ring-1 ring-black/10">
                              <QRCodeCanvas value={url.toString()} size={152} includeMargin />
                            </div>
                          </div>
                          <div className="mt-3 break-all rounded-2xl bg-white/60 px-4 py-3 text-xs text-slate-600 ring-1 ring-black/5">
                            {url.toString()}
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </RequireRole>
  )
}
