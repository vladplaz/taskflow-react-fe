import { Building2 } from 'lucide-react'
import { Link } from 'react-router'

import { AppHeader } from '../components/layout/app-header'
import { Skeleton } from '../components/ui/skeleton'
import { NewWorkspaceCard } from '../components/workspaces/new-workspace-card'
import { useWorkspaces } from '../features/workspaces/use-workspaces'
import { ApiError } from '../lib/api'

function getErrorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again'
}

export function WorkspacesPage() {
  const workspaces = useWorkspaces()
  const administeredWorkspaces = workspaces.data?.filter(
    (workspace) => workspace.membership_role === 'owner' || workspace.membership_role === 'admin',
  )
  return (
    <main className="min-h-screen bg-[#f7f7fa] text-zinc-950 dark:bg-[#0b0b0d] dark:text-zinc-50">
      <AppHeader />
      <section className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <Link className="text-sm font-semibold text-zinc-500 hover:text-violet-600" to="/">
          ← Back to my boards
        </Link>
        <div className="mt-8 flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">ADMIN SETUP</p>
            <h1 className="mt-2 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
              Workspaces are for organization.
            </h1>
            <p className="mt-4 max-w-2xl text-zinc-500 dark:text-zinc-400">
              Owners and admins create boards, manage workspace-wide access, and invite the people who
              organize the team. Day-to-day task work stays in My boards.
            </p>
          </div>
          <NewWorkspaceCard />
        </div>
        {workspaces.isError && (
          <p className="mt-8 rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
            {getErrorMessage(workspaces.error)}
          </p>
        )}
        <div className="mt-12 flex items-center justify-between border-b border-zinc-200/80 pb-4 dark:border-white/10">
          <h2 className="text-lg font-bold tracking-tight">Managed workspaces</h2>
          {!workspaces.isPending && (
            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              {administeredWorkspaces?.length ?? 0}
            </span>
          )}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.isPending ? (
            <>
              <Skeleton className="min-h-52 rounded-2xl" />
              <Skeleton className="min-h-52 rounded-2xl" />
              <Skeleton className="min-h-52 rounded-2xl" />
            </>
          ) : administeredWorkspaces?.length ? (
            administeredWorkspaces?.map((workspace, index) => (
              <Link
                className="group min-h-52 rounded-2xl border border-zinc-200/80 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-zinc-950/8 dark:border-white/10 dark:bg-zinc-900"
                key={workspace.id}
                to={`/admin/workspaces/${workspace.id}`}
              >
                <div
                  className={`h-1.5 w-14 rounded-full ${['bg-violet-500', 'bg-teal-500', 'bg-amber-500', 'bg-rose-500'][index % 4]}`}
                />
                <div className="mt-7 flex items-start justify-between gap-3">
                  <h2 className="text-xl font-bold tracking-tight">{workspace.name}</h2>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold capitalize text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                    {workspace.membership_role}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  {workspace.description || 'A focused place for this team’s work.'}
                </p>
                <p className="mt-7 text-sm font-semibold text-violet-600 transition group-hover:translate-x-1 dark:text-violet-400">
                  Configure workspace →
                </p>
              </Link>
            ))
          ) : (
            <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-zinc-300 bg-white/50 px-6 text-center sm:col-span-2 lg:col-span-3 dark:border-white/15 dark:bg-white/[0.03]">
              <div>
                <span className="mx-auto grid size-11 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                  <Building2 className="size-5" />
                </span>
                <p className="mt-4 font-semibold">No workspaces to manage yet</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Use New workspace above when you’re ready to organize a team.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
