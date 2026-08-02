import { Check, Inbox, LoaderCircle, X } from 'lucide-react'

import { AppHeader } from '../components/layout/app-header'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import {
  useMyBoardInvitations,
  useMyWorkspaceInvitations,
  useRespondToBoardInvitation,
  useRespondToWorkspaceInvitation,
} from '../features/invitations/use-invitations'
import type { BoardInvitation, WorkspaceInvitation } from '../lib/api'

export function InvitationsPage() {
  const workspaceInvitations = useMyWorkspaceInvitations()
  const boardInvitations = useMyBoardInvitations()
  const respondToWorkspace = useRespondToWorkspaceInvitation()
  const respondToBoard = useRespondToBoardInvitation()
  const isPending = workspaceInvitations.isPending || boardInvitations.isPending
  const hasInvitations = Boolean(workspaceInvitations.data?.length || boardInvitations.data?.length)
  return (
    <main className="min-h-screen bg-[#f7f7fa] text-zinc-950 dark:bg-[#0b0b0d] dark:text-zinc-50">
      <AppHeader />
      <section className="mx-auto max-w-3xl px-5 py-12">
        <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">YOUR INVITATIONS</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Join your team’s work</h1>
        <p className="mt-3 text-zinc-500 dark:text-zinc-400">
          Workspace invitations are for team-wide administration. Board invitations give you access to the
          actual task board.
        </p>

        <div className="mt-8 space-y-4">
          {isPending ? (
            <>
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </>
          ) : hasInvitations ? (
            <>
              {boardInvitations.data?.map((invitation) => (
                <InvitationCard
                  invitation={invitation}
                  key={`board-${invitation.id}`}
                  kind="board"
                  onRespond={(response) => respondToBoard.mutate({ invitationId: invitation.id, response })}
                  responding={respondToBoard.isPending}
                />
              ))}
              {workspaceInvitations.data?.map((invitation) => (
                <InvitationCard
                  invitation={invitation}
                  key={`workspace-${invitation.id}`}
                  kind="workspace"
                  onRespond={(response) =>
                    respondToWorkspace.mutate({ invitationId: invitation.id, response })
                  }
                  responding={respondToWorkspace.isPending}
                />
              ))}
            </>
          ) : (
            <Card>
              <CardContent className="grid place-items-center py-14 text-center">
                <Inbox className="size-8 text-muted-foreground" />
                <p className="mt-4 font-semibold">No invitations waiting</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  New workspace and board invitations will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </main>
  )
}

function InvitationCard({
  invitation,
  kind,
  onRespond,
  responding,
}: {
  invitation: BoardInvitation | WorkspaceInvitation
  kind: 'board' | 'workspace'
  onRespond: (response: 'accept' | 'reject') => void
  responding: boolean
}) {
  const boardInvitation = kind === 'board' ? (invitation as BoardInvitation) : null
  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
          <Inbox />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">
              {boardInvitation ? boardInvitation.board_name : invitation.workspace_name}
            </h2>
            <Badge variant="outline">{kind}</Badge>
            {boardInvitation && (
              <Badge className="capitalize" variant="secondary">
                {boardInvitation.role}
              </Badge>
            )}
            <Badge variant={invitation.status === 'rejected' ? 'destructive' : 'secondary'}>
              {invitation.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {boardInvitation ? `${boardInvitation.workspace_name} · ` : ''}
            Invited by {invitation.invited_by_name || `the ${kind} admin`}
          </p>
        </div>
        {invitation.status === 'pending' && (
          <div className="flex gap-2">
            <Button disabled={responding} onClick={() => onRespond('reject')} variant="outline">
              <X /> Decline
            </Button>
            <Button disabled={responding} onClick={() => onRespond('accept')}>
              {responding ? <LoaderCircle className="animate-spin" /> : <Check />}
              Accept
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
