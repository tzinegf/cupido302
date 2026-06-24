import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppShell } from './components/AppShell'
import { HomePage } from './pages/HomePage'
import { SendMessagePage } from './pages/SendMessagePage'
import { RedeemPage } from './pages/RedeemPage'
import { ProfilePage } from './pages/ProfilePage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AdminLayout } from './pages/AdminLayout'
import { ModerationPage } from './pages/ModerationPage'
import { ParticipantsPage } from './pages/ParticipantsPage'
import { AdminStatsPage } from './pages/AdminStatsPage'
import { CupidosAdminPage } from './pages/CupidosAdminPage'
import { CupidoCentralPage } from './pages/CupidoCentralPage'
import { NotFoundPage } from './pages/NotFoundPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'enviar', element: <SendMessagePage /> },
      { path: 'resgatar', element: <RedeemPage /> },
      { path: 'perfil/:usuarioId', element: <ProfilePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '/admin/login', element: <AdminLoginPage /> },
  {
    path: '/admin',
    element: <AppShell />,
    children: [
      {
        path: '',
        element: <AdminLayout />,
        children: [
          { path: 'moderacao', element: <ModerationPage /> },
          { path: 'participantes', element: <ParticipantsPage /> },
          { path: 'cupidos', element: <CupidosAdminPage /> },
          { path: 'estatisticas', element: <AdminStatsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
  {
    path: '/cupidos',
    element: <AppShell />,
    children: [{ index: true, element: <CupidoCentralPage /> }],
  },
])

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        toastOptions={{
          style: { borderRadius: '16px' },
        }}
      />
    </>
  )
}
