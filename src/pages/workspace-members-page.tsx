import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Copy, LoaderCircle, MailPlus, RotateCw, Trash2, UserRound } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'

import { AppHeader } from '../components/layout/app-header'
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
} from '../components/ui/alert-dialog'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Skeleton } from '../components/ui/skeleton'
import {
  useInviteToWorkspace,
  useRemoveWorkspaceMember,
  useResendWorkspaceInvitation,
  useWorkspaceInvitations,
} from '../features/invitations/use-invitations'
import { useWorkspaceMembers, useWorkspaces } from '../features/workspaces/use-workspaces'
import { ApiError } from '../lib/api'
import { validateField } from '../lib/validation'

export function WorkspaceMembersPage() {
  const workspaceId = parseId(useParams().workspaceId)
  const workspaces = useWorkspaces()
  const workspace = workspaces.data?.find((item) => item.id === workspaceId)
  const canAdmin = workspace?.membership_role === 'owner' || workspace?.membership_role === 'admin'
  const members = useWorkspaceMembers(workspaceId ?? 0, canAdmin)
  const invitations = useWorkspaceInvitations(workspaceId ?? 0, canAdmin)

  if (!workspaceId) return <Navigate replace to="/" />
  if (!workspaces.isPending && !workspace) return <Navigate replace to="/" />
  if (!workspaces.isPending && workspace && !canAdmin) {
    return <Navigate replace to="/" />
  }

  return (
    <main className="min-h-screen bg-[#f7f7fa] text-zinc-950 dark:bg-[#0b0b0d] dark:text-zinc-50">
      <AppHeader />
      <section className="mx-auto max-w-5xl px-5 py-10">
        <Link
          className="text-sm font-semibold text-zinc-500 hover:text-violet-600 dark:text-zinc-400"
          to={`/admin/workspaces/${workspaceId}`}
        >
          ← Back to workspace
        </Link>
        <div className="mt-6 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">PEOPLE</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">Manage {workspace?.name}</h1>
            <p className="mt-3 text-zinc-500 dark:text-zinc-400">
              Invite teammates, follow pending responses, and manage access.
            </p>
          </div>
          <InviteDialog workspaceId={workspaceId} />
        </div>

        <div className="mt-10 grid gap-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Members</CardTitle>
              <Badge variant="secondary">{members.data?.length ?? 0}</Badge>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {members.isPending ? (
                <div className="space-y-4 p-6">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                members.data?.map((member) => (
                  <MemberRow key={member.id} member={member} workspaceId={workspaceId} />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Invitations</CardTitle>
              <Badge variant="secondary">{invitations.data?.length ?? 0}</Badge>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {invitations.isPending ? (
                <div className="space-y-4 p-6">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : invitations.data?.length ? (
                invitations.data.map((invitation) => (
                  <InvitationRow invitation={invitation} key={invitation.id} workspaceId={workspaceId} />
                ))
              ) : (
                <p className="p-6 text-sm text-muted-foreground">No pending or rejected invitations.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  )
}

function InviteDialog({ workspaceId }: { workspaceId: number }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const invite = useInviteToWorkspace(workspaceId)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formError = validateField(email, 'Email address', { email: true, maxLength: 254 })
    setValidationError(formError)
    if (formError) return
    try {
      await invite.mutateAsync(email.trim())
      setEmail('')
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
          <MailPlus /> Invite to workspace
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form noValidate onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Invite a teammate</DialogTitle>
            <DialogDescription>
              We’ll send a mock email with a link locked to this email address.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              autoFocus
              id="invite-email"
              onChange={(event) => {
                setEmail(event.target.value)
                setValidationError(null)
              }}
              placeholder="teammate@example.com"
              type="email"
              value={email}
            />
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
  member,
  workspaceId,
}: {
  member: {
    id: number
    user_id: number
    display_name: string
    email: string
    role: 'owner' | 'admin' | 'member'
  }
  workspaceId: number
}) {
  const remove = useRemoveWorkspaceMember(workspaceId)
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-violet-500/15 font-bold text-violet-600 dark:text-violet-300">
        {member.display_name.slice(0, 1).toUpperCase() || <UserRound className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          className="font-semibold hover:text-violet-600"
          to={`/workspaces/${workspaceId}/users/${member.user_id}`}
        >
          {member.display_name || member.email}
        </Link>
        <p className="truncate text-sm text-muted-foreground">{member.email}</p>
      </div>
      <Badge className="capitalize" variant="secondary">
        {member.role}
      </Badge>
      {member.role !== 'owner' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button aria-label={`Remove ${member.display_name}`} size="icon" variant="ghost">
              <Trash2 className="text-destructive" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {member.display_name}?</AlertDialogTitle>
              <AlertDialogDescription>
                They will lose access immediately. Their task assignments will become unassigned, and their
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
  invitation,
  workspaceId,
}: {
  invitation: {
    id: number
    email: string
    status: 'pending' | 'accepted' | 'rejected'
    invite_url: string
    sent_at: string
  }
  workspaceId: number
}) {
  const resend = useResendWorkspaceInvitation(workspaceId)
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
        <p className="text-sm text-muted-foreground">
          Sent{' '}
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
      ) : (
        <Button
          disabled={resend.isPending}
          onClick={() => resend.mutate(invitation.id)}
          size="sm"
          variant="outline"
        >
          {resend.isPending ? <LoaderCircle className="animate-spin" /> : <RotateCw />}
          Resend
        </Button>
      )}
    </div>
  )
}

function parseId(value: string | undefined) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Unable to send this invitation'
}
