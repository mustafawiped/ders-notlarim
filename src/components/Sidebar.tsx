import { useEffect, useRef, useState } from 'react'
import type { Course } from '../lib/types'
import { APP_NAME, COURSE_COLORS } from '../lib/constants'
import { ConfirmDialog } from './ConfirmDialog'
import { Icon } from './icons'

interface SidebarProps {
  courses: Course[]
  topicCounts: Record<string, number>
  selectedCourseId: string | null
  open: boolean
  onSelect: (id: string | null) => void
  onAdd: (name: string, color: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
  userEmail: string | null
  onLogout: () => Promise<void>
}

export function Sidebar({
  courses,
  topicCounts,
  selectedCourseId,
  open,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  onClose,
  userEmail,
  onLogout,
}: SidebarProps) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<string>(COURSE_COLORS[0])
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const addInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) addInputRef.current?.focus()
  }, [adding])

  const submitAdd = async () => {
    const name = newName.trim()
    if (!name) return
    await onAdd(name, newColor)
    setNewName('')
    setAdding(false)
  }

  const commitRename = async (id: string) => {
    const name = renameValue.trim()
    setRenamingId(null)
    if (name) await onRename(id, name)
  }

  return (
    <>
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand">
            <span className="brand-icon">
              <Icon name="cap" size={18} />
            </span>
            <span className="brand-name">{APP_NAME}</span>
          </div>
          <button className="icon-btn only-mobile" onClick={onClose} aria-label="Menüyü kapat">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="sidebar-section">
          <div className="section-head">
            <span>Dersler</span>
            <button
              className="icon-btn"
              onClick={() => setAdding(!adding)}
              aria-label="Yeni ders ekle"
              title="Yeni ders ekle"
            >
              <Icon name="plus" size={15} />
            </button>
          </div>

          {adding && (
            <div className="add-course">
              <div className="swatches">
                {COURSE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`swatch ${newColor === c ? 'selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setNewColor(c)}
                    aria-label={`Renk seç: ${c}`}
                  />
                ))}
              </div>
              <input
                ref={addInputRef}
                className="input"
                placeholder="Ders adı (örn. Matematik)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submitAdd()
                  if (e.key === 'Escape') setAdding(false)
                }}
              />
              <div className="add-course-actions">
                <button className="btn" onClick={() => setAdding(false)} type="button">
                  İptal
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => void submitAdd()}
                  disabled={!newName.trim()}
                  type="button"
                >
                  Ekle
                </button>
              </div>
            </div>
          )}

          <nav className="course-list">
            {courses.length === 0 && !adding && (
              <p className="empty-hint">Henüz ders yok. + düğmesiyle ilk dersini ekle.</p>
            )}
            {courses.map((course) => (
              <div
                key={course.id}
                className={`course-item ${selectedCourseId === course.id ? 'active' : ''}`}
              >
                {renamingId === course.id ? (
                  <input
                    className="input rename-input"
                    value={renameValue}
                    autoFocus
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => void commitRename(course.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void commitRename(course.id)
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                  />
                ) : (
                  <>
                    <button className="course-main" onClick={() => onSelect(course.id)} type="button">
                      <span className="dot" style={{ background: course.color }} />
                      <span className="course-name">{course.name}</span>
                      <span className="count">{topicCounts[course.id] ?? 0}</span>
                    </button>
                    <span className="course-actions">
                      <button
                        className="icon-btn"
                        title="Yeniden adlandır"
                        onClick={() => {
                          setRenamingId(course.id)
                          setRenameValue(course.name)
                        }}
                        type="button"
                      >
                        <Icon name="pencil" size={13} />
                      </button>
                      <button
                        className="icon-btn danger"
                        title="Dersi sil"
                        onClick={() => setDeleteId(course.id)}
                        type="button"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </span>
                  </>
                )}
              </div>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          {userEmail ? (
            <div className="user-box">
              <span className="user-email" title={userEmail}>
                {userEmail}
              </span>
              <button className="btn btn-small" onClick={() => void onLogout()} type="button">
                Çıkış Yap
              </button>
            </div>
          ) : (
            <span className="muted">Kişisel ders notları</span>
          )}
        </div>
      </aside>

      {deleteId && (
        <ConfirmDialog
          title="Dersi sil"
          message={`"${courses.find((c) => c.id === deleteId)?.name}" dersi ve içindeki tüm konular ve notlar silinecek. Emin misin?`}
          onConfirm={() => {
            void onDelete(deleteId)
            setDeleteId(null)
          }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </>
  )
}
