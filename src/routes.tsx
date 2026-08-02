import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, useParams } from 'react-router'
import { RouterProvider } from 'react-router/dom'

const BoardPage = lazy(async () => ({ default: (await import('./pages/board-page')).BoardPage }))
const MyBoardsPage = lazy(async () => ({
  default: (await import('./pages/my-boards-page')).MyBoardsPage,
}))
const BoardSettingsPage = lazy(async () => ({
  default: (await import('./pages/board-settings-page')).BoardSettingsPage,
}))
const BoardsPage = lazy(async () => ({ default: (await import('./pages/boards-page')).BoardsPage }))
const WorkspacesPage = lazy(async () => ({
  default: (await import('./pages/workspaces-page')).WorkspacesPage,
}))
const UserProfilePage = lazy(async () => ({
  default: (await import('./pages/user-profile-page')).UserProfilePage,
}))
const MyProfilePage = lazy(async () => ({ default: (await import('./pages/my-profile-page')).MyProfilePage }))
const WorkspaceMembersPage = lazy(async () => ({
  default: (await import('./pages/workspace-members-page')).WorkspaceMembersPage,
}))
const InvitationsPage = lazy(async () => ({
  default: (await import('./pages/invitations-page')).InvitationsPage,
}))
const InviteLinkPage = lazy(async () => ({
  default: (await import('./pages/invite-link-page')).InviteLinkPage,
}))
const BoardInviteLinkPage = lazy(async () => ({
  default: (await import('./pages/board-invite-link-page')).BoardInviteLinkPage,
}))
const NotFoundPage = lazy(async () => ({
  default: (await import('./pages/not-found-page')).NotFoundPage,
}))
const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Page>
        <MyBoardsPage />
      </Page>
    ),
  },
  {
    path: '/admin',
    element: (
      <Page>
        <WorkspacesPage />
      </Page>
    ),
  },
  {
    path: '/admin/workspaces/:workspaceId',
    element: (
      <Page>
        <BoardsPage />
      </Page>
    ),
  },
  {
    path: '/admin/workspaces/:workspaceId/members',
    element: (
      <Page>
        <WorkspaceMembersPage />
      </Page>
    ),
  },
  {
    path: '/profile',
    element: (
      <Page>
        <MyProfilePage />
      </Page>
    ),
  },
  {
    path: '/invitations',
    element: (
      <Page>
        <InvitationsPage />
      </Page>
    ),
  },
  {
    path: '/invite/:token',
    element: (
      <Page>
        <InviteLinkPage />
      </Page>
    ),
  },
  {
    path: '/invite/board/:token',
    element: (
      <Page>
        <BoardInviteLinkPage />
      </Page>
    ),
  },
  {
    path: '/workspaces/:workspaceId',
    element: <Navigate replace to="/" />,
  },
  {
    path: '/workspaces/:workspaceId/users/:userId',
    element: (
      <Page>
        <UserProfilePage />
      </Page>
    ),
  },
  {
    path: '/workspaces/:workspaceId/members',
    element: <Navigate replace to="/" />,
  },
  {
    path: '/workspaces/:workspaceId/boards/:boardId/members',
    element: <LegacyBoardMembersRedirect />,
  },
  {
    path: '/workspaces/:workspaceId/boards/:boardId',
    element: (
      <Page>
        <BoardPage />
      </Page>
    ),
  },
  {
    path: '/workspaces/:workspaceId/boards/:boardId/settings',
    element: <Navigate replace to="members" />,
  },
  {
    path: '/workspaces/:workspaceId/boards/:boardId/settings/members',
    element: (
      <Page>
        <BoardSettingsPage section="members" />
      </Page>
    ),
  },
  {
    path: '/workspaces/:workspaceId/boards/:boardId/settings/statuses',
    element: (
      <Page>
        <BoardSettingsPage section="statuses" />
      </Page>
    ),
  },
  {
    path: '/workspaces/:workspaceId/boards/:boardId/settings/labels',
    element: (
      <Page>
        <BoardSettingsPage section="labels" />
      </Page>
    ),
  },
  {
    path: '/workspaces/:workspaceId/boards/:boardId/tasks/:taskId',
    element: (
      <Page>
        <BoardPage />
      </Page>
    ),
  },
  {
    path: '/workspaces/:workspaceId/boards/:boardId/lists/:listId/tasks/new',
    element: <LegacyNewTaskRedirect />,
  },
  {
    path: '*',
    element: (
      <Page>
        <NotFoundPage />
      </Page>
    ),
  },
])

export function AppRoutes() {
  return <RouterProvider router={router} />
}

function LegacyNewTaskRedirect() {
  const { boardId, workspaceId } = useParams()
  return <Navigate replace to={`/workspaces/${workspaceId}/boards/${boardId}`} />
}

function LegacyBoardMembersRedirect() {
  const { boardId, workspaceId } = useParams()
  return <Navigate replace to={`/workspaces/${workspaceId}/boards/${boardId}/settings/members`} />
}

function Page({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<main className="min-h-screen bg-background" />}>{children}</Suspense>
}
