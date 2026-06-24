import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { SetupRequired } from '../components/SetupRequired'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type Perfil = {
  id: string
  nome: string
  sobrenome: string
  apelido: string
  turma: string | null
  total_recebidas: number
}

export function ProfilePage() {
  const { usuarioId } = useParams<{ usuarioId: string }>()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [loading, setLoading] = useState(false)

  const profileUrl = useMemo(() => {
    const base = window.location.origin
    return usuarioId ? `${base}/perfil/${usuarioId}` : base
  }, [usuarioId])

  useEffect(() => {
    if (!usuarioId || !supabase) return
    const client = supabase
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        const { data } = await client.rpc('get_participante_perfil', {
          p_usuario_id: usuarioId,
        })
        if (cancelled) return
        setPerfil((data as Perfil | null) ?? null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [usuarioId])

  if (!isSupabaseConfigured) return <SetupRequired />

  return (
    <div className="space-y-4">
      <Card className="p-6 sm:p-8">
        <div className="space-y-1">
          <div className="text-sm text-slate-600">Perfil do participante</div>
          <div className="text-2xl font-semibold tracking-tight text-slate-900">
            {perfil ? (
              <>
                {perfil.nome} {perfil.sobrenome}{' '}
                <span className="text-slate-500">({perfil.apelido})</span>
              </>
            ) : loading ? (
              'Carregando…'
            ) : (
              'Não encontrado'
            )}
          </div>
          {perfil ? (
            <div className="text-sm text-slate-600">
              Mensagens recebidas: <span className="font-medium">{perfil.total_recebidas}</span>
              {perfil.turma ? (
                <>
                  {' '}
                  • Turma: <span className="font-medium">{perfil.turma}</span>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="text-lg font-semibold text-slate-900">Seu QR Code</div>
            <div className="text-sm text-slate-600">
              Use para acessar este perfil rapidamente em eventos e resgatar novas
              mensagens.
            </div>
            <div className="pt-2">
              <Link to="/resgatar">
                <Button variant="primary">Resgatar mensagens</Button>
              </Link>
            </div>
          </div>
          <div className="rounded-3xl bg-white p-4 ring-1 ring-black/10">
            <QRCodeCanvas value={profileUrl} size={184} includeMargin />
          </div>
        </div>
        <div className="mt-4 break-all rounded-2xl bg-white/50 px-4 py-3 text-xs text-slate-600 ring-1 ring-black/5">
          {profileUrl}
        </div>
      </Card>
    </div>
  )
}

