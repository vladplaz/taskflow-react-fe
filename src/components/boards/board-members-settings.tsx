import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Copy, LoaderCircle, MailPlus, RotateCw, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { Link } from 'react-router'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '../ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Skeleton } from '../ui/skeleton'
import { useToast } from '../ui/toast-context'
import {
  useBoardInvitations,
  useBoardMembers,
  useInviteToBoard,
  useRemoveBoardMember,
  useResendBoardInvitation,
  useUpdateBoardMember,
} from '../../features/boards/use-boards'
import { useAuthSession } from '../../features/auth/use-auth'
import { ApiError, type Board, type BoardInvitation, type BoardMember } from '../../lib/api'
import { validateField } from '../../lib/validation'

export function BoardMembersSettings({
  board,
  boardId,
  workspaceId,
}: {
  board?: Board
  boardId: number
  workspaceId: number
}) {
  const canLoad = Boolean(board?.can_admin)
  const session = useAuthSession()
  const members = useBoardMembers(workspaceId, boardId, canLoad)
  const invitations = useBoardInvitations(workspaceId, boardId, canLoad)

  return (
    <>
      <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Admins configure the board, members edit cards, and viewers have read-only access.
          </p>
        </div>
        {board && <InviteDialog boardId={boardId} workspaceId={workspaceId} />}
      </div>

      <div className="mt-8 grid gap-6">
        <Card>
          {/* CardHeader is a grid; CardAction is its right-hand slot. */}
          <CardHeader>
            <CardTitle>Board members</CardTitle>
            <CardAction className="self-center">
              <Badge variant="secondary">{members.data?.length ?? 0}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {members.isPending || !board ? (
              <RowsSkeleton />
            ) : (
              members.data?.map((member) => (
                <MemberRow
                  boardId={boardId}
                  isCurrentUser={member.user_id === session.data?.id}
                  key={member.id}
                  member={member}
                  workspaceId={workspaceId}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invitations</CardTitle>
            <CardAction className="self-center">
              <Badge variant="secondary">{invitations.data?.length ?? 0}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {invitations.isPending || !board ? (
              <RowsSkeleton />
            ) : invitations.data?.length ? (
              invitations.data.map((invitation) => (
                <InvitationRow
                  boardId={boardId}
                  invitation={invitation}
                  key={invitation.id}
                  workspaceId={workspaceId}
                />
              ))
            ) : (
              <p className="p-6 text-sm text-muted-foreground">No pending or rejected invitations.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function InviteDialog({ boardId, workspaceId }: { boardId: number; workspaceId: number }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'member' | 'viewer'>('member')
  const [validationError, setValidationError] = useState<string | null>(null)
  const invite = useInviteToBoard(workspaceId, boardId)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formError = validateField(email, 'Email address', { email: true, maxLength: 254 })
    setValidationError(formError)
    if (formError) return
    try {
      await invite.mutateAsync({ email: email.trim(), role })
      setEmail('')
      setRole('member')
      setOpen(false)
    } catch {
      return
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          invite.reset()
          setValidationError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <MailPlus /> Invite to board
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form noValidate onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Invite a teammate to this board</DialogTitle>
            <DialogDescription>
              The invite is locked to their email. They can join the board without becoming a workspace
              member.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="board-invite-email">Email address</Label>
              <Input
                autoFocus
                id="board-invite-email"
                onChange={(event) => {
                  setEmail(event.target.value)
                  setValidationError(null)
                }}
                placeholder="teammate@example.com"
                type="email"
                value={email}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-invite-role">Board role</Label>
              <Select onValueChange={(value) => setRole(value as 'member' | 'viewer')} value={role}>
                <SelectTrigger id="board-invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member — can edit tasks</SelectItem>
                  <SelectItem value="viewer">Viewer — read only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(validationError || invite.error) && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {validationError ?? errorMessage(invite.error)}
            </p>
          )}
          <DialogFooter className="mt-6">
            <Button disabled={invite.isPending} type="submit">
              {invite.isPending ? <LoaderCircle className="animate-spin" /> : <MailPlus />}
              Send invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MemberRow({
  boardId,
  isCurrentUser,
  member,
  workspaceId,
}: {
  boardId: number
  isCurrentUser: boolean
  member: BoardMember
  workspaceId: number
}) {
  const update = useUpdateBoardMember(workspaceId, boardId)
  const remove = useRemoveBoardMember(workspaceId, boardId)
  const showToast = useToast()

  async function changeRole(role: BoardMember['role']) {
    try {
      await update.mutateAsync({ membershipId: member.id, role })
      showToast({
        description: `${member.display_name || member.email} is now ${roleName(role)}`,
        title: 'Role updated',
        variant: 'success',
      })
    } catch (error) {
      showToast({
        description: roleUpdateErrorMessage(error),
        title: 'Role update failed',
        variant: 'error',
      })
    }
  }

  return (
    <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-violet-500/15 font-bold text-violet-600 dark:text-violet-300">
        {member.display_name.slice(0, 1).toUpperCase() || <UserRound className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            className="font-semibold hover:text-violet-600"
            to={`/workspaces/${workspaceId}/users/${member.user_id}`}
          >
            {member.display_name || member.email}
          </Link>
          {isCurrentUser && <Badge variant="secondary">You</Badge>}
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {member.email}
          {member.is_workspace_member ? ' · Workspace member' : ' · Board guest'}
        </p>
      </div>
      <Select
        disabled={isCurrentUser || update.isPending}
        onValueChange={(role) => void changeRole(role as BoardMember['role'])}
        value={member.role}
      >
        <SelectTrigger
          aria-label={`Role for ${member.display_name}`}
          className="w-32"
          title={isCurrentUser ? 'You cannot change your own board role' : undefined}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="member">Member</SelectItem>
          <SelectItem value="viewer">Viewer</SelectItem>
        </SelectContent>
      </Select>
      {!isCurrentUser && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button aria-label={`Remove ${member.display_name}`} size="icon" variant="ghost">
              <Trash2 className="text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {member.display_name} from this board?</AlertDialogTitle>
              <AlertDialogDescription>
                They will lose board access immediately. Their task assignments become unassigned, and their
                old mentions and activity will no longer open a profile.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={remove.isPending}
                onClick={() => remove.mutate(member.id)}
                variant="destructive"
              >
                {remove.isPending && <LoaderCircle className="animate-spin" />}
                Remove member
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}

function InvitationRow({
  boardId,
  invitation,
  workspaceId,
}: {
  boardId: number
  invitation: BoardInvitation
  workspaceId: number
}) {
  const resend = useResendBoardInvitation(workspaceId, boardId)
  const [copied, setCopied] = useState(false)
  async function copyLink() {
    await navigator.clipboard.writeText(invitation.invite_url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }
  return (
    <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{invitation.email}</p>
        <p className="text-sm capitalize text-muted-foreground">
          {invitation.role} · Sent{' '}
          {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(invitation.sent_at))}
        </p>
      </div>
      <Badge variant={invitation.status === 'rejected' ? 'destructive' : 'secondary'}>
        {invitation.status}
      </Badge>
      {invitation.status === 'pending' ? (
        <Button onClick={() => void copyLink()} size="sm" variant="outline">
          {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy link'}
        </Button>
      ) : invitation.status === 'rejected' ? (
        <Button
          disabled={resend.isPending}
          onClick={() => resend.mutate(invitation.id)}
          size="sm"
          variant="outline"
        >
          {resend.isPending ? <LoaderCircle className="animate-spin" /> : <RotateCw />}
          Resend
        </Button>
      ) : (
        <span className="flex items-center gap-1.5 text-sm text-emerald-600">
          <ShieldCheck className="size-4" /> Joined
        </span>
      )}
    </div>
  )
}

function RowsSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Unable to send this invitation'
}

function roleName(role: BoardMember['role']) {
  return role[0].toUpperCase() + role.slice(1)
}

function roleUpdateErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 404) return 'This member is no longer on the board'
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again'
}
