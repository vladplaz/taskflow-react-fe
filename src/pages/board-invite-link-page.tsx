import { LoaderCircle, LogOut, MailWarning } from 'lucide-react'
import { Navigate, useParams } from 'react-router'

import { AppHeader } from '../components/layout/app-header'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { useAuthSession, useLogout } from '../features/auth/use-auth'
import { usePublicBoardInvitation } from '../features/invitations/use-invitations'

export function BoardInviteLinkPage() {
  const token = useParams().token ?? null
  const invitation = usePublicBoardInvitation(token)
  const session = useAuthSession()
  const logout = useLogout()

  if (invitation.isPending) {
    return (
      <main className="grid min-h-screen place-items-center bg-background">
        <LoaderCircle className="animate-spin text-violet-500" />
      </main>
    )
  }
  if (!invitation.data || invitation.data.status !== 'pending') {
    return (
      <main className="min-h-screen bg-background">
        <AppHeader />
        <div className="mx-auto max-w-xl px-5 py-14">
          <Card>
            <CardContent className="p-8 text-center">
              <MailWarning className="mx-auto size-9 text-muted-foreground" />
              <h1 className="mt-4 text-xl font-bold">Invitation unavailable</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This board invitation has already been answered or is no longer available.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    )
  }
  if (session.data?.email.toLowerCase() === invitation.data.email.toLowerCase()) {
    return <Navigate replace to="/invitations" />
  }
  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <div
        className="fixed top-20 right-5 z-50 max-w-sm rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow-xl dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
        role="alert"
      >
        A different email is required. Please log out and use {invitation.data.email}.
      </div>
      <div className="mx-auto max-w-xl px-5 py-14">
        <Card>
          <CardContent className="p-8 text-center">
            <MailWarning className="mx-auto size-9 text-amber-500" />
            <h1 className="mt-4 text-xl font-bold">This invitation is for another email</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You’re signed in as {session.data?.email}. Sign out, then use {invitation.data.email} to join{' '}
              {invitation.data.board_name}.
            </p>
            <Button className="mt-6" disabled={logout.isPending} onClick={() => logout.mutate()}>
              {logout.isPending ? <LoaderCircle className="animate-spin" /> : <LogOut />}
              Log out
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
