import { useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'

import { useLogin, useRegister } from '../features/auth/use-auth'
import {
  usePublicBoardInvitation,
  usePublicWorkspaceInvitation,
} from '../features/invitations/use-invitations'
import { ApiError } from '../lib/api'
import { firstValidationError, validateField } from '../lib/validation'
import { Brand } from '../components/ui/brand'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { ThemeToggle } from '../components/ui/theme-toggle'

type AuthMode = 'login' | 'register'
function getErrorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again'
}

export function AuthPage() {
  const workspaceInviteToken = getWorkspaceInviteToken()
  const boardInviteToken = getBoardInviteToken()
  const workspaceInvitation = usePublicWorkspaceInvitation(workspaceInviteToken)
  const boardInvitation = usePublicBoardInvitation(boardInviteToken)
  const invitation = boardInvitation.data
    ? {
        email: boardInvitation.data.email,
        name: `${boardInvitation.data.board_name} in ${boardInvitation.data.workspace_name}`,
        recipient_registered: boardInvitation.data.recipient_registered,
      }
    : workspaceInvitation.data
      ? {
          email: workspaceInvitation.data.email,
          name: workspaceInvitation.data.workspace_name,
          recipient_registered: workspaceInvitation.data.recipient_registered,
        }
      : null
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [registeredFromInvite, setRegisteredFromInvite] = useState(false)
  const login = useLogin()
  const register = useRegister()
  const isBusy = login.isPending || register.isPending
  const error = login.error ?? register.error
  const activeMode =
    invitation && !registeredFromInvite ? (invitation.recipient_registered ? 'login' : 'register') : mode
  const activeEmail = invitation?.email ?? email

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSuccessMessage('')
    setValidationError(null)
    const formError = firstValidationError(
      activeMode === 'register' ? validateField(displayName, 'Your name', { maxLength: 80 }) : null,
      validateField(activeEmail, 'Email address', { email: true, maxLength: 254 }),
      validateField(password, 'Password', { minLength: 8, trim: false }),
    )
    if (formError) {
      setValidationError(formError)
      return
    }
    try {
      if (activeMode === 'login') {
        await login.mutateAsync({ email: activeEmail.trim(), password })
        return
      }
      await register.mutateAsync({
        email: activeEmail.trim(),
        display_name: displayName.trim(),
        password,
        ...(workspaceInviteToken ? { invite_token: workspaceInviteToken } : {}),
        ...(boardInviteToken ? { board_invite_token: boardInviteToken } : {}),
      })
      setSuccessMessage('Account created. Sign in to begin.')
      setMode('login')
      setRegisteredFromInvite(true)
      setPassword('')
      setShowPassword(false)
    } catch {
      return
    }
  }
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-zinc-50 px-5 py-8 text-zinc-950 dark:bg-[#09090b] dark:text-zinc-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(124,58,237,0.16),transparent_28rem),radial-gradient(circle_at_85%_75%,rgba(45,212,191,0.1),transparent_25rem)]" />
      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white/75 shadow-2xl shadow-violet-950/10 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/65 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden min-h-[680px] overflow-hidden bg-zinc-950 p-12 text-white lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,#7c3aed,transparent_30rem),radial-gradient(circle_at_75%_90%,#0d9488,transparent_28rem)] opacity-80" />
          <div className="relative flex h-full flex-col">
            <Brand inverted />
            <div className="my-auto max-w-md">
              <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-violet-200">
                A calmer way to ship
              </p>
              <h1 className="text-5xl font-bold leading-[1.03] tracking-tight">
                Make work feel a little more obvious.
              </h1>
              <p className="mt-6 text-lg leading-8 text-zinc-300">
                Organize projects with your team, one focused workspace at a time.
              </p>
            </div>
          </div>
        </section>
        <section className="relative flex min-h-[640px] flex-col p-7 sm:p-12">
          <div className="flex items-center justify-between lg:hidden">
            <Brand />
            <ThemeToggle />
          </div>
          <div className="absolute right-12 top-12 hidden lg:block">
            <ThemeToggle />
          </div>
          <div className="m-auto w-full max-w-sm">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">
              {activeMode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              {invitation
                ? `Join ${invitation.name}`
                : activeMode === 'login'
                  ? 'Sign in to Taskflow'
                  : 'Create your account'}
            </h1>
            {invitation && (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {invitation.recipient_registered
                  ? 'Sign in with the invited email to view and answer your invitation.'
                  : 'Create an account with the invited email, then sign in to answer your invitation.'}
              </p>
            )}
            {(workspaceInviteToken || boardInviteToken) &&
              (workspaceInvitation.isError || boardInvitation.isError) && (
                <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  This invitation link is invalid or no longer available.
                </p>
              )}
            <form className="mt-8 space-y-4" noValidate onSubmit={submit}>
              {activeMode === 'register' && (
                <div className="space-y-2">
                  <Label htmlFor="display-name">Your name</Label>
                  <Input
                    autoComplete="name"
                    className="h-11"
                    id="display-name"
                    onChange={(event) => {
                      setDisplayName(event.target.value)
                      setValidationError(null)
                    }}
                    value={displayName}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  autoComplete="email"
                  className="h-11"
                  id="email"
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setValidationError(null)
                  }}
                  placeholder="you@example.com"
                  readOnly={Boolean(invitation)}
                  type="email"
                  value={activeEmail}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    autoComplete={activeMode === 'login' ? 'current-password' : 'new-password'}
                    className="h-11 pr-11"
                    id="password"
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setValidationError(null)
                    }}
                    placeholder="At least 8 characters"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <Button
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 z-10 h-full w-11 rounded-l-none"
                    onClick={() => setShowPassword((visible) => !visible)}
                    onMouseDown={(event) => event.preventDefault()}
                    size="icon"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    type="button"
                    variant="ghost"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </div>
              {(validationError || error) && (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                  {validationError ?? getErrorMessage(error)}
                </p>
              )}
              {successMessage && (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {successMessage}
                </p>
              )}
              <Button className="h-11 w-full" disabled={isBusy} type="submit">
                {isBusy && <LoaderCircle className="animate-spin" />}
                {isBusy ? 'Working…' : activeMode === 'login' ? 'Sign in' : 'Create account'}
              </Button>
            </form>
            {!invitation && (
              <p className="mt-7 text-center text-sm text-zinc-500 dark:text-zinc-400">
                {activeMode === 'login' ? 'New to Taskflow?' : 'Already have an account?'}{' '}
                <Button
                  className="h-auto px-0 font-semibold text-violet-600 dark:text-violet-400"
                  onClick={() => {
                    login.reset()
                    register.reset()
                    setSuccessMessage('')
                    setValidationError(null)
                    setShowPassword(false)
                    setMode((current) => (current === 'login' ? 'register' : 'login'))
                  }}
                  type="button"
                  variant="link"
                >
                  {activeMode === 'login' ? 'Create one' : 'Sign in'}
                </Button>
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function getWorkspaceInviteToken() {
  return window.location.pathname.match(/^\/invite\/([^/]+)\/?$/)?.[1] ?? null
}

function getBoardInviteToken() {
  return window.location.pathname.match(/^\/invite\/board\/([^/]+)\/?$/)?.[1] ?? null
}
