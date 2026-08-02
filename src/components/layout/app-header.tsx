import { Link } from 'react-router'
import { Building2, LayoutDashboard, LoaderCircle, LogOut, Mail, UserRound } from 'lucide-react'

import { useAuthSession, useLogout } from '../../features/auth/use-auth'
import { Brand } from '../ui/brand'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { ThemeToggle } from '../ui/theme-toggle'

export function AppHeader() {
  const session = useAuthSession()
  const logout = useLogout()
  const displayName = session.data?.display_name ?? ''

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-zinc-200/80 bg-white/85 px-5 py-3.5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-5">
          <Link className="rounded-xl" to="/">
            <Brand />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <Button asChild size="sm" variant="ghost">
              <Link to="/">
                <LayoutDashboard /> My boards
              </Link>
            </Button>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-zinc-500 dark:text-zinc-400 sm:block">{displayName}</span>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="Account menu" className="rounded-full" size="icon-lg" variant="outline">
                <UserRound />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/">
                  <LayoutDashboard /> My boards
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/admin">
                  <Building2 /> Admin setup
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile">
                  <UserRound /> My profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/invitations">
                  <Mail /> Invitations
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={logout.isPending}
                onSelect={() => logout.mutate()}
                variant="destructive"
              >
                {logout.isPending ? <LoaderCircle className="animate-spin" /> : <LogOut />} Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
