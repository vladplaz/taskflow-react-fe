import { useEffect, useState } from 'react'

import { Icon } from './icon'
import { Button } from './button'

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') !== 'light')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  return (
    <Button
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="border-border bg-background text-muted-foreground"
      onClick={() => setIsDark((current) => !current)}
      size="icon-lg"
      type="button"
      variant="outline"
    >
      <Icon>
        {isDark ? (
          <path d="M12 3v2m0 14v2M3 12h2m14 0h2m-3.64-5.36 1.42-1.42M5.22 18.78l1.42-1.42m0-10.14L5.22 5.8m13.56 12.98-1.42-1.42M15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" />
        ) : (
          <path d="M20.5 15.4A8.5 8.5 0 0 1 8.6 3.5 8.5 8.5 0 1 0 20.5 15.4Z" />
        )}
      </Icon>
    </Button>
  )
}
