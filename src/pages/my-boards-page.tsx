import { LayoutDashboard, LockKeyhole, UsersRound } from 'lucide-react'
import { Link } from 'react-router'

import { AppHeader } from '../components/layout/app-header'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import { useMyBoards } from '../features/boards/use-boards'
import type { Board } from '../lib/api'

export function MyBoardsPage() {
  const boards = useMyBoards()
  const groups = groupBoardsByWorkspace(boards.data ?? [])

  return (
    <main className="min-h-screen bg-[#f7f7fa] text-zinc-950 dark:bg-[#0b0b0d] dark:text-zinc-50">
      <AppHeader />
      <section className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">MY BOARDS</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Your work, ready to go.</h1>
        <p className="mt-4 max-w-2xl text-zinc-500 dark:text-zinc-400">
          Open a board to work on tasks. Workspace and board setup live in a separate admin area.
        </p>

        {boards.isPending ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        ) : groups.length ? (
          <div className="mt-10 space-y-10">
            {groups.map((group) => (
              <section key={group.workspaceId}>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold">{group.workspaceName}</h2>
                  <Badge variant="secondary">{group.boards.length}</Badge>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.boards.map((board, index) => (
                    <BoardCard board={board} index={index} key={board.id} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <Card className="mt-10 border-dashed">
            <CardContent className="grid place-items-center px-6 py-16 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-violet-500/10 text-violet-600">
                <LayoutDashboard />
              </span>
              <h2 className="mt-5 text-xl font-bold">No boards yet</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Ask your team admin or workspace owner to invite you to the board where your team works.
              </p>
              <Button asChild className="mt-6" variant="outline">
                <Link to="/invitations">Check invitations</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  )
}

function BoardCard({ board, index }: { board: Board; index: number }) {
  const colors = ['bg-violet-500', 'bg-teal-500', 'bg-amber-500', 'bg-rose-500']
  return (
    <Link
      className="group min-h-44 rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-zinc-950/8 dark:border-white/10 dark:bg-zinc-900"
      to={`/workspaces/${board.workspace_id}/boards/${board.id}`}
    >
      <div className={`h-1.5 w-14 rounded-full ${colors[index % colors.length]}`} />
      <div className="mt-6 flex items-start justify-between gap-3">
        <h3 className="text-xl font-bold tracking-tight">{board.name}</h3>
        <Badge className="capitalize" variant="secondary">
          {board.access_role}
        </Badge>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        {board.description || 'Open the board and continue your team’s work.'}
      </p>
      <p className="mt-5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {board.visibility === 'private' ? (
          <LockKeyhole className="size-3.5" />
        ) : (
          <UsersRound className="size-3.5" />
        )}
        {board.visibility === 'private' ? 'Private board' : 'Visible to workspace'}
      </p>
    </Link>
  )
}

function groupBoardsByWorkspace(boards: Board[]) {
  const groups = new Map<number, { workspaceId: number; workspaceName: string; boards: Board[] }>()
  boards.forEach((board) => {
    const group = groups.get(board.workspace_id) ?? {
      workspaceId: board.workspace_id,
      workspaceName: board.workspace_name,
      boards: [],
    }
    group.boards.push(board)
    groups.set(board.workspace_id, group)
  })
  return [...groups.values()]
}
