import { Card } from './Card'
import { Button } from './Button'

export function SetupRequired() {
  return (
    <Card className="p-6">
      <div className="space-y-2">
        <div className="text-lg font-semibold text-slate-900">
          Supabase não configurado
        </div>
        <div className="text-sm text-slate-600">
          Defina as variáveis <span className="font-medium">VITE_SUPABASE_URL</span>{' '}
          e <span className="font-medium">VITE_SUPABASE_ANON_KEY</span> para
          habilitar o Cupido 302.
        </div>
        <div className="pt-2">
          <Button
            variant="secondary"
            onClick={() => window.location.reload()}
            type="button"
          >
            Recarregar
          </Button>
        </div>
      </div>
    </Card>
  )
}

