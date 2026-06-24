import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ListChecks, MailPlus, PenLine, User, Users } from 'lucide-react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { Field, SelectInput, TextArea, TextInput } from '../components/Field'
import { SetupRequired } from '../components/SetupRequired'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { normalizeHumanText, normalizeOptional } from '../lib/normalize'

function getSenderFingerprint() {
  const key = 'cupido302_sender_fp'
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const fp = crypto.randomUUID()
  localStorage.setItem(key, fp)
  return fp
}

const STANDARD_MESSAGES = [
  'Você é uma pessoa muito especial para mim.',
  'Adorei lhe conhecer.',
  'Seu sorriso deixa o dia mais leve.',
  'Você torna tudo mais divertido.',
  'Obrigado(a) por ser tão incrível.',
  'Tenho muita admiração por você.',
  'Você ilumina o ambiente quando chega.',
  'Queria dizer que gosto muito de você.',
  'Você me inspira a ser melhor.',
  'Você tem um jeito único e encantador.',
  'Seu carinho faz diferença.',
  'Que bom que você faz parte disso tudo.',
  'Você é a melhor parte do meu dia.',
  'Se eu pudesse, te daria um abraço agora.',
  'Você merece coisas lindas.',
  'Você é uma companhia maravilhosa.',
  'Seu jeito me faz sorrir.',
  'Você é muito importante para mim.',
  'Torcendo por você sempre!',
  'Que nossa amizade (ou história) seja cheia de momentos bons.',
]

type FormValues = {
  nome: string
  sobrenome: string
  apelido?: string
  turma?: string
  emissor_nome?: string
  emissor_sobrenome?: string
  emissor_apelido?: string
  emissor_turma?: string
  mensagem_modo: 'PERSONALIZADA' | 'PADRAO'
  mensagem_padrao?: string
  mensagem: string
  tipo: 'ANONIMA' | 'IDENTIFICADA'
}

export function SendMessagePage() {
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormValues>({
    defaultValues: { tipo: 'ANONIMA', mensagem_modo: 'PERSONALIZADA' },
  })

  const tipo = watch('tipo')
  const mensagemModo = watch('mensagem_modo')

  const onSubmit = handleSubmit(async (values) => {
    if (!supabase) return
    setSubmitting(true)
    const senderFingerprint = getSenderFingerprint()
    const destinatarioNome = normalizeHumanText(values.nome)
    const destinatarioSobrenome = normalizeHumanText(values.sobrenome)
    const destinatarioApelido = normalizeOptional(values.apelido) ?? null
    const destinatarioTurma = normalizeOptional(values.turma) ?? null
    const mensagemText =
      values.mensagem_modo === 'PADRAO' ? values.mensagem_padrao ?? '' : values.mensagem
    const mensagem = normalizeHumanText(mensagemText)
    const anonima = values.tipo === 'ANONIMA'

    const emissorNome = anonima ? null : normalizeOptional(values.emissor_nome)
    const emissorSobrenome = anonima ? null : normalizeOptional(values.emissor_sobrenome)
    const emissorApelido = anonima ? null : normalizeOptional(values.emissor_apelido)
    const emissorTurma = anonima ? null : normalizeOptional(values.emissor_turma)

    if (!mensagem) {
      toast.error('Escolha ou escreva uma mensagem')
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from('mensagens').insert({
      destinatario_nome: destinatarioNome,
      destinatario_sobrenome: destinatarioSobrenome,
      destinatario_apelido: destinatarioApelido,
      destinatario_turma: destinatarioTurma,
      sender_fingerprint: senderFingerprint,
      emissor_nome: emissorNome,
      emissor_sobrenome: emissorSobrenome,
      emissor_apelido: emissorApelido,
      emissor_turma: emissorTurma,
      mensagem,
      anonima,
      status: 'PENDENTE_MODERACAO',
    })

    if (error) {
      toast.error('Não foi possível enviar. Tente novamente.')
      setSubmitting(false)
      return
    }

    toast.success('Seu correio elegante foi enviado para análise ❤️')
    reset({ tipo: 'ANONIMA', mensagem_modo: 'PERSONALIZADA' })
    setSubmitting(false)
  })

  if (!isSupabaseConfigured) return <SetupRequired />

  return (
    <div className="space-y-4">
      <Card className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-2xl font-semibold tracking-tight text-slate-900">
              Enviar mensagem
            </div>
            <div className="text-sm text-slate-600">
              O destinatário não precisa estar cadastrado. Tudo passa por
              moderação.
            </div>
          </div>
          <div className="grid size-12 place-items-center rounded-3xl bg-white/60 ring-1 ring-black/5">
            <MailPlus className="size-5 text-slate-800" />
          </div>
        </div>
      </Card>

      <Card className="p-6 sm:p-8">
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do destinatário" error={errors.nome?.message}>
              <TextInput
                placeholder="Ex: Maria"
                {...register('nome', { required: 'Informe o nome' })}
              />
            </Field>
            <Field
              label="Sobrenome do destinatário"
              error={errors.sobrenome?.message}
            >
              <TextInput
                placeholder="Ex: Silva"
                {...register('sobrenome', { required: 'Informe o sobrenome' })}
              />
            </Field>
            <Field label="Apelido (opcional)" error={errors.apelido?.message}>
              <TextInput placeholder="Ex: Mari" {...register('apelido')} />
            </Field>
            <Field label="Turma (opcional)" error={errors.turma?.message}>
              <TextInput placeholder="Ex: 2ºA" {...register('turma')} />
            </Field>
          </div>

          <div className="rounded-3xl bg-white/40 ring-1 ring-black/5 p-5">
            <div className="text-sm font-semibold text-slate-900">Tipo de mensagem</div>
            <div className="mt-1 text-sm text-slate-600">
              Escolha uma mensagem pronta ou escreva uma personalizada.
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white/50 p-4 ring-1 ring-black/5">
                <input
                  className="size-4 accent-cupido-purple"
                  type="radio"
                  value="PERSONALIZADA"
                  {...register('mensagem_modo', { required: true })}
                />
                <div className="flex items-center gap-2">
                  <PenLine className="size-4 text-slate-700" />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Personalizada
                    </div>
                    <div className="text-xs text-slate-600">Você escreve do seu jeito.</div>
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white/50 p-4 ring-1 ring-black/5">
                <input
                  className="size-4 accent-cupido-purple"
                  type="radio"
                  value="PADRAO"
                  {...register('mensagem_modo', { required: true })}
                />
                <div className="flex items-center gap-2">
                  <ListChecks className="size-4 text-slate-700" />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Padrão</div>
                    <div className="text-xs text-slate-600">
                      Escolha uma mensagem pronta.
                    </div>
                  </div>
                </div>
              </label>
            </div>

            <div className="mt-4">
              {mensagemModo === 'PADRAO' ? (
                <Field
                  label="Mensagem padrão"
                  error={errors.mensagem_padrao?.message}
                  hint={`${STANDARD_MESSAGES.length} opções`}
                >
                  <SelectInput
                    defaultValue=""
                    {...register('mensagem_padrao', {
                      validate: (v) =>
                        mensagemModo !== 'PADRAO' || (v ?? '').trim().length > 0
                          ? true
                          : 'Escolha uma mensagem',
                    })}
                  >
                    <option value="" disabled>
                      Selecione…
                    </option>
                    {STANDARD_MESSAGES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
              ) : (
                <Field label="Mensagem" error={errors.mensagem?.message} hint="Máx. 400">
                  <TextArea
                    maxLength={400}
                    placeholder="Escreva algo divertido, leve e respeitoso…"
                    {...register('mensagem', {
                      validate: (v) =>
                        mensagemModo !== 'PERSONALIZADA' || (v ?? '').trim().length >= 3
                          ? true
                          : 'Escreva a mensagem',
                    })}
                  />
                </Field>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white/50 p-4 ring-1 ring-black/5">
              <input
                className="size-4 accent-cupido-purple"
                type="radio"
                value="ANONIMA"
                {...register('tipo', { required: true })}
              />
              <div className="flex items-center gap-2">
                <Users className="size-4 text-slate-700" />
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Anônima
                  </div>
                  <div className="text-xs text-slate-600">
                    O destinatário não verá quem enviou.
                  </div>
                </div>
              </div>
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white/50 p-4 ring-1 ring-black/5">
              <input
                className="size-4 accent-cupido-purple"
                type="radio"
                value="IDENTIFICADA"
                {...register('tipo', { required: true })}
              />
              <div className="flex items-center gap-2">
                <User className="size-4 text-slate-700" />
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Identificada
                  </div>
                  <div className="text-xs text-slate-600">
                    Vamos pedir seus dados (sem telefone, e-mail ou redes sociais).
                  </div>
                </div>
              </div>
            </label>
          </div>

          {tipo === 'IDENTIFICADA' ? (
            <div className="rounded-3xl bg-white/40 ring-1 ring-black/5 p-5">
              <div className="text-sm font-semibold text-slate-900">
                Dados do emissor
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Esses dados ficam visíveis para o destinatário após a entrega.
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Seu nome" error={errors.emissor_nome?.message}>
                  <TextInput
                    placeholder="Ex: João"
                    {...register('emissor_nome', {
                      validate: (v) =>
                        tipo !== 'IDENTIFICADA' || (v ?? '').trim().length > 0
                          ? true
                          : 'Informe seu nome',
                    })}
                  />
                </Field>
                <Field
                  label="Seu sobrenome"
                  error={errors.emissor_sobrenome?.message}
                >
                  <TextInput
                    placeholder="Ex: Santos"
                    {...register('emissor_sobrenome', {
                      validate: (v) =>
                        tipo !== 'IDENTIFICADA' || (v ?? '').trim().length > 0
                          ? true
                          : 'Informe seu sobrenome',
                    })}
                  />
                </Field>
                <Field label="Seu apelido (opcional)" error={errors.emissor_apelido?.message}>
                  <TextInput placeholder="Ex: Jão" {...register('emissor_apelido')} />
                </Field>
                <Field label="Sua turma (opcional)" error={errors.emissor_turma?.message}>
                  <TextInput placeholder="Ex: 3ºB" {...register('emissor_turma')} />
                </Field>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              Status inicial: <span className="font-medium">pendente</span>
            </div>
            <Button type="submit" disabled={submitting} size="lg">
              Enviar para moderação
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
