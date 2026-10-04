import type { SearchHit } from '../lib/types'
import { formatDate } from '../lib/format'
import { Icon } from './icons'

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const parts: Array<string | { m: string }> = []
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  let i = 0
  for (;;) {
    const idx = lower.indexOf(q, i)
    if (idx < 0) {
      parts.push(text.slice(i))
      break
    }
    if (idx > i) parts.push(text.slice(i, idx))
    parts.push({ m: text.slice(idx, idx + q.length) })
    i = idx + q.length
  }
  return (
    <>
      {parts.map((p, n) =>
        typeof p === 'string' ? <span key={n}>{p}</span> : <mark key={n}>{p.m}</mark>,
      )}
    </>
  )
}

interface SearchViewProps {
  query: string
  hits: SearchHit[]
  loading: boolean
  onOpenHit: (hit: SearchHit) => void
}

export function SearchView({ query, hits, loading, onOpenHit }: SearchViewProps) {
  const q = query.trim()
  if (!q) return null

  return (
    <div className="search-view">
      <h1 className="view-title">“{q}” için sonuçlar</h1>
      <p className="view-sub">
        {loading ? 'Aranıyor…' : hits.length === 0 ? 'Sonuç bulunamadı.' : `${hits.length} sonuç`}
      </p>

      {!loading && hits.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">
            <Icon name="search" size={26} />
          </span>
          <p>Sonuç bulunamadı.</p>
          <p className="muted">Farklı bir kelime deneyebilirsin.</p>
        </div>
      )}

      <div className="hit-list">
        {hits.map((hit) => (
          <button
            key={`${hit.kind}-${hit.id}`}
            className="hit"
            onClick={() => onOpenHit(hit)}
            type="button"
          >
            <span className="hit-icon">
              <Icon name={hit.kind === 'note' ? 'note' : 'book'} size={15} />
            </span>
            <span className="hit-body">
              <span className="hit-top">
                <span className="hit-title">
                  <Highlight text={hit.topicTitle} query={q} />
                </span>
                <span className="hit-date">{formatDate(hit.updatedAt)}</span>
              </span>
              <span className="hit-course">{hit.courseName}</span>
              {hit.kind === 'note' && (
                <span className="hit-snippet">
                  <Highlight text={hit.snippet} query={q} />
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
