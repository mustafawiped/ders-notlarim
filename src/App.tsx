import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Sidebar } from './components/Sidebar'
import { CourseView } from './components/CourseView'
import { TopicView } from './components/TopicView'
import { SearchView } from './components/SearchView'
import { SetupNotice } from './components/SetupNotice'
import { AuthView } from './components/AuthView'
import { LegalView, type LegalPage } from './components/LegalView'
import { Footer } from './components/Footer'
import { Icon } from './components/icons'
import { isDemo, createRepository } from './lib/repository'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import { APP_NAME, errMessage } from './lib/constants'
import type { Course, Note, Repository, SearchHit, Topic } from './lib/types'

const SCHEMA_HINT = /does not exist|relation|column|row-level security|schema/i

export default function App() {
  const [authLoading, setAuthLoading] = useState(!isDemo)
  const [session, setSession] = useState<Session | null>(null)
  const [legal, setLegal] = useState<LegalPage | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('dn.theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('dn.theme', theme)
  }, [theme])

  // Oturum durumu (demo modda atlanır).
  useEffect(() => {
    if (isDemo) return
    supabase!.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const {
      data: { subscription },
    } = supabase!.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setAuthLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id ?? null
  const userEmail = session?.user?.email ?? null

  const repo = useMemo<Repository>(() => createRepository(userId ?? undefined), [userId])

  const refresh = useCallback(async () => {
    try {
      const [cs, ts] = await Promise.all([repo.listCourses(), repo.listAllTopics()])
      setCourses(cs)
      setTopics(ts)
      setError(null)
    } catch (e) {
      setError(errMessage(e))
    } finally {
      setInitialLoading(false)
    }
  }, [repo])

  // Oturum açıldığında (veya demo modda ilk açılışta) verileri yükle.
  useEffect(() => {
    if (!isDemo && !userId) return
    void refresh()
  }, [isDemo, userId, refresh])

  // Çıkış yapıldığında tüm verileri temizle.
  useEffect(() => {
    if (isDemo || userId) return
    setCourses([])
    setTopics([])
    setNotes([])
    setSelectedCourseId(null)
    setSelectedTopicId(null)
    setQuery('')
    setError(null)
  }, [isDemo, userId])

  const reloadNotes = useCallback(
    async (topicId: string) => {
      setNotesLoading(true)
      try {
        setNotes(await repo.listNotes(topicId))
        setError(null)
      } catch (e) {
        setError(errMessage(e))
      } finally {
        setNotesLoading(false)
      }
    },
    [repo],
  )

  useEffect(() => {
    if (selectedTopicId) void reloadNotes(selectedTopicId)
    else setNotes([])
  }, [selectedTopicId, reloadNotes])

  // Arama: yazmayı bıraktıktan kısa süre sonra çalışır.
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setHits([])
      setSearching(false)
      return
    }
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        setHits(await repo.search(q))
        setError(null)
      } catch (e) {
        setError(errMessage(e))
      } finally {
        setSearching(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [query, repo])

  const guard = useCallback(async (fn: () => Promise<void>) => {
    try {
      await fn()
      setError(null)
    } catch (e) {
      setError(errMessage(e))
    }
  }, [])

  const addCourse = useCallback(
    (name: string, color: string) => guard(async () => {
      await repo.createCourse(name, color)
      await refresh()
    }),
    [guard, refresh, repo],
  )

  const renameCourse = useCallback(
    (id: string, name: string) => guard(async () => {
      await repo.updateCourse(id, { name })
      await refresh()
    }),
    [guard, refresh, repo],
  )

  const deleteCourse = useCallback(
    (id: string) => guard(async () => {
      await repo.deleteCourse(id)
      if (selectedCourseId === id) {
        setSelectedCourseId(null)
        setSelectedTopicId(null)
      }
      await refresh()
    }),
    [guard, refresh, repo, selectedCourseId],
  )

  const addTopic = useCallback(
    (courseId: string, title: string) => guard(async () => {
      await repo.createTopic(courseId, title)
      await refresh()
    }),
    [guard, refresh, repo],
  )

  const renameTopic = useCallback(
    (id: string, title: string) => guard(async () => {
      await repo.updateTopic(id, { title })
      await refresh()
    }),
    [guard, refresh, repo],
  )

  const deleteTopic = useCallback(
    (id: string) => guard(async () => {
      await repo.deleteTopic(id)
      if (selectedTopicId === id) setSelectedTopicId(null)
      await refresh()
    }),
    [guard, refresh, repo, selectedTopicId],
  )

  const addNote = useCallback(
    (topicId: string, content: string) => guard(async () => {
      await repo.createNote(topicId, content)
      await reloadNotes(topicId)
    }),
    [guard, reloadNotes, repo],
  )

  const updateNote = useCallback(
    (topicId: string, id: string, content: string) => guard(async () => {
      await repo.updateNote(id, { content })
      await reloadNotes(topicId)
    }),
    [guard, reloadNotes, repo],
  )

  const deleteNote = useCallback(
    (topicId: string, id: string) => guard(async () => {
      await repo.deleteNote(id)
      await reloadNotes(topicId)
    }),
    [guard, reloadNotes, repo],
  )

  const logout = useCallback(async () => {
    if (isSupabaseConfigured) await supabase!.auth.signOut()
  }, [])

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === selectedCourseId) ?? null,
    [courses, selectedCourseId],
  )
  const selectedTopic = useMemo(
    () => topics.find((t) => t.id === selectedTopicId) ?? null,
    [topics, selectedTopicId],
  )
  const courseTopics = useMemo(
    () => topics.filter((t) => t.courseId === selectedCourseId),
    [topics, selectedCourseId],
  )
  const topicCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of topics) counts[t.courseId] = (counts[t.courseId] ?? 0) + 1
    return counts
  }, [topics])

  const selectCourse = (id: string | null) => {
    setSelectedCourseId(id)
    setSelectedTopicId(null)
    setQuery('')
    setSidebarOpen(false)
  }

  const openTopic = (courseId: string, topicId: string) => {
    setSelectedCourseId(courseId)
    setSelectedTopicId(topicId)
    setQuery('')
    setSidebarOpen(false)
  }

  const showSearch = query.trim().length > 0

  if (!isDemo && authLoading) {
    return (
      <div className="splash">
        <div className="brand">
          <span className="brand-icon brand-icon-lg">
            <Icon name="cap" size={22} />
          </span>
          <span className="brand-name brand-name-lg">{APP_NAME}</span>
        </div>
      </div>
    )
  }

  if (legal) {
    return (
      <div className="app legal-bg">
        <div className="legal-page">
          <LegalView page={legal} onBack={() => setLegal(null)} />
          <Footer onOpenLegal={setLegal} />
        </div>
      </div>
    )
  }

  if (!isDemo && !userId) {
    return (
      <div className="app auth-bg">
        <div className="auth-shell">
          <AuthView />
          <Footer onOpenLegal={setLegal} />
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Sidebar
        courses={courses}
        topicCounts={topicCounts}
        selectedCourseId={selectedCourseId}
        open={sidebarOpen}
        onSelect={selectCourse}
        onAdd={addCourse}
        onRename={renameCourse}
        onDelete={deleteCourse}
        onClose={() => setSidebarOpen(false)}
        userEmail={isDemo ? null : userEmail}
        onLogout={logout}
      />
      {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <button
            className="icon-btn only-mobile"
            onClick={() => setSidebarOpen(true)}
            aria-label="Menüyü aç"
          >
            <Icon name="menu" size={16} />
          </button>

          <nav className="crumbs">
            {selectedTopic && selectedCourse ? (
              <>
                <button className="crumb" onClick={() => setSelectedTopicId(null)} type="button">
                  {selectedCourse.name}
                </button>
                <Icon name="chevronRight" size={14} className="crumb-sep" />
                <span className="crumb current">{selectedTopic.title}</span>
              </>
            ) : selectedCourse ? (
              <span className="crumb current">{selectedCourse.name}</span>
            ) : (
              <span className="crumb current">Tüm Dersler</span>
            )}
          </nav>

          <div className="search-wrap">
            <Icon name="search" size={14} className="search-icon" />
            <input
              className="input search-input"
              placeholder="Konu veya not ara…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Ara"
            />
            {query && (
              <button
                className="icon-btn search-clear"
                onClick={() => setQuery('')}
                aria-label="Aramayı temizle"
              >
                <Icon name="x" size={13} />
              </button>
            )}
          </div>

          <button
            className="icon-btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Tema değiştir"
            title={theme === 'dark' ? 'Açık tema' : 'Koyu tema'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
          </button>
        </header>

        {error && (
          <div className="banner banner-error" role="alert">
            <Icon name="alert" size={15} />
            <span>
              {error}
              {SCHEMA_HINT.test(error) &&
                " — Supabase SQL Editor'de güncel schema.sql dosyasını çalıştırdığından emin ol."}
            </span>
            <button className="icon-btn" onClick={() => setError(null)} aria-label="Hata kapat">
              <Icon name="x" size={13} />
            </button>
          </div>
        )}

        {isDemo && <SetupNotice />}

        <div className="content">
          <div className="content-inner">
            {initialLoading ? (
              <p className="muted loading-hint">Yükleniyor…</p>
            ) : showSearch ? (
              <SearchView
                query={query}
                hits={hits}
                loading={searching}
                onOpenHit={(hit) => openTopic(hit.courseId, hit.topicId)}
              />
            ) : selectedTopic && selectedCourse ? (
              <TopicView
                course={selectedCourse}
                topic={selectedTopic}
                notes={notes}
                loading={notesLoading}
                onBack={() => setSelectedTopicId(null)}
                onAddNote={(content) =>
                  selectedTopicId ? addNote(selectedTopicId, content) : Promise.resolve()
                }
                onUpdateNote={(id, content) =>
                  selectedTopicId ? updateNote(selectedTopicId, id, content) : Promise.resolve()
                }
                onDeleteNote={(id) =>
                  selectedTopicId ? deleteNote(selectedTopicId, id) : Promise.resolve()
                }
              />
            ) : selectedCourse ? (
              <CourseView
                course={selectedCourse}
                topics={courseTopics}
                onBack={() => selectCourse(null)}
                onAdd={(title) => addTopic(selectedCourse.id, title)}
                onRename={renameTopic}
                onDelete={deleteTopic}
                onOpenTopic={(id) => openTopic(selectedCourse.id, id)}
              />
            ) : (
              <HomeView
                courses={courses}
                topics={topics}
                demo={isDemo}
                onSelect={selectCourse}
              />
            )}
          </div>
          <Footer onOpenLegal={setLegal} />
        </div>
      </main>
    </div>
  )
}

function HomeView({
  courses,
  topics,
  demo,
  onSelect,
}: {
  courses: Course[]
  topics: Topic[]
  demo: boolean
  onSelect: (id: string) => void
}) {
  return (
    <div className="home">
      <div className="home-hero">
        <h1>Hoş geldin 👋</h1>
        <p>
          {demo
            ? 'Şu an demo modundasın: veriler yalnızca bu tarayıcıda tutuluyor.'
            : 'Notların hesabına bağlı olarak Supabase veri tabanında saklanıyor.'}{' '}
          Derslerini ekle, konuları oluştur ve ders sırasında notlarını buraya yaz.
        </p>
      </div>

      <div className="stats">
        <div className="stat-card">
          <span className="stat-num">{courses.length}</span>
          <span className="stat-label">ders</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{topics.length}</span>
          <span className="stat-label">konu</span>
        </div>
      </div>

      {courses.length > 0 ? (
        <div className="home-hint">
          <h2>Derslerine devam et</h2>
          <div className="recent-courses">
            {courses.map((course) => (
              <button
                key={course.id}
                className="recent-course"
                onClick={() => onSelect(course.id)}
                type="button"
              >
                <span className="dot" style={{ background: course.color }} />
                {course.name}
                <Icon name="chevronRight" size={14} />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="empty-hint">
          Başlamak için soldaki <strong>+</strong> düğmesiyle ilk dersini ekle.
        </p>
      )}
    </div>
  )
}
