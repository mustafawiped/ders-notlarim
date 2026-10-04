export const APP_NAME = 'Ders Notlarım'

export const COURSE_COLORS = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#8b5cf6',
  '#ef4444',
  '#84cc16',
] as const

/** Konu/nottan arama eşleşmesi çevresinde kısa bir önizleme üretir. */
export function makeSnippet(content: string, query: string, radius = 60): string {
  const idx = content.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return content.slice(0, radius * 2).replace(/\s+/g, ' ')
  const start = Math.max(0, idx - radius)
  const end = Math.min(content.length, idx + query.length + radius)
  const body = content.slice(start, end).replace(/\s+/g, ' ').trim()
  return (start > 0 ? '…' : '') + body + (end < content.length ? '…' : '')
}

export function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
