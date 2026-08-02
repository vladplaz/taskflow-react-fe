import { useCallback, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { Toast as ToastPrimitive } from 'radix-ui'

import { cn } from '../../lib/utils'
import { Button } from './button'
import { ToastContext } from './toast-context'
import type { ToastOptions } from './toast-context'

type ActiveToast = ToastOptions & {
  id: number
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [activeToast, setActiveToast] = useState<ActiveToast | null>(null)
  const nextId = useRef(0)
  const showToast = useCallback((options: ToastOptions) => {
    nextId.current += 1
    setActiveToast({ ...options, id: nextId.current })
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      <ToastPrimitive.Provider duration={4000} swipeDirection="right">
        {children}
        {activeToast && (
          <ToastPrimitive.Root
            className={cn(
              'relative flex w-full items-start gap-3 rounded-xl border bg-popover p-4 pr-12 text-popover-foreground shadow-xl shadow-black/15 data-open:animate-in data-open:slide-in-from-right-5 data-closed:animate-out data-closed:fade-out-0 data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full',
              activeToast.variant === 'success' ? 'border-emerald-500/30' : 'border-destructive/40',
            )}
            key={activeToast.id}
            onOpenChange={(open) => {
              if (!open) setActiveToast(null)
            }}
            open
          >
            {activeToast.variant === 'success' ? (
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
            )}
            <div className="min-w-0">
              <ToastPrimitive.Title className="font-semibold">{activeToast.title}</ToastPrimitive.Title>
              {activeToast.description && (
                <ToastPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  {activeToast.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close asChild>
              <Button
                aria-label="Dismiss notification"
                className="absolute right-2 top-2"
                size="icon"
                variant="ghost"
              >
                <X />
              </Button>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        )}
        <ToastPrimitive.Viewport className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col gap-2 p-4 outline-none sm:max-w-sm" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}
