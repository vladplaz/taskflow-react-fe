import { useState } from 'react'

import { AppHeader } from '../components/layout/app-header'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { useAuthSession, useUpdateMyProfile } from '../features/auth/use-auth'
import { ApiError } from '../lib/api'

export function MyProfilePage() {
  const session = useAuthSession()
  const [displayName, setDisplayName] = useState(session.data?.display_name ?? '')
  const updateProfile = useUpdateMyProfile()
  if (!session.data) return null
  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <div className="mx-auto max-w-xl px-5 py-12">
        <Card>
          <CardHeader>
            <CardTitle>My profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Email</p>
              <p className="mt-1 text-sm">{session.data.email}</p>
            </div>
            <label className="block text-sm font-medium">
              Display name
              <Input
                className="mt-2"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
            <Button
              disabled={updateProfile.isPending || !displayName.trim()}
              onClick={() => updateProfile.mutate(displayName.trim())}
            >
              {updateProfile.isPending ? 'Saving…' : 'Save changes'}
            </Button>
            {updateProfile.error && (
              <p className="text-sm text-destructive" role="alert">
                {updateProfile.error instanceof ApiError
                  ? updateProfile.error.message
                  : 'Unable to save changes'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
