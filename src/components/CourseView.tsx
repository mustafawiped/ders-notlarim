import { useState } from 'react'
import type { Course, Topic } from '../lib/types'
import { formatDate } from '../lib/format'
import { ConfirmDialog } from './ConfirmDialog'
import { Icon } from './icons'

interface CourseViewProps {
  course: Course
  topics: Topic[]
  onBack: () => void
  onAdd: (title: string) => Promise<void>
  onRename: (id: string, title: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onOpenTopic: (id: string) => void
}

export function CourseView({
  course,
  topics,
  onBack,
  onAdd,
  onRename,
  onDelete,
  onOpenTopic,
}: CourseViewProps) {
  const [title, setTitle] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const submit = async () => {
    const t = title.trim()
    if (!t) return
    await onAdd(t)
    setTitle('')
  }

  const commitRename = async (id: string) => {
    const t = renameValue.trim()
    setRenamingId(null)
    if (t) await onRename(id, t)
  }

  const filteredTopics = filter.trim()
    ? topics.filter((t) => t.title.toLowerCase().includes(filter.toLowerCase()))
    : topics

  return (
    <div className="course-view">
      <div className="view-head">
        <button className="icon-btn" onClick={onBack} aria-label="Derslere dön" title="Derslere dön">
          <Icon name="arrowLeft" size={16} />
        </button>
        <div className="view-title-wrap">
          <h1 className="view-title">
            <span className="dot dot-lg" style={{ background: course.color }} />
            {course.name}
          </h1>
          <p className="view-sub">
            {topics.length === 0 ? 'Henüz konu yok' : `${topics.length} konu`} · Konu ekleyip içine not yazabilirsin.
          </p>
        </div>
      </div>

      <div className="add-topic">
        <input
          className="input"
          placeholder="Yeni konu adı (örn. Türev ve İntegral, Osmanlı Dönemi...)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submit()
          }}
        />
        <button className="btn btn-primary" onClick={() => void submit()} disabled={!title.trim()} type="button">
          <Icon name="plus" size={14} />
          Konu Ekle
        </button>
      </div>

      {topics.length > 4 && (
        <div className="topic-filter-bar">
          <Icon name="search" size={13} className="topic-filter-icon" />
          <input
            className="input topic-filter-input"
            placeholder="Konularda filtrele…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      )}

      {topics.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">
            <Icon name="book" size={26} />
          </span>
          <p>Bu derste henüz konu yok.</p>
          <p className="muted">Yukarıdaki alana konu adı yazıp ekleyerek başla.</p>
        </div>
      ) : (
        <div className="topic-grid">
          {filteredTopics.map((topic) => (
            <div
              key={topic.id}
              className="topic-card"
              role="button"
              tabIndex={0}
              onClick={() => onOpenTopic(topic.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onOpenTopic(topic.id)
              }}
            >
              <div className="topic-card-bar" style={{ background: course.color }} />
              {renamingId === topic.id ? (
                <input
                  className="input rename-input"
                  value={renameValue}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => void commitRename(topic.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void commitRename(topic.id)
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                />
              ) : (
                <>
                  <div className="topic-card-top">
                    <span className="topic-card-badge">Konu</span>
                    <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="icon-btn"
                        title="Yeniden adlandır"
                        onClick={() => {
                          setRenamingId(topic.id)
                          setRenameValue(topic.title)
                        }}
                        type="button"
                      >
                        <Icon name="pencil" size={13} />
                      </button>
                      <button
                        className="icon-btn danger"
                        title="Konuyu sil"
                        onClick={() => setDeleteId(topic.id)}
                        type="button"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="topic-card-title">{topic.title}</div>
                  <div className="topic-card-meta">
                    <span>{formatDate(topic.createdAt)}</span>
                    <span className="topic-open-hint">
                      Notları Aç <Icon name="chevronRight" size={13} />
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Konuyu sil"
          message={`"${topics.find((t) => t.id === deleteId)?.title}" konusu ve içindeki tüm notlar silinecek. Emin misin?`}
          onConfirm={() => {
            void onDelete(deleteId)
            setDeleteId(null)
          }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
