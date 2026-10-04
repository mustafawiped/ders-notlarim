import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { Icon, type IconName } from './icons'

export interface ToastItem {
  id: string
  message: string
  type?: 'success' | 'info' | 'warn'
  icon?: IconName
}

interface ToastContextValue {
  showToast: (message: string, options?: { type?: ToastItem['type']; icon?: IconName }) => void
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback(
    (message: string, options?: { type?: ToastItem['type']; icon?: IconName }) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const item: ToastItem = {
        id,
        message,
        type: options?.type ?? 'success',
        icon: options?.icon ?? (options?.type === 'warn' ? 'alert' : 'check'),
      }
      setToasts((prev) => [...prev, item])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 3000)
    },
    [],
  )

  const remove = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => remove(t.id)}>
            {t.icon && <Icon name={t.icon} size={15} className="toast-icon" />}
            <span className="toast-msg">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
