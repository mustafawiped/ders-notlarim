import { supabase } from './supabase'
import type { Course, Note, Repository, SearchHit, Topic } from './types'
import { makeSnippet } from './constants'

function mapCourse(row: Record<string, unknown>): Course {
  return {
    id: String(row.id),
    name: String(row.name),
    color: String(row.color),
    createdAt: String(row.created_at),
  }
}

function mapTopic(row: Record<string, unknown>): Topic {
  return {
    id: String(row.id),
    courseId: String(row.course_id),
    title: String(row.title),
    createdAt: String(row.created_at),
  }
}

function mapNote(row: Record<string, unknown>): Note {
  return {
    id: String(row.id),
    topicId: String(row.topic_id),
    content: String(row.content ?? ''),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

/** Supabase PostgREST üzerinden çalışan veri katmanı; her kayıt kullanıcıya bağlanır. */
export class SupabaseRepository implements Repository {
  private client = supabase as NonNullable<typeof supabase>

  constructor(private readonly userId: string) {}

  async listCourses(): Promise<Course[]> {
    const { data, error } = await this.client
      .from('courses')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map(mapCourse)
  }

  async createCourse(name: string, color: string): Promise<Course> {
    const { data, error } = await this.client
      .from('courses')
      .insert({ user_id: this.userId, name: name.trim(), color })
      .select()
      .single()
    if (error) throw error
    return mapCourse(data)
  }

  async updateCourse(id: string, patch: Partial<Pick<Course, 'name' | 'color'>>): Promise<void> {
    const { error } = await this.client
      .from('courses')
      .update({ ...patch, ...(patch.name ? { name: patch.name.trim() } : {}) })
      .eq('id', id)
    if (error) throw error
  }

  async deleteCourse(id: string): Promise<void> {
    // Konular ve notlar veritabanındaki cascade kurallarıyla silinir.
    const { error } = await this.client.from('courses').delete().eq('id', id)
    if (error) throw error
  }

  async listTopics(courseId: string): Promise<Topic[]> {
    const { data, error } = await this.client
      .from('topics')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map(mapTopic)
  }

  async listAllTopics(): Promise<Topic[]> {
    const { data, error } = await this.client
      .from('topics')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map(mapTopic)
  }

  async createTopic(courseId: string, title: string): Promise<Topic> {
    const { data, error } = await this.client
      .from('topics')
      .insert({ user_id: this.userId, course_id: courseId, title: title.trim() })
      .select()
      .single()
    if (error) throw error
    return mapTopic(data)
  }

  async updateTopic(id: string, patch: Partial<Pick<Topic, 'title'>>): Promise<void> {
    const { error } = await this.client
      .from('topics')
      .update({ ...patch, ...(patch.title ? { title: patch.title.trim() } : {}) })
      .eq('id', id)
    if (error) throw error
  }

  async deleteTopic(id: string): Promise<void> {
    const { error } = await this.client.from('topics').delete().eq('id', id)
    if (error) throw error
  }

  async listNotes(topicId: string): Promise<Note[]> {
    const { data, error } = await this.client
      .from('notes')
      .select('*')
      .eq('topic_id', topicId)
      .order('updated_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapNote)
  }

  async createNote(topicId: string, content: string): Promise<Note> {
    const { data, error } = await this.client
      .from('notes')
      .insert({ user_id: this.userId, topic_id: topicId, content })
      .select()
      .single()
    if (error) throw error
    return mapNote(data)
  }

  async updateNote(id: string, patch: Partial<Pick<Note, 'content'>>): Promise<void> {
    const { error } = await this.client
      .from('notes')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }

  async deleteNote(id: string): Promise<void> {
    const { error } = await this.client.from('notes').delete().eq('id', id)
    if (error) throw error
  }

  async search(query: string): Promise<SearchHit[]> {
    const like = `%${query}%`
    const hits: SearchHit[] = []

    const notesRes = await this.client
      .from('notes')
      .select(
        'id, content, updated_at, topic_id, topics!inner(id, title, course_id, courses!inner(name))',
      )
      .ilike('content', like)
      .order('updated_at', { ascending: false })
      .limit(50)
    if (notesRes.error) throw notesRes.error

    for (const row of (notesRes.data ?? []) as Array<Record<string, any>>) {
      const topic = row.topics as Record<string, any>
      const course = topic?.courses as Record<string, any> | undefined
      hits.push({
        kind: 'note',
        id: String(row.id),
        courseId: String(topic?.course_id ?? ''),
        courseName: String(course?.name ?? ''),
        topicId: String(topic?.id ?? row.topic_id),
        topicTitle: String(topic?.title ?? ''),
        snippet: makeSnippet(String(row.content ?? ''), query),
        updatedAt: String(row.updated_at),
      })
    }

    const topicsRes = await this.client
      .from('topics')
      .select('id, title, created_at, course_id, courses!inner(name)')
      .ilike('title', like)
      .limit(20)
    if (topicsRes.error) throw topicsRes.error

    for (const row of (topicsRes.data ?? []) as Array<Record<string, any>>) {
      const course = row.courses as Record<string, any>
      hits.push({
        kind: 'topic',
        id: String(row.id),
        courseId: String(row.course_id),
        courseName: String(course?.name ?? ''),
        topicId: String(row.id),
        topicTitle: String(row.title),
        snippet: String(row.title),
        updatedAt: String(row.created_at),
      })
    }

    return hits.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
}
