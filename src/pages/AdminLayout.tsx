import { Outlet, NavLink } from 'react-router-dom'
import { BarChart3, ClipboardCheck, Users, LogOut, HandHeart } from 'lucide-react'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { RequireRole } from '../components/RequireRole'
import { useAuth } from '../contexts/AuthContext'

export function AdminLayout() {
  const { session, signOut } = useAuth()

  return (
    <RequireRole role="admin">
      <div className="space-y-4">
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm text-slate-600">Dashboard</div>
              <div className="text-2xl font-semibold tracking-tight text-slate-900">
                Administração
              </div>
              {session?.user?.email ? (
                <div className="mt-1 text-sm text-slate-600">{session.user.email}</div>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="ghost" onClick={signOut}>
                <LogOut className="size-4" />
                Sair
              </Button>
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Tab to="/admin/moderacao" icon={<ClipboardCheck className="size-4" />}>
            Mensagens
          </Tab>
          <Tab to="/admin/participantes" icon={<Users className="size-4" />}>
            Participantes
          </Tab>
          <Tab to="/admin/cupidos" icon={<HandHeart className="size-4" />}>
            Cupidos
          </Tab>
          <Tab to="/admin/estatisticas" icon={<BarChart3 className="size-4" />}>
            Estatísticas
          </Tab>
        </div>

        <Outlet />
      </div>
    </RequireRole>
  )
}

function Tab({
  to,
  icon,
  children,
}: {
  to: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1 transition',
          isActive
            ? 'bg-gradient-to-r from-cupido-pink to-cupido-purple text-white ring-transparent shadow-sm shadow-cupido-purple/20'
            : 'bg-white/60 text-slate-800 ring-black/10 hover:bg-white/80',
        ].join(' ')
      }
    >
      {icon}
      {children}
    </NavLink>
  )
}
