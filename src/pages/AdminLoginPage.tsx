import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Field, TextInput } from '../components/Field'
import { SetupRequired } from '../components/SetupRequired'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type FormValues = {
  email: string
  password: string
}

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const redirect = params.get('redirect') ?? ''
  const force = params.get('force') === '1'
  const cupidoFlow = params.get('cupido') === '1' || redirect.startsWith('/cupidos')
  const { session, roleLoading, isAdmin, isCupido, refreshRole, signOut } = useAuth()

  const [submitting, setSubmitting] = useState(false)
  const [pendingAdminRedirect, setPendingAdminRedirect] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>()

  useEffect(() => {
    const email = session?.user?.email
    if (!email) return
    setValue('email', email, { shouldDirty: false })
  }, [session?.user?.email, setValue])

  const onSubmit = handleSubmit(async (values) => {
    const client = supabase
    if (!client) return
    setSubmitting(true)
    const { data, error } = await client.auth.signInWithPassword({
      email: values.email.trim(),
      password: values.password,
    })

    if (error) {
      toast.error(error.message || 'Login inválido')
      setSubmitting(false)
      return
    }

    const userId = data.session?.user?.id
    const checkMembership = async (
      table: 'administradores' | 'cupidos',
      id: string,
    ): Promise<boolean> => {
      const { data, error } = await client
        .from(table)
        .select('id')
        .eq('id', id)
        .maybeSingle()
      if (error) return false
      return Boolean(data?.id)
    }

    const [adminNow, cupidoNow] = userId
      ? await Promise.all([
          checkMembership('administradores', userId),
          checkMembership('cupidos', userId),
        ])
      : [false, false]

    await refreshRole(userId)
    toast.success('Bem-vindo(a)!')
    if (redirect) {
      if (redirect.startsWith('/admin') && adminNow && cupidoNow) {
        setPendingAdminRedirect(redirect)
        setSubmitting(false)
        return
      }

      if (cupidoFlow) sessionStorage.setItem('cupido_access_ok', '1')
      navigate(redirect, { replace: true })
      setSubmitting(false)
      return
    }

    if (adminNow && cupidoNow) {
      setSubmitting(false)
      return
    }

    if (cupidoNow) {
      sessionStorage.setItem('cupido_access_ok', '1')
      navigate('/cupidos', { replace: true })
      setSubmitting(false)
      return
    }

    navigate('/admin/moderacao', { replace: true })
    setSubmitting(false)
  })

  if (!isSupabaseConfigured) return <SetupRequired />

  return (
    <div className="space-y-4">
      <Card className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-2xl font-semibold tracking-tight text-slate-900">
              Acesso administrativo
            </div>
            <div className="text-sm text-slate-600">
              Somente administradores e cupidos autorizados.
            </div>
          </div>
          <div className="grid size-12 place-items-center rounded-3xl bg-white/60 ring-1 ring-black/5">
            <ShieldCheck className="size-5 text-slate-800" />
          </div>
        </div>
      </Card>

      <Card className="p-6 sm:p-8">
        {session && !force ? (
          <div className="space-y-4">
            <div className="text-sm text-slate-700">
              Logado como <span className="font-medium">{session.user.email}</span>
            </div>
            {roleLoading ? (
              <div className="rounded-2xl bg-white/50 px-4 py-3 text-sm text-slate-700 ring-1 ring-black/5">
                Carregando permissões…
              </div>
            ) : null}
            {isAdmin && isCupido ? (
              <div className="rounded-2xl bg-white/50 px-4 py-3 text-sm text-slate-700 ring-1 ring-black/5">
                Escolha o modo de acesso:
              </div>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              {isAdmin ? (
                <Button
                  className="w-full sm:w-auto"
                  variant="primary"
                  onClick={() => {
                    sessionStorage.removeItem('cupido_access_ok')
                    const target = pendingAdminRedirect ?? '/admin/moderacao'
                    setPendingAdminRedirect(null)
                    navigate(target)
                  }}
                >
                  Entrar como Admin
                </Button>
              ) : null}
              {isCupido ? (
                <Button
                  className="w-full sm:w-auto"
                  variant="secondary"
                  onClick={() => {
                    sessionStorage.setItem('cupido_access_ok', '1')
                    setPendingAdminRedirect(null)
                    navigate('/cupidos')
                  }}
                >
                  Entrar como Cupido
                </Button>
              ) : null}
              <Button className="w-full sm:w-auto" variant="ghost" onClick={signOut}>
                Sair
              </Button>
            </div>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={onSubmit}>
            <Field label="E-mail" error={errors.email?.message}>
              <TextInput
                type="email"
                autoComplete="email"
                placeholder="admin@escola.com"
                {...register('email', { required: 'Informe o e-mail' })}
              />
            </Field>
            <Field label="Senha" error={errors.password?.message}>
              <TextInput
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password', { required: 'Informe a senha' })}
              />
            </Field>
            <div className="flex items-center justify-end">
              <Button type="submit" disabled={submitting}>
                Entrar
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
