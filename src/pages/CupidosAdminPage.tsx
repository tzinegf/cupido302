import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, RefreshCcw, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Field, TextInput } from '../components/Field'
import { supabase } from '../lib/supabase'

type CupidoRow = {
  id: string
  email: string
  created_at: string
}

type FormValues = {
  id: string
  email: string
}

export function CupidosAdminPage() {
  const [rows, setRows] = useState<CupidoRow[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>()

  const load = async () => {
    if (!supabase) return
    setLoading(true)
    const watchdogId = window.setTimeout(() => {
      setLoading(false)
    }, 12000)
    try {
      const { data, error } = await supabase
        .from('cupidos')
        .select('id,email,created_at')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) {
        toast.error('Falha ao carregar cupidos')
        return
      }

      setRows((data as CupidoRow[]) ?? [])
    } catch {
      toast.error('Falha ao carregar cupidos')
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

  const onSubmit = handleSubmit(async (values) => {
    if (!supabase) return
    setSubmitting(true)
    const id = values.id.trim()
    const email = values.email.trim().toLowerCase()

    const { error } = await supabase.from('cupidos').insert({ id, email })
    if (error) {
      toast.error('Não foi possível cadastrar este cupido')
      setSubmitting(false)
      return
    }

    toast.success('Cupido cadastrado')
    reset()
    setSubmitting(false)
    void load()
  })

  const remove = async (id: string) => {
    if (!supabase) return
    const { error } = await supabase.from('cupidos').delete().eq('id', id)
    if (error) {
      toast.error('Não foi possível remover')
      return
    }
    toast.success('Cupido removido')
    void load()
  }

  const hint = useMemo(
    () =>
      'Para cadastrar: crie o usuário no Supabase Auth (email/senha) e copie o UUID (auth.users.id).',
    [],
  )

  return (
    <div className="space-y-4">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm text-slate-600">Acesso</div>
            <div className="text-xl font-semibold tracking-tight text-slate-900">
              Cupidos
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw className="size-4" />
            Atualizar
          </Button>
        </div>
      </Card>

      <Card className="p-6 sm:p-8">
        <div className="text-sm text-slate-600">{hint}</div>
        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="UUID do usuário" error={errors.id?.message} hint="auth.users.id">
              <TextInput
                placeholder="Ex: 9f6f5c2e-…"
                {...register('id', {
                  required: 'Informe o UUID',
                  validate: (v) =>
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                      v.trim(),
                    )
                      ? true
                      : 'UUID inválido',
                })}
              />
            </Field>
            <Field label="E-mail" error={errors.email?.message}>
              <TextInput
                type="email"
                autoComplete="email"
                placeholder="cupido@escola.com"
                {...register('email', { required: 'Informe o e-mail' })}
              />
            </Field>
          </div>

          <div className="flex items-center justify-end">
            <Button type="submit" disabled={submitting}>
              <Plus className="size-4" />
              Cadastrar cupido
            </Button>
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden">
        <div className="divide-y divide-black/5">
          {rows.length === 0 ? (
            <div className="px-5 py-6 text-sm text-slate-600">
              {loading ? 'Carregando…' : 'Nenhum cupido cadastrado.'}
            </div>
          ) : (
            rows.map((c) => (
              <div key={c.id} className="px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{c.email}</div>
                    <div className="mt-1 text-xs text-slate-500">{c.id}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-black/10">
                      {new Date(c.created_at).toLocaleDateString('pt-BR')}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => remove(c.id)}>
                      <Trash2 className="size-4" />
                      Remover
                    </Button>
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
