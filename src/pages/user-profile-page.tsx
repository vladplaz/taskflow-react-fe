import { Link, useParams } from 'react-router'

import { AppHeader } from '../components/layout/app-header'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Skeleton } from '../components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { getWorkspaceUserProfile } from '../lib/api'

export function UserProfilePage() {
  const { userId: userIdParam, workspaceId: workspaceIdParam } = useParams()
  const workspaceId = parseId(workspaceIdParam)
  const userId = parseId(userIdParam)
  const isValidRoute = workspaceId !== null && userId !== null
  const profile = useQuery({
    queryKey: ['workspace-user-profile', workspaceId ?? 0, userId ?? 0],
    queryFn: () => getWorkspaceUserProfile(workspaceId!, userId!),
    enabled: isValidRoute,
  })

  if (!isValidRoute) {
    return <main className="grid min-h-screen place-items-center bg-background">User not found.</main>
  }

  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <div className="mx-auto max-w-2xl px-5 py-12">
        <Link
          className="text-sm font-semibold text-violet-600 hover:text-violet-500"
          to={`/workspaces/${workspaceId}`}
        >
          ← Back to workspace
        </Link>
        {profile.isPending ? (
          <Card className="mt-6">
            <CardContent className="space-y-4 pt-6">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-64" />
            </CardContent>
          </Card>
        ) : profile.data ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>{profile.data.display_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{profile.data.email}</p>
            </CardContent>
          </Card>
        ) : (
          <p className="mt-6 text-muted-foreground">User not found.</p>
        )}
      </div>
    </main>
  )
}

function parseId(value: string | undefined) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}
