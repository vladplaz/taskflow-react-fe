const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

export function getWebSocketUrl(path: string) {
  const baseUrl = new URL(import.meta.env.VITE_WS_BASE_URL ?? API_BASE_URL, window.location.origin)
  const url = new URL(path, baseUrl)
  if (url.protocol === 'http:') url.protocol = 'ws:'
  if (url.protocol === 'https:') url.protocol = 'wss:'
  return url.toString()
}

export type User = {
  id: number
  email: string
  display_name: string
}

export type Workspace = {
  id: number
  name: string
  description: string
  membership_role: 'owner' | 'admin' | 'member'
  created_at: string
  updated_at: string
}

export type WorkspaceMember = {
  id: number
  user_id: number
  display_name: string
  email: string
  role: 'owner' | 'admin' | 'member'
  created_at: string
}

export type WorkspaceInvitation = {
  id: number
  workspace_id: number
  workspace_name: string
  email: string
  status: 'pending' | 'accepted' | 'rejected'
  invited_by_name: string
  invite_url: string
  created_at: string
  sent_at: string
  responded_at: string | null
}

export type PublicWorkspaceInvitation = {
  email: string
  workspace_name: string
  status: 'pending' | 'accepted' | 'rejected'
  recipient_registered: boolean
}

export type Board = {
  id: number
  workspace_id: number
  workspace_name: string
  name: string
  description: string
  visibility: 'private' | 'workspace'
  access_role: 'admin' | 'member' | 'viewer'
  can_edit: boolean
  can_admin: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

export type BoardMember = {
  id: number
  user_id: number
  display_name: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  is_workspace_member: boolean
  created_at: string
}

export type BoardInvitation = {
  id: number
  board_id: number
  board_name: string
  workspace_id: number
  workspace_name: string
  email: string
  role: 'member' | 'viewer'
  status: 'pending' | 'accepted' | 'rejected'
  invited_by_name: string
  invite_url: string
  created_at: string
  sent_at: string
  responded_at: string | null
}

export type PublicBoardInvitation = {
  email: string
  board_name: string
  workspace_name: string
  role: 'member' | 'viewer'
  status: 'pending' | 'accepted' | 'rejected'
  recipient_registered: boolean
}

export type BoardList = {
  id: number
  name: string
  position: string
  created_at: string
}

export type BoardStatus = {
  id: number
  name: string
  position: number
}

export type BoardLabel = {
  id: number
  name: string
  color: string
  position: number
}

export type TaskLabel = Pick<BoardLabel, 'id' | 'name' | 'color'>

export type TaskStatus = {
  id: number
  name: string
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type RichTextContent = Record<string, unknown>

export type Attachment = {
  id: number
  original_name: string
  content_type: string
  size: number
  /** The API path the file is read through, never a storage key. */
  url: string
  thumbnail_url: string | null
  /** Whether the server will render this type in place, rather than force a download. */
  can_preview: boolean
  placement: 'task' | 'comment'
  uploaded_by_id: number | null
  uploaded_by_display_name: string | null
  created_at: string
}

export type TaskActivity = {
  id: number
  action: string
  payload: { from?: unknown; to?: unknown; name?: string }
  created_at: string
  author_id: number | null
  author_display_name: string | null
  author_is_member: boolean
  comment_id: number | null
  comment_body: string | null
  comment_updated_at: string | null
  comment_mentions: { user_id: number; display_name: string }[]
  comment_attachments: Attachment[]
}

export type TaskAssignee = {
  membership_id: number
  user_id: number
  display_name: string
  assigned_at: string
}

export type Task = {
  id: number
  title: string
  description: RichTextContent
  priority: TaskPriority | null
  due_date: string | null
  position: string
  is_archived: boolean
  created_at: string
  updated_at: string
  assignees: TaskAssignee[]
  status_id: number | null
  status: TaskStatus | null
  labels: TaskLabel[]
  /** Files in the task's strip. Present on the detail response only. */
  attachments?: Attachment[]
  attachment_count: number
}

export class ApiError extends Error {
  readonly status: number
  readonly fields: Record<string, string[]>

  constructor(status: number, message: string, fields: Record<string, string[]> = {}) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

function getCookie(name: string) {
  const prefix = `${name}=`
  const cookie = document.cookie.split('; ').find((value) => value.startsWith(prefix))
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null
}

function isUnsafeMethod(method: string | undefined) {
  return method !== undefined && !['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method.toUpperCase())
}

function getApiError(body: unknown, status: number) {
  if (typeof body !== 'object' || body === null) {
    return new ApiError(status, 'Something went wrong. Please try again')
  }

  const responseBody = body as Record<string, unknown>
  const fields = Object.fromEntries(
    Object.entries(responseBody).flatMap(([field, value]) => {
      const messages = Array.isArray(value)
        ? value.filter((message): message is string => typeof message === 'string')
        : typeof value === 'string'
          ? [value]
          : []
      return messages.length ? [[field, messages.map((message) => normalizeErrorMessage(message))]] : []
    }),
  )
  const detail =
    typeof responseBody.detail === 'string' ? normalizeErrorMessage(responseBody.detail) : undefined
  const firstField = Object.entries(fields)[0]
  const message = detail ?? (firstField ? firstField[1][0] : 'Something went wrong. Please try again')
  return new ApiError(status, message, fields)
}

function normalizeErrorMessage(value: string) {
  const message = value.trim().replace(/\.+$/, '')
  return message ? `${message[0].toUpperCase()}${message.slice(1)}` : message
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (init.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (isUnsafeMethod(init.method)) {
    const csrfToken = getCookie('csrftoken')
    if (!csrfToken) {
      throw new ApiError(403, 'Security token is missing. Please refresh the page')
    }
    headers.set('X-CSRFToken', csrfToken)
  }

  const url = /^https?:\/\//.test(path) ? path : `${API_BASE_URL}${path}`
  const httpResponse = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (!httpResponse.ok) {
    const body: unknown = await httpResponse.json().catch(() => null)
    throw getApiError(body, httpResponse.status)
  }

  if (httpResponse.status === 204) {
    return undefined as T
  }

  return httpResponse.json() as Promise<T>
}

export type Paginated<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/** Fetch every page of a paginated list endpoint, as one plain array. */
async function requestList<T>(path: string, init: RequestInit = {}): Promise<T[]> {
  const items: T[] = []
  let page: Paginated<T> = await request<Paginated<T>>(path, init)
  items.push(...page.results)

  while (page.next) {
    page = await request<Paginated<T>>(page.next, init)
    items.push(...page.results)
  }

  return items
}

export function ensureCsrfToken() {
  return request<void>('/auth/csrf/')
}

export async function register(payload: {
  email: string
  display_name: string
  password: string
  invite_token?: string
  board_invite_token?: string
}) {
  return request<User>('/auth/register/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function login(email: string, password: string) {
  return request<User>('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function getCurrentUser() {
  return request<User>('/auth/me/')
}

export async function restoreSession() {
  await ensureCsrfToken()

  try {
    return await getCurrentUser()
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return null
    }
    throw error
  }
}

export async function logout() {
  await request<void>('/auth/logout/', { method: 'POST' })
}

export function getWorkspaces() {
  return requestList<Workspace>('/workspaces/')
}

export function createWorkspace(payload: { name: string; description: string }) {
  return request<Workspace>('/workspaces/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getBoards(workspaceId: number) {
  return requestList<Board>(`/workspaces/${workspaceId}/boards/`)
}

export function getMyBoards() {
  return requestList<Board>('/boards/')
}

/** Archived boards, lists, and tasks are hidden unless `?archived=true`. */
export function getArchivedBoards(workspaceId: number) {
  return requestList<Board>(`/workspaces/${workspaceId}/boards/?archived=true`)
}

export function restoreBoard(workspaceId: number, boardId: number) {
  return request<Board>(`/workspaces/${workspaceId}/boards/${boardId}/restore/`, {
    method: 'POST',
  })
}

export function leaveBoard(workspaceId: number, boardId: number) {
  return request<void>(`/workspaces/${workspaceId}/boards/${boardId}/members/me/`, {
    method: 'DELETE',
  })
}

export function createBoard(
  workspaceId: number,
  payload: { name: string; description: string; visibility: 'private' | 'workspace' },
) {
  return request<Board>(`/workspaces/${workspaceId}/boards/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateBoard(
  workspaceId: number,
  boardId: number,
  payload: Partial<Pick<Board, 'name' | 'visibility'>>,
) {
  return request<Board>(`/workspaces/${workspaceId}/boards/${boardId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function getBoardLists(workspaceId: number, boardId: number) {
  return requestList<BoardList>(`/workspaces/${workspaceId}/boards/${boardId}/lists/`)
}

export function getArchivedBoardLists(workspaceId: number, boardId: number) {
  return requestList<BoardList>(`/workspaces/${workspaceId}/boards/${boardId}/lists/?archived=true`)
}

export function restoreBoardList(workspaceId: number, boardId: number, listId: number) {
  return request<BoardList>(`/workspaces/${workspaceId}/boards/${boardId}/lists/${listId}/restore/`, {
    method: 'POST',
  })
}

export function createBoardList(workspaceId: number, boardId: number, name: string) {
  return request<BoardList>(`/workspaces/${workspaceId}/boards/${boardId}/lists/`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function updateBoardList(workspaceId: number, boardId: number, listId: number, name: string) {
  return request<BoardList>(`/workspaces/${workspaceId}/boards/${boardId}/lists/${listId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
}

export function moveBoardList(workspaceId: number, boardId: number, listId: number, beforeListId?: number) {
  return request<BoardList>(`/workspaces/${workspaceId}/boards/${boardId}/lists/${listId}/move/`, {
    method: 'POST',
    body: JSON.stringify(beforeListId ? { before_list_id: beforeListId } : {}),
  })
}

export function getBoardStatuses(workspaceId: number, boardId: number) {
  return requestList<BoardStatus>(`/workspaces/${workspaceId}/boards/${boardId}/statuses/`)
}

export function createBoardStatus(workspaceId: number, boardId: number, name: string) {
  return request<BoardStatus>(`/workspaces/${workspaceId}/boards/${boardId}/statuses/`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function updateBoardStatus(workspaceId: number, boardId: number, statusId: number, name: string) {
  return request<BoardStatus>(`/workspaces/${workspaceId}/boards/${boardId}/statuses/${statusId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
}

export function deleteBoardStatus(workspaceId: number, boardId: number, statusId: number) {
  return request<void>(`/workspaces/${workspaceId}/boards/${boardId}/statuses/${statusId}/`, {
    method: 'DELETE',
  })
}

export function getBoardLabels(workspaceId: number, boardId: number) {
  return requestList<BoardLabel>(`/workspaces/${workspaceId}/boards/${boardId}/labels/`)
}

export function createBoardLabel(
  workspaceId: number,
  boardId: number,
  payload: { name: string; color: string },
) {
  return request<BoardLabel>(`/workspaces/${workspaceId}/boards/${boardId}/labels/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateBoardLabel(
  workspaceId: number,
  boardId: number,
  labelId: number,
  payload: { name: string; color: string },
) {
  return request<BoardLabel>(`/workspaces/${workspaceId}/boards/${boardId}/labels/${labelId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteBoardLabel(workspaceId: number, boardId: number, labelId: number) {
  return request<void>(`/workspaces/${workspaceId}/boards/${boardId}/labels/${labelId}/`, {
    method: 'DELETE',
  })
}

export function getTasks(workspaceId: number, listId: number) {
  return requestList<Task>(`/workspaces/${workspaceId}/lists/${listId}/tasks/`)
}

export function getArchivedTasks(workspaceId: number, listId: number) {
  return requestList<Task>(`/workspaces/${workspaceId}/lists/${listId}/tasks/?archived=true`)
}

export function restoreTask(workspaceId: number, taskId: number) {
  return request<Task>(`/workspaces/${workspaceId}/tasks/${taskId}/restore/`, {
    method: 'POST',
  })
}

export function createTask(
  workspaceId: number,
  listId: number,
  payload: {
    title: string
    description: RichTextContent
    priority: TaskPriority | null
    assignee_membership_ids: number[]
    status_id: number | null
    label_ids: number[]
  },
) {
  return request<Task>(`/workspaces/${workspaceId}/lists/${listId}/tasks/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function moveTask(
  workspaceId: number,
  taskId: number,
  payload: { target_list_id: number; before_task_id?: number },
) {
  return request<Task>(`/workspaces/${workspaceId}/tasks/${taskId}/move/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getTask(workspaceId: number, taskId: number) {
  return request<Task>(`/workspaces/${workspaceId}/tasks/${taskId}/`)
}

/**
 * One batch of a task's timeline, newest first. The only list not read through
 * `requestList`, and counted in rows rather than pages because the batches
 * differ in size. See `OffsetPagination` on the API side.
 */
export function getTaskActivityBatch(
  workspaceId: number,
  taskId: number,
  { limit, offset }: { limit: number; offset: number },
) {
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  return request<Paginated<TaskActivity>>(`/workspaces/${workspaceId}/tasks/${taskId}/activity/?${query}`)
}

export function createTaskComment(
  workspaceId: number,
  taskId: number,
  body: string,
  mentionUserIds: number[] = [],
  attachmentIds: number[] = [],
) {
  return request(`/workspaces/${workspaceId}/tasks/${taskId}/comments/`, {
    method: 'POST',
    body: JSON.stringify({
      body,
      mention_user_ids: mentionUserIds,
      attachment_ids: attachmentIds,
    }),
  })
}

export function updateTaskComment(
  workspaceId: number,
  commentId: number,
  body: string,
  mentionUserIds: number[] = [],
  // The API reads an absent `attachment_ids` as "leave them alone" and an
  // empty array as "remove them".
  attachmentIds?: number[],
) {
  return request(`/workspaces/${workspaceId}/comments/${commentId}/`, {
    method: 'PATCH',
    body: JSON.stringify({
      body,
      mention_user_ids: mentionUserIds,
      ...(attachmentIds ? { attachment_ids: attachmentIds } : {}),
    }),
  })
}

export function deleteTaskComment(workspaceId: number, commentId: number) {
  return request<void>(`/workspaces/${workspaceId}/comments/${commentId}/`, { method: 'DELETE' })
}

/**
 * Turn an attachment's root-relative API path into a URL the browser can fetch;
 * it would otherwise resolve against the dev server's own origin.
 */
export function attachmentSrc(
  attachment: Pick<Attachment, 'url' | 'thumbnail_url'>,
  options: { variant?: 'thumb'; download?: boolean; stream?: boolean } = {},
) {
  const path = options.variant === 'thumb' ? (attachment.thumbnail_url ?? attachment.url) : attachment.url
  const url = new URL(path, new URL(API_BASE_URL, window.location.origin))
  if (options.download) url.searchParams.set('download', '1')
  // For reading the bytes in JavaScript: the API would otherwise redirect to
  // storage, which cannot answer a credentialed cross-origin read. See
  // `_wants_stream` in the backend's attachment view.
  if (options.stream) url.searchParams.set('stream', '1')
  return url.toString()
}

/** Upload one file. `XMLHttpRequest` because only XHR reports progress. */
export function uploadAttachment(
  workspaceId: number,
  taskId: number,
  file: File,
  {
    placement = 'task',
    onProgress,
    signal,
  }: {
    placement?: Attachment['placement']
    onProgress?: (fraction: number) => void
    signal?: AbortSignal
  } = {},
) {
  return new Promise<Attachment>((resolve, reject) => {
    const csrfToken = getCookie('csrftoken')
    if (!csrfToken) {
      reject(new ApiError(403, 'Security token is missing. Please refresh the page'))
      return
    }

    const body = new FormData()
    body.append('file', file)
    body.append('placement', placement)

    const request = new XMLHttpRequest()
    request.open('POST', `${API_BASE_URL}/workspaces/${workspaceId}/tasks/${taskId}/attachments/`)
    request.withCredentials = true
    request.responseType = 'json'
    request.setRequestHeader('Accept', 'application/json')
    request.setRequestHeader('X-CSRFToken', csrfToken)
    // Content-Type stays unset so the browser adds the multipart boundary.

    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total)
    })
    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) {
        resolve(request.response as Attachment)
      } else {
        reject(getApiError(request.response, request.status))
      }
    })
    request.addEventListener('error', () =>
      reject(new ApiError(0, 'The upload failed. Please check your connection')),
    )
    request.addEventListener('abort', () => reject(new ApiError(0, 'Upload cancelled')))
    signal?.addEventListener('abort', () => request.abort(), { once: true })

    request.send(body)
  })
}

export function deleteAttachment(workspaceId: number, attachmentId: number) {
  return request<void>(`/workspaces/${workspaceId}/attachments/${attachmentId}/`, {
    method: 'DELETE',
  })
}

export function getWorkspaceUserProfile(workspaceId: number, userId: number) {
  return request<User>(`/workspaces/${workspaceId}/users/${userId}/`)
}

export function updateMyProfile(displayName: string) {
  return request<User>('/auth/me/', { method: 'PATCH', body: JSON.stringify({ display_name: displayName }) })
}

export function updateTask(
  workspaceId: number,
  taskId: number,
  payload: {
    title: string
    description: RichTextContent
    priority: TaskPriority | null
    assignee_membership_ids: number[]
    status_id: number | null
    label_ids: number[]
  },
) {
  return request<Task>(`/workspaces/${workspaceId}/tasks/${taskId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function getWorkspaceMembers(workspaceId: number) {
  return requestList<WorkspaceMember>(`/workspaces/${workspaceId}/members/`)
}

export function getWorkspaceInvitations(workspaceId: number) {
  return requestList<WorkspaceInvitation>(`/workspaces/${workspaceId}/invitations/`)
}

export function inviteToWorkspace(workspaceId: number, email: string) {
  return request<WorkspaceInvitation>(`/workspaces/${workspaceId}/invitations/`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function resendWorkspaceInvitation(workspaceId: number, invitationId: number) {
  return request<WorkspaceInvitation>(`/workspaces/${workspaceId}/invitations/${invitationId}/resend/`, {
    method: 'POST',
  })
}

export function removeWorkspaceMember(workspaceId: number, membershipId: number) {
  return request<void>(`/workspaces/${workspaceId}/members/${membershipId}/`, {
    method: 'DELETE',
  })
}

/** Giving up your own membership; removeWorkspaceMember is the admin action. */
export function leaveWorkspace(workspaceId: number) {
  return request<void>(`/workspaces/${workspaceId}/members/me/`, {
    method: 'DELETE',
  })
}

export function getMyWorkspaceInvitations() {
  return requestList<WorkspaceInvitation>('/workspaces/invitations/')
}

export function acceptWorkspaceInvitation(invitationId: number) {
  return request<void>(`/workspaces/invitations/${invitationId}/accept/`, {
    method: 'POST',
  })
}

export function rejectWorkspaceInvitation(invitationId: number) {
  return request<void>(`/workspaces/invitations/${invitationId}/reject/`, {
    method: 'POST',
  })
}

export function getPublicWorkspaceInvitation(token: string) {
  return request<PublicWorkspaceInvitation>(`/workspaces/invitation-links/${encodeURIComponent(token)}/`)
}

export function getBoardMembers(workspaceId: number, boardId: number) {
  return requestList<BoardMember>(`/workspaces/${workspaceId}/boards/${boardId}/members/`)
}

export function updateBoardMember(
  workspaceId: number,
  boardId: number,
  membershipId: number,
  role: BoardMember['role'],
) {
  return request<BoardMember>(`/workspaces/${workspaceId}/boards/${boardId}/members/${membershipId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })
}

export function removeBoardMember(workspaceId: number, boardId: number, membershipId: number) {
  return request<void>(`/workspaces/${workspaceId}/boards/${boardId}/members/${membershipId}/`, {
    method: 'DELETE',
  })
}

export function getBoardInvitations(workspaceId: number, boardId: number) {
  return requestList<BoardInvitation>(`/workspaces/${workspaceId}/boards/${boardId}/invitations/`)
}

export function inviteToBoard(
  workspaceId: number,
  boardId: number,
  payload: { email: string; role: 'member' | 'viewer' },
) {
  return request<BoardInvitation>(`/workspaces/${workspaceId}/boards/${boardId}/invitations/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function resendBoardInvitation(workspaceId: number, boardId: number, invitationId: number) {
  return request<BoardInvitation>(
    `/workspaces/${workspaceId}/boards/${boardId}/invitations/${invitationId}/resend/`,
    { method: 'POST' },
  )
}

export function getMyBoardInvitations() {
  return requestList<BoardInvitation>('/boards/invitations/')
}

export function acceptBoardInvitation(invitationId: number) {
  return request<void>(`/boards/invitations/${invitationId}/accept/`, { method: 'POST' })
}

export function rejectBoardInvitation(invitationId: number) {
  return request<void>(`/boards/invitations/${invitationId}/reject/`, { method: 'POST' })
}

export function getPublicBoardInvitation(token: string) {
  return request<PublicBoardInvitation>(`/boards/invitation-links/${encodeURIComponent(token)}/`)
}
