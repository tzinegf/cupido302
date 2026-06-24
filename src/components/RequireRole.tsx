import { Navigate, useLocation } from 'react-router-dom'
import { Card } from './Card'
import { useAuth } from '../contexts/AuthContext'

export function RequireRole({
  role,
  children,
}: {
  role: 'admin' | 'cupido'
  children: React.ReactNode
}) {
  const { loading, roleLoading, session, isAdmin, isCupido } = useAuth()
  const location = useLocation()

  if (loading || roleLoading) {
    return (
      <Card className="p-6">
        <div className="text-sm text-slate-600">Carregando…</div>
      </Card>
    )
  }

  if (!session) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/admin/login?redirect=${redirect}`} replace />
  }

  if (role === 'cupido' && location.pathname.startsWith('/cupidos')) {
    const ok = sessionStorage.getItem('cupido_access_ok') === '1'
    if (!ok) {
      const redirect = encodeURIComponent(location.pathname + location.search)
      return <Navigate to={`/admin/login?redirect=${redirect}&force=1&cupido=1`} replace />
    }
  }

  const allowed = role === 'admin' ? isAdmin : isCupido
  if (!allowed) {
    return (
      <Card className="p-6">
        <div className="text-lg font-semibold text-slate-900">Acesso negado</div>
        <div className="mt-1 text-sm text-slate-600">
          Sua conta não possui permissão para acessar esta área.
        </div>
      </Card>
    )
  }

  return <>{children}</>
}
