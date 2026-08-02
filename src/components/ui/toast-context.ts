import { createContext, useContext } from 'react'

export type ToastOptions = {
  description?: string
  title: string
  variant: 'success' | 'error'
}

export const ToastContext = createContext<((options: ToastOptions) => void) | null>(null)

export function useToast() {
  const showToast = useContext(ToastContext)
  if (!showToast) throw new Error('useToast must be used within ToastProvider')
  return showToast
}
