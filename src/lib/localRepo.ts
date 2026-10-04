import type { Course, Note, Repository, SearchHit, Topic } from './types'
import { makeSnippet } from './constants'

const KEYS = {
  courses: 'dn.courses',
  topics: 'dn.topics',
  notes: 'dn.notes',
} as const

function read<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as T[]
  } catch {
    return []
  }
}

function write<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items))
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const byCreated = (a: { createdAt: string }, b: { createdAt: string }) =>
  a.createdAt.localeCompare(b.createdAt)
const byUpdatedDesc = (a: Note, b: Note) => b.updatedAt.localeCompare(a.updatedAt)

/**
 * Supabase bağlı olmadığında kullanılan yedek veri katmanı.
 * Veriler yalnızca tarayıcının localStorage'ında tutulur.
 */
export class LocalRepository implements Repository {
  private courses(): Course[] {
    return read<Course>(KEYS.courses)
  }
  private topics(): Topic[] {
    return read<Topic>(KEYS.topics)
  }
  private notes(): Note[] {
    return read<Note>(KEYS.notes)
  }

  async listCourses(): Promise<Course[]> {
    return this.courses().sort(byCreated)
  }

  async createCourse(name: string, color: string): Promise<Course> {
    const course: Course = { id: uid(), name: name.trim(), color, createdAt: new Date().toISOString() }
    write(KEYS.courses, [...this.courses(), course])
    return course
  }

  async updateCourse(id: string, patch: Partial<Pick<Course, 'name' | 'color'>>): Promise<void> {
    write(
      KEYS.courses,
      this.courses().map((c) => (c.id === id ? { ...c, ...patch } : c)),
    )
  }

  async deleteCourse(id: string): Promise<void> {
    const removedTopics = new Set(this.topics().filter((t) => t.courseId === id).map((t) => t.id))
    write(KEYS.courses, this.courses().filter((c) => c.id !== id))
    write(KEYS.topics, this.topics().filter((t) => !removedTopics.has(t.id)))
    write(KEYS.notes, this.notes().filter((n) => !removedTopics.has(n.topicId)))
  }

  async listTopics(courseId: string): Promise<Topic[]> {
    return this.topics().filter((t) => t.courseId === courseId).sort(byCreated)
  }

  async listAllTopics(): Promise<Topic[]> {
    return this.topics().sort(byCreated)
  }

  async createTopic(courseId: string, title: string): Promise<Topic> {
    const topic: Topic = { id: uid(), courseId, title: title.trim(), createdAt: new Date().toISOString() }
    write(KEYS.topics, [...this.topics(), topic])
    return topic
  }

  async updateTopic(id: string, patch: Partial<Pick<Topic, 'title'>>): Promise<void> {
    write(
      KEYS.topics,
      this.topics().map((t) => (t.id === id ? { ...t, ...patch } : t)),
    )
  }

  async deleteTopic(id: string): Promise<void> {
    write(KEYS.topics, this.topics().filter((t) => t.id !== id))
    write(KEYS.notes, this.notes().filter((n) => n.topicId !== id))
  }

  async listNotes(topicId: string): Promise<Note[]> {
    return this.notes().filter((n) => n.topicId === topicId).sort(byUpdatedDesc)
  }

  async createNote(topicId: string, content: string): Promise<Note> {
    const now = new Date().toISOString()
    const note: Note = { id: uid(), topicId, content, createdAt: now, updatedAt: now }
    write(KEYS.notes, [...this.notes(), note])
    return note
  }

  async updateNote(id: string, patch: Partial<Pick<Note, 'content'>>): Promise<void> {
    write(
      KEYS.notes,
      this.notes().map((n) =>
        n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
      ),
    )
  }

  async deleteNote(id: string): Promise<void> {
    write(KEYS.notes, this.notes().filter((n) => n.id !== id))
  }

  async search(query: string): Promise<SearchHit[]> {
    const q = query.toLowerCase()
    const courses = new Map(this.courses().map((c) => [c.id, c]))
    const topics = this.topics()
    const topicById = new Map(topics.map((t) => [t.id, t]))

    const hits: SearchHit[] = []
    for (const topic of topics) {
      if (!topic.title.toLowerCase().includes(q)) continue
      hits.push({
        kind: 'topic',
        id: topic.id,
        courseId: topic.courseId,
        courseName: courses.get(topic.courseId)?.name ?? '',
        topicId: topic.id,
        topicTitle: topic.title,
        snippet: topic.title,
        updatedAt: topic.createdAt,
      })
    }
    for (const note of this.notes()) {
      if (!note.content.toLowerCase().includes(q)) continue
      const topic = topicById.get(note.topicId)
      if (!topic) continue
      hits.push({
        kind: 'note',
        id: note.id,
        courseId: topic.courseId,
        courseName: courses.get(topic.courseId)?.name ?? '',
        topicId: topic.id,
        topicTitle: topic.title,
        snippet: makeSnippet(note.content, query),
        updatedAt: note.updatedAt,
      })
    }
    return hits.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
}
