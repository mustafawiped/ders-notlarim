import { Icon } from './icons'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Sil',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="overlay" onClick={onCancel} role="presentation">
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-icon">
          <Icon name="trash" size={18} />
        </div>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="dialog-actions">
          <button className="btn" onClick={onCancel} type="button">
            Vazgeç
          </button>
          <button className="btn btn-danger" onClick={onConfirm} type="button">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
