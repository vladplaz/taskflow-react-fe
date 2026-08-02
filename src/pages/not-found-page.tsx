import { ArrowLeft, Compass, LayoutDashboard } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { AppHeader } from '../components/layout/app-header'
import { Button } from '../components/ui/button'

/**
 * The end of every route that leads nowhere: the catch-all route, and the
 * pages whose own id does not resolve.
 */
export function NotFoundPage({
  description = 'The page you are looking for does not exist, or it moved somewhere else.',
  title = 'This page went missing',
}: {
  description?: string
  title?: string
}) {
  const navigate = useNavigate()

  return (
    <main className="flex min-h-screen flex-col bg-[#f7f7fa] text-zinc-950 dark:bg-[#0b0b0d] dark:text-zinc-50">
      <AppHeader />
      <section className="relative grid flex-1 place-items-center overflow-hidden px-5 py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.18),transparent_28rem)]" />
        <div className="relative flex max-w-xl flex-col items-center text-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-violet-500/10 text-violet-600 shadow-lg shadow-violet-600/10 dark:text-violet-300">
            <Compass className="size-7" />
          </span>
          <p
            aria-hidden
            className="mt-8 bg-gradient-to-b from-violet-600 to-violet-600/25 bg-clip-text text-7xl font-black tracking-tight text-transparent sm:text-8xl dark:from-violet-300 dark:to-violet-300/20"
          >
            404
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-4 text-zinc-500 dark:text-zinc-400">{description}</p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/">
                <LayoutDashboard /> Back to my boards
              </Link>
            </Button>
            <Button onClick={() => void navigate(-1)} size="lg" type="button" variant="outline">
              <ArrowLeft /> Go back
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
