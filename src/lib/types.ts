export interface Course {
  id: string
  name: string
  color: string
  createdAt: string
}

export interface Topic {
  id: string
  courseId: string
  title: string
  createdAt: string
}

export interface Note {
  id: string
  topicId: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface SearchHit {
  kind: 'note' | 'topic'
  id: string
  courseId: string
  courseName: string
  topicId: string
  topicTitle: string
  snippet: string
  updatedAt: string
}

export interface Repository {
  listCourses(): Promise<Course[]>
  createCourse(name: string, color: string): Promise<Course>
  updateCourse(id: string, patch: Partial<Pick<Course, 'name' | 'color'>>): Promise<void>
  deleteCourse(id: string): Promise<void>

  listTopics(courseId: string): Promise<Topic[]>
  listAllTopics(): Promise<Topic[]>
  createTopic(courseId: string, title: string): Promise<Topic>
  updateTopic(id: string, patch: Partial<Pick<Topic, 'title'>>): Promise<void>
  deleteTopic(id: string): Promise<void>

  listNotes(topicId: string): Promise<Note[]>
  createNote(topicId: string, content: string): Promise<Note>
  updateNote(id: string, patch: Partial<Pick<Note, 'content'>>): Promise<void>
  deleteNote(id: string): Promise<void>

  search(query: string): Promise<SearchHit[]>
}
