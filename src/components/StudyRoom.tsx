import { useState, useEffect, useCallback, useRef } from 'react'
import type { Course } from '../lib/types'
import type { StudySession } from '../lib/studySession'
import {
  getActiveSession,
  createSession,
  endSession,
  updateTimerState,
  updateSharedCourses,
  sendInvite,
  getPendingInvites,
  acceptInvite,
  rejectInvite,
  subscribeToSession,
  subscribeToInvites,
  calcTimeLeft,
} from '../lib/studySession'
import type { StudyInvite } from '../lib/studySession'
import { Icon } from './icons'
import { useToast } from './Toast'

type Mode = 'focus' | 'shortBreak' | 'longBreak'

const MODE_LABELS: Record<Mode, string> = {
  focus: 'Odak',
  shortBreak: 'Kısa Mola',
  longBreak: 'Uzun Mola',
}

const DEFAULT_DURATIONS: Record<Mode, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
}

// ─── Çıldıran alarm efekti ───────────────────────────────────────────────────
class AlarmAudio {
  private ctx: AudioContext | null = null
  private timer: number | null = null

  start() {
    this.stop()
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new AC()
      let step = 0
      const beep = () => {
        if (!this.ctx || this.ctx.state === 'closed') return
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        osc.type = step % 2 === 0 ? 'square' : 'sawtooth'
        osc.frequency.setValueAtTime(step % 2 === 0 ? 880 : 1250, this.ctx.currentTime)
        gain.gain.setValueAtTime(0.28, this.ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16)
        osc.connect(gain)
        gain.connect(this.ctx.destination)
        osc.start()
        osc.stop(this.ctx.currentTime + 0.16)
        step++
      }
      beep()
      this.timer = window.setInterval(beep, 200)
    } catch {}
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null }
    if (this.ctx) { try { this.ctx.close() } catch {}; this.ctx = null }
  }
}

/** Kısa "ortak durdurdu" bip sesi */
function playPartnerPause() {
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, ctx.currentTime)
    osc.frequency.setValueAtTime(330, ctx.currentTime + 0.18)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
  } catch {}
}

const alarmAudio = new AlarmAudio()

// ─── Props ───────────────────────────────────────────────────────────────────
interface StudyRoomProps {
  userId: string
  userEmail: string
  courses: Course[]
  onClose: () => void
}

// ─── Bileşen ─────────────────────────────────────────────────────────────────
export function StudyRoom({ userId, userEmail, courses, onClose }: StudyRoomProps) {
  const { showToast } = useToast()

  const [session, setSession] = useState<StudySession | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingInvites, setPendingInvites] = useState<StudyInvite[]>([])

  // UI State
  const [tab, setTab] = useState<'timer' | 'notes' | 'invite'>('timer')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)

  // Timer görsel
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATIONS.focus)
  const [alarmActive, setAlarmActive] = useState(false)
  const [alarmMode, setAlarmMode] = useState<Mode>('focus')

  // Not paylaşımı
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set())
  const [shareUpdating, setShareUpdating] = useState(false)

  const prevRunningRef = useRef<boolean | null>(null)
  const meIsOwner = session ? session.ownerId === userId : false
  const partnerEmail = '' // session'daki partner e-postasını profile'dan çekebilirdik; şimdilik boş

  // ── Aktif oturumu yükle ─────────────────────────────────────────────────
  const loadSession = useCallback(async () => {
    try {
      const s = await getActiveSession(userId)
      setSession(s)
      if (s) {
        setSelectedCourseIds(new Set(s.sharedCourseIds))
        setTimeLeft(calcTimeLeft(s))
      }
    } catch (e) {
      showToast('Oturum yüklenemedi', { type: 'warn', icon: 'alert' })
    } finally {
      setLoading(false)
    }
  }, [userId, showToast])

  useEffect(() => {
    void loadSession()
  }, [loadSession])

  // ── Realtime: session değişikliği ─────────────────────────────────────
  useEffect(() => {
    if (!session) return

    const unsub = subscribeToSession(session.id, (updated) => {
      const wasRunning = prevRunningRef.current
      const nowRunning = updated.timerRunning

      setSession(updated)
      setTimeLeft(calcTimeLeft(updated))

      // Ortak durdurdu → bip
      if (wasRunning && !nowRunning) {
        playPartnerPause()
        showToast('Ortak çalışmayı durdurdu ⏸', { type: 'info', icon: 'pause' })
      }
      // Ortak başlattı
      if (!wasRunning && nowRunning) {
        showToast('Ortak çalışmayı başlattı ▶️', { type: 'success', icon: 'play' })
      }

      prevRunningRef.current = nowRunning
    })

    return unsub
  }, [session?.id, showToast])

  // ── Realtime: yeni davet ───────────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribeToInvites(userId, (invite) => {
      setPendingInvites((prev) => [invite, ...prev])
      showToast(`Yeni birlikte çalışma daveti! 🤝`, { type: 'info', icon: 'sparkles' })
    })
    return unsub
  }, [userId, showToast])

  // Mevcut bekleyen davetleri yükle
  useEffect(() => {
    getPendingInvites(userId)
      .then(setPendingInvites)
      .catch(() => {})
  }, [userId])

  // ── Yerel timer ticker ─────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.timerRunning) return
    const tick = setInterval(() => {
      setTimeLeft(calcTimeLeft(session))
    }, 500)
    return () => clearInterval(tick)
  }, [session?.timerRunning, session?.timerStartedAt, session?.timerRemaining])

  // ── Timer sıfıra inince alarm ──────────────────────────────────────────
  useEffect(() => {
    if (timeLeft <= 0 && session?.timerRunning) {
      alarmAudio.start()
      setAlarmMode(session.timerMode)
      setAlarmActive(true)
      // Timer'ı durdur
      void updateTimerState(session.id, {
        timerRunning: false,
        timerRemaining: 0,
      })
    }
  }, [timeLeft, session])

  // ── Alarm kapat ────────────────────────────────────────────────────────
  const dismissAlarm = useCallback(() => {
    setAlarmActive(false)
    alarmAudio.stop()
  }, [])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape' && alarmActive) dismissAlarm() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [alarmActive, dismissAlarm])

  // ── Oturum oluştur ─────────────────────────────────────────────────────
  const handleCreateSession = async () => {
    try {
      const s = await createSession(userId, Array.from(selectedCourseIds))
      setSession(s)
      showToast('Birlikte çalışma odası açıldı! 🚀', { type: 'success', icon: 'sparkles' })
    } catch {
      showToast('Oda açılamadı', { type: 'warn', icon: 'alert' })
    }
  }

  // ── Oturumu bitir ──────────────────────────────────────────────────────
  const handleEndSession = async () => {
    if (!session) return
    try {
      await endSession(session.id)
      setSession(null)
      showToast('Oturum sona erdi 👋')
    } catch {
      showToast('Oturum kapatılamadı', { type: 'warn', icon: 'alert' })
    }
  }

  // ── Timer kontrolleri ──────────────────────────────────────────────────
  const toggleTimer = async () => {
    if (!session) return
    const now = new Date().toISOString()
    const current = calcTimeLeft(session)

    if (session.timerRunning) {
      // Durdur
      await updateTimerState(session.id, {
        timerRunning: false,
        timerStartedAt: null,
        timerRemaining: current,
      }).catch(() => {})
    } else {
      // Başlat
      await updateTimerState(session.id, {
        timerRunning: true,
        timerStartedAt: now,
        timerRemaining: current,
      }).catch(() => {})
    }
  }

  const resetTimer = async () => {
    if (!session) return
    const duration = DEFAULT_DURATIONS[session.timerMode]
    await updateTimerState(session.id, {
      timerRunning: false,
      timerStartedAt: null,
      timerRemaining: duration,
    }).catch(() => {})
    setTimeLeft(duration)
  }

  const switchMode = async (mode: Mode) => {
    if (!session) return
    const duration = DEFAULT_DURATIONS[mode]
    await updateTimerState(session.id, {
      timerMode: mode,
      timerRunning: false,
      timerStartedAt: null,
      timerRemaining: duration,
    }).catch(() => {})
    setTimeLeft(duration)
  }

  // ── Not paylaşımı ──────────────────────────────────────────────────────
  const toggleCourse = async (courseId: string) => {
    if (!session || !meIsOwner) return
    setShareUpdating(true)
    const next = new Set(selectedCourseIds)
    if (next.has(courseId)) {
      next.delete(courseId)
    } else {
      next.add(courseId)
    }
    setSelectedCourseIds(next)
    try {
      await updateSharedCourses(session.id, Array.from(next))
    } catch {
      showToast('Paylaşım güncellenemedi', { type: 'warn', icon: 'alert' })
    } finally {
      setShareUpdating(false)
    }
  }

  // ── Davet gönder ───────────────────────────────────────────────────────
  const handleSendInvite = async () => {
    if (!session || !inviteEmail.trim()) return
    setInviteBusy(true)
    try {
      await sendInvite(userId, session.id, inviteEmail.trim())
      showToast(`Davet gönderildi: ${inviteEmail.trim()} 📨`)
      setInviteEmail('')
    } catch (e) {
      showToast('Davet gönderilemedi', { type: 'warn', icon: 'alert' })
    } finally {
      setInviteBusy(false)
    }
  }

  // ── Davet kabul/red ────────────────────────────────────────────────────
  const handleAcceptInvite = async (invite: StudyInvite) => {
    try {
      await acceptInvite(invite.id, invite.sessionId, userId)
      setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id))
      showToast('Davet kabul edildi! Odaya katılındı 🤝', { type: 'success', icon: 'check' })
      await loadSession()
    } catch {
      showToast('Kabul işlemi başarısız', { type: 'warn', icon: 'alert' })
    }
  }

  const handleRejectInvite = async (invite: StudyInvite) => {
    try {
      await rejectInvite(invite.id)
      setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id))
      showToast('Davet reddedildi')
    } catch {
      showToast('Red işlemi başarısız', { type: 'warn', icon: 'alert' })
    }
  }

  // ── Sonraki mola/odak ──────────────────────────────────────────────────
  const startNextAfterAlarm = async () => {
    dismissAlarm()
    if (!session) return
    const nextMode: Mode = alarmMode === 'focus' ? 'shortBreak' : 'focus'
    const duration = DEFAULT_DURATIONS[nextMode]
    const now = new Date().toISOString()
    await updateTimerState(session.id, {
      timerMode: nextMode,
      timerRunning: true,
      timerStartedAt: now,
      timerRemaining: duration,
    }).catch(() => {})
    setTimeLeft(duration)
  }

  // ── Render ─────────────────────────────────────────────────────────────
  const mins = Math.floor(Math.max(0, timeLeft) / 60)
  const secs = Math.max(0, timeLeft) % 60
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  const totalSecs = session ? DEFAULT_DURATIONS[session.timerMode] : DEFAULT_DURATIONS.focus
  const progress = totalSecs > 0 ? Math.max(0, timeLeft) / totalSecs : 0

  if (loading) {
    return (
      <div className="study-room-overlay">
        <div className="study-room-modal">
          <p className="muted" style={{ textAlign: 'center', padding: 40 }}>Yükleniyor…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="study-room-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="study-room-modal">
          {/* Header */}
          <div className="study-room-header">
            <div className="study-room-title">
              <span className="study-room-icon">🤝</span>
              <div>
                <h2>Birlikte Çalışma Odası</h2>
                <p className="study-room-status">
                  {session
                    ? session.partnerId
                      ? `Aktif oturum · 2 katılımcı`
                      : 'Aktif oturum · Ortak bekleniyor'
                    : 'Henüz aktif oturum yok'}
                </p>
              </div>
            </div>
            <button className="icon-btn" onClick={onClose} aria-label="Kapat">
              <Icon name="x" size={18} />
            </button>
          </div>

          {/* Bekleyen davetler */}
          {pendingInvites.length > 0 && (
            <div className="study-invite-incoming">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="study-invite-banner">
                  <div className="study-invite-banner-info">
                    <span className="study-invite-banner-icon">📨</span>
                    <div>
                      <strong>Birlikte çalışma daveti!</strong>
                      <p>{invite.fromEmail ?? invite.fromUserId} seni davet etti</p>
                    </div>
                  </div>
                  <div className="study-invite-banner-actions">
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => void handleAcceptInvite(invite)}
                    >
                      Kabul Et
                    </button>
                    <button
                      className="btn btn-small"
                      onClick={() => void handleRejectInvite(invite)}
                    >
                      Reddet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Oturum yok → oluştur */}
          {!session ? (
            <div className="study-no-session">
              <div className="study-empty-icon">🚀</div>
              <p>Birlikte çalışma odası oluştur ve arkadaşını davet et.</p>
              <p className="muted">
                Odak zamanlayıcısı senkronize olur, notlarını paylaşabilirsin.
              </p>
              <button className="btn btn-primary" onClick={() => void handleCreateSession()}>
                <Icon name="plus" size={15} />
                Oda Oluştur
              </button>
            </div>
          ) : (
            <>
              {/* Tab Bar */}
              <div className="study-tabs">
                {[
                  { id: 'timer', label: '⏱ Zamanlayıcı' },
                  { id: 'notes', label: '📚 Paylaşılan Notlar' },
                  { id: 'invite', label: '📨 Davet' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    className={`study-tab ${tab === id ? 'active' : ''}`}
                    onClick={() => setTab(id as typeof tab)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab: Zamanlayıcı */}
              {tab === 'timer' && (
                <div className="study-timer-section">
                  {/* Mode butonları */}
                  <div className="study-mode-pills">
                    {(['focus', 'shortBreak', 'longBreak'] as Mode[]).map((m) => (
                      <button
                        key={m}
                        className={`study-mode-pill ${session.timerMode === m ? 'active' : ''}`}
                        onClick={() => void switchMode(m)}
                        type="button"
                      >
                        {MODE_LABELS[m]}
                      </button>
                    ))}
                  </div>

                  {/* Radyal zamanlayıcı */}
                  <div className="study-timer-ring-wrap">
                    <svg className="study-timer-ring" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r="88" className="ring-bg" />
                      <circle
                        cx="100"
                        cy="100"
                        r="88"
                        className="ring-progress"
                        strokeDasharray={`${2 * Math.PI * 88}`}
                        strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress)}`}
                      />
                    </svg>
                    <div className="study-timer-center">
                      <span className="study-clock">{formatted}</span>
                      <span className="study-mode-label">
                        {session.timerMode === 'focus' ? '🎯 Odaklanma' : '☕ Mola'}
                      </span>
                    </div>
                  </div>

                  {/* Kontroller */}
                  <div className="study-controls">
                    <button
                      className="icon-btn"
                      onClick={() => void resetTimer()}
                      title="Sıfırla"
                      type="button"
                    >
                      <Icon name="rotateCcw" size={18} />
                    </button>
                    <button
                      className={`study-play-btn ${session.timerRunning ? 'running' : ''}`}
                      onClick={() => void toggleTimer()}
                      type="button"
                    >
                      <Icon name={session.timerRunning ? 'pause' : 'play'} size={22} />
                      {session.timerRunning ? 'Duraklat' : 'Başlat'}
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => void handleEndSession()}
                      title="Odayı Kapat"
                      type="button"
                    >
                      <Icon name="x" size={13} />
                      Odayı Kapat
                    </button>
                  </div>

                  {session.partnerId ? (
                    <div className="study-participants">
                      <div className="study-participant">
                        <span className="study-participant-dot online" />
                        <span>{userEmail}</span>
                        <span className="study-participant-you">(Sen)</span>
                      </div>
                      <div className="study-participant">
                        <span className="study-participant-dot online" />
                        <span>Ortak Kullanıcı</span>
                      </div>
                    </div>
                  ) : (
                    <div className="study-waiting">
                      <span className="study-waiting-spinner" />
                      Arkadaşın bekleniyor…
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Notlar */}
              {tab === 'notes' && (
                <div className="study-notes-section">
                  <p className="study-notes-desc">
                    {meIsOwner
                      ? 'Seçtiğin dersler ve içindeki konular & notlar ortağın tarafından görüntülenebilir olur.'
                      : 'Oda sahibinin paylaştığı dersler aşağıda görünür.'}
                  </p>
                  {courses.length === 0 ? (
                    <p className="muted">Henüz ders yok.</p>
                  ) : (
                    <div className="study-course-list">
                      {courses.map((course) => {
                        const shared = selectedCourseIds.has(course.id)
                        const isOwner = meIsOwner
                        return (
                          <div
                            key={course.id}
                            className={`study-course-item ${shared ? 'shared' : ''} ${!isOwner ? 'readonly' : ''}`}
                            onClick={() => isOwner && void toggleCourse(course.id)}
                          >
                            <span className="dot" style={{ background: course.color }} />
                            <span className="study-course-name">{course.name}</span>
                            {shared ? (
                              <span className="study-shared-badge">
                                <Icon name="check" size={12} />
                                Paylaşıldı
                              </span>
                            ) : isOwner ? (
                              <span className="study-share-hint">Paylaş</span>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {shareUpdating && <p className="muted" style={{ textAlign: 'center', marginTop: 8 }}>Güncelleniyor…</p>}
                </div>
              )}

              {/* Tab: Davet */}
              {tab === 'invite' && (
                <div className="study-invite-section">
                  <p className="study-invite-desc">
                    Arkadaşının MWnotes. hesabına kayıtlı e-posta adresini gir.
                    Davet aldığında aynı oturuma bağlanabilir.
                  </p>
                  <div className="study-invite-form">
                    <input
                      className="input"
                      type="email"
                      placeholder="ornek@mail.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') void handleSendInvite() }}
                    />
                    <button
                      className="btn btn-primary"
                      onClick={() => void handleSendInvite()}
                      disabled={inviteBusy || !inviteEmail.trim()}
                      type="button"
                    >
                      <Icon name="sparkles" size={14} />
                      {inviteBusy ? 'Gönderiliyor…' : 'Davet Gönder'}
                    </button>
                  </div>

                  <div className="study-invite-tips">
                    <p>
                      <strong>Nasıl çalışır?</strong>
                    </p>
                    <ul>
                      <li>Davetli e-postasını girip "Davet Gönder" butonuna tıkla.</li>
                      <li>Arkadaşın bu ekrana geldiğinde daveti görüp kabul edebilir.</li>
                      <li>Kabul ettiğinde senkronize odak zamanlayıcısı başlar.</li>
                      <li>Biri başlatırsa/durdurursa diğerinde de anında etkisi görülür.</li>
                      <li>İstediğin dersleri Notlar sekmesinden paylaşabilirsin.</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Çıldıran Alarm */}
      {alarmActive && (
        <div className="crazy-alarm-overlay" role="alertdialog" aria-modal="true">
          <div className="crazy-alarm-particles" aria-hidden="true">
            <span>🚨</span><span>⚡</span><span>⏰</span><span>🔥</span>
            <span>💥</span><span>📢</span><span>🎉</span><span>⭐</span>
            <span>🚨</span><span>⚡</span><span>⏰</span><span>🔥</span>
          </div>
          <div className="crazy-alarm-modal">
            <div className="crazy-alarm-icon-box">
              <span className="crazy-siren">🚨</span>
              <span className="crazy-bell">⏰</span>
              <span className="crazy-fire">🔥</span>
            </div>
            <h1 className="crazy-alarm-title">
              {alarmMode === 'focus'
                ? 'SÜRE BİTTİ! İKİNİZ DE ÇOK ÇALIŞTINIZ! 🔥'
                : 'MOLA BİTTİ! KALKIYOR MUSUNUZ?! ⚡'}
            </h1>
            <p className="crazy-alarm-desc">
              {alarmMode === 'focus'
                ? 'Harika bir senkronize odaklanma seansı tamamlandı! Birlikte kahve içme zamanı.'
                : 'Birlikte mola bitti! Şimdi yeniden odaklanma zamanı. Hazır mısınız?'}
            </p>
            <div className="crazy-alarm-actions">
              <button className="crazy-btn crazy-btn-dismiss" onClick={dismissAlarm} type="button">
                🚨 ALARMI SUSTUR 🚨
              </button>
              <button className="crazy-btn crazy-btn-next" onClick={() => void startNextAfterAlarm()} type="button">
                {alarmMode === 'focus' ? '☕ Birlikte Mola Başlat' : '🎯 Yeni Odak Seansı'}
              </button>
            </div>
            <span className="crazy-alarm-hint">ESC tuşu ile de kapatabilirsin</span>
          </div>
        </div>
      )}
    </>
  )
}
