export type MessageStatus =
  | 'PENDENTE_MODERACAO'
  | 'AGUARDANDO_DESTINATARIO'
  | 'ENTREGUE'
  | 'REJEITADA'

export const messageStatusLabel: Record<MessageStatus, string> = {
  PENDENTE_MODERACAO: 'Pendente',
  AGUARDANDO_DESTINATARIO: 'Aguardando destinatário',
  ENTREGUE: 'Entregue',
  REJEITADA: 'Rejeitada',
}

export const messageStatusTone: Record<MessageStatus, string> = {
  PENDENTE_MODERACAO: 'bg-amber-500/15 text-amber-700 ring-amber-500/20',
  AGUARDANDO_DESTINATARIO: 'bg-cupido-blue/15 text-blue-700 ring-blue-500/20',
  ENTREGUE: 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/20',
  REJEITADA: 'bg-rose-500/15 text-rose-700 ring-rose-500/20',
}

