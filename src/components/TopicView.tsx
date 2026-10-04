import { useEffect, useRef, useState, useMemo } from 'react'
import type { Course, Note, Topic } from '../lib/types'
import { formatDateTime } from '../lib/format'
import { ConfirmDialog } from './ConfirmDialog'
import { Icon } from './icons'
import { MarkdownView } from './MarkdownView'
import { useToast } from './Toast'

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
  const { showToast } = useToast()
  const [composerOpen, setComposerOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [previewMode, setPreviewMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [editPreview, setEditPreview] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [filterText, setFilterText] = useState('')

  // Pinned note IDs saved in localStorage
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('dn.pinned_notes')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  const composerRef = useRef<HTMLTextAreaElement>(null)
  const editRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setComposerOpen(false)
    setEditingId(null)
    setDraft('')
    setFilterText('')
  }, [topic.id])

  useEffect(() => {
    if (composerOpen && !previewMode) composerRef.current?.focus()
  }, [composerOpen, previewMode])

  const togglePin = (noteId: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (next.has(noteId)) {
        next.delete(noteId)
        showToast('Not sabitlemesi kaldırıldı', { type: 'info', icon: 'star' })
      } else {
        next.add(noteId)
        showToast('Not başa sabitlendi ⭐', { type: 'success', icon: 'starFilled' })
      }
      localStorage.setItem('dn.pinned_notes', JSON.stringify(Array.from(next)))
      return next
    })
  }

  const insertSnippet = (
    prefix: string,
    suffix: string,
    target: 'composer' | 'edit',
    defaultText = 'metin',
  ) => {
    const isEdit = target === 'edit'
    const textarea = isEdit ? editRef.current : composerRef.current
    const val = isEdit ? editDraft : draft
    const setVal = isEdit ? setEditDraft : setDraft

    if (!textarea) {
      setVal((prev) => prev + prefix + defaultText + suffix)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = val.slice(start, end) || defaultText
    const replacement = prefix + selected + suffix
    const nextVal = val.slice(0, start) + replacement + val.slice(end)

    setVal(nextVal)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length)
    }, 10)
  }

  const copyNote = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      showToast('Not panoya kopyalandı! 📋')
    } catch {
      showToast('Kopyalanamadı', { type: 'warn' })
    }
  }

  const downloadNote = (note: Note) => {
    const blob = new Blob([note.content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${topic.title.replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ_-]/g, '_')}_not.md`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Not dosyası indirildi 📥')
  }

  const submitNew = async () => {
    const content = draft.trim()
    if (!content) return
    await onAddNote(content)
    setDraft('')
    setComposerOpen(false)
    setPreviewMode(false)
    showToast('Not başarıyla kaydedildi! ✨')
  }

  const submitEdit = async (id: string) => {
    const content = editDraft.trim()
    if (!content) return
    await onUpdateNote(id, content)
    setEditingId(null)
    setEditPreview(false)
    showToast('Not güncellendi!')
  }

  // Interactive checklist toggle directly inside note view
  const toggleCheckbox = async (note: Note, lineIndex: number) => {
    const lines = note.content.split('\n')
    if (lineIndex >= lines.length) return
    const targetLine = lines[lineIndex]
    let updatedLine = targetLine
    if (/^-\s*\[\s*\]\s+/.test(targetLine)) {
      updatedLine = targetLine.replace(/^-\s*\[\s*\]\s+/, '- [x] ')
    } else if (/^-\s*\[[xX]\]\s+/.test(targetLine)) {
      updatedLine = targetLine.replace(/^-\s*\[[xX]\]\s+/, '- [ ] ')
    } else {
      return
    }
    lines[lineIndex] = updatedLine
    await onUpdateNote(note.id, lines.join('\n'))
  }

  // Sorted and filtered notes: Pinned first, then sorted
  const displayedNotes = useMemo(() => {
    let list = [...notes]
    if (filterText.trim()) {
      const q = filterText.toLowerCase()
      list = list.filter((n) => n.content.toLowerCase().includes(q))
    }
    return list.sort((a, b) => {
      const aPinned = pinnedIds.has(a.id) ? 1 : 0
      const bPinned = pinnedIds.has(b.id) ? 1 : 0
      if (aPinned !== bPinned) return bPinned - aPinned
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [notes, filterText, pinnedIds])

  const draftWordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0
  const draftCharCount = draft.length

  return (
    <div className="topic-view">
      <div className="view-head">
        <button className="icon-btn" onClick={onBack} aria-label="Konulara dön" title="Konulara dön">
          <Icon name="arrowLeft" size={16} />
        </button>
        <div className="view-title-wrap">
          <h1 className="view-title">
            <span className="dot dot-lg" style={{ background: course.color }} />
            {topic.title}
          </h1>
          <p className="view-sub">
            {course.name} · {notes.length === 0 ? 'Henüz not yok' : `${notes.length} not`}
          </p>
        </div>
        <button
          className="btn btn-primary add-note-btn"
          onClick={() => {
            setComposerOpen(true)
            setPreviewMode(false)
          }}
          type="button"
        >
          <Icon name="plus" size={14} />
          Yeni Not
        </button>
      </div>

      {/* Arama / Filtreleme Çubuğu (Not sayısı > 2 ise) */}
      {notes.length > 2 && (
        <div className="topic-filter-bar">
          <Icon name="search" size={13} className="topic-filter-icon" />
          <input
            className="input topic-filter-input"
            placeholder="Bu konudaki notlarda ara…"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          {filterText && (
            <button className="icon-btn" onClick={() => setFilterText('')} aria-label="Temizle">
              <Icon name="x" size={12} />
            </button>
          )}
        </div>
      )}

      {/* Yeni Not Oluşturucu */}
      {composerOpen && (
        <div className="composer">
          <div className="composer-toolbar">
            <div className="composer-tools">
              <button
                className="icon-btn"
                type="button"
                title="Kalın (**metin**)"
                onClick={() => insertSnippet('**', '**', 'composer', 'kalın')}
              >
                <Icon name="bold" size={14} />
              </button>
              <button
                className="icon-btn"
                type="button"
                title="İtalik (*metin*)"
                onClick={() => insertSnippet('*', '*', 'composer', 'italik')}
              >
                <Icon name="italic" size={14} />
              </button>
              <button
                className="icon-btn"
                type="button"
                title="Vurgula (==metin==)"
                onClick={() => insertSnippet('==', '==', 'composer', 'vurgulu metin')}
              >
                <Icon name="sparkles" size={14} />
              </button>
              <button
                className="icon-btn"
                type="button"
                title="Liste (- madde)"
                onClick={() => insertSnippet('\n- ', '', 'composer', 'madde')}
              >
                <Icon name="list" size={14} />
              </button>
              <button
                className="icon-btn"
                type="button"
                title="Yapılacak Kutusu (- [ ] görev)"
                onClick={() => insertSnippet('\n- [ ] ', '', 'composer', 'görev')}
              >
                <Icon name="checkSquare" size={14} />
              </button>
              <button
                className="icon-btn"
                type="button"
                title="Kod Bloğu (```)"
                onClick={() => insertSnippet('\n```\n', '\n```\n', 'composer', 'kod')}
              >
                <Icon name="code" size={14} />
              </button>
              <button
                className="icon-btn"
                type="button"
                title="Alıntı (> alıntı)"
                onClick={() => insertSnippet('\n> ', '', 'composer', 'alıntı')}
              >
                <Icon name="quote" size={14} />
              </button>
            </div>

            <div className="composer-mode-tabs">
              <button
                className={`composer-mode-btn ${!previewMode ? 'active' : ''}`}
                onClick={() => setPreviewMode(false)}
                type="button"
              >
                Yaz
              </button>
              <button
                className={`composer-mode-btn ${previewMode ? 'active' : ''}`}
                onClick={() => setPreviewMode(true)}
                type="button"
              >
                <Icon name="eye" size={13} />
                Önizle
              </button>
            </div>
          </div>

          {!previewMode ? (
            <textarea
              ref={composerRef}
              className="textarea composer-textarea"
              placeholder="Notunu yaz… Markdown desteklidir (# Başlık, - [ ] Liste, **kalın**, ```kod```)"
              value={draft}
              rows={6}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void submitNew()
              }}
            />
          ) : (
            <div className="composer-preview">
              {draft.trim() ? (
                <MarkdownView content={draft} />
              ) : (
                <span className="muted">Önizlenecek bir şey yok.</span>
              )}
            </div>
          )}

          <div className="composer-actions">
            <div className="composer-stats">
              <span>Ctrl+Enter ile kaydet</span>
              {draft.trim() && (
                <span className="composer-wc">
                  · {draftWordCount} kelime · {draftCharCount} karakter
                </span>
              )}
            </div>
            <div className="composer-buttons">
              <button
                className="btn"
                onClick={() => {
                  setComposerOpen(false)
                  setDraft('')
                  setPreviewMode(false)
                }}
                type="button"
              >
                İptal
              </button>
              <button
                className="btn btn-primary"
                onClick={() => void submitNew()}
                disabled={!draft.trim()}
                type="button"
              >
                Kaydet
              </button>
            </div>
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
          <p className="muted">"Yeni Not" düğmesiyle ilk zengin notunu ekle.</p>
        </div>
      ) : displayedNotes.length === 0 && filterText ? (
        <div className="empty-state">
          <p>“{filterText}” ile eşleşen not bulunamadı.</p>
        </div>
      ) : (
        <div className="note-list">
          {displayedNotes.map((note) => {
            const edited = note.updatedAt !== note.createdAt
            const isPinned = pinnedIds.has(note.id)

            return (
              <article
                key={note.id}
                className={`note-card ${isPinned ? 'note-pinned' : ''}`}
              >
                {editingId === note.id ? (
                  <div className="note-editing">
                    <div className="composer-toolbar">
                      <div className="composer-tools">
                        <button
                          className="icon-btn"
                          type="button"
                          title="Kalın"
                          onClick={() => insertSnippet('**', '**', 'edit')}
                        >
                          <Icon name="bold" size={14} />
                        </button>
                        <button
                          className="icon-btn"
                          type="button"
                          title="İtalik"
                          onClick={() => insertSnippet('*', '*', 'edit')}
                        >
                          <Icon name="italic" size={14} />
                        </button>
                        <button
                          className="icon-btn"
                          type="button"
                          title="Vurgula"
                          onClick={() => insertSnippet('==', '==', 'edit')}
                        >
                          <Icon name="sparkles" size={14} />
                        </button>
                        <button
                          className="icon-btn"
                          type="button"
                          title="Liste"
                          onClick={() => insertSnippet('\n- ', '', 'edit')}
                        >
                          <Icon name="list" size={14} />
                        </button>
                        <button
                          className="icon-btn"
                          type="button"
                          title="Yapılacak"
                          onClick={() => insertSnippet('\n- [ ] ', '', 'edit')}
                        >
                          <Icon name="checkSquare" size={14} />
                        </button>
                        <button
                          className="icon-btn"
                          type="button"
                          title="Kod"
                          onClick={() => insertSnippet('\n```\n', '\n```\n', 'edit')}
                        >
                          <Icon name="code" size={14} />
                        </button>
                      </div>
                      <div className="composer-mode-tabs">
                        <button
                          className={`composer-mode-btn ${!editPreview ? 'active' : ''}`}
                          onClick={() => setEditPreview(false)}
                          type="button"
                        >
                          Düzenle
                        </button>
                        <button
                          className={`composer-mode-btn ${editPreview ? 'active' : ''}`}
                          onClick={() => setEditPreview(true)}
                          type="button"
                        >
                          Önizle
                        </button>
                      </div>
                    </div>

                    {!editPreview ? (
                      <textarea
                        ref={editRef}
                        className="textarea"
                        value={editDraft}
                        rows={Math.max(5, Math.ceil(editDraft.length / 50))}
                        autoFocus
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey))
                            void submitEdit(note.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                      />
                    ) : (
                      <div className="composer-preview">
                        <MarkdownView content={editDraft} />
                      </div>
                    )}

                    <div className="composer-buttons">
                      <button
                        className="btn"
                        onClick={() => {
                          setEditingId(null)
                          setEditPreview(false)
                        }}
                        type="button"
                      >
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
                      <div className="note-meta-left">
                        {isPinned && (
                          <span className="pinned-badge" title="Başa sabitlendi">
                            <Icon name="starFilled" size={13} />
                            Sabitlendi
                          </span>
                        )}
                        <span>
                          {formatDateTime(note.updatedAt)}
                          {edited && ' · düzenlendi'}
                        </span>
                      </div>

                      <div className="card-actions">
                        <button
                          className={`icon-btn ${isPinned ? 'active-star' : ''}`}
                          title={isPinned ? 'Sabitlemeyi kaldır' : 'Başa sabitle'}
                          onClick={() => togglePin(note.id)}
                          type="button"
                        >
                          <Icon name={isPinned ? 'starFilled' : 'star'} size={13} />
                        </button>
                        <button
                          className="icon-btn"
                          title="Notu panoya kopyala"
                          onClick={() => void copyNote(note.content)}
                          type="button"
                        >
                          <Icon name="copy" size={13} />
                        </button>
                        <button
                          className="icon-btn"
                          title="İndir (.md)"
                          onClick={() => downloadNote(note)}
                          type="button"
                        >
                          <Icon name="download" size={13} />
                        </button>
                        <button
                          className="icon-btn"
                          title="Düzenle"
                          onClick={() => {
                            setEditingId(note.id)
                            setEditDraft(note.content)
                            setEditPreview(false)
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
                      </div>
                    </div>

                    <div className="note-content">
                      <MarkdownView
                        content={note.content}
                        onToggleCheckbox={(lineIdx) => toggleCheckbox(note, lineIdx)}
                      />
                    </div>
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
            showToast('Not silindi')
          }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
