import { useState, useEffect, useRef, useCallback } from 'react'
import { Icon } from './icons'

type Mode = 'focus' | 'shortBreak' | 'longBreak'

interface PomodoroDurations {
  focus: number // minutes
  shortBreak: number // minutes
  longBreak: number // minutes
}

const DEFAULT_DURATIONS: PomodoroDurations = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
}

const MODE_LABELS: Record<Mode, string> = {
  focus: 'Odak',
  shortBreak: 'Kısa Mola',
  longBreak: 'Uzun Mola',
}

/**
 * Deliler gibi çıldıran sesli alarm motoru.
 * Kullanıcı susturana kadar yüksek tempolu acil durum tonu çalar.
 */
class CrazyAlarmAudio {
  private ctx: AudioContext | null = null
  private timer: number | null = null

  start() {
    this.stop()
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) return
      this.ctx = new AudioContextClass()

      let step = 0
      const playBeep = () => {
        if (!this.ctx || this.ctx.state === 'closed') return

        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()

        // 2 tonlu agresif dijital alarm (880Hz / 1250Hz)
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

      playBeep()
      this.timer = window.setInterval(playBeep, 200)
    } catch {}
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.ctx) {
      try {
        this.ctx.close()
      } catch {}
      this.ctx = null
    }
  }
}

const alarmAudio = new CrazyAlarmAudio()

export function PomodoroTimer() {
  const [open, setOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [mode, setMode] = useState<Mode>('focus')

  const [durations, setDurations] = useState<PomodoroDurations>(() => {
    try {
      const saved = localStorage.getItem('dn.pomodoro_durations')
      if (saved) return { ...DEFAULT_DURATIONS, ...JSON.parse(saved) }
    } catch {}
    return DEFAULT_DURATIONS
  })

  // Editable drafts in settings view
  const [editFocus, setEditFocus] = useState(durations.focus)
  const [editShortBreak, setEditShortBreak] = useState(durations.shortBreak)
  const [editLongBreak, setEditLongBreak] = useState(durations.longBreak)

  const [timeLeft, setTimeLeft] = useState(durations.focus * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [completedSessions, setCompletedSessions] = useState<number>(() => {
    return Number(localStorage.getItem('dn.pomodoro_count') ?? 0)
  })

  // Deliler gibi çıldıran tam ekran alarm durumu
  const [alarmActive, setAlarmActive] = useState(false)
  const [alarmMode, setAlarmMode] = useState<Mode>('focus')

  const popupRef = useRef<HTMLDivElement>(null)

  const triggerAlarm = useCallback((triggerMode: Mode) => {
    setAlarmMode(triggerMode)
    setAlarmActive(true)
    alarmAudio.start()
  }, [])

  const dismissAlarm = useCallback(() => {
    setAlarmActive(false)
    alarmAudio.stop()
  }, [])

  // Timer interval
  useEffect(() => {
    if (!isRunning) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false)
          triggerAlarm(mode)
          if (mode === 'focus') {
            setCompletedSessions((c) => {
              const next = c + 1
              localStorage.setItem('dn.pomodoro_count', String(next))
              return next
            })
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isRunning, mode, triggerAlarm])

  // Click outside to close popup
  useEffect(() => {
    if (!open) return
    const handleDown = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowSettings(false)
      }
    }
    window.addEventListener('mousedown', handleDown)
    return () => window.removeEventListener('mousedown', handleDown)
  }, [open])

  // ESC tuşuyla alarmı kapatma
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && alarmActive) {
        dismissAlarm()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [alarmActive, dismissAlarm])

  const switchMode = (m: Mode) => {
    setMode(m)
    setTimeLeft(durations[m] * 60)
    setIsRunning(false)
  }

  const reset = () => {
    setTimeLeft(durations[mode] * 60)
    setIsRunning(false)
  }

  const saveSettings = () => {
    const f = Math.max(1, Math.min(180, Number(editFocus) || 25))
    const sb = Math.max(1, Math.min(60, Number(editShortBreak) || 5))
    const lb = Math.max(1, Math.min(90, Number(editLongBreak) || 15))
    const next: PomodoroDurations = { focus: f, shortBreak: sb, longBreak: lb }
    setDurations(next)
    localStorage.setItem('dn.pomodoro_durations', JSON.stringify(next))
    if (!isRunning) {
      setTimeLeft(next[mode] * 60)
    }
    setShowSettings(false)
  }

  const applyPreset = (focusMin: number, breakMin: number) => {
    setEditFocus(focusMin)
    setEditShortBreak(breakMin)
  }

  const testAlarm = () => {
    setOpen(false)
    triggerAlarm(mode)
  }

  const startNextAfterAlarm = () => {
    dismissAlarm()
    if (alarmMode === 'focus') {
      switchMode('shortBreak')
      setIsRunning(true)
    } else {
      switchMode('focus')
      setIsRunning(true)
    }
  }

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return (
    <>
      <div className="pomodoro-wrap" ref={popupRef}>
        <button
          className={`pomodoro-badge ${isRunning ? 'active' : ''}`}
          onClick={() => setOpen(!open)}
          type="button"
          title="Çalışma Sayacı / Pomodoro"
          aria-label="Çalışma Sayacı"
        >
          <Icon name="timer" size={15} />
          <span className="pomodoro-time">{formatted}</span>
          {isRunning && <span className="pomodoro-pulse" />}
        </button>

        {open && (
          <div className="pomodoro-popup">
            <div className="pomodoro-top-row">
              <div className="pomodoro-modes">
                {(['focus', 'shortBreak', 'longBreak'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`pomodoro-mode-btn ${mode === m ? 'active' : ''}`}
                    onClick={() => {
                      switchMode(m)
                      setShowSettings(false)
                    }}
                  >
                    {MODE_LABELS[m]} ({durations[m]}d)
                  </button>
                ))}
              </div>

              <button
                className={`icon-btn ${showSettings ? 'active' : ''}`}
                onClick={() => {
                  setEditFocus(durations.focus)
                  setEditShortBreak(durations.shortBreak)
                  setEditLongBreak(durations.longBreak)
                  setShowSettings(!showSettings)
                }}
                title="Süreleri Değiştir"
                type="button"
              >
                <Icon name="settings" size={15} />
              </button>
            </div>

            {showSettings ? (
              <div className="pomodoro-settings-view">
                <span className="pomodoro-settings-title">Süre Ayarları (Dakika)</span>

                <div className="pomodoro-presets">
                  <button
                    type="button"
                    className="pomodoro-preset-btn"
                    onClick={() => applyPreset(25, 5)}
                  >
                    25 / 5 dk
                  </button>
                  <button
                    type="button"
                    className="pomodoro-preset-btn"
                    onClick={() => applyPreset(45, 15)}
                  >
                    45 / 15 dk
                  </button>
                  <button
                    type="button"
                    className="pomodoro-preset-btn"
                    onClick={() => applyPreset(50, 10)}
                  >
                    50 / 10 dk
                  </button>
                </div>

                <div className="pomodoro-input-group">
                  <label>
                    <span>Odaklanma Süresi:</span>
                    <div className="pomodoro-num-wrap">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setEditFocus((v) => Math.max(1, v - 5))}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        className="input pomodoro-num-input"
                        min={1}
                        max={180}
                        value={editFocus}
                        onChange={(e) => setEditFocus(Number(e.target.value))}
                      />
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setEditFocus((v) => Math.min(180, v + 5))}
                      >
                        +
                      </button>
                      <span className="muted">dk</span>
                    </div>
                  </label>

                  <label>
                    <span>Kısa Mola:</span>
                    <div className="pomodoro-num-wrap">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setEditShortBreak((v) => Math.max(1, v - 1))}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        className="input pomodoro-num-input"
                        min={1}
                        max={60}
                        value={editShortBreak}
                        onChange={(e) => setEditShortBreak(Number(e.target.value))}
                      />
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setEditShortBreak((v) => Math.min(60, v + 1))}
                      >
                        +
                      </button>
                      <span className="muted">dk</span>
                    </div>
                  </label>

                  <label>
                    <span>Uzun Mola:</span>
                    <div className="pomodoro-num-wrap">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setEditLongBreak((v) => Math.max(1, v - 5))}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        className="input pomodoro-num-input"
                        min={1}
                        max={90}
                        value={editLongBreak}
                        onChange={(e) => setEditLongBreak(Number(e.target.value))}
                      />
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setEditLongBreak((v) => Math.min(90, v + 5))}
                      >
                        +
                      </button>
                      <span className="muted">dk</span>
                    </div>
                  </label>
                </div>

                <div className="pomodoro-settings-actions">
                  <button
                    className="btn btn-small"
                    onClick={testAlarm}
                    type="button"
                    title="Alarmı test et"
                  >
                    🚨 Alarmı Test Et
                  </button>
                  <button
                    className="btn btn-primary btn-small"
                    onClick={saveSettings}
                    type="button"
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="pomodoro-display">
                  <span className="pomodoro-clock">{formatted}</span>
                  <span className="pomodoro-sub">
                    {mode === 'focus' ? '🎯 Odaklanma Zamanı' : '☕ Mola Zamanı'}
                  </span>
                </div>

                <div className="pomodoro-controls">
                  <button
                    className="btn btn-primary pomodoro-play"
                    onClick={() => setIsRunning(!isRunning)}
                    type="button"
                  >
                    <Icon name={isRunning ? 'pause' : 'play'} size={15} />
                    {isRunning ? 'Duraklat' : 'Başlat'}
                  </button>
                  <button
                    className="icon-btn"
                    onClick={reset}
                    type="button"
                    title="Sıfırla"
                    aria-label="Sıfırla"
                  >
                    <Icon name="rotateCcw" size={15} />
                  </button>
                </div>

                <div className="pomodoro-footer">
                  <span>Tamamlanan odak:</span>
                  <strong>{completedSessions} seans</strong>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* DELİLER GİBİ ÇILDIRAN TAM EKRAN ALARM MODALI */}
      {alarmActive && (
        <div className="crazy-alarm-overlay" role="alertdialog" aria-modal="true">
          <div className="crazy-alarm-particles" aria-hidden="true">
            <span>🚨</span>
            <span>⚡</span>
            <span>⏰</span>
            <span>🔥</span>
            <span>💥</span>
            <span>📢</span>
            <span>🎉</span>
            <span>⭐</span>
            <span>🚨</span>
            <span>⚡</span>
            <span>⏰</span>
            <span>🔥</span>
          </div>

          <div className="crazy-alarm-modal">
            <div className="crazy-alarm-icon-box">
              <span className="crazy-siren">🚨</span>
              <span className="crazy-bell">⏰</span>
              <span className="crazy-fire">🔥</span>
            </div>

            <h1 className="crazy-alarm-title">
              {alarmMode === 'focus'
                ? 'SÜRE BİTTİ! DELİ GİBİ ÇALIŞTIN! 🔥'
                : 'MOLA BİTTİ! KALK, ÇALIŞMA VAKTİ! ⚡'}
            </h1>

            <p className="crazy-alarm-desc">
              {alarmMode === 'focus'
                ? 'Muazzam bir odaklanma seansı tamamlandı! Beynin dinlenmeyi hak etti. Şimdi mola verip bir kahve kap.'
                : 'Mola süren doldu! Masaya dön, notlarını aç ve hedefine odaklan! Başarı seni bekliyor.'}
            </p>

            <div className="crazy-alarm-actions">
              <button
                className="crazy-btn crazy-btn-dismiss"
                onClick={dismissAlarm}
                type="button"
              >
                🚨 ALARMI SUSTUR 🚨
              </button>

              <button
                className="crazy-btn crazy-btn-next"
                onClick={startNextAfterAlarm}
                type="button"
              >
                {alarmMode === 'focus' ? '☕ Molayı Başlat' : '🎯 Yeni Odak Seansı Başlat'}
              </button>
            </div>

            <span className="crazy-alarm-hint">ESC tuşu ile de kapatabilirsin</span>
          </div>
        </div>
      )}
    </>
  )
}
