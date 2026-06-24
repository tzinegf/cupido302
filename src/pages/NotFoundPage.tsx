import { Link } from 'react-router-dom'
import { Card } from '../components/Card'
import { Button } from '../components/Button'

export function NotFoundPage() {
  return (
    <Card className="p-6 sm:p-8">
      <div className="text-2xl font-semibold tracking-tight text-slate-900">
        Página não encontrada
      </div>
      <div className="mt-2 text-sm text-slate-600">
        O link pode estar incorreto ou ter expirado.
      </div>
      <div className="mt-5">
        <Link to="/">
          <Button variant="secondary">Voltar ao início</Button>
        </Link>
      </div>
    </Card>
  )
}

