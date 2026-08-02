import { ArrowUpRight, LockKeyhole, UsersRound } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'

import { AppHeader } from '../components/layout/app-header'
import { NewBoardCard } from '../components/boards/new-board-card'
import { Skeleton } from '../components/ui/skeleton'
import { Button } from '../components/ui/button'
import { useBoards } from '../features/boards/use-boards'
import { useWorkspaces } from '../features/workspaces/use-workspaces'

export function BoardsPage() {
  const workspaceId = Number(useParams().workspaceId)
  const workspaces = useWorkspaces()
  const workspace = workspaces.data?.find((item) => item.id === workspaceId)
  const canAdmin = workspace?.membership_role === 'owner' || workspace?.membership_role === 'admin'
  const boards = useBoards(Number.isInteger(workspaceId) ? workspaceId : null)
  if (!workspace && !workspaces.isPending)
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-50">
        Workspace not found.
      </main>
    )
  if (workspace && !canAdmin) return <Navigate replace to="/" />
  return (
    <main className="min-h-screen bg-[#f7f7fa] text-zinc-950 dark:bg-[#0b0b0d] dark:text-zinc-50">
      <AppHeader />
      <section className="mx-auto max-w-6xl px-5 py-10">
        <Link
          className="text-sm font-semibold text-zinc-500 hover:text-violet-600 dark:text-zinc-400"
          to="/admin"
        >
          ← Admin setup
        </Link>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">WORKSPACE ADMIN</p>
            {workspaces.isPending ? (
              <Skeleton className="mt-2 h-10 w-56" />
            ) : (
              <h1 className="mt-2 text-4xl font-bold tracking-tight">{workspace?.name}</h1>
            )}
            <p className="mt-3 max-w-xl text-zinc-500 dark:text-zinc-400">
              Create collaboration spaces and decide whether each board is private or discoverable by the
              workspace.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canAdmin && (
              <Button asChild variant="outline">
                <Link to={`/admin/workspaces/${workspaceId}/members`}>
                  <UsersRound /> Manage people
                </Link>
              </Button>
            )}
            <span className="rounded-full bg-zinc-200/70 px-3 py-1.5 text-sm font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
              {boards.data?.length ?? 0} boards
            </span>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.isPending ? (
            <>
              <Skeleton className="min-h-40 rounded-2xl" />
              <Skeleton className="min-h-40 rounded-2xl" />
              <Skeleton className="min-h-40 rounded-2xl" />
            </>
          ) : (
            boards.data?.map((board, index) => (
              <Link
                className="group flex h-full min-h-40 flex-col rounded-2xl border border-zinc-200/80 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-zinc-950/8 dark:border-white/10 dark:bg-zinc-900"
                key={board.id}
                to={`/workspaces/${workspaceId}/boards/${board.id}`}
              >
                <div
                  className={`h-1.5 w-14 rounded-full ${['bg-violet-500', 'bg-teal-500', 'bg-amber-500', 'bg-rose-500'][index % 4]}`}
                />
                <h2 className="mt-7 text-xl font-bold tracking-tight">{board.name}</h2>
                {board.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {board.description}
                  </p>
                )}
                <div className="mt-auto flex items-center justify-between pt-5">
                  <span
                    aria-label={board.visibility === 'private' ? 'Private board' : 'Visible to workspace'}
                    className="grid size-8 place-items-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-300"
                    role="img"
                    title={board.visibility === 'private' ? 'Private board' : 'Visible to workspace'}
                  >
                    {board.visibility === 'private' ? (
                      <LockKeyhole className="size-4" />
                    ) : (
                      <UsersRound className="size-4" />
                    )}
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-5 text-violet-600 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 dark:text-violet-400"
                  />
                </div>
              </Link>
            ))
          )}
          {workspace && <NewBoardCard workspaceId={workspace.id} />}
        </div>
      </section>
    </main>
  )
}
