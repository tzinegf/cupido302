import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Search } from 'lucide-react'
import { Card } from '../components/Card'
import { TextInput } from '../components/Field'
import { Button } from '../components/Button'
import { supabase } from '../lib/supabase'

type UsuarioRow = {
  id: string
  nome: string
  sobrenome: string
  apelido: string
  turma: string | null
  created_at: string
}

export function ParticipantsPage() {
  const [rows, setRows] = useState<UsuarioRow[]>([])
  const [loading, setLoading] = useState(false)
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((u) => {
      const hay = `${u.nome} ${u.sobrenome} ${u.apelido} ${u.turma ?? ''}`.toLowerCase()
      return hay.includes(term)
    })
  }, [rows, q])

  const load = async () => {
    if (!supabase) return
    setLoading(true)
    const watchdogId = window.setTimeout(() => {
      setLoading(false)
    }, 12000)
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id,nome,sobrenome,apelido,turma,created_at')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) {
        toast.error('Falha ao carregar participantes')
        return
      }
      setRows((data as UsuarioRow[]) ?? [])
    } catch {
      toast.error('Falha ao carregar participantes')
    } finally {
      window.clearTimeout(watchdogId)
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

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
  }, [])

  return (
    <div className="space-y-4">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm text-slate-600">Participantes</div>
            <div className="text-xl font-semibold tracking-tight text-slate-900">
              Lista
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <TextInput
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome, apelido, turma…"
                className="pl-10"
              />
            </div>
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              Atualizar
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="divide-y divide-black/5">
          {filtered.length === 0 ? (
            <div className="px-5 py-6 text-sm text-slate-600">
              {loading ? 'Carregando…' : 'Nenhum participante encontrado.'}
            </div>
          ) : (
            filtered.map((u) => (
              <div key={u.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {u.nome} {u.sobrenome}{' '}
                      <span className="text-slate-500">({u.apelido})</span>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {u.turma ? `Turma: ${u.turma}` : 'Turma não informada'}
                    </div>
                  </div>
                  <div className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-black/10">
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
