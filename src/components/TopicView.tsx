import { useEffect, useRef, useState } from 'react'
import type { Course, Note, Topic } from '../lib/types'
import { formatDateTime } from '../lib/format'
import { ConfirmDialog } from './ConfirmDialog'
import { Icon } from './icons'

interface TopicViewProps {
  course: Course
  topic: Topic
  notes: Note[]
  loading: boolean
  onBack: () => void
  onAddNote: (content: string) => Promise<void>
  onUpdateNote: (id: string, content: string) => Promise<void>
  onDeleteNote: (id: string) => Promise<void>
}

export function TopicView({
  course,
  topic,
  notes,
  loading,
  onBack,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: TopicViewProps) {
  const [composerOpen, setComposerOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setComposerOpen(false)
    setEditingId(null)
    setDraft('')
  }, [topic.id])

  useEffect(() => {
    if (composerOpen) composerRef.current?.focus()
  }, [composerOpen])

  const submitNew = async () => {
    const content = draft.trim()
    if (!content) return
    await onAddNote(content)
    setDraft('')
    setComposerOpen(false)
  }

  const submitEdit = async (id: string) => {
    const content = editDraft.trim()
    if (!content) return
    await onUpdateNote(id, content)
    setEditingId(null)
  }

  return (
    <div className="topic-view">
      <div className="view-head">
        <button className="icon-btn" onClick={onBack} aria-label="Konulara dön" title="Konulara dön">
          <Icon name="arrowLeft" size={16} />
        </button>
        <div className="view-title-wrap">
          <h1 className="view-title">{topic.title}</h1>
          <p className="view-sub">
            {course.name} · {notes.length === 0 ? 'Henüz not yok' : `${notes.length} not`}
          </p>
        </div>
        <button
          className="btn btn-primary add-note-btn"
          onClick={() => setComposerOpen(true)}
          type="button"
        >
          <Icon name="plus" size={14} />
          Yeni Not
        </button>
      </div>

      {composerOpen && (
        <div className="composer">
          <textarea
            ref={composerRef}
            className="textarea"
            placeholder="Notunu yaz… (ders özeti, formüller, hatırlatıcılar)"
            value={draft}
            rows={5}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void submitNew()
            }}
          />
          <div className="composer-actions">
            <span className="muted">Ctrl+Enter ile kaydedebilirsin</span>
            <span className="composer-buttons">
              <button
                className="btn"
                onClick={() => {
                  setComposerOpen(false)
                  setDraft('')
                }}
                type="button"
              >
                İptal
              </button>
              <button className="btn btn-primary" onClick={() => void submitNew()} disabled={!draft.trim()} type="button">
                Kaydet
              </button>
            </span>
          </div>
        </div>
      )}

      {loading ? (
        <p className="muted loading-hint">Notlar yükleniyor…</p>
      ) : notes.length === 0 && !composerOpen ? (
        <div className="empty-state">
          <span className="empty-icon">
            <Icon name="note" size={26} />
          </span>
          <p>Bu konuda henüz not yok.</p>
          <p className="muted">"Yeni Not" düğmesiyle ilk notunu ekle.</p>
        </div>
      ) : (
        <div className="note-list">
          {notes.map((note) => {
            const edited = note.updatedAt !== note.createdAt
            return (
              <article key={note.id} className="note-card">
                {editingId === note.id ? (
                  <div className="note-editing">
                    <textarea
                      className="textarea"
                      value={editDraft}
                      rows={Math.max(4, Math.ceil(editDraft.length / 60))}
                      autoFocus
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void submitEdit(note.id)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                    />
                    <div className="composer-buttons">
                      <button className="btn" onClick={() => setEditingId(null)} type="button">
                        İptal
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => void submitEdit(note.id)}
                        disabled={!editDraft.trim()}
                        type="button"
                      >
                        Kaydet
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="note-meta">
                      <span>
                        {formatDateTime(note.updatedAt)}
                        {edited && ' · düzenlendi'}
                      </span>
                      <span className="card-actions">
                        <button
                          className="icon-btn"
                          title="Düzenle"
                          onClick={() => {
                            setEditingId(note.id)
                            setEditDraft(note.content)
                          }}
                          type="button"
                        >
                          <Icon name="pencil" size={13} />
                        </button>
                        <button
                          className="icon-btn danger"
                          title="Notu sil"
                          onClick={() => setDeleteId(note.id)}
                          type="button"
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </span>
                    </div>
                    <div className="note-content">{note.content}</div>
                  </>
                )}
              </article>
            )
          })}
        </div>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Notu sil"
          message="Bu not kalıcı olarak silinecek. Emin misin?"
          onConfirm={() => {
            void onDeleteNote(deleteId)
            setDeleteId(null)
          }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
