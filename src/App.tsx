import { LoaderCircle } from 'lucide-react'

import { Brand } from './components/ui/brand'
import { useAuthSession } from './features/auth/use-auth'
import { AuthPage } from './pages/auth-page'
import { AppRoutes } from './routes'

function App() {
  const session = useAuthSession()
  if (session.isPending) return <SessionLoader />
  if (!session.data) return <AuthPage />
  return <AppRoutes />
}

function SessionLoader() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
      <div aria-live="polite" className="flex flex-col items-center gap-5">
        <div className="rounded-2xl border bg-card p-5 shadow-xl shadow-violet-950/10">
          <Brand />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin text-primary" />
          Restoring your workspace…
        </div>
      </div>
    </main>
  )
}

export default App
