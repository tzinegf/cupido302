import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useSearchParams } from 'react-router-dom'
import { Copy } from 'lucide-react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Field, TextInput } from '../components/Field'
import { SetupRequired } from '../components/SetupRequired'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type FormValues = {
  codigo: string
}

type RedeemedMessage = {
  id: string
  mensagem: string
  anonima: boolean
  emissor_nome: string | null
  emissor_sobrenome: string | null
  emissor_apelido: string | null
  emissor_turma: string | null
  created_at: string
}

type RedeemResult = {
  codigo: string
  mensagens: RedeemedMessage[]
}

const MISSING_RPC_SQL = `alter table public.mensagens add column if not exists claim_code text null;

drop function if exists public.resgatar_por_codigo(text);
create or replace function public.resgatar_por_codigo(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_codigo text := upper(regexp_replace(trim(coalesce(p_codigo, '')), '\\s+', '', 'g'));
  v_mensagens jsonb;
begin
  if v_codigo = '' then
    return null;
  end if;

  with candidatos as (
    select
      m.id,
      m.mensagem,
      m.anonima,
      m.emissor_nome,
      m.emissor_sobrenome,
      m.emissor_apelido,
      m.emissor_turma,
      m.created_at
    from public.mensagens m
    where m.status in ('AGUARDANDO_DESTINATARIO', 'ENTREGUE')
      and upper(coalesce(m.claim_code, '')) = v_codigo
  )
  select jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'mensagem', c.mensagem,
      'anonima', c.anonima,
      'emissor_nome', c.emissor_nome,
      'emissor_sobrenome', c.emissor_sobrenome,
      'emissor_apelido', c.emissor_apelido,
      'emissor_turma', c.emissor_turma,
      'created_at', c.created_at
    )
    order by c.created_at asc
  )
  into v_mensagens
  from candidatos c;

  if v_mensagens is null then
    return null;
  end if;

  update public.mensagens
  set
    status = 'ENTREGUE',
    delivered_at = now()
  where status = 'AGUARDANDO_DESTINATARIO'
    and upper(coalesce(claim_code, '')) = v_codigo;

  return jsonb_build_object(
    'codigo', v_codigo,
    'mensagens', v_mensagens
  );
end;
$$;`

export function RedeemPage() {
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<RedeemResult | null>(null)
  const [missingRpc, setMissingRpc] = useState(false)
  const [params] = useSearchParams()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>()

  useEffect(() => {
    const codigo = params.get('codigo')
    if (codigo) setValue('codigo', codigo, { shouldDirty: false })
  }, [params, setValue])

  useEffect(() => {
    const codigo = params.get('codigo')
    const client = supabase
    if (!codigo || !client) return
    const normalized = codigo.trim().replace(/\s+/g, '').toUpperCase()
    if (!normalized) return
    let cancelled = false
    const run = async () => {
      setSubmitting(true)
      try {
        const { data, error } = await client.rpc('resgatar_por_codigo', {
          p_codigo: normalized,
        })
        if (cancelled) return
        if (error) {
          const msg = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase()
          const isMissing =
            msg.includes('could not find the function') ||
            msg.includes('schema cache') ||
            msg.includes('pgrst202') ||
            msg.includes('not found')
          if (isMissing) setMissingRpc(true)
          toast.error('Não foi possível resgatar. Tente novamente.')
          return
        }
        const parsed = (data as RedeemResult | null) ?? null
        if (!parsed || !Array.isArray(parsed.mensagens) || parsed.mensagens.length === 0) {
          toast('Nenhuma mensagem aprovada encontrada ❤️')
          setResult(null)
          return
        }
        setResult(parsed)
        toast.success(`Você possui ${parsed.mensagens.length} mensagens aguardando ❤️`)
      } finally {
        if (!cancelled) setSubmitting(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [params])

  const messageCount = useMemo(() => result?.mensagens?.length ?? 0, [result])

  const onSubmit = handleSubmit(async (values) => {
    const client = supabase
    if (!client) return
    setSubmitting(true)

    const codigo = values.codigo.trim().replace(/\s+/g, '').toUpperCase()

    const payload = {
      p_codigo: codigo,
    }

    const { data, error } = await client.rpc('resgatar_por_codigo', payload)

    if (error) {
      const msg = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase()
      const isMissing =
        msg.includes('could not find the function') ||
        msg.includes('schema cache') ||
        msg.includes('pgrst202') ||
        msg.includes('not found')
      if (isMissing) setMissingRpc(true)
      toast.error('Não foi possível resgatar. Tente novamente.')
      setSubmitting(false)
      return
    }

    const parsed = (data as RedeemResult | null) ?? null
    if (!parsed || !Array.isArray(parsed.mensagens) || parsed.mensagens.length === 0) {
      toast('Nenhuma mensagem aprovada encontrada ❤️')
      setResult(null)
      setSubmitting(false)
      return
    }

    setResult(parsed)
    toast.success(`Você possui ${parsed.mensagens.length} mensagens aguardando ❤️`)
    setSubmitting(false)
  })

  if (!isSupabaseConfigured) return <SetupRequired />

  return (
    <div className="space-y-4">
      {missingRpc ? (
        <Card className="p-6 sm:p-8">
          <div className="text-lg font-semibold tracking-tight text-slate-900">
            Banco não atualizado
          </div>
          <div className="mt-2 text-sm text-slate-600">
            A função de resgate por código ainda não existe no Supabase. Execute este
            SQL no Supabase SQL Editor e recarregue.
          </div>
          <pre className="mt-4 overflow-auto rounded-2xl bg-black/5 p-4 text-xs text-slate-800 ring-1 ring-black/10">
            {MISSING_RPC_SQL}
          </pre>
        </Card>
      ) : null}

      {result ? (
        <div className="space-y-4">
          <Card className="p-6 sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm text-slate-600">Resgate</div>
                <div className="text-xl font-semibold tracking-tight text-slate-900">
                  Código <span className="text-slate-500">{result.codigo}</span>
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  Salve esse código para acessar sua mensagem depois.
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Você possui <span className="font-medium">{messageCount}</span>{' '}
                  mensagens ❤️
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  variant="secondary"
                  className="w-full sm:w-auto"
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(result.codigo)
                      toast.success('Código copiado')
                    } catch {
                      toast.error('Não foi possível copiar o código')
                    }
                  }}
                >
                  <Copy className="size-4" />
                  Copiar código
                </Button>
                <Link to="/" className="w-full sm:w-auto">
                  <Button variant="secondary" className="w-full">
                    Voltar ao início
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          <div className="grid gap-4">
            {result.mensagens.map((m, idx) => (
              <Card key={m.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Mensagem #{idx + 1}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {m.anonima
                        ? 'Anônima'
                        : `De: ${
                            [m.emissor_nome, m.emissor_sobrenome].filter(Boolean).join(' ') ||
                            'Identificado'
                          }${m.emissor_apelido ? ` (${m.emissor_apelido})` : ''}`}
                    </div>
                  </div>
                  <div className="rounded-full bg-cupido-pink/15 px-3 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-500/20">
                    ENTREGUE
                  </div>
                </div>
                <div className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-slate-900">
                  {m.mensagem}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      <Card className="p-6 sm:p-8">
        <div className="space-y-2">
          <div className="text-2xl font-semibold tracking-tight text-slate-900">
            Resgatar mensagens
          </div>
          <div className="text-sm text-slate-600">
            Para ler a mensagem, use o QR Code recebido ou informe o código do
            resgate. Não pedimos telefone, e-mail ou redes sociais.
          </div>
        </div>
      </Card>

      <Card className="p-6 sm:p-8">
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-4">
            <Field label="Código de resgate" error={errors.codigo?.message} hint="Obrigatório">
              <TextInput
                placeholder="Ex: A1B2C3D4E5F6"
                autoComplete="one-time-code"
                {...register('codigo', { required: 'Informe o código' })}
              />
            </Field>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              Ao encontrar mensagens, o sistema marca como{' '}
              <span className="font-medium">ENTREGUE</span>.
            </div>
            <Button type="submit" disabled={submitting} size="lg">
              Resgatar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
